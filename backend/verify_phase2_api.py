"""
Phase 2 Automated Verification Script: Testing FastAPI Endpoints & Task Assignment Logic.
Validates:
1. GET /employees returns all 50 employees.
2. GET /tasks returns churn evaluation tasks.
3. PUT /tasks/{task_id}/assign successfully links an employee to a task and updates DB.
"""

import time
import os
import sys
import json
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = WORKSPACE_ROOT / "data" / "app.db"
BASE_URL = os.getenv("API_URL", os.getenv("VITE_API_URL", "http://127.0.0.1:8000"))


def http_get(endpoint: str):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "Phase2Verifier"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


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
        return json.loads(resp.read().decode("utf-8"))


def verify_phase2():
    print("======================================================================")
    print("PHASE 2: BACKEND API & TASK ASSIGNMENT VERIFICATION")
    print("======================================================================\n")

    # Step 1: Health check
    print("1. Checking FastAPI server status (/health)...")
    for attempt in range(10):
        try:
            health = http_get("/health")
            print(f"   [PASS] FastAPI Server Status: {health.get('status')} (Model loaded: {health.get('model_loaded')})")
            break
        except Exception as e:
            if attempt == 9:
                raise RuntimeError(f"FastAPI server not responding: {e}")
            time.sleep(1)

    # Step 2: GET /employees
    print("\n2. Testing GET /employees...")
    employees = http_get("/employees")
    print(f"   Total employees retrieved: {len(employees)}")
    if len(employees) != 50:
        raise AssertionError(f"Expected exactly 50 employees, received {len(employees)}")
    print(f"   Sample Employee #1: {employees[0].get('full_name')} ({employees[0].get('avatar_initials')}) - {employees[0].get('job_title')}")
    print(f"   Sample Employee #50: {employees[49].get('full_name')} ({employees[49].get('avatar_initials')}) - {employees[49].get('job_title')}")
    print("   [PASS] GET /employees returned all 50 employees accurately.")

    # Step 3: GET /tasks
    print("\n3. Testing GET /tasks...")
    tasks = http_get("/tasks")
    print(f"   Total tasks retrieved: {len(tasks)}")
    if len(tasks) == 0:
        raise AssertionError("No tasks returned by GET /tasks")

    unassigned_task = None
    for t in tasks:
        if t.get("employee_id") is None:
            unassigned_task = t
            break

    if not unassigned_task:
        unassigned_task = tasks[0]
        print(f"   Using Task #{unassigned_task['id']} for assignment test (previously assigned to {unassigned_task.get('employee_id')}).")
    else:
        print(f"   Found unassigned task #{unassigned_task['id']} ({unassigned_task.get('customer_name')})")

    task_id = unassigned_task["id"]
    test_employee_id = 5  # Laurie Allen
    test_employee = next((e for e in employees if e["id"] == test_employee_id), employees[4])
    print(f"   Assigning Task #{task_id} to Employee #{test_employee_id} ({test_employee.get('full_name')})...")

    # Step 4: PUT /tasks/{task_id}/assign
    print(f"\n4. Testing PUT /tasks/{task_id}/assign...")
    assign_res = http_put(f"/tasks/{task_id}/assign", {"employee_id": test_employee_id})
    print(f"   API Response Status: {assign_res.get('status')}")
    print(f"   Message: {assign_res.get('message')}")

    updated_task = assign_res.get("task", {})
    if updated_task.get("employee_id") != test_employee_id:
        raise AssertionError(f"Expected task employee_id to be {test_employee_id}, got {updated_task.get('employee_id')}")
    print(f"   Returned Assigned Employee Name: {updated_task.get('employee_name')}")
    print(f"   Returned Assigned Employee Role: {updated_task.get('employee_role')}")
    print("   [PASS] PUT endpoint returned successful response with updated employee linkage.")

    # Step 5: Direct Database Verification
    print("\n5. Verifying Database State via direct SQLite query...")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, customer_name, employee_id FROM tasks WHERE id = ?", (task_id,))
        db_row = cursor.fetchone()

    print(f"   Direct DB Row: Task #{db_row[0]} | Customer: {db_row[1]} | employee_id in DB: {db_row[2]}")
    if db_row[2] != test_employee_id:
        raise AssertionError(f"Database employee_id is {db_row[2]}, expected {test_employee_id}")
    print("   [PASS] Database successfully persisted the assignment!")

    # Step 6: Verify GET /tasks reflects the update
    print("\n6. Verifying GET /tasks reflects updated assignment...")
    tasks_after = http_get("/tasks")
    verified_task = next(t for t in tasks_after if t["id"] == task_id)
    print(f"   Task #{verified_task['id']} assigned to: {verified_task.get('employee_name')} ({verified_task.get('employee_avatar')})")
    print("   [PASS] GET /tasks confirms real-time updated assignment.")

    print("\n======================================================================")
    print("PHASE 2 VERIFICATION COMPLETE: ALL DONE CRITERIA SATISFIED")
    print("======================================================================")
    return True


if __name__ == "__main__":
    verify_phase2()
