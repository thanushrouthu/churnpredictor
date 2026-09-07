"""
Database Seeding Script for Customer Churn Predictor Enterprise Platform.
Uses Faker to generate exactly 50 realistic employee records and seeds initial churn tasks.
Maintains manual employee insertions alongside the 50 seeded employees.
Target: Supabase (PostgreSQL) + Persistent Local SQLite Fallback (data/app.db).
"""

import os
import json
import sqlite3
import random
from pathlib import Path
from datetime import datetime, timezone
from faker import Faker
from dotenv import load_dotenv

load_dotenv()

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
SQLITE_DB_PATH = WORKSPACE_ROOT / "data" / "app.db"

fake = Faker()
Faker.seed(2026)
random.seed(2026)

JOB_TITLES = [
    ("Senior Retention Specialist", "Customer Success"),
    ("Customer Success Manager", "Customer Success"),
    ("Key Account Director", "Enterprise Accounts"),
    ("Enterprise Account Executive", "Enterprise Accounts"),
    ("Churn Risk Analyst", "Risk & Operations"),
    ("Customer Lifecycle Strategist", "Retention & Growth"),
    ("Senior Client Partner", "Enterprise Accounts"),
    ("Retention Operations Lead", "Retention & Growth"),
    ("Customer Support Escalation Lead", "Client Support"),
    ("Client Health Specialist", "Customer Success"),
    ("Strategic Renewal Manager", "Retention & Growth"),
    ("Enterprise Support Engineer", "Client Support"),
    ("VIP Client Advocate", "Customer Success"),
    ("Predictive Risk Investigator", "Risk & Operations"),
]


def get_avatar_initials(name: str) -> str:
    parts = [p for p in name.replace(".", "").split(" ") if p]
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    elif len(parts) == 1:
        return parts[0][:2].upper()
    return "EM"


def setup_sqlite_schema(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # Create employees table if not exists (supports manual and seeded staff)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            full_name TEXT,
            role TEXT NOT NULL,
            job_title TEXT,
            department TEXT NOT NULL,
            avatar_initials TEXT NOT NULL,
            email TEXT,
            is_seeded INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )

    # Column migrations if table exists
    cursor.execute("PRAGMA table_info(employees)")
    emp_columns = [col[1] for col in cursor.fetchall()]
    if "name" not in emp_columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN name TEXT")
        cursor.execute("UPDATE employees SET name = full_name WHERE name IS NULL")
    if "full_name" not in emp_columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN full_name TEXT")
        cursor.execute("UPDATE employees SET full_name = name WHERE full_name IS NULL")
    if "role" not in emp_columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN role TEXT")
        cursor.execute("UPDATE employees SET role = job_title WHERE role IS NULL")
    if "job_title" not in emp_columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN job_title TEXT")
        cursor.execute("UPDATE employees SET job_title = role WHERE job_title IS NULL")
    if "is_seeded" not in emp_columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN is_seeded INTEGER DEFAULT 0")
        cursor.execute("UPDATE employees SET is_seeded = 1 WHERE is_seeded IS NULL")

    # Create tasks table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER REFERENCES employees(id),
            customer_name TEXT NOT NULL,
            contract TEXT NOT NULL,
            tenure INTEGER NOT NULL,
            monthly_charges REAL NOT NULL,
            churn_probability REAL NOT NULL,
            risk_level TEXT NOT NULL,
            input_features TEXT NOT NULL,
            top_factors TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL
        )
        """
    )

    # Maintain users and predictions_log tables
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS predictions_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER REFERENCES employees(id),
            timestamp TEXT NOT NULL,
            input_features TEXT NOT NULL,
            churn_probability REAL NOT NULL,
            top_factors TEXT NOT NULL
        )
        """
    )

    conn.commit()


