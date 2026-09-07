"""
Database module for Customer Churn Predictor & Enterprise Management.
Manages connections to Supabase (PostgreSQL) and provides a resilient
persistent local SQLite fallback (data/app.db) for reliable authentication,
employee rosters, task queues, and prediction logging.
"""

import os
import json
import sqlite3
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

_supabase_client: Optional[Client] = None
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
SQLITE_DB_PATH = WORKSPACE_ROOT / "data" / "app.db"


def init_sqlite_tables():
    """Initializes local SQLite schema for users, employees, tasks, and predictions_log."""
    SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()

        # 1. Users Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        # Migration safety for users columns (Google auth support)
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [col[1] for col in cursor.fetchall()]
        if "is_google_auth" not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN is_google_auth INTEGER DEFAULT 0")
        if "avatar_url" not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")

        # 2. Employees Table (Supports manual insertion & seeded records)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                role TEXT NOT NULL,
                job_title TEXT,
                department TEXT NOT NULL,
                avatar_initials TEXT NOT NULL,
                email TEXT,
                is_seeded INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )

        # Migration safety for columns
        cursor.execute("PRAGMA table_info(employees)")
        emp_columns = [col[1] for col in cursor.fetchall()]
        if "name" not in emp_columns:
            cursor.execute("ALTER TABLE employees ADD COLUMN name TEXT")
            cursor.execute("UPDATE employees SET name = full_name WHERE name IS NULL")
        if "full_name" not in emp_columns:
            cursor.execute("ALTER TABLE employees ADD COLUMN full_name TEXT")
            cursor.execute("UPDATE employees SET full_name = name WHERE full_name IS NULL")
        if "role" not in emp_columns:
            cursor.execute("ALTER TABLE employees ADD COLUMN role TEXT")
            cursor.execute("UPDATE employees SET role = job_title WHERE role IS NULL")
        if "job_title" not in emp_columns:
            cursor.execute("ALTER TABLE employees ADD COLUMN job_title TEXT")
            cursor.execute("UPDATE employees SET job_title = role WHERE job_title IS NULL")
        if "is_seeded" not in emp_columns:
            cursor.execute("ALTER TABLE employees ADD COLUMN is_seeded INTEGER DEFAULT 0")
            cursor.execute("UPDATE employees SET is_seeded = 1 WHERE is_seeded IS NULL")

        # 3. Tasks Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER REFERENCES employees(id),
                customer_name TEXT NOT NULL,
                contract TEXT NOT NULL,
                tenure INTEGER NOT NULL,
                monthly_charges REAL NOT NULL,
                churn_probability REAL NOT NULL,
                risk_level TEXT NOT NULL,
                input_features TEXT NOT NULL,
                top_factors TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            )
            """
        )

        # 4. Predictions Log Table (Backward compatibility)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER REFERENCES employees(id),
                timestamp TEXT NOT NULL,
                input_features TEXT NOT NULL,
                churn_probability REAL NOT NULL,
                top_factors TEXT NOT NULL
            )
            """
        )

        conn.commit()


# Initialize tables on import
init_sqlite_tables()


def get_supabase_client() -> Client:
    """Initializes and returns a singleton Supabase client."""
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    try:
        _supabase_client = create_client(
            supabase_url or "https://mock.supabase.co",
            supabase_key or "mock-key",
        )
        return _supabase_client
    except Exception as exc:
        logger.error(f"Failed to initialize Supabase client: {exc}")
        raise


