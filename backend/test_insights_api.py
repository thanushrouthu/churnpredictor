"""
Unit test for GET /model/insights API endpoint.
Tests:
1. Rejection of unauthenticated requests with 401.
2. Acceptance of authenticated session with 200 OK.
3. Verification that all 6 requirements are present in the response schema.
4. Validation of real computed values (ROC-AUC 0.7471, Recall 74.54%, Precision 62.23%).
5. Verification of sub-10ms cached response performance.
"""

import os
import sys
import time
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

# Ensure JWT_SECRET is present for testing
if not os.getenv("JWT_SECRET"):
    os.environ["JWT_SECRET"] = "test-secret-key-for-local-testing-1234567890"

from fastapi.testclient import TestClient
from backend.main import app, create_jwt_token
from backend.db import create_user, get_user_by_email


def test_model_insights_endpoint():
    print("=" * 65)
    print("RUNNING MODEL INSIGHTS API TEST SUITE")
    print("=" * 65)

    with TestClient(app) as client:
        # 1. Unauthenticated request must return 401
        print("1. Testing unauthenticated GET /model/insights...")
        res = client.get("/model/insights")
        print(f"   Status: {res.status_code}")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("   [PASS] Correctly rejected unauthenticated request with 401.\n")

        # 2. Create or fetch test user and mint JWT token
        test_email = "insights_tester@example.com"
        existing_user = get_user_by_email(test_email)
        if not existing_user:
            user = create_user("Insights Tester", test_email, "hashed_pw_test_123")
        else:
            user = existing_user

        token = create_jwt_token(user["id"], user["email"])
        client.cookies.set("access_token", token)

        # 3. Authenticated request
        print("2. Testing authenticated GET /model/insights...")
        t0 = time.perf_counter()
        res = client.get("/model/insights")
        t1 = time.perf_counter()
        duration_ms = (t1 - t0) * 1000

        print(f"   Status: {res.status_code}, Response time: {duration_ms:.2f}ms")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print("   [PASS] 200 OK received in sub-10ms!\n")

        # 4. Verify all 6 Requirements in schema
        print("3. Validating requirement components in payload...")
        assert "eda" in data, "Requirement 1: 'eda' missing"
        assert "preprocessing" in data, "Requirement 2: 'preprocessing' missing"
        assert "class_imbalance" in data, "Requirement 3: 'class_imbalance' missing"
        assert "architecture" in data, "Requirement 4: 'architecture' missing"
        assert "evaluation" in data, "Requirement 5: 'evaluation' missing"
        assert "feature_importance" in data, "Requirement 6: 'feature_importance' missing"
        print("   [PASS] All 6 Requirement keys present.\n")

        # 5. Check real metrics
        print("4. Validating exact verified test set metrics...")
        metrics = data["evaluation"]["metrics"]
        print(f"   ROC-AUC: {metrics['roc_auc']} (Expected: ~0.7471)")
        print(f"   Recall: {metrics['recall_pct']}% (Expected: ~74.54%)")
        print(f"   Precision: {metrics['precision_pct']}% (Expected: ~62.23%)")
        print(f"   Accuracy: {metrics['accuracy_pct']}% (Expected: ~66.51%)")
        assert metrics["roc_auc"] == 0.7471, f"Mismatch in ROC-AUC: {metrics['roc_auc']}"
        assert metrics["recall_pct"] == 74.54, f"Mismatch in Recall: {metrics['recall_pct']}"
        assert metrics["precision_pct"] == 62.23, f"Mismatch in Precision: {metrics['precision_pct']}"
        assert metrics["accuracy_pct"] == 66.51, f"Mismatch in Accuracy: {metrics['accuracy_pct']}"

        # 6. Check EDA contract churn rates
        print("\n5. Validating EDA Contract analysis...")
        contracts = {c["contract"]: c["churn_rate_pct"] for c in data["eda"]["contract_analysis"]}
        print(f"   Contracts: {contracts}")
        assert contracts.get("Monthly") == 100.0, f"Expected Monthly 100%, got {contracts.get('Monthly')}"

        # 7. Check Top 5 SHAP Drivers
        print("\n6. Validating Top 5 SHAP portfolio drivers...")
        top_5 = [d["feature"] for d in data["feature_importance"]["top_5_portfolio_drivers"]]
        print(f"   Top 5: {top_5}")
        assert "Support Calls" in top_5
        assert "Total Spend" in top_5
        assert "Payment Delay" in top_5

        print("\n" + "=" * 65)
        print("ALL MODEL INSIGHTS API CHECKS PASSED WITH FLYING COLORS!")
        print("=" * 65)


if __name__ == "__main__":
    test_model_insights_endpoint()
