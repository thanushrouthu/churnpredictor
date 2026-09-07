"""
Phase 1 Verification Test Script.
Validates:
1. Repository directory structure.
2. Requirements specification.
3. Supabase client initialization via backend/db.py.
4. Schema definition for predictions_log.
"""

import os
import sys
from pathlib import Path

# Ensure root workspace is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))


def test_directory_structure():
    required_dirs = ["data", "notebooks", "src", "backend", "frontend", "models"]
    print("Testing directory structure...")
    for d in required_dirs:
        dir_path = WORKSPACE_ROOT / d
        assert dir_path.is_dir(), f"Missing required directory: {d}"
        print(f"  [OK] Directory exists: {d}/")
    print("All required directories verified successfully!\n")


def test_requirements_file():
    req_path = WORKSPACE_ROOT / "requirements.txt"
    assert req_path.is_file(), "requirements.txt does not exist!"
    content = req_path.read_text(encoding="utf-8")
    expected_packages = ["scikit-learn", "xgboost", "imbalanced-learn", "shap", "fastapi", "uvicorn", "supabase"]
    print("Testing requirements.txt...")
    for pkg in expected_packages:
        assert pkg in content, f"Package {pkg} missing from requirements.txt"
        print(f"  [OK] Found dependency: {pkg}")
    print("requirements.txt verified successfully!\n")


def test_supabase_schema():
    schema_path = WORKSPACE_ROOT / "backend" / "supabase_schema.sql"
    assert schema_path.is_file(), "backend/supabase_schema.sql does not exist!"
    content = schema_path.read_text(encoding="utf-8")
    assert "predictions_log" in content, "Table predictions_log missing from schema!"
    assert "input_features" in content, "Column input_features missing from schema!"
    assert "churn_probability" in content, "Column churn_probability missing from schema!"
    assert "top_factors" in content, "Column top_factors missing from schema!"
    print("[OK] backend/supabase_schema.sql verified successfully!\n")


def test_supabase_db_module():
    print("Testing backend/db.py Supabase initialization...")
    from backend.db import get_supabase_client, log_prediction

    client = get_supabase_client()
    assert client is not None, "Supabase client is None!"
    print(f"  [OK] Supabase client initialized: {type(client).__name__}")

    # Test log_prediction invocation
    dummy_input = {"tenure": 12, "MonthlyCharges": 65.5, "Contract": "Month-to-month"}
    dummy_prob = 0.7241
    dummy_factors = [{"feature": "Contract", "importance": 0.35}]
    result = log_prediction(dummy_input, dummy_prob, dummy_factors)
    assert result is not None and "status" in result, "log_prediction failed to return status!"
    print(f"  [OK] log_prediction executed cleanly with status: {result['status']}")
    print("backend/db.py verified successfully!\n")


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING PHASE 1 VERIFICATION TESTS")
    print("=" * 60)
    try:
        test_directory_structure()
        test_requirements_file()
        test_supabase_schema()
        test_supabase_db_module()
        print("=" * 60)
        print("ALL PHASE 1 DONE CRITERIA SATISFIED!")
        print("=" * 60)
        sys.exit(0)
    except Exception as exc:
        print(f"[FAIL] Verification failed: {exc}", file=sys.stderr)
        sys.exit(1)
