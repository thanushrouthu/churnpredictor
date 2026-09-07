"""
Phase 2 Comprehensive Automated Verification Script.
Tests:
1. Health check (GET /health)
2. Employee listing (GET /employees)
3. New employee creation (POST /employees) -> HTTP 201 Created
4. Database persistence and is_seeded flag verification for custom employee
5. Full roster reflects the newly added employee
6. Task assignment (PUT /tasks/{task_id}/assign) with the new employee
7. DB verification of task assignment persistence
"""

import json
import sqlite3
import time
import urllib.request
import urllib.error
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = WORKSPACE_ROOT / "data" / "app.db"
BASE_URL = "http://127.0.0.1:8000"


def http_get(endpoint: str):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "Phase2Verifier"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def http_post(endpoint: str, data: dict):
    url = f"{BASE_URL}{endpoint}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "Phase2Verifier"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def http_put(endpoint: str, data: dict):
    url = f"{BASE_URL}{endpoint}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "Phase2Verifier"},
        method="PUT",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def run_phase2_verification():
    print("=" * 70)
    print("PHASE 2 COMPREHENSIVE VERIFICATION: EMPLOYEE CREATION & TASK ASSIGNMENT")
    print("=" * 70 + "\n")

    # 1. Health check
    print("1. Checking FastAPI Server Status (/health)...")
    status_code, health = http_get("/health")
    assert status_code == 200, f"Health check failed with status {status_code}"
    print(f"   [PASS] FastAPI Online | Status: {health.get('status')} | Model Loaded: {health.get('model_loaded')}")

    # 2. Initial Employee Listing
    print("\n2. Querying Initial GET /employees...")
    status_code, initial_employees = http_get("/employees")
    assert status_code == 200, f"GET /employees failed with status {status_code}"
    initial_count = len(initial_employees)
    print(f"   Current total employees: {initial_count}")
    print(f"   [PASS] GET /employees responded with {initial_count} records.")

    # 3. POST /employees
    timestamp_suffix = int(time.time()) % 10000
    test_employee_data = {
        "name": f"Marcus Kane {timestamp_suffix}",
        "role": "VP Customer Retention",
        "department": "Executive Leadership",
        "email": f"marcus.kane.{timestamp_suffix}@enterprise.corp",
    }
    print(f"\n3. Testing POST /employees with payload:")
    print(f"   {json.dumps(test_employee_data, indent=2)}")

    status_code, created_emp = http_post("/employees", test_employee_data)
    print(f"   HTTP Status: {status_code}")
    print(f"   Created Employee Object: {json.dumps(created_emp, indent=2)}")

    assert status_code == 201, f"Expected HTTP 201 Created, got {status_code}"
    new_emp_id = created_emp.get("id")
    assert new_emp_id is not None, "Response missing employee ID"
    assert created_emp.get("name") == test_employee_data["name"] or created_emp.get("full_name") == test_employee_data["name"]
    assert created_emp.get("role") == test_employee_data["role"] or created_emp.get("job_title") == test_employee_data["role"]
    assert created_emp.get("department") == test_employee_data["department"]
    print(f"   [PASS] POST /employees returned HTTP 201 with ID #{new_emp_id} and initials '{created_emp.get('avatar_initials')}'.")

    # 4. Direct SQLite Verification of is_seeded flag
    print("\n4. Verifying Database Record & is_seeded = 0 in SQLite...")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, full_name, job_title, department, avatar_initials, is_seeded FROM employees WHERE id = ?", (new_emp_id,))
        db_row = cursor.fetchone()

    assert db_row is not None, f"Employee #{new_emp_id} not found in DB!"
    print(f"   Database Row: ID={db_row[0]}, Name='{db_row[1]}', Title='{db_row[2]}', Dept='{db_row[3]}', Initials='{db_row[4]}', is_seeded={db_row[5]}")
    assert db_row[5] == 0, f"Expected is_seeded=0 for manual employee, found {db_row[5]}"
    print("   [PASS] Database successfully persisted the record with is_seeded = 0 (preserved from Faker resets).")

    # 5. GET /employees roster includes newly created employee
    print("\n5. Testing GET /employees contains the new employee...")
    status_code, updated_employees = http_get("/employees")
    assert status_code == 200
    assert len(updated_employees) == initial_count + 1, f"Expected {initial_count + 1} employees, found {len(updated_employees)}"
    found_in_list = any(e.get("id") == new_emp_id for e in updated_employees)
    assert found_in_list, f"New employee #{new_emp_id} not found in GET /employees response!"
    print(f"   Total employees now: {len(updated_employees)} (includes new employee #{new_emp_id})")
    print("   [PASS] GET /employees roster updated dynamically.")

    # 6. Assign new employee to a task via PUT /tasks/{task_id}/assign
    print("\n6. Testing Task Assignment with the newly created employee...")
    status_code, tasks = http_get("/tasks")
    assert status_code == 200 and len(tasks) > 0, "No tasks found in system"
    target_task = tasks[0]
    task_id = target_task["id"]
    print(f"   Assigning Task #{task_id} ('{target_task.get('customer_name')}') to Employee #{new_emp_id}...")

    assign_payload = {"employee_id": new_emp_id}
    status_code, assign_res = http_put(f"/tasks/{task_id}/assign", assign_payload)
    print(f"   PUT Status: {status_code}")
    print(f"   Response Message: {assign_res.get('message')}")
    assert status_code == 200, f"Expected 200 OK, got {status_code}"

    updated_task_obj = assign_res.get("task", {})
    assert updated_task_obj.get("employee_id") == new_emp_id, f"Expected employee_id {new_emp_id}, got {updated_task_obj.get('employee_id')}"
    print(f"   Assigned Name in Task: {updated_task_obj.get('employee_name')}")
    print(f"   Assigned Role in Task: {updated_task_obj.get('employee_role')}")
    print("   [PASS] Task assignment endpoint returned 200 with updated employee linkage.")

    # 7. Direct Database Verification of Task Assignment
    print("\n7. Verifying Task Assignment in Database...")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, customer_name, employee_id FROM tasks WHERE id = ?", (task_id,))
        task_row = cursor.fetchone()

    assert task_row[2] == new_emp_id, f"Database has employee_id {task_row[2]}, expected {new_emp_id}"
    print(f"   Task #{task_row[0]} | Customer: {task_row[1]} | DB employee_id: {task_row[2]}")
    print("   [PASS] Task employee linkage verified directly in SQLite DB.")

    print("\n" + "=" * 70)
    print("ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    run_phase2_verification()
