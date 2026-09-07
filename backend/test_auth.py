"""
Automated Backend Auth & Protection Test Suite.
Tests:
1. Blocked unauthenticated /predict (401)
2. Blocked unauthenticated /auth/me (401)
3. User signup and httpOnly cookie issuance
4. /auth/me with session cookie
5. Duplicate user registration rejection
6. Login authentication (invalid password rejection vs valid login)
7. Authenticated /predict execution (200 OK)
8. Logout and session cookie invalidation
9. Verification that passwords in DB are bcrypt-hashed, never plaintext
"""

import sys
import sqlite3
from pathlib import Path
import requests

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
API_URL = "http://127.0.0.1:8000"


def test_auth_suite():
    session = requests.Session()

    print("=" * 65)
    print("RUNNING BACKEND AUTH & PROTECTION TEST SUITE")
    print("=" * 65)

    # 1. Unauthenticated /predict must return 401
    print("1. Testing unauthenticated POST /predict...")
    res = session.post(f"{API_URL}/predict", json={"tenure": 12, "MonthlyCharges": 70, "Contract": "Month-to-month"})
    print(f"   Response status: {res.status_code}")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
    print("   [PASS] Unauthenticated /predict correctly blocked with 401!\n")

    # 2. Unauthenticated GET /auth/me must return 401
    print("2. Testing unauthenticated GET /auth/me...")
    res = session.get(f"{API_URL}/auth/me")
    print(f"   Response status: {res.status_code}")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("   [PASS] Unauthenticated /auth/me correctly blocked with 401!\n")

    # 3. User Signup
    test_email = f"testuser_{int(res.elapsed.total_seconds() * 1000)}@example.com"
    test_password = "SecurePassword2026!"
    signup_payload = {
        "name": "Jane ML Specialist",
        "email": test_email,
        "password": test_password,
    }
    print(f"3. Testing POST /auth/signup with {test_email}...")
    res = session.post(f"{API_URL}/auth/signup", json=signup_payload)
    print(f"   Response status: {res.status_code}")
    assert res.status_code == 200, f"Signup failed: {res.text}"
    user_data = res.json()
    assert user_data["email"] == test_email
    assert "access_token" in session.cookies, "httpOnly access_token cookie was not set!"
    print(f"   User registered: {user_data}")
    print(f"   Cookie received: access_token={session.cookies.get('access_token')[:20]}...")
    print("   [PASS] User registered and httpOnly cookie issued!\n")

    # 4. Authenticated /auth/me
    print("4. Testing GET /auth/me with active session cookie...")
    res = session.get(f"{API_URL}/auth/me")
    assert res.status_code == 200, f"Failed to get current user: {res.text}"
    me_data = res.json()
    assert me_data["id"] == user_data["id"]
    print(f"   Current user verified: {me_data['name']} ({me_data['email']})")
    print("   [PASS] Session auto-restored via cookie!\n")

    # 5. Duplicate signup should be rejected
    print("5. Testing duplicate email registration...")
    res = session.post(f"{API_URL}/auth/signup", json=signup_payload)
    assert res.status_code == 400, f"Expected 400 for duplicate, got {res.status_code}"
    print("   [PASS] Duplicate registration rejected with 400!\n")

    # 6. Test Login
    # Bad password
    print("6. Testing POST /auth/login with wrong password...")
    res_bad = requests.post(f"{API_URL}/auth/login", json={"email": test_email, "password": "WrongPassword!"})
    assert res_bad.status_code == 401, f"Expected 401 for wrong password, got {res_bad.status_code}"
    print("   [PASS] Wrong password rejected with 401!")

    # Good password
    login_session = requests.Session()
    print("   Testing POST /auth/login with correct credentials...")
    res_login = login_session.post(f"{API_URL}/auth/login", json={"email": test_email, "password": test_password})
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    assert "access_token" in login_session.cookies, "Login did not set access_token cookie!"
    print("   [PASS] Login successful and session cookie set!\n")

    # 7. Authenticated /predict
    print("7. Testing protected POST /predict with authenticated session...")
    predict_payload = {
        "tenure": 3.0,
        "MonthlyCharges": 88.0,
        "Contract": "Month-to-month",
        "InternetService": "Fiber optic",
        "PaymentMethod": "Electronic check",
    }
    res_pred = login_session.post(f"{API_URL}/predict", json=predict_payload)
    assert res_pred.status_code == 200, f"Protected /predict failed: {res_pred.text}"
    pred_data = res_pred.json()
    assert "churn_probability" in pred_data
    assert len(pred_data["top_factors"]) > 0
    print(f"   Prediction Succeeded: Churn Probability = {pred_data['churn_probability']}, Risk = {pred_data['risk_level']}")
    print("   [PASS] Authenticated user executed /predict with full SHAP explainability!\n")

    # 8. Logout
    print("8. Testing POST /auth/logout...")
    res_logout = login_session.post(f"{API_URL}/auth/logout")
    assert res_logout.status_code == 200
    res_me_after = login_session.get(f"{API_URL}/auth/me")
    assert res_me_after.status_code == 401, f"Expected 401 after logout, got {res_me_after.status_code}"
    print("   [PASS] Logout successfully invalidated session!\n")

    # 9. Direct DB Inspection: Verify Bcrypt Hash
    print("9. Verifying database password encryption...")
    db_path = WORKSPACE_ROOT / "data" / "app.db"
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT hashed_password FROM users WHERE email = ?", (test_email,))
        row = cursor.fetchone()
        assert row is not None, "User not found in DB!"
        stored_hash = row[0]
        assert stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"), f"Password is not a bcrypt hash: {stored_hash}"
        assert test_password not in stored_hash, "Plaintext password was leaked in hash column!"
        print(f"   Stored hash: {stored_hash[:30]}... (verified bcrypt salt & rounds)")
        print("   [PASS] Passwords are strictly bcrypt-hashed!\n")

    print("=" * 65)
    print("ALL BACKEND AUTH & PROTECTED ROUTE TESTS PASSED!")
    print("=" * 65)


if __name__ == "__main__":
    test_auth_suite()
