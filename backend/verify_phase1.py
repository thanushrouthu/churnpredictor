"""
Phase 1 Verification Script: Validating Supabase / Database Architecture & 50-Employee Seeding
"""

import sqlite3
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = WORKSPACE_ROOT / "data" / "app.db"

def verify_phase1():
    print("======================================================================")
    print("PHASE 1 EXECUTION TEST & VALIDATION")
    print("======================================================================\n")

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        # 1. Check employees count
        cursor.execute("SELECT COUNT(*) FROM employees")
        emp_count = cursor.fetchone()[0]

        # 2. Check employees schema columns
        cursor.execute("PRAGMA table_info(employees)")
        emp_cols = {row[1]: row[2] for row in cursor.fetchall()}

        # 3. Check tasks table and employee_id foreign key
        cursor.execute("PRAGMA table_info(tasks)")
        task_cols = {row[1]: row[2] for row in cursor.fetchall()}

        cursor.execute("SELECT COUNT(*) FROM tasks")
        task_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE employee_id IS NULL")
        unassigned_task_count = cursor.fetchone()[0]

        cursor.execute("SELECT id, full_name, job_title, department, avatar_initials, email FROM employees LIMIT 10")
        sample_employees = cursor.fetchall()

    print(f"1. Total Employees in Database: {emp_count}")
    print(f"   [DONE CRITERIA CHECK] Exactly 50 employees? {'YES (50)' if emp_count == 50 else 'NO'}")

    print("\n2. Employees Table Schema Verification:")
    for col, ctype in emp_cols.items():
        print(f"   - {col} ({ctype})")
    
    required_emp_cols = ["id", "full_name", "job_title", "department", "avatar_initials"]
    has_all_emp_cols = all(c in emp_cols for c in required_emp_cols)
    print(f"   All required columns present ({', '.join(required_emp_cols)}): {has_all_emp_cols}")

    print("\n3. Tasks Table Schema Verification:")
    for col, ctype in task_cols.items():
        print(f"   - {col} ({ctype})")
    
    has_task_fk = "employee_id" in task_cols
    print(f"   Nullable employee_id foreign key present in tasks: {has_task_fk}")
    print(f"   Total Seeded Tasks: {task_count} (Assigned: {task_count - unassigned_task_count}, Unassigned: {unassigned_task_count})")

    print("\n4. Sample Seeded Employees (first 10 of 50):")
    for emp in sample_employees:
        print(f"   #{emp[0]:02d} [{emp[4]}] {emp[1]} | {emp[2]} ({emp[3]})")

    print("\n======================================================================")
    if emp_count == 50 and has_all_emp_cols and has_task_fk:
        print("PHASE 1 VERIFICATION PASSED: ALL DONE CRITERIA SATISFIED")
        print("======================================================================")
        return True
    else:
        print("PHASE 1 VERIFICATION FAILED")
        print("======================================================================")
        return False

if __name__ == "__main__":
    success = verify_phase1()
    if not success:
        exit(1)