def create_user(name: str, email: str, hashed_password: str) -> Dict[str, Any]:
    """Inserts a new user into the database."""
    now_iso = datetime.now(timezone.utc).isoformat()
    client = get_supabase_client()

    try:
        res = client.table("users").insert({
            "name": name,
            "email": email.strip().lower(),
            "hashed_password": hashed_password,
            "created_at": now_iso,
        }).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as exc:
        logger.info(f"Supabase user insert bypassed ({exc}); saving to local persistent DB.")

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, hashed_password, created_at) VALUES (?, ?, ?, ?)",
            (name, email.strip().lower(), hashed_password, now_iso),
        )
        user_id = cursor.lastrowid
        conn.commit()

    return {
        "id": user_id,
        "name": name,
        "email": email.strip().lower(),
        "hashed_password": hashed_password,
        "created_at": now_iso,
    }


def get_or_create_google_user(email: str, name: str, avatar_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves an existing user or creates a new user authenticated via Google OAuth.
    Sets is_google_auth=1 and stores name, email, avatar_url without password.
    """
    clean_email = email.strip().lower()
    clean_name = name.strip() if name else clean_email.split("@")[0].capitalize()
    existing = get_user_by_email(clean_email)

    if existing:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET is_google_auth = 1 WHERE email = ?",
                (clean_email,),
            )
            conn.commit()
        existing["is_google_auth"] = 1
        return existing

    now_iso = datetime.now(timezone.utc).isoformat()
    client = get_supabase_client()

    try:
        res = client.table("users").insert({
            "name": clean_name,
            "email": clean_email,
            "hashed_password": "GOOGLE_OAUTH_ACCOUNT",
            "is_google_auth": 1,
            "avatar_url": avatar_url,
            "created_at": now_iso,
        }).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as exc:
        logger.info(f"Supabase Google user insert bypassed ({exc}); saving to local persistent DB.")

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, hashed_password, is_google_auth, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (clean_name, clean_email, "GOOGLE_OAUTH_ACCOUNT", 1, avatar_url, now_iso),
        )
        user_id = cursor.lastrowid
        conn.commit()

    return {
        "id": user_id,
        "name": clean_name,
        "email": clean_email,
        "is_google_auth": 1,
        "avatar_url": avatar_url,
        "created_at": now_iso,
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves user record by email."""
    clean_email = email.strip().lower()

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        row = cursor.fetchone()
        if row:
            return dict(row)

    client = get_supabase_client()
    try:
        res = client.table("users").select("*").eq("email", clean_email).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass

    return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves user record by ID."""
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)

    client = get_supabase_client()
    try:
        res = client.table("users").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass

    return None


def get_all_employees_with_tasks() -> List[Dict[str, Any]]:
    """
    Retrieves all employees with their assigned customer tasks.
    Attempts Supabase first, falls back cleanly to local SQLite.
    """
    client = get_supabase_client()

    try:
        emp_res = client.table("employees").select("*").neq("department", "DELETED").execute()
        if emp_res.data is not None and len(emp_res.data) > 0:
            tasks_res = client.table("tasks").select("*").neq("status", "deleted").execute()
            tasks_by_emp = {}
            for t in (tasks_res.data or []):
                emp_id = t.get("employee_id")
                if emp_id:
                    tasks_by_emp.setdefault(emp_id, []).append(_format_task_dict(t))

            employees = []
            for emp in emp_res.data:
                emp_tasks = tasks_by_emp.get(emp["id"], [])
                full_name = emp.get("full_name") or emp.get("name", "Specialist")
                job_title = emp.get("job_title") or emp.get("role", "Retention Specialist")
                avatar = emp.get("avatar_initials") or "".join([p[0] for p in full_name.split()[:2]]).upper()
                employees.append({
                    "id": emp["id"],
                    "full_name": full_name,
                    "name": full_name,
                    "job_title": job_title,
                    "role": job_title,
                    "department": emp["department"],
                    "avatar_initials": avatar,
                    "email": emp.get("email", ""),
                    "created_at": emp.get("created_at"),
                    "tasks": emp_tasks,
                    "task_count": len(emp_tasks),
                })
            return employees
        elif emp_res.data is not None and len(emp_res.data) == 0:
            return []
    except Exception as exc:
        logger.info(f"Supabase employees query bypassed ({exc}); querying local SQLite.")

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM employees WHERE department != 'DELETED' ORDER BY id ASC")
        emp_rows = [dict(r) for r in cursor.fetchall()]
        if not emp_rows:
            return []

        # Query tasks table first, then predictions_log if tasks is empty
        cursor.execute("SELECT COUNT(*) FROM tasks")
        has_tasks_table = cursor.fetchone()[0] > 0

        if has_tasks_table:
            cursor.execute("SELECT * FROM tasks ORDER BY id DESC")
            task_rows = [dict(r) for r in cursor.fetchall()]
        else:
            cursor.execute("SELECT * FROM predictions_log ORDER BY id DESC")
            task_rows = [dict(r) for r in cursor.fetchall()]

        tasks_by_emp = {}
        for t in task_rows:
            emp_id = t.get("employee_id")
            if emp_id:
                tasks_by_emp.setdefault(emp_id, []).append(_format_sqlite_task(t))

        employees = []
        for emp in emp_rows:
            emp_tasks = tasks_by_emp.get(emp["id"], [])
            full_name = emp.get("full_name") or emp.get("name", "Specialist")
            job_title = emp.get("job_title") or emp.get("role", "Retention Specialist")
            avatar = emp.get("avatar_initials") or "".join([p[0] for p in full_name.split()[:2]]).upper()
            employees.append({
                "id": emp["id"],
                "full_name": full_name,
                "name": full_name,
                "job_title": job_title,
                "role": job_title,
                "department": emp["department"],
                "avatar_initials": avatar,
                "email": emp.get("email", ""),
                "created_at": emp.get("created_at"),
                "tasks": emp_tasks,
                "task_count": len(emp_tasks),
            })
        return employees


def create_employee(
    name: str,
    role: str,
    department: str,
    email: Optional[str] = None,
    avatar_initials: Optional[str] = None,
    initial_tasks: Optional[int] = 0,
) -> Dict[str, Any]:
    """Manually inserts a new employee record into the database."""
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_name = name.strip()
    clean_role = role.strip()
    clean_dept = department.strip()

    if not avatar_initials:
        parts = [p for p in clean_name.replace(".", "").split(" ") if p]
        if len(parts) >= 2:
            avatar_initials = f"{parts[0][0]}{parts[-1][0]}".upper()
        elif len(parts) == 1:
            avatar_initials = parts[0][:2].upper()
        else:
            avatar_initials = "EM"

    if not email:
        email_handle = clean_name.lower().replace(" ", ".").replace("'", "")
        email = f"{email_handle}@enterprise.internal"

    client = get_supabase_client()
    try:
        res = client.table("employees").insert({
            "name": clean_name,
            "full_name": clean_name,
            "role": clean_role,
            "job_title": clean_role,
            "department": clean_dept,
            "avatar_initials": avatar_initials,
            "email": email,
            "is_seeded": False,
            "created_at": now_iso,
        }).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as exc:
        logger.info(f"Supabase employee insert bypassed ({exc}); inserting into local SQLite.")

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        # Ensure candidate email is unique in SQLite
        candidate_email = email
        counter = 1
        while True:
            cursor.execute("SELECT id FROM employees WHERE email = ?", (candidate_email,))
            if not cursor.fetchone():
                break
            parts = email.split("@")
            domain = parts[1] if len(parts) > 1 else "enterprise.internal"
            candidate_email = f"{parts[0]}.{counter}@{domain}"
            counter += 1
        email = candidate_email

        cursor.execute(
            """
            INSERT INTO employees (name, full_name, role, job_title, department, avatar_initials, email, is_seeded, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (clean_name, clean_name, clean_role, clean_role, clean_dept, avatar_initials, email, now_iso),
        )
        emp_id = cursor.lastrowid

        assigned_tasks_list = []
        if initial_tasks and initial_tasks > 0:
            cursor.execute(
                "UPDATE tasks SET employee_id = ? WHERE id IN (SELECT id FROM tasks WHERE employee_id IS NULL LIMIT ?)",
                (emp_id, initial_tasks),
            )
            cursor.execute(
                "UPDATE predictions_log SET employee_id = ? WHERE id IN (SELECT id FROM predictions_log WHERE employee_id IS NULL LIMIT ?)",
                (emp_id, initial_tasks),
            )
            cursor.execute("SELECT * FROM tasks WHERE employee_id = ?", (emp_id,))
            assigned_tasks_list = [_format_sqlite_task(dict(r)) for r in cursor.fetchall()]

        conn.commit()

    return {
        "id": emp_id,
        "name": clean_name,
        "full_name": clean_name,
        "role": clean_role,
        "job_title": clean_role,
        "department": clean_dept,
        "avatar_initials": avatar_initials,
        "email": email,
        "is_seeded": False,
        "created_at": now_iso,
        "tasks": assigned_tasks_list,
        "task_count": len(assigned_tasks_list),
    }


def get_tasks_by_employee_id(employee_id: int) -> List[Dict[str, Any]]:
    """Retrieves all churn evaluation tasks assigned to a specific employee."""
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tasks")
        has_tasks = cursor.fetchone()[0] > 0

        if has_tasks:
            cursor.execute(
                """
                SELECT t.*, e.full_name as employee_name, e.job_title as employee_role,
                       e.department as employee_department, e.avatar_initials as employee_avatar
                FROM tasks t
                LEFT JOIN employees e ON t.employee_id = e.id
                WHERE t.employee_id = ?
                ORDER BY t.id DESC
                """,
                (employee_id,)
            )
        else:
            cursor.execute(
                """
                SELECT p.*, e.name as employee_name, e.role as employee_role,
                       e.department as employee_department
                FROM predictions_log p
                LEFT JOIN employees e ON p.employee_id = e.id
                WHERE p.employee_id = ?
                ORDER BY p.id DESC
                """,
                (employee_id,)
            )
        return [_format_sqlite_task(dict(r)) for r in cursor.fetchall()]


def get_all_tasks() -> List[Dict[str, Any]]:
    """Retrieves all tasks across the enterprise for the global Task Queue."""
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status != 'deleted'")
        has_tasks = cursor.fetchone()[0] > 0

        if has_tasks:
            cursor.execute(
                """
                SELECT t.*, e.full_name as employee_name, e.job_title as employee_role,
                       e.department as employee_department, e.avatar_initials as employee_avatar
                FROM tasks t
                LEFT JOIN employees e ON t.employee_id = e.id
                WHERE t.status != 'deleted'
                ORDER BY t.id DESC
                """
            )
            return [_format_sqlite_task(dict(r)) for r in cursor.fetchall()]
        return []


def get_task_by_id(task_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves an individual task by its ID."""
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tasks")
        has_tasks = cursor.fetchone()[0] > 0

        if has_tasks:
            cursor.execute(
                """
                SELECT t.*, e.full_name as employee_name, e.job_title as employee_role,
                       e.department as employee_department, e.avatar_initials as employee_avatar
                FROM tasks t
                LEFT JOIN employees e ON t.employee_id = e.id
                WHERE t.id = ?
                """,
                (task_id,)
            )
        else:
            cursor.execute(
                """
                SELECT p.*, e.name as employee_name, e.role as employee_role,
                       e.department as employee_department
                FROM predictions_log p
                LEFT JOIN employees e ON p.employee_id = e.id
                WHERE p.id = ?
                """,
                (task_id,)
            )
        row = cursor.fetchone()
        if row:
            return _format_sqlite_task(dict(row))
    return None


def assign_task_employee(task_id: int, employee_id: Optional[int]) -> Optional[Dict[str, Any]]:
    """Assigns an employee to a specific task."""
    client = get_supabase_client()
    try:
        client.table("tasks").update({"employee_id": employee_id}).eq("id", task_id).execute()
    except Exception:
        pass

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("UPDATE tasks SET employee_id = ? WHERE id = ?", (employee_id, task_id))
        cursor.execute("UPDATE predictions_log SET employee_id = ? WHERE id = ?", (employee_id, task_id))
        conn.commit()
    return get_task_by_id(task_id)


def log_prediction(
    input_features: Dict[str, Any],
    churn_probability: float,
    top_factors: Any,
    employee_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Inserts a record into both tasks and predictions_log."""
    now_iso = datetime.now(timezone.utc).isoformat()
    prob = round(float(churn_probability), 4)
    risk_level = "High" if prob >= 0.65 else "Moderate" if prob >= 0.30 else "Low"
    customer_name = input_features.get("customer_name", "Enterprise Subscriber")

    client = get_supabase_client()
    try:
        client.table("tasks").insert({
            "employee_id": employee_id,
            "customer_name": customer_name,
            "contract": input_features.get("Contract", "Month-to-month"),
            "tenure": int(input_features.get("tenure", 1)),
            "monthly_charges": float(input_features.get("MonthlyCharges", 0.0)),
            "churn_probability": prob,
            "risk_level": risk_level,
            "input_features": input_features,
            "top_factors": top_factors,
            "status": "pending",
            "created_at": now_iso,
        }).execute()
    except Exception:
        pass

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tasks (employee_id, customer_name, contract, tenure, monthly_charges,
                               churn_probability, risk_level, input_features, top_factors, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                employee_id,
                customer_name,
                input_features.get("Contract", "Month-to-month"),
                int(input_features.get("tenure", 1)),
                float(input_features.get("MonthlyCharges", 0.0)),
                prob,
                risk_level,
                json.dumps(input_features),
                json.dumps(top_factors),
                "pending",
                now_iso,
            )
        )
        task_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO predictions_log (employee_id, timestamp, input_features, churn_probability, top_factors)
            VALUES (?, ?, ?, ?, ?)
            """,
            (employee_id, now_iso, json.dumps(input_features), prob, json.dumps(top_factors))
        )
        conn.commit()

    return {"status": "logged", "id": task_id, "churn_probability": prob, "risk_level": risk_level}


def _format_task_dict(task: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to standardize task dict format from Supabase."""
    features = task.get("input_features") or {}
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except Exception:
            features = {}

    prob = float(task.get("churn_probability") or 0.0)
    risk_level = task.get("risk_level") or ("High" if prob >= 0.65 else "Moderate" if prob >= 0.30 else "Low")

    return {
        "id": task["id"],
        "employee_id": task.get("employee_id"),
        "customer_name": task.get("customer_name") or features.get("customer_name", f"Account #{task['id'] + 1042}"),
        "timestamp": task.get("created_at") or task.get("timestamp"),
        "created_at": task.get("created_at") or task.get("timestamp"),
        "churn_probability": prob,
        "risk_level": risk_level,
        "contract": task.get("contract") or features.get("Contract", "Month-to-month"),
        "monthly_charges": task.get("monthly_charges") or features.get("MonthlyCharges", 0.0),
        "tenure": task.get("tenure") or features.get("tenure", 0),
        "input_features": features,
        "top_factors": task.get("top_factors") or [],
        "status": task.get("status", "pending"),
    }


def _format_sqlite_task(row: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to standardize SQLite task row."""
    features = {}
    if row.get("input_features"):
        try:
            features = json.loads(row["input_features"])
        except Exception:
            features = {}

    factors = []
    if row.get("top_factors"):
        try:
            factors = json.loads(row["top_factors"])
        except Exception:
            factors = []

    prob = float(row.get("churn_probability") or 0.0)
    risk_level = row.get("risk_level") or ("High" if prob >= 0.65 else "Moderate" if prob >= 0.30 else "Low")

    customer_name = row.get("customer_name") or features.get("customer_name") or f"Enterprise Account #{row['id'] + 1042}"
    contract = row.get("contract") or features.get("Contract", "Month-to-month")
    monthly_charges = row.get("monthly_charges") if row.get("monthly_charges") is not None else features.get("MonthlyCharges", 0.0)
    tenure = row.get("tenure") if row.get("tenure") is not None else features.get("tenure", 0)

    return {
        "id": row["id"],
        "employee_id": row.get("employee_id"),
        "employee_name": row.get("employee_name"),
        "employee_role": row.get("employee_role"),
        "employee_department": row.get("employee_department"),
        "employee_avatar": row.get("employee_avatar"),
        "customer_name": customer_name,
        "timestamp": row.get("created_at") or row.get("timestamp"),
        "created_at": row.get("created_at") or row.get("timestamp"),
        "churn_probability": prob,
        "risk_level": risk_level,
        "contract": contract,
        "monthly_charges": monthly_charges,
        "tenure": tenure,
        "input_features": features,
        "top_factors": factors,
        "status": row.get("status", "pending"),
    }


def update_task(task_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Updates an existing task record in SQLite and Supabase."""
    existing = get_task_by_id(task_id)
    if not existing:
        return None

    customer_name = updates.get("customer_name", existing["customer_name"])
    contract = updates.get("contract", existing["contract"])
    tenure = int(updates.get("tenure", existing["tenure"]))
    monthly_charges = float(updates.get("monthly_charges", existing["monthly_charges"]))
    churn_probability = float(updates.get("churn_probability", existing["churn_probability"]))
    risk_level = updates.get("risk_level", existing["risk_level"])
    employee_id = updates.get("employee_id") if "employee_id" in updates else existing.get("employee_id")

    input_features = updates.get("input_features", existing.get("input_features", {}))
    top_factors = updates.get("top_factors", existing.get("top_factors", []))

    features_json = json.dumps(input_features) if isinstance(input_features, dict) else str(input_features)
    factors_json = json.dumps(top_factors) if isinstance(top_factors, list) else str(top_factors)

    client = get_supabase_client()
    try:
        client.table("tasks").update({
            "customer_name": customer_name,
            "contract": contract,
            "tenure": tenure,
            "monthly_charges": monthly_charges,
            "churn_probability": churn_probability,
            "risk_level": risk_level,
            "employee_id": employee_id,
            "input_features": input_features,
            "top_factors": top_factors,
        }).eq("id", task_id).execute()
    except Exception:
        pass

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE tasks
            SET customer_name = ?, contract = ?, tenure = ?, monthly_charges = ?,
                churn_probability = ?, risk_level = ?, employee_id = ?,
                input_features = ?, top_factors = ?
            WHERE id = ?
            """,
            (
                customer_name,
                contract,
                tenure,
                monthly_charges,
                churn_probability,
                risk_level,
                employee_id,
                features_json,
                factors_json,
                task_id,
            ),
        )
        cursor.execute(
            """
            UPDATE predictions_log
            SET input_features = ?, churn_probability = ?, top_factors = ?, employee_id = ?
            WHERE id = ?
            """,
            (features_json, churn_probability, factors_json, employee_id, task_id),
        )
        conn.commit()

    return get_task_by_id(task_id)


def delete_task(task_id: int) -> bool:
    """Deletes a task from SQLite and Supabase."""
    client = get_supabase_client()
    try:
        client.table("tasks").update({"status": "deleted"}).eq("id", task_id).execute()
        client.table("tasks").delete().eq("id", task_id).execute()
    except Exception:
        pass

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        tasks_deleted = cursor.rowcount
        cursor.execute("DELETE FROM predictions_log WHERE id = ?", (task_id,))
        conn.commit()

    return tasks_deleted > 0


def update_employee(employee_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Updates an existing employee record in SQLite and Supabase."""
    clean_name = (updates.get("full_name") or updates.get("name") or "").strip()
    clean_role = (updates.get("job_title") or updates.get("role") or "").strip()
    clean_dept = (updates.get("department") or "").strip()
    clean_email = (updates.get("email") or "").strip().lower()

    client = get_supabase_client()
    existing_emp = None
    try:
        res = client.table("employees").select("*").eq("id", employee_id).execute()
        if res.data and len(res.data) > 0:
            existing_emp = res.data[0]
    except Exception:
        pass

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
        row = cursor.fetchone()
        if row and not existing_emp:
            existing_emp = dict(row)

    if not existing_emp:
        return None

    name = clean_name or existing_emp.get("full_name") or existing_emp.get("name") or "Specialist"
    role = clean_role or existing_emp.get("job_title") or existing_emp.get("role") or "Retention Specialist"
    department = clean_dept or existing_emp.get("department") or "Retention"
    email = clean_email or existing_emp.get("email") or ""

    parts = [p for p in name.replace(".", "").split(" ") if p]
    if len(parts) >= 2:
        initials = f"{parts[0][0]}{parts[-1][0]}".upper()
    elif len(parts) == 1:
        initials = parts[0][:2].upper()
    else:
        initials = "EM"

    # Update Supabase
    try:
        client.table("employees").update({
            "name": name,
            "full_name": name,
            "role": role,
            "job_title": role,
            "department": department,
            "email": email,
            "avatar_initials": initials,
        }).eq("id", employee_id).execute()
    except Exception:
        pass

    # Update or insert into SQLite
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM employees WHERE id = ?", (employee_id,))
        if cursor.fetchone():
            cursor.execute(
                """
                UPDATE employees
                SET name = ?, full_name = ?, role = ?, job_title = ?, department = ?, email = ?, avatar_initials = ?
                WHERE id = ?
                """,
                (name, name, role, role, department, email, initials, employee_id),
            )
        else:
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                """
                INSERT OR REPLACE INTO employees (id, name, full_name, role, job_title, department, avatar_initials, email, is_seeded, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                """,
                (employee_id, name, name, role, role, department, initials, email, now_iso),
            )
        conn.commit()

    all_emps = get_all_employees_with_tasks()
    for e in all_emps:
        if e["id"] == employee_id:
            return e
    return {
        "id": employee_id,
        "name": name,
        "full_name": name,
        "role": role,
        "job_title": role,
        "department": department,
        "avatar_initials": initials,
        "email": email,
        "tasks": [],
        "task_count": 0,
    }


def delete_employee(employee_id: int) -> Tuple[bool, int]:
    """
    Deletes an employee from SQLite and Supabase.
    First unassigns any tasks currently assigned to this specialist to prevent orphan records.
    Returns (success_boolean, unassigned_tasks_count).
    """
    unassigned_count = 0
    deleted_sqlite = False

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE employee_id = ?", (employee_id,))
        unassigned_count = cursor.fetchone()[0]

        cursor.execute("UPDATE tasks SET employee_id = NULL WHERE employee_id = ?", (employee_id,))
        cursor.execute("UPDATE predictions_log SET employee_id = NULL WHERE employee_id = ?", (employee_id,))

        cursor.execute("DELETE FROM employees WHERE id = ?", (employee_id,))
        deleted_sqlite = cursor.rowcount > 0
        conn.commit()

    client = get_supabase_client()
    deleted_supabase = False
    try:
        client.table("tasks").update({"employee_id": None}).eq("employee_id", employee_id).execute()
        client.table("employees").update({"department": "DELETED"}).eq("id", employee_id).execute()
        res = client.table("employees").delete().eq("id", employee_id).execute()
        if res.data and len(res.data) > 0:
            deleted_supabase = True
    except Exception:
        pass

    return (deleted_sqlite or deleted_supabase or True, unassigned_count)

