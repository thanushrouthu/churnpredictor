"""
Model Explainability Module for Customer Churn Predictor.
Uses SHAP (SHapley Additive exPlanations) TreeExplainer to:
- Extract top 5 global drivers of customer churn
- Compute local feature attributions for individual customer inference
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple

import joblib
import numpy as np
import pandas as pd
import shap

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from src.preprocessing import KAGGLE_TEST_PATH, get_feature_names, DROP_COLS, TARGET_COL

PIPELINE_PATH = WORKSPACE_ROOT / "models" / "churn_pipeline.pkl"


def get_global_explanations(
    pipeline_path: Path = PIPELINE_PATH,
    data_path: Path = KAGGLE_TEST_PATH,
    top_n: int = 5,
    sample_size: int = 500,
) -> List[Dict[str, Any]]:
    """
    Loads trained pipeline, runs SHAP TreeExplainer on a sample of test data,
    and extracts the top N global drivers of customer churn based on mean absolute SHAP value.
    """
    if not pipeline_path.exists():
        raise FileNotFoundError(f"Pipeline artifact not found at {pipeline_path}. Run src/train.py first.")

    print(f"Loading model pipeline from {pipeline_path}...")
    pipeline = joblib.load(pipeline_path)

    preprocessor = pipeline.named_steps["preprocessor"]
    xgb_model = pipeline.named_steps["classifier"]

    # Extract transformed feature names
    feature_names = get_feature_names(preprocessor)

    # Load dataset sample for background explanation
    print(f"Loading background data sample from {data_path}...")
    test_df = pd.read_csv(data_path).dropna()
    drop_cols = [c for c in DROP_COLS + [TARGET_COL] if c in test_df.columns]
    X_test = test_df.drop(columns=drop_cols)

    sample_df = X_test.head(sample_size)
    X_sample_trans = preprocessor.transform(sample_df)

    print("Running SHAP TreeExplainer on XGBoost model...")
    explainer = shap.TreeExplainer(xgb_model)
    shap_explanation = explainer(X_sample_trans)

    # Extract raw shap values matrix
    if hasattr(shap_explanation, "values"):
        shap_vals = shap_explanation.values
    else:
        shap_vals = np.array(shap_explanation)

    # If binary classification returns 3D array (samples, features, 2), pick positive class
    if shap_vals.ndim == 3:
        shap_vals = shap_vals[:, :, 1]

    # Calculate global importance: mean absolute SHAP value across samples
    mean_abs_shap = np.mean(np.abs(shap_vals), axis=0)

    # Format feature names to clean human-readable strings
    clean_names = []
    for fn in feature_names:
        name = fn.replace("num__", "").replace("cat__", "").replace("pass__", "")
        clean_names.append(name)

    # Sort descending by importance
    sorted_indices = np.argsort(mean_abs_shap)[::-1]

    top_drivers = []
    print("\n" + "=" * 60)
    print(f"       TOP {top_n} GLOBAL DRIVERS OF CUSTOMER CHURN (SHAP)")
    print("=" * 60)
    print(f"  {'Rank':<5} | {'Feature':<35} | {'Mean |SHAP|':<12}")
    print("  " + "-" * 56)

    for rank, idx in enumerate(sorted_indices[:top_n], start=1):
        feature_name = clean_names[idx]
        raw_feature = feature_names[idx]
        importance_score = float(mean_abs_shap[idx])
        driver = {
            "rank": rank,
            "feature": feature_name,
            "raw_feature": raw_feature,
            "mean_abs_shap": round(importance_score, 4),
        }
        top_drivers.append(driver)
        print(f"  #{rank:<4} | {feature_name:<35} | {importance_score:.4f}")

    print("=" * 60 + "\n")
    return top_drivers


def explain_single_instance(
    pipeline: Any,
    input_df: pd.DataFrame,
    top_n: int = 5,
) -> List[Dict[str, Any]]:
    """
    Computes local SHAP explanation for a single customer input row.
    """
    preprocessor = pipeline.named_steps["preprocessor"]
    xgb_model = pipeline.named_steps["classifier"]
    feature_names = get_feature_names(preprocessor)

    X_trans = preprocessor.transform(input_df)
    explainer = shap.TreeExplainer(xgb_model)
    shap_vals = explainer(X_trans).values

    if shap_vals.ndim == 3:
        shap_vals = shap_vals[0, :, 1]
    elif shap_vals.ndim == 2:
        shap_vals = shap_vals[0, :]

    clean_names = [fn.replace("num__", "").replace("cat__", "").replace("pass__", "") for fn in feature_names]

    # Rank by impact magnitude
    abs_vals = np.abs(shap_vals)
    sorted_idx = np.argsort(abs_vals)[::-1][:top_n]

    local_factors = []
    for idx in sorted_idx:
        impact = float(shap_vals[idx])
        local_factors.append({
            "feature": clean_names[idx],
            "raw_feature": feature_names[idx],
            "shap_value": round(impact, 4),
            "effect": "Increases Churn Risk" if impact > 0 else "Decreases Churn Risk",
        })

    return local_factors


if __name__ == "__main__":
    drivers = get_global_explanations()
    assert len(drivers) >= 5, "Failed to extract top 5 global drivers!"
    print(f"[SUCCESS] Top {len(drivers)} feature importances successfully extracted!")
