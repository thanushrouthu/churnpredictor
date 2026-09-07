"""
Data Preprocessing Module for Customer Churn Predictor.
Supports the official Kaggle Customer Churn Dataset (muhammadshahidazeem/customer-churn-dataset).
Includes:
- Loading pre-split training and testing CSVs
- ColumnTransformer with median imputation, scaling, and one-hot encoding
- Input feature normalization bridging between UI fields and Kaggle model schema
"""

import sys
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

# Official Kaggle Dataset Paths
KAGGLE_TRAIN_PATH = WORKSPACE_ROOT / "data" / "customer_churn_dataset-training-master.csv"
KAGGLE_TEST_PATH = WORKSPACE_ROOT / "data" / "customer_churn_dataset-testing-master.csv"

# Real Kaggle Dataset Feature Definitions
NUMERICAL_COLS = [
    "Age",
    "Tenure",
    "Usage Frequency",
    "Support Calls",
    "Payment Delay",
    "Total Spend",
    "Last Interaction",
]

CATEGORICAL_COLS = [
    "Gender",
    "Subscription Type",
    "Contract Length",
]

TARGET_COL = "Churn"
DROP_COLS = ["CustomerID", "customerID"]


def load_kaggle_data(
    train_path: Path = KAGGLE_TRAIN_PATH,
    test_path: Path = KAGGLE_TEST_PATH,
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """
    Loads the real pre-split Kaggle training and testing datasets.
    Drops any corrupted rows with missing values (e.g. 1 corrupted row in raw train CSV).
    Returns X_train, y_train, X_test, y_test.
    """
    if not Path(train_path).exists():
        raise FileNotFoundError(f"Kaggle training CSV not found at {train_path}")
    if not Path(test_path).exists():
        raise FileNotFoundError(f"Kaggle testing CSV not found at {test_path}")

    print(f"Loading Kaggle training set from {train_path}...")
    train_df = pd.read_csv(train_path).dropna()
    print(f"Loading Kaggle testing set from {test_path}...")
    test_df = pd.read_csv(test_path).dropna()

    drop_cols_train = [c for c in DROP_COLS + [TARGET_COL] if c in train_df.columns]
    X_train = train_df.drop(columns=drop_cols_train)
    y_train = train_df[TARGET_COL].astype(int)

    drop_cols_test = [c for c in DROP_COLS + [TARGET_COL] if c in test_df.columns]
    X_test = test_df.drop(columns=drop_cols_test)
    y_test = test_df[TARGET_COL].astype(int)

    print(f"Loaded {len(X_train)} training records and {len(X_test)} testing records.")
    return X_train, y_train, X_test, y_test


def load_data(file_path: str = "data/customer_churn.csv") -> Tuple[pd.DataFrame, pd.Series]:
    """
    Backward-compatible data loader for single CSV files.
    """
    path = Path(file_path)
    if not path.exists():
        # Fall back to kaggle train if legacy CSV missing
        if KAGGLE_TRAIN_PATH.exists():
            path = KAGGLE_TRAIN_PATH
        else:
            raise FileNotFoundError(f"Dataset not found at {path.resolve()}")

    df = pd.read_csv(path).dropna()

    if "TotalCharges" in df.columns:
        df["TotalCharges"] = pd.to_numeric(df["TotalCharges"].astype(str).str.strip(), errors="coerce")

    if TARGET_COL in df.columns:
        y = df[TARGET_COL].astype(str).str.strip().map({"Yes": 1, "No": 0, "1": 1, "0": 0})
        if y.isnull().any():
            y = df[TARGET_COL].astype(int)
    else:
        y = pd.Series([0] * len(df))

    drop_candidates = [col for col in DROP_COLS + [TARGET_COL] if col in df.columns]
    X = df.drop(columns=drop_candidates)
    return X, y


def build_preprocessor(
    num_cols: List[str] = NUMERICAL_COLS,
    cat_cols: List[str] = CATEGORICAL_COLS,
) -> ColumnTransformer:
    """
    Builds a robust scikit-learn ColumnTransformer pipeline for Kaggle features:
    - Numerical: Median Imputation + StandardScaler
    - Categorical: Most Frequent Imputation + OneHotEncoder (handle_unknown='ignore')
    """
    num_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    cat_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, num_cols),
            ("cat", cat_pipeline, cat_cols),
        ],
        remainder="drop",
    )

    return preprocessor


