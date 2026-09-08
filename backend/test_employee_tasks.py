"""
Automated Verification Suite for Phase 1: Database Schema & Backend API Update
Tests:
1. GET /employees - Retrieves all employees with nested assigned customer tasks (200 OK)
2. GET /tasks/{employee_id} - Retrieves customer churn tasks assigned to specific employee (200 OK)
3. GET /tasks - Retrieves all enterprise customer tasks for global Task Queue (200 OK)
4. GET /tasks/detail/{task_id} - Retrieves single customer task detail for Churn Analysis (200 OK)
5. Validates JSON relationship integrity: employee_id foreign key links and task attributes.
"""

import os
import sys
import json
import requests

API_URL = os.getenv("API_URL", os.getenv("VITE_API_URL", "http://127.0.0.1:8000"))


def run_phase1_verification():
    print("=" * 70)
    print("PHASE 1 VERIFICATION: EMPLOYEE & TASK API ENDPOINTS")
    print("=" * 70)

    # 1. Test GET /employees
    print("\n1. Testing GET /employees...")
    res = requests.get(f"{API_URL}/employees")
    print(f"   Status Code: {res.status_code}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    employees = res.json()
    assert isinstance(employees, list), "Expected list of employees"
    assert len(employees) > 0, "Expected at least 1 employee"
    print(f"   [PASS] Retrieved {len(employees)} enterprise employees.")

    # Validate employee schema & task relationships
    first_emp = employees[0]
    required_keys = ["id", "name", "email", "role", "department", "tasks", "task_count"]
    for k in required_keys:
        assert k in first_emp, f"Missing key '{k}' in employee object: {first_emp}"

    print(f"   Sample Employee: {first_emp['name']} | {first_emp['role']} ({first_emp['department']})")
    print(f"   Assigned Tasks Count: {first_emp['task_count']}")
    
    for emp in employees:
        print(f"     - ID {emp['id']}: {emp['name']} ({emp['department']}) -> {emp['task_count']} tasks")

    # 2. Test GET /tasks/{employee_id}
    target_emp_id = first_emp["id"]
    print(f"\n2. Testing GET /tasks/{target_emp_id} for {first_emp['name']}...")
    res_tasks = requests.get(f"{API_URL}/tasks/{target_emp_id}")
    print(f"   Status Code: {res_tasks.status_code}")
    assert res_tasks.status_code == 200, f"Expected 200, got {res_tasks.status_code}: {res_tasks.text}"
    
    emp_tasks = res_tasks.json()
    assert isinstance(emp_tasks, list), "Expected list of tasks"
    print(f"   [PASS] Retrieved {len(emp_tasks)} assigned tasks for employee #{target_emp_id}.")

    for task in emp_tasks:
        assert task["employee_id"] == target_emp_id, f"Task employee_id {task['employee_id']} does not match requested {target_emp_id}"
        assert "customer_name" in task, "Missing customer_name in task"
        assert "churn_probability" in task, "Missing churn_probability in task"
        assert "risk_level" in task, "Missing risk_level in task"
        print(f"     - Task #{task['id']}: {task['customer_name']} | Risk: {task['risk_level']} ({task['churn_probability'] * 100:.1f}%) | Contract: {task['contract']}")

    # 3. Test GET /tasks (global queue)
    print("\n3. Testing GET /tasks (all tasks queue)...")
    res_all_tasks = requests.get(f"{API_URL}/tasks")
    assert res_all_tasks.status_code == 200, f"Expected 200, got {res_all_tasks.status_code}"
    all_tasks = res_all_tasks.json()
    print(f"   [PASS] Retrieved {len(all_tasks)} total tasks in queue.")

    # 4. Test GET /tasks/detail/{task_id}
    sample_task_id = all_tasks[0]["id"]
    print(f"\n4. Testing GET /tasks/detail/{sample_task_id} for focused Churn Analysis...")
    res_task_detail = requests.get(f"{API_URL}/tasks/detail/{sample_task_id}")
    assert res_task_detail.status_code == 200, f"Expected 200, got {res_task_detail.status_code}"
    task_detail = res_task_detail.json()
    assert task_detail["id"] == sample_task_id
    assert "input_features" in task_detail
    assert "top_factors" in task_detail
    print(f"   [PASS] Retrieved task details for #{sample_task_id} ({task_detail['customer_name']}):")
    print(f"          Tenure: {task_detail['tenure']} mo | Monthly: ${task_detail['monthly_charges']} | Top Factors: {len(task_detail['top_factors'])}")

    print("\n" + "=" * 70)
    print("PHASE 1 DONE CRITERIA FULLY SATISFIED: ALL TESTS PASSED (200 OK)")
    print("=" * 70)


if __name__ == "__main__":
    try:
        run_phase1_verification()
    except Exception as e:
        print(f"\n[FAIL] Phase 1 Verification Failed: {e}", file=sys.stderr)
        sys.exit(1)
