"""
FastAPI Backend Application for Customer Churn Predictor.
Includes:
- Full Authentication: /auth/signup, /auth/login, /auth/logout, /auth/me
- Bcrypt password hashing & PyJWT token generation
- Secure httpOnly cookie session persistence
- Protected POST /predict endpoint requiring authenticated session
- Local SHAP explainability and asynchronous database logging
- CORS configured for credentialed cookies from Vite frontend
"""

import os
import sys
import re
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

logger = logging.getLogger("churnguard")

import bcrypt
import jwt
import joblib
import httpx
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.db import (
    create_user,
    get_or_create_google_user,
    get_user_by_email,
    get_user_by_id,
    log_prediction,
    get_all_employees_with_tasks,
    get_tasks_by_employee_id,
    get_all_tasks,
    get_task_by_id,
    assign_task_employee,
    create_employee,
    update_task,
    delete_task,
    update_employee,
    delete_employee,
)
from src.preprocessing import get_feature_names, normalize_customer_features
from src.calibrated_model import CalibratedXGBClassifier


# Security Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
if not JWT_SECRET:
    raise RuntimeError(
        "CRITICAL SECURITY ERROR: 'JWT_SECRET' environment variable is not set. "
        "A strong, non-guessable secret key is required for signing session tokens. "
        "Set JWT_SECRET in your environment variables (generate one via python -c 'import secrets; print(secrets.token_urlsafe(32))')."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

# Globals for ML Artifacts
model_pipeline = None
tree_explainer = None
transformed_feature_names = []
clean_feature_names = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager: loads pipeline and initializes SHAP explainer on startup.
    """
    global model_pipeline, tree_explainer, transformed_feature_names, clean_feature_names

    pipeline_path = WORKSPACE_ROOT / "models" / "churn_pipeline.pkl"
    if not pipeline_path.exists():
        raise RuntimeError(f"Pipeline artifact not found at {pipeline_path}. Run src/train.py first.")

    print(f"Loading churn pipeline from {pipeline_path}...")
    model_pipeline = joblib.load(pipeline_path)

    preprocessor = model_pipeline.named_steps["preprocessor"]
    xgb_classifier = model_pipeline.named_steps["classifier"]

    transformed_feature_names = get_feature_names(preprocessor)
    clean_feature_names = [
        fn.replace("num__", "").replace("cat__", "").replace("pass__", "")
        for fn in transformed_feature_names
    ]

    print("Initializing SHAP TreeExplainer...")
    tree_explainer = shap.TreeExplainer(xgb_classifier)
    print("Startup complete: Model, SHAP Explainer, and Auth Services ready.")

    yield

    print("Shutting down API server...")


app = FastAPI(
    title="Customer Churn Predictor & Auth API",
    description="Full-stack ML inference API with JWT httpOnly authentication and SHAP explainability",
    version="2.0.0",
    lifespan=lifespan,
)

# Explicit allowed origins required for CORS when allow_credentials=True
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", os.getenv("CORS_ORIGINS", ""))
parsed_origins = [o.strip().rstrip("/") for o in allowed_origins_env.split(",") if o.strip()]

ALLOWED_ORIGINS = list(dict.fromkeys([
    "https://churnpredictor-roan.vercel.app",
    "https://churnpredictor.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
] + parsed_origins))

# Strict origin regex allowing ONLY churnpredictor Vercel deployments (production & branch previews)
ALLOWED_ORIGIN_REGEX = r"^https://churnpredictor(-[a-zA-Z0-9_-]+)?\.vercel\.app$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiter Configuration (5 requests / minute per client IP on sensitive auth endpoints)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": "Too many attempts. For security reasons, authentication requests are limited to 5 per minute. Please wait a moment and try again."
        },
        headers={"Retry-After": "60"},
    )


# ==============================================================================
# Auth Schemas & Helper Utilities
# ==============================================================================

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=8, max_length=100)


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    id_token: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_google_auth: Optional[int] = 0
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


def hash_password(password: str) -> str:
    """Hashes plain text password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against bcrypt hash."""
    if not hashed_password or not hashed_password.startswith("$2"):
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_jwt_token(user_id: int, email: str) -> str:
    """Generates signed JWT token with expiration."""
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


COOKIE_SECURE = (
    os.getenv("COOKIE_SECURE", "").lower() == "true"
    or os.getenv("ENVIRONMENT", "").lower() in ["production", "prod"]
    or bool(os.getenv("RAILWAY_ENVIRONMENT"))
    or bool(os.getenv("RENDER"))
    or bool(os.getenv("ALLOWED_ORIGINS"))
)
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"


def set_auth_cookie(response: Response, token: str):
    """Sets secure httpOnly cookie on response. Uses SameSite=None and Secure=True in production for cross-site auth."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        max_age=JWT_EXPIRE_HOURS * 3600,
        path="/",
        secure=COOKIE_SECURE,
    )


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Dependency that verifies authentication via httpOnly cookie or Authorization header.
    Returns user record if valid; raises 401 Unauthorized if missing/invalid.
    """
    token = request.cookies.get("access_token")

    # Fallback to Authorization: Bearer header
    if not token and "Authorization" in request.headers:
        auth_header = request.headers["Authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
        )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again.",
        )

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )

    return user


# ==============================================================================
# Authentication Endpoints
# ==============================================================================

@app.post("/auth/signup", response_model=UserResponse)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest, response: Response):
    """
    Registers a new user account:
    - Validates email and minimum password length
    - Hashes password with bcrypt before storage
    - Issues JWT and sets httpOnly cookie
    """
    clean_email = body.email.strip().lower()
    if "@" not in clean_email or "." not in clean_email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    if not re.search(r"[a-zA-Z]", body.password) or not re.search(r"\d", body.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter and at least one number.",
        )

    existing = get_user_by_email(clean_email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    hashed = hash_password(body.password)
    user = create_user(name=body.name.strip(), email=clean_email, hashed_password=hashed)

    token = create_jwt_token(user["id"], user["email"])
    set_auth_cookie(response, token)

    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        is_google_auth=user.get("is_google_auth", 0),
        avatar_url=user.get("avatar_url"),
        created_at=user.get("created_at"),
    )


@app.post("/auth/login", response_model=UserResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, response: Response):
    """
    Authenticates an existing user:
    - Compares password against bcrypt hash
    - Sets session in httpOnly cookie
    """
    clean_email = body.email.strip().lower()
    user = get_user_by_email(clean_email)

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_jwt_token(user["id"], user["email"])
    set_auth_cookie(response, token)

    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        is_google_auth=user.get("is_google_auth", 0),
        avatar_url=user.get("avatar_url"),
        created_at=user.get("created_at"),
    )


@app.post("/auth/google", response_model=UserResponse)
async def google_auth(body: GoogleAuthRequest, response: Response):
    """
    Cryptographic Google OAuth 2.0 / OpenID Connect ID Token Verification:
    1. Verifies the ID token signature against Google's public RSA keys.
    2. Validates audience matches configured GOOGLE_CLIENT_ID if set.
    3. Confirms issuer is accounts.google.com or https://accounts.google.com.
    4. Validates token expiration (exp).
    5. Confirms email_verified is true.
    6. Extracts verified email, name, and avatar from Google's token payload.
    7. Persists/retrieves user record and issues secure httpOnly JWT session cookie.
    
    Zero mock/fallback: never trusts unverified or simulated credentials.
    """
    raw_token = body.credential or body.id_token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token is required. Missing 'credential' or 'id_token' in request body.",
        )

    try:
        request_adapter = google_requests.Request()
        target_audience = (
            GOOGLE_CLIENT_ID
            if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID not in ["YOUR_GOOGLE_CLIENT_ID_HERE", ""]
            else None
        )

        id_info = google_id_token.verify_oauth2_token(
            raw_token,
            request_adapter,
            audience=target_audience,
            clock_skew_in_seconds=10,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google ID token signature verification failed: {str(val_err)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {str(exc)}",
        )

    # Confirm issuer is Google
    issuer = id_info.get("iss")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Untrusted token issuer: '{issuer}'. Must be 'accounts.google.com'.",
        )

    # Confirm email is verified by Google
    email_verified = id_info.get("email_verified", False)
    user_email = id_info.get("email")
    if not user_email or not email_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email is not verified or missing in token claims.",
        )

    clean_email = user_email.strip().lower()
    user_name = id_info.get("name") or id_info.get("given_name") or clean_email.split("@")[0].capitalize()
    user_avatar = id_info.get("picture")

    user = get_or_create_google_user(email=clean_email, name=user_name, avatar_url=user_avatar)

    token = create_jwt_token(user["id"], user["email"])
    set_auth_cookie(response, token)

    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        is_google_auth=user.get("is_google_auth", 1),
        avatar_url=user.get("avatar_url"),
        created_at=user.get("created_at"),
    )


@app.post("/auth/logout")
async def logout(response: Response):
    """
    Clears the session cookie.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
    )
    return {"message": "Logged out successfully"}


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns current authenticated user details.
    """
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        is_google_auth=current_user.get("is_google_auth", 0),
        avatar_url=current_user.get("avatar_url"),
        created_at=current_user.get("created_at"),
    )


# ==============================================================================
# Prediction & Inference Endpoints (PROTECTED)
# ==============================================================================

class CustomerInput(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    # Legacy Telco fields
    gender: Optional[str] = None
    SeniorCitizen: Optional[int] = None
    Partner: Optional[str] = None
    Dependents: Optional[str] = None
    tenure: Optional[float] = None
    InternetService: Optional[str] = None
    OnlineSecurity: Optional[str] = None
    TechSupport: Optional[str] = None
    Contract: Optional[str] = None
    PaperlessBilling: Optional[str] = None
    PaymentMethod: Optional[str] = None
    MonthlyCharges: Optional[float] = None
    TotalCharges: Optional[float] = None

    # Official Kaggle Dataset fields
    Age: Optional[float] = None
    Gender: Optional[str] = None
    Tenure: Optional[float] = None
    Usage_Frequency: Optional[float] = Field(default=None, alias="Usage Frequency")
    Support_Calls: Optional[float] = Field(default=None, alias="Support Calls")
    Payment_Delay: Optional[float] = Field(default=None, alias="Payment Delay")
    Subscription_Type: Optional[str] = Field(default=None, alias="Subscription Type")
    Contract_Length: Optional[str] = Field(default=None, alias="Contract Length")
    Total_Spend: Optional[float] = Field(default=None, alias="Total Spend")
    Last_Interaction: Optional[float] = Field(default=None, alias="Last Interaction")


class RiskFactor(BaseModel):
    feature: str
    raw_feature: str
    shap_value: float
    effect: str


class PredictionResponse(BaseModel):
    churn_probability: float
    risk_level: str
    top_factors: List[RiskFactor]
    timestamp: str
    logged_to_db: bool


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "model_loaded": model_pipeline is not None,
        "features_count": len(clean_feature_names),
        "auth_enabled": True,
    }


def compute_local_shap(input_df: pd.DataFrame, top_n: int = 5) -> List[RiskFactor]:
    """Computes local SHAP attributions."""
    preprocessor = model_pipeline.named_steps["preprocessor"]
    X_trans = preprocessor.transform(input_df)

    shap_output = tree_explainer(X_trans)
    vals = shap_output.values

    if vals.ndim == 3:
        vals = vals[0, :, 1]
    elif vals.ndim == 2:
        vals = vals[0, :]

    abs_vals = np.abs(vals)
    sorted_indices = np.argsort(abs_vals)[::-1][:top_n]

    factors = []
    for idx in sorted_indices:
        val = float(vals[idx])
        factors.append(
            RiskFactor(
                feature=clean_feature_names[idx],
                raw_feature=transformed_feature_names[idx],
                shap_value=round(val, 4),
                effect="Increases Churn Risk" if val > 0 else "Decreases Churn Risk",
            )
        )
    return factors


def async_db_log(payload: Dict[str, Any], prob: float, factors: List[Dict[str, Any]], user_id: int):
    """Background logger with user association."""
    try:
        payload_with_user = {**payload, "user_id": user_id}
        log_prediction(payload_with_user, prob, factors)
    except Exception as exc:
        print(f"Async DB logging warning: {exc}")


@app.post("/predict", response_model=PredictionResponse)
async def predict_churn(
    customer: CustomerInput,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    PROTECTED Endpoint: Requires active authenticated user session.
    1. Runs ML inference with XGBoost pipeline.
    2. Calculates local SHAP explainability.
    3. Asynchronously logs prediction linked to user session.
    """
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")

    cust_dict = customer.model_dump()
    input_df = normalize_customer_features(cust_dict)

    try:
        proba = float(model_pipeline.predict_proba(input_df)[0, 1])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Inference error: {exc}")

    if proba >= 0.65:
        risk_level = "High"
    elif proba >= 0.30:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    try:
        top_factors = compute_local_shap(input_df, top_n=5)
    except Exception as exc:
        print(f"SHAP explanation fallback: {exc}")
        top_factors = []

    factors_dump = [f.model_dump() for f in top_factors]
    background_tasks.add_task(async_db_log, cust_dict, proba, factors_dump, current_user["id"])

    return PredictionResponse(
        churn_probability=round(proba, 4),
        risk_level=risk_level,
        top_factors=top_factors,
        timestamp=datetime.now(timezone.utc).isoformat(),
        logged_to_db=True,
    )