def get_feature_names(preprocessor: ColumnTransformer) -> List[str]:
    """
    Extracts clean transformed feature names from fitted ColumnTransformer.
    """
    try:
        raw_names = list(preprocessor.get_feature_names_out())
        return raw_names
    except Exception:
        num_features = [f"num__{c}" for c in NUMERICAL_COLS]
        try:
            cat_encoder = preprocessor.named_transformers_["cat"].named_steps["onehot"]
            cat_features = list(cat_encoder.get_feature_names_out(CATEGORICAL_COLS))
        except Exception:
            cat_features = [f"cat__{c}" for c in CATEGORICAL_COLS]
        return num_features + cat_features


def normalize_customer_features(cust: Dict[str, Any]) -> pd.DataFrame:
    """
    Bridges between dashboard UI fields and the real Kaggle model schema.
    If Kaggle fields are already provided, uses them directly.
    If UI/Telco fields are provided, maps them accurately.
    """
    # 1. Gender
    gender = cust.get("Gender") or cust.get("gender") or "Female"
    gender = "Female" if str(gender).strip().lower() in ["f", "female"] else "Male"

    # 2. Tenure
    tenure = float(cust.get("Tenure") or cust.get("tenure") or 12.0)

    # 3. Contract Length
    contract_raw = str(cust.get("Contract Length") or cust.get("Contract") or "Annual").strip()
    if "month" in contract_raw.lower():
        contract_len = "Monthly"
    elif "quarter" in contract_raw.lower() or "one" in contract_raw.lower():
        contract_len = "Quarterly"
    else:
        contract_len = "Annual"

    # 4. Subscription Type
    sub_raw = str(cust.get("Subscription Type") or cust.get("InternetService") or "Standard").strip()
    if "fiber" in sub_raw.lower() or "premium" in sub_raw.lower() or "vip" in sub_raw.lower():
        sub_type = "Premium"
    elif "dsl" in sub_raw.lower() or "standard" in sub_raw.lower():
        sub_type = "Standard"
    else:
        sub_type = "Basic"

    # 5. Total Spend
    total_spend = cust.get("Total Spend") or cust.get("TotalCharges")
    if total_spend is None:
        monthly = float(cust.get("MonthlyCharges") or 65.0)
        total_spend = round(tenure * monthly, 2)
    else:
        total_spend = float(total_spend)

    # 6. Age
    if cust.get("Age") is not None:
        age = float(cust["Age"])
    elif cust.get("SeniorCitizen") == 1:
        age = 65.0
    else:
        age = 38.0

    # 7. Usage Frequency
    if cust.get("Usage Frequency") is not None:
        usage_freq = float(cust["Usage Frequency"])
    else:
        usage_freq = 22.0 if sub_type == "Premium" else (15.0 if sub_type == "Standard" else 8.0)

    # 8. Support Calls
    if cust.get("Support Calls") is not None:
        support_calls = float(cust["Support Calls"])
    else:
        # Customers with Month-to-month contracts and no tech support experience more friction
        support_calls = 5.0 if (cust.get("TechSupport") == "No" and contract_len == "Monthly") else 2.0

    # 9. Payment Delay
    if cust.get("Payment Delay") is not None:
        payment_delay = float(cust["Payment Delay"])
    else:
        payment_delay = 14.0 if (cust.get("PaymentMethod") == "Electronic check") else 4.0

    # 10. Last Interaction
    last_interaction = float(cust.get("Last Interaction") or 14.0)

    row = {
        "Age": age,
        "Gender": gender,
        "Tenure": tenure,
        "Usage Frequency": usage_freq,
        "Support Calls": support_calls,
        "Payment Delay": payment_delay,
        "Subscription Type": sub_type,
        "Contract Length": contract_len,
        "Total Spend": total_spend,
        "Last Interaction": last_interaction,
    }
    return pd.DataFrame([row])
