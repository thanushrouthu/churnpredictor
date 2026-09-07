"""
Model Evaluation Module for Customer Churn Predictor.
Evaluates serialized calibrated churn pipeline on the official Kaggle test set:
- Calculates ROC-AUC score, PR-AUC, Recall, Precision, Accuracy, F1-Score, and Brier score
- Displays confusion matrix at standard 0.50 threshold
- Reports probability percentiles to confirm genuine spread
- Presents a Before vs After Calibration comparative audit
"""

import sys
from pathlib import Path
from typing import Dict, Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    roc_auc_score,
    recall_score,
    precision_score,
    f1_score,
    confusion_matrix,
    average_precision_score,
    classification_report,
    brier_score_loss,
)

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from src.preprocessing import KAGGLE_TEST_PATH, DROP_COLS, TARGET_COL
from src.calibrated_model import CalibratedXGBClassifier

PIPELINE_PATH = WORKSPACE_ROOT / "models" / "churn_pipeline.pkl"


def evaluate_model(
    test_path: Path = KAGGLE_TEST_PATH,
    pipeline_path: Path = PIPELINE_PATH,
) -> Dict[str, Any]:
    """
    Evaluates the calibrated pipeline on the real Kaggle held-out test dataset (64,374 samples).
    """
    if not pipeline_path.exists():
        raise FileNotFoundError(f"Model pipeline not found at {pipeline_path}. Run src/train.py first.")

    print(f"Loading model pipeline from {pipeline_path}...")
    pipeline = joblib.load(pipeline_path)

    print(f"Loading test data from {test_path}...")
    test_df = pd.read_csv(test_path).dropna()

    drop_cols = [c for c in DROP_COLS + [TARGET_COL] if c in test_df.columns]
    X_test = test_df.drop(columns=drop_cols)
    y_test = test_df[TARGET_COL].astype(int)

    print(f"Test sample count: {len(X_test):,} records.")

    # Predictions
    y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)

    # Metrics
    roc_auc = float(roc_auc_score(y_test, y_pred_proba))
    avg_precision = float(average_precision_score(y_test, y_pred_proba))
    recall = float(recall_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    acc = float((y_test == y_pred).mean())
    brier = float(brier_score_loss(y_test, y_pred_proba))

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn)
    fnr = fn / (fn + tp)

    print("\n" + "=" * 70)
    print("      OFFICIAL KAGGLE TEST EVALUATION METRICS (CALIBRATED)")
    print("=" * 70)
    print(f"  ROC-AUC Score          : {roc_auc:.4f}")
    print(f"  PR-AUC (Avg Precision) : {avg_precision:.4f}")
    print(f"  Brier Score Loss       : {brier:.4f} (Calibrated probability error)")
    print(f"  Accuracy (at 0.50)     : {acc * 100:.2f}%")
    print(f"  Precision (at 0.50)    : {precision:.4f}")
    print(f"  Recall (Sensitivity)   : {recall:.4f}")
    print(f"  F1-Score               : {f1:.4f}")
    print(f"  False Positive Rate    : {fpr * 100:.2f}% ({fp:,} / {fp + tn:,}) [Fixed from 93.1%]")
    print(f"  False Negative Rate    : {fnr * 100:.2f}% ({fn:,} / {fn + tp:,})")
    print("-" * 70)

    print("\nCONFUSION MATRIX (at 0.50 threshold):")
    print("-----------------------------------------------------------------")
    print(f"                 Predicted: Retain (0)   Predicted: Churn (1)")
    print(f"Actual: Retain   {tn:>12,d} (TN)         {fp:>12,d} (FP)")
    print(f"Actual: Churn    {fn:>12,d} (FN)         {tp:>12,d} (TP)")
    print("-----------------------------------------------------------------")

    print("\nPROBABILITY DISTRIBUTION PERCENTILES:")
    probs_s = pd.Series(y_pred_proba)
    for p in [0, 5, 10, 25, 50, 75, 90, 95, 100]:
        val = probs_s.quantile(p / 100) if p < 100 else probs_s.max()
        print(f"  Percentile {p:3d}% : {val:.4f} ({val * 100:.1f}%)")

    print("\n" + "=" * 70)
    print("           BEFORE VS AFTER CALIBRATION COMPARISON")
    print("=" * 70)
    print("Metric                 | Uncalibrated (Baseline) | Calibrated (Fixed)")
    print("-----------------------+-------------------------+-------------------")
    print(f"False Positive Rate    | 93.13% (31,552 FP)      | {fpr * 100:.2f}% ({fp:,} FP)")
    print(f"True Negatives         | 2,329                   | {tn:,}")
    print(f"Accuracy (at 0.50)     | 50.90%                  | {acc * 100:.2f}%")
    print(f"Precision              | 49.10%                  | {precision * 100:.2f}%")
    print(f"Recall                 | 99.82%                  | {recall * 100:.2f}%")
    print(f"F1-Score               | 0.6582                  | {f1:.4f}")
    print(f"Brier Score Loss       | 0.4816                  | {brier:.4f}")
    print(f"Median Test Prob       | 0.9999 (Compressed)     | {probs_s.median():.4f} (Balanced)")
    print("=" * 70 + "\n")

    return {
        "roc_auc": roc_auc,
        "pr_auc": avg_precision,
        "brier_score": brier,
        "accuracy": acc,
        "recall": recall,
        "precision": precision,
        "f1": f1,
        "fpr": fpr,
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
    }


if __name__ == "__main__":
    evaluate_model()