# ==============================================================================
# Employee & Task Management Endpoints
# ==============================================================================

class CreateEmployeeRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    job_title: Optional[str] = None
    department: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = None
    avatar_initials: Optional[str] = None
    assigned_tasks: Optional[int] = 0
    initial_tasks: Optional[int] = 0


class UpdateEmployeeRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None


class AssignEmployeeRequest(BaseModel):
    employee_id: Optional[int] = None


@app.get("/employees")
def list_employees(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns list of all employees (both seeded and manual) and their active tasks.
    PROTECTED: Requires authenticated user session.
    """
    return get_all_employees_with_tasks()


@app.post("/employees", status_code=status.HTTP_201_CREATED)
def create_new_employee(
    body: CreateEmployeeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Manually creates a new company employee record in the database.
    Accepts JSON payload: { name/full_name, role/job_title, department, email, initial_tasks }
    """
    employee_name = body.full_name or body.name
    if not employee_name or len(employee_name.strip()) < 2:
        raise HTTPException(status_code=422, detail="Employee name must be at least 2 characters.")

    employee_role = body.job_title or body.role
    if not employee_role or len(employee_role.strip()) < 2:
        raise HTTPException(status_code=422, detail="Job title/role must be at least 2 characters.")

    task_count = body.initial_tasks or body.assigned_tasks or 0

    try:
        new_emp = create_employee(
            name=employee_name.strip(),
            role=employee_role.strip(),
            department=body.department.strip(),
            email=body.email.strip() if body.email else None,
            avatar_initials=body.avatar_initials,
            initial_tasks=task_count,
        )
        return new_emp
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create employee: {exc}")


class CreateCustomerTaskRequest(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)
    customer_name: str = Field(..., min_length=2, max_length=200)
    Contract: Optional[str] = "Month-to-month"
    tenure: Optional[float] = Field(default=12.0, ge=0, le=120)
    MonthlyCharges: Optional[float] = Field(default=75.50, ge=0)
    TotalCharges: Optional[float] = None
    PaperlessBilling: Optional[str] = "Yes"
    PaymentMethod: Optional[str] = "Electronic check"
    InternetService: Optional[str] = "Fiber optic"
    OnlineSecurity: Optional[str] = "No"
    TechSupport: Optional[str] = "No"
    gender: Optional[str] = "Female"
    SeniorCitizen: Optional[int] = 0
    Partner: Optional[str] = "No"
    Dependents: Optional[str] = "No"
    employee_id: Optional[int] = None


class UpdateCustomerTaskRequest(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)
    customer_name: Optional[str] = None
    Contract: Optional[str] = None
    tenure: Optional[float] = None
    MonthlyCharges: Optional[float] = None
    TotalCharges: Optional[float] = None
    PaperlessBilling: Optional[str] = None
    PaymentMethod: Optional[str] = None
    InternetService: Optional[str] = None
    OnlineSecurity: Optional[str] = None
    TechSupport: Optional[str] = None
    gender: Optional[str] = None
    SeniorCitizen: Optional[int] = None
    Partner: Optional[str] = None
    Dependents: Optional[str] = None
    employee_id: Optional[int] = None


@app.get("/tasks")
def list_all_tasks_queue(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns all customer evaluation tasks across the organization for the Task Queue.
    PROTECTED: Requires authenticated user session.
    """
    return get_all_tasks()


@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_customer_task(
    body: CreateCustomerTaskRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Creates a new customer account, computes real-time churn prediction & SHAP factors,
    and persists the evaluation task directly to the database.
    PROTECTED: Requires authenticated user session.
    """
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")

    cust_dict = body.model_dump()
    input_df = normalize_customer_features(cust_dict)

    try:
        proba = float(model_pipeline.predict_proba(input_df)[0, 1])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Inference error: {exc}")

    try:
        top_factors = compute_local_shap(input_df, top_n=5)
    except Exception as exc:
        print(f"SHAP explanation fallback: {exc}")
        top_factors = []

    factors_dump = [f.model_dump() for f in top_factors]

    try:
        log_res = log_prediction(
            input_features=cust_dict,
            churn_probability=proba,
            top_factors=factors_dump,
            employee_id=body.employee_id,
        )
        new_task_id = log_res.get("id")
        created_task = get_task_by_id(new_task_id)
        if not created_task:
            return {
                "id": new_task_id,
                "customer_name": body.customer_name,
                "contract": body.Contract,
                "tenure": body.tenure,
                "monthly_charges": body.MonthlyCharges,
                "churn_probability": round(proba, 4),
                "risk_level": log_res.get("risk_level", "Moderate"),
                "top_factors": factors_dump,
                "status": "pending",
                "employee_id": body.employee_id,
            }
        return created_task
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to persist task: {exc}")


@app.get("/tasks/detail/{task_id}")
def get_task_details(
    task_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Returns details of a single task for the dedicated Churn Analysis window.
    PROTECTED: Requires authenticated user session.
    """
    task = get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task #{task_id} not found.")
    return task


@app.get("/tasks/{employee_id}")
def list_tasks_for_employee(
    employee_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Returns list of customers assigned to a specific employee for churn evaluation.
    PROTECTED: Requires authenticated user session.
    """
    return get_tasks_by_employee_id(employee_id)


@app.put("/tasks/{task_id}/assign")
def assign_employee_to_task(
    task_id: int,
    body: AssignEmployeeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Assigns an employee to a specific task.
    PROTECTED: Requires authenticated user session.
    Accepts employee_id (or null to unassign).
    """
    updated_task = assign_task_employee(task_id, body.employee_id)
    if not updated_task:
        raise HTTPException(status_code=404, detail=f"Task #{task_id} not found.")
    return {
        "status": "success",
        "message": f"Task #{task_id} successfully assigned to employee #{body.employee_id}",
        "task": updated_task,
    }


@app.put("/tasks/{task_id}")
def update_customer_task_endpoint(
    task_id: int,
    body: UpdateCustomerTaskRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Updates an existing customer task.
    If inference-relevant features changed (Contract, tenure, MonthlyCharges,
    PaperlessBilling, PaymentMethod, InternetService), dynamically re-evaluates
    churn probability and local SHAP explanations using the XGBoost pipeline.
    """
    existing_task = get_task_by_id(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail=f"Task #{task_id} not found.")

    existing_features = existing_task.get("input_features") or {}
    updated_dict = body.model_dump(exclude_unset=True)

    # Build merged feature set
    merged_features = dict(existing_features)
    for field in [
        "Contract", "tenure", "MonthlyCharges", "TotalCharges", "PaperlessBilling",
        "PaymentMethod", "InternetService", "OnlineSecurity", "TechSupport",
        "gender", "SeniorCitizen", "Partner", "Dependents",
    ]:
        if field in updated_dict and updated_dict[field] is not None:
            merged_features[field] = updated_dict[field]

    cust_name = updated_dict.get("customer_name") or existing_task.get("customer_name", "Enterprise Customer")
    merged_features["customer_name"] = cust_name

    recalc_fields = [
        "Contract", "tenure", "MonthlyCharges", "TotalCharges", "PaperlessBilling",
        "PaymentMethod", "InternetService", "Age", "Gender", "Tenure", "Usage Frequency",
        "Support Calls", "Payment Delay", "Subscription Type", "Contract Length", "Total Spend", "Last Interaction"
    ]
    needs_recalc = any(f in updated_dict for f in recalc_fields)

    prob = existing_task.get("churn_probability", 0.5)
    risk_level = existing_task.get("risk_level", "Moderate")
    top_factors = existing_task.get("top_factors", [])

    if needs_recalc and model_pipeline is not None:
        input_df = normalize_customer_features(merged_features)
        try:
            prob = float(model_pipeline.predict_proba(input_df)[0, 1])
            prob = round(prob, 4)
            risk_level = "High" if prob >= 0.65 else "Moderate" if prob >= 0.30 else "Low"
        except Exception as exc:
            logger.warning(f"Re-inference failed during task update ({exc}); preserving existing probability.")

        try:
            shap_factors = compute_local_shap(input_df, top_n=5)
            top_factors = [f.model_dump() for f in shap_factors]
        except Exception as exc:
            logger.warning(f"SHAP recalculation failed ({exc}); preserving existing factors.")

    updates = {
        "customer_name": cust_name,
        "contract": merged_features.get("Contract", existing_task.get("contract", "Month-to-month")),
        "tenure": int(merged_features.get("tenure", existing_task.get("tenure", 1))),
        "monthly_charges": float(merged_features.get("MonthlyCharges", existing_task.get("monthly_charges", 0.0))),
        "churn_probability": prob,
        "risk_level": risk_level,
        "input_features": merged_features,
        "top_factors": top_factors,
    }

    if "employee_id" in updated_dict:
        updates["employee_id"] = updated_dict["employee_id"]

    updated_task = update_task(task_id, updates)
    if not updated_task:
        raise HTTPException(status_code=500, detail=f"Failed to update Task #{task_id}.")

    return {
        "status": "success",
        "message": f"Task #{task_id} successfully updated.",
        "task": updated_task,
    }


@app.delete("/tasks/{task_id}")
def delete_customer_task_endpoint(
    task_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Permanently deletes a customer task from SQLite and Supabase.
    PROTECTED: Requires authenticated user session.
    """
    existing_task = get_task_by_id(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail=f"Task #{task_id} not found.")

    deleted = delete_task(task_id)
    if not deleted:
        raise HTTPException(status_code=500, detail=f"Failed to delete Task #{task_id}.")

    return {
        "status": "success",
        "message": f"Customer task #{task_id} ('{existing_task.get('customer_name')}') successfully deleted.",
        "id": task_id,
    }


@app.put("/employees/{employee_id}")
def update_employee_endpoint(
    employee_id: int,
    body: UpdateEmployeeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Updates specialist details in the Employee Roster.
    PROTECTED: Requires authenticated user session.
    """
    all_emps = get_all_employees_with_tasks()
    existing = next((e for e in all_emps if e["id"] == employee_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Employee #{employee_id} not found.")

    updates = body.model_dump(exclude_unset=True)
    updated = update_employee(employee_id, updates)
    if not updated:
        raise HTTPException(status_code=500, detail=f"Failed to update employee #{employee_id}.")

    return {
        "status": "success",
        "message": f"Specialist #{employee_id} successfully updated.",
        "employee": updated,
    }


@app.delete("/employees/{employee_id}")
def delete_employee_endpoint(
    employee_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Deletes an employee from the roster.
    Safely unassigns any active customer tasks linked to this employee first,
    returning them to the unassigned queue.
    """
    all_emps = get_all_employees_with_tasks()
    existing = next((e for e in all_emps if e["id"] == employee_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Employee #{employee_id} not found.")

    deleted, unassigned_count = delete_employee(employee_id)
    if not deleted:
        raise HTTPException(status_code=500, detail=f"Failed to delete employee #{employee_id}.")

    emp_name = existing.get("full_name") or existing.get("name") or f"Specialist #{employee_id}"
    return {
        "status": "success",
        "message": f"Specialist '{emp_name}' removed. {unassigned_count} tasks unassigned.",
        "unassigned_tasks": unassigned_count,
        "id": employee_id,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

