"""
Phase 4 Verification Script.
Sends requests to FastAPI server /predict endpoint and validates:
1. HTTP 200 OK response.
2. Response schema compliance (churn_probability, risk_level, top_factors, timestamp).
3. Local SHAP explainability factors.
"""

import os
import sys
import time
import requests

API_URL = os.getenv("API_URL", os.getenv("VITE_API_URL", "http://127.0.0.1:8000"))


def wait_for_server(max_retries: int = 15, delay: float = 1.0):
    print("Waiting for FastAPI server to be reachable...")
    for attempt in range(1, max_retries + 1):
        try:
            res = requests.get(f"{API_URL}/health", timeout=2)
            if res.status_code == 200:
                print(f"  [OK] Server online! Health check response: {res.json()}")
                return True
        except Exception:
            pass
        time.sleep(delay)
    raise RuntimeError(f"Server at {API_URL} did not respond after {max_retries} attempts.")


def test_predict_endpoint():
    # Case 1: High-Risk Customer Profile (Short tenure, Month-to-month, Fiber, High bill)
    high_risk_payload = {
        "gender": "Female",
        "SeniorCitizen": 0,
        "Partner": "No",
        "Dependents": "No",
        "tenure": 2.0,
        "InternetService": "Fiber optic",
        "OnlineSecurity": "No",
        "TechSupport": "No",
        "Contract": "Month-to-month",
        "PaperlessBilling": "Yes",
        "PaymentMethod": "Electronic check",
        "MonthlyCharges": 92.50,
        "TotalCharges": 185.00,
    }

    print("\n" + "=" * 60)
    print("TEST 1: Sending High-Risk Customer Profile to /predict")
    print("=" * 60)
    response = requests.post(f"{API_URL}/predict", json=high_risk_payload, timeout=5)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()
    print("Response JSON:")
    print(data)

    # Validate schema
    assert "churn_probability" in data, "Missing churn_probability in response"
    assert "risk_level" in data, "Missing risk_level in response"
    assert "top_factors" in data, "Missing top_factors in response"
    assert "timestamp" in data, "Missing timestamp in response"
    assert isinstance(data["top_factors"], list), "top_factors must be a list"
    assert len(data["top_factors"]) > 0, "top_factors must not be empty"

    prob = data["churn_probability"]
    assert 0.0 <= prob <= 1.0, f"Invalid probability: {prob}"
    print(f"\n  [OK] Churn Probability : {prob:.4f}")
    print(f"  [OK] Risk Level        : {data['risk_level']}")
    print("  [OK] Top Local SHAP Factors:")
    for f in data["top_factors"]:
        print(f"       - {f['feature']:<30} SHAP: {f['shap_value']:>7.4f} ({f['effect']})")

    # Case 2: Low-Risk Customer Profile (High tenure, Two-year contract, DSL)
    low_risk_payload = {
        "gender": "Male",
        "SeniorCitizen": 0,
        "Partner": "Yes",
        "Dependents": "Yes",
        "tenure": 60.0,
        "InternetService": "DSL",
        "OnlineSecurity": "Yes",
        "TechSupport": "Yes",
        "Contract": "Two year",
        "PaperlessBilling": "No",
        "PaymentMethod": "Bank transfer (automatic)",
        "MonthlyCharges": 45.00,
        "TotalCharges": 2700.00,
    }

    print("\n" + "=" * 60)
    print("TEST 2: Sending Low-Risk Customer Profile to /predict")
    print("=" * 60)
    response_low = requests.post(f"{API_URL}/predict", json=low_risk_payload, timeout=5)
    assert response_low.status_code == 200, f"Expected 200, got {response_low.status_code}"
    data_low = response_low.json()
    print(f"  [OK] Low-Risk Churn Probability : {data_low['churn_probability']:.4f}")
    print(f"  [OK] Low-Risk Level             : {data_low['risk_level']}")

    assert data["churn_probability"] > data_low["churn_probability"], "Model did not distinguish high vs low risk!"
    print("\n" + "=" * 60)
    print("[SUCCESS] ALL PHASE 4 BACKEND INTEGRATION TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    wait_for_server()
    test_predict_endpoint()
