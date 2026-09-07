"""
Calibrated XGBoost Classifier Module for Customer Churn Prediction.
Provides CalibratedXGBClassifier which wraps an XGBClassifier with Platt scaling
(sigmoid calibration) on decision margins to fix probability compression and false-positive inflation.
Fully compatible with scikit-learn Pipeline and SHAP TreeExplainer.
"""

from typing import Any, Dict, Optional, Tuple
import numpy as np
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier


class CalibratedXGBClassifier(XGBClassifier):
    """
    XGBClassifier with post-hoc Platt scaling probability calibration.
    Overcomes synthetic rule saturation in training data by mapping raw log-odds
    margins to well-calibrated probabilities matching the real operational distribution.
    """

    def __init__(
        self,
        cal_a: float = 1.0,
        cal_b: float = 0.0,
        **xgb_params,
    ):
        super().__init__(**xgb_params)
        self.cal_a = cal_a
        self.cal_b = cal_b
        self.cal_a_ = cal_a
        self.cal_b_ = cal_b

    def get_xgb_params(self) -> Dict[str, Any]:
        """Filters out calibration parameters so XGBoost C++ core receives only valid tree params."""
        params = super().get_xgb_params()
        params.pop("cal_a", None)
        params.pop("cal_b", None)
        return params

    def fit_calibrated(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_cal: np.ndarray,
        y_cal: np.ndarray,
    ) -> "CalibratedXGBClassifier":
        """
        1. Fits underlying XGBoost trees on X_train.
        2. Fits Platt sigmoid calibrator on raw margin outputs of X_cal.
        """
        super().fit(X_train, y_train)

        # Fit sigmoid calibration on margins
        margins_cal = super().predict(X_cal, output_margin=True)
        lr = LogisticRegression(random_state=42)
        lr.fit(margins_cal.reshape(-1, 1), y_cal)

        self.cal_a_ = float(lr.coef_[0][0])
        self.cal_b_ = float(lr.intercept_[0])
        self.cal_a = self.cal_a_
        self.cal_b = self.cal_b_
        return self

    def predict_proba(self, X: np.ndarray, **kwargs) -> np.ndarray:
        """
        Outputs Platt-calibrated probabilities for class 0 (retained) and class 1 (churn).
        """
        margins = super().predict(X, output_margin=True)
        cal_logits = self.cal_a_ * margins + self.cal_b_
        # Numerically stable sigmoid
        p1 = 1.0 / (1.0 + np.exp(-cal_logits))
        p0 = 1.0 - p1
        return np.column_stack([p0, p1])

    def predict(self, X: np.ndarray, **kwargs) -> np.ndarray:
        """
        Standard threshold (0.50) classification based on calibrated probabilities.
        """
        probs = self.predict_proba(X)[:, 1]
        return (probs >= 0.50).astype(int)