def seed_database():
    print("======================================================================")
    print("PHASE 1: 50-EMPLOYEE SEEDING WITH FAKER (PRESERVING MANUAL RECORDS)")
    print("======================================================================\n")

    now_iso = datetime.now(timezone.utc).isoformat()
    SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        setup_sqlite_schema(conn)
        cursor = conn.cursor()

        # Clean previous seeded Faker records to guarantee exactly 50 fresh seeded Faker records
        cursor.execute("DELETE FROM employees WHERE is_seeded = 1 OR email LIKE '%@churnguard.enterprise'")
        conn.commit()

        # Count existing manual (non-seeded) employees
        cursor.execute("SELECT COUNT(*) FROM employees WHERE is_seeded = 0")
        manual_count = cursor.fetchone()[0]
        if manual_count > 0:
            print(f"-> Preserving {manual_count} manually inserted custom employee records.")

        # 1. Generate 50 realistic employees with Faker
        employees_data = []
        used_emails = set()

        for i in range(1, 51):
            full_name = fake.name()
            title_info = random.choice(JOB_TITLES)
            job_title = title_info[0]
            department = title_info[1]
            avatar_initials = get_avatar_initials(full_name)

            clean_name = full_name.lower().replace(" ", ".").replace("'", "").replace('"', "")
            email = f"{clean_name}.{i}@churnguard.enterprise"
            if email in used_emails:
                email = f"{clean_name}.{fake.unique.random_number(digits=4)}@churnguard.enterprise"
            used_emails.add(email)

            employees_data.append((
                full_name, # name
                full_name, # full_name
                job_title, # role
                job_title, # job_title
                department,
                avatar_initials,
                email,
                1,         # is_seeded = True
                now_iso
            ))

        cursor.executemany(
            """
            INSERT INTO employees (name, full_name, role, job_title, department, avatar_initials, email, is_seeded, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            employees_data
        )
        conn.commit()

        # 2. Check if tasks exist, seed sample tasks if needed
        cursor.execute("SELECT COUNT(*) FROM tasks")
        task_count = cursor.fetchone()[0]

        if task_count == 0:
            sample_tasks = [
                (
                    1,
                    "Acme Global Industries",
                    "Month-to-month",
                    2,
                    94.5,
                    0.9175,
                    "High",
                    json.dumps({
                        "customer_name": "Acme Global Industries",
                        "gender": "Female",
                        "SeniorCitizen": 0,
                        "Partner": "No",
                        "Dependents": "No",
                        "tenure": 2,
                        "Contract": "Month-to-month",
                        "PaperlessBilling": "Yes",
                        "PaymentMethod": "Electronic check",
                        "MonthlyCharges": 94.5,
                        "TotalCharges": 189.0,
                        "InternetService": "Fiber optic",
                        "OnlineSecurity": "No",
                        "TechSupport": "No",
                    }),
                    json.dumps([
                        {"feature": "Contract_Month-to-month", "shap_value": 0.6359, "effect": "Increases Churn Risk"},
                        {"feature": "tenure", "shap_value": 0.5556, "effect": "Increases Churn Risk"},
                        {"feature": "MonthlyCharges", "shap_value": 0.4307, "effect": "Increases Churn Risk"},
                    ]),
                    "pending",
                    now_iso,
                ),
                (
                    2,
                    "Starlight Logistics",
                    "Two year",
                    62,
                    42.0,
                    0.0008,
                    "Low",
                    json.dumps({
                        "customer_name": "Starlight Logistics",
                        "gender": "Male",
                        "SeniorCitizen": 0,
                        "Partner": "Yes",
                        "Dependents": "Yes",
                        "tenure": 62,
                        "Contract": "Two year",
                        "PaperlessBilling": "No",
                        "PaymentMethod": "Bank transfer (automatic)",
                        "MonthlyCharges": 42.0,
                        "TotalCharges": 2604.0,
                        "InternetService": "DSL",
                        "OnlineSecurity": "Yes",
                        "TechSupport": "Yes",
                    }),
                    json.dumps([
                        {"feature": "tenure", "shap_value": -2.8241, "effect": "Decreases Churn Risk"},
                        {"feature": "Contract_Month-to-month", "shap_value": -1.1961, "effect": "Decreases Churn Risk"},
                    ]),
                    "resolved",
                    now_iso,
                ),
                (
                    None,
                    "Apex Cloud Systems",
                    "Month-to-month",
                    4,
                    102.5,
                    0.8840,
                    "High",
                    json.dumps({
                        "customer_name": "Apex Cloud Systems",
                        "gender": "Male",
                        "SeniorCitizen": 0,
                        "Partner": "No",
                        "Dependents": "No",
                        "tenure": 4,
                        "Contract": "Month-to-month",
                        "PaperlessBilling": "Yes",
                        "PaymentMethod": "Electronic check",
                        "MonthlyCharges": 102.5,
                        "TotalCharges": 410.0,
                        "InternetService": "Fiber optic",
                        "OnlineSecurity": "No",
                        "TechSupport": "No",
                    }),
                    json.dumps([
                        {"feature": "MonthlyCharges", "shap_value": 0.5420, "effect": "Increases Churn Risk"},
                        {"feature": "Contract_Month-to-month", "shap_value": 0.5120, "effect": "Increases Churn Risk"},
                    ]),
                    "pending",
                    now_iso,
                ),
                (
                    3,
                    "Nexus Retail Corp",
                    "One year",
                    18,
                    78.0,
                    0.3642,
                    "Moderate",
                    json.dumps({
                        "customer_name": "Nexus Retail Corp",
                        "gender": "Female",
                        "SeniorCitizen": 1,
                        "Partner": "Yes",
                        "Dependents": "No",
                        "tenure": 18,
                        "Contract": "One year",
                        "PaperlessBilling": "Yes",
                        "PaymentMethod": "Credit card (automatic)",
                        "MonthlyCharges": 78.0,
                        "TotalCharges": 1404.0,
                        "InternetService": "Fiber optic",
                        "OnlineSecurity": "Yes",
                        "TechSupport": "No",
                    }),
                    json.dumps([
                        {"feature": "Contract_One year", "shap_value": -0.4215, "effect": "Decreases Churn Risk"},
                        {"feature": "MonthlyCharges", "shap_value": 0.2854, "effect": "Increases Churn Risk"},
                    ]),
                    "in_review",
                    now_iso,
                ),
                (
                    None,
                    "Vanguard Financial Partners",
                    "Month-to-month",
                    1,
                    112.0,
                    0.9410,
                    "High",
                    json.dumps({
                        "customer_name": "Vanguard Financial Partners",
                        "gender": "Male",
                        "SeniorCitizen": 0,
                        "Partner": "No",
                        "Dependents": "No",
                        "tenure": 1,
                        "Contract": "Month-to-month",
                        "PaperlessBilling": "Yes",
                        "PaymentMethod": "Electronic check",
                        "MonthlyCharges": 112.0,
                        "TotalCharges": 112.0,
                        "InternetService": "Fiber optic",
                        "OnlineSecurity": "No",
                        "TechSupport": "No",
                    }),
                    json.dumps([
                        {"feature": "Contract_Month-to-month", "shap_value": 0.7100, "effect": "Increases Churn Risk"},
                        {"feature": "MonthlyCharges", "shap_value": 0.5200, "effect": "Increases Churn Risk"},
                    ]),
                    "pending",
                    now_iso,
                ),
                (
                    4,
                    "Horizon Media Group",
                    "One year",
                    38,
                    65.0,
                    0.1820,
                    "Low",
                    json.dumps({
                        "customer_name": "Horizon Media Group",
                        "gender": "Female",
                        "SeniorCitizen": 0,
                        "Partner": "Yes",
                        "Dependents": "Yes",
                        "tenure": 38,
                        "Contract": "One year",
                        "PaperlessBilling": "No",
                        "PaymentMethod": "Bank transfer (automatic)",
                        "MonthlyCharges": 65.0,
                        "TotalCharges": 2470.0,
                        "InternetService": "DSL",
                        "OnlineSecurity": "Yes",
                        "TechSupport": "Yes",
                    }),
                    json.dumps([
                        {"feature": "tenure", "shap_value": -1.140, "effect": "Decreases Churn Risk"},
                        {"feature": "OnlineSecurity_Yes", "shap_value": -0.480, "effect": "Decreases Churn Risk"},
                    ]),
                    "resolved",
                    now_iso,
                ),
                (
                    None,
                    "Zenith Health Systems",
                    "Month-to-month",
                    6,
                    89.0,
                    0.7250,
                    "High",
                    json.dumps({
                        "customer_name": "Zenith Health Systems",
                        "gender": "Female",
                        "SeniorCitizen": 0,
                        "Partner": "Yes",
                        "Dependents": "No",
                        "tenure": 6,
                        "Contract": "Month-to-month",
                        "PaperlessBilling": "Yes",
                        "PaymentMethod": "Electronic check",
                        "MonthlyCharges": 89.0,
                        "TotalCharges": 534.0,
                        "InternetService": "Fiber optic",
                        "OnlineSecurity": "No",
                        "TechSupport": "No",
                    }),
                    json.dumps([
                        {"feature": "Contract_Month-to-month", "shap_value": 0.5820, "effect": "Increases Churn Risk"},
                        {"feature": "MonthlyCharges", "shap_value": 0.3110, "effect": "Increases Churn Risk"},
                    ]),
                    "pending",
                    now_iso,
                ),
            ]

            cursor.executemany(
                """
                INSERT INTO tasks (employee_id, customer_name, contract, tenure, monthly_charges, churn_probability, risk_level, input_features, top_factors, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                sample_tasks
            )
            conn.commit()

        # 3. Verification: SELECT COUNT(*) for seeded employees and total
        cursor.execute("SELECT COUNT(*) FROM employees WHERE is_seeded = 1")
        seeded_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM employees")
        total_count = cursor.fetchone()[0]

        cursor.execute("SELECT id, name, role, department, avatar_initials, is_seeded FROM employees WHERE is_seeded = 1 LIMIT 5")
        sample_rows = cursor.fetchall()

    print(f"-> Verification: SELECT COUNT(*) FROM employees WHERE is_seeded = 1 returned: {seeded_count}")
    print(f"-> Total Employees in Database (Seeded + Manual): {total_count}")
    print("\nSample Seeded Employees:")
    for r in sample_rows:
        print(f"   [{r[0]}] {r[1]} ({r[4]}) - {r[2]} | {r[3]} [Seeded: {bool(r[5])}]")

    if seeded_count == 50:
        print("\n[SUCCESS] Exactly 50 seeded employees verified in database alongside any existing data!")
        return True
    else:
        print(f"\n[FAILURE] Expected 50 seeded employees, got {seeded_count}")
        return False


if __name__ == "__main__":
    success = seed_database()
    if not success:
        exit(1)
