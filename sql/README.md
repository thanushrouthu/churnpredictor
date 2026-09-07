# Database Scripts (`sql/`)

This directory contains database DDL definitions, seed datasets, and analytical queries for the Customer Churn Predictor.

---

## File Overview

| File | Description |
|---|---|
| [`combined.sql`](file:///c:/Users/thanu/OneDrive/Documents/Desktop/TASK-2/sql/combined.sql) | **(Recommended)** All-in-one execution script containing table schemas, safe migrations, unique constraints, performance indexes, RLS policies, views, and seed data. Guaranteed 42P10-safe. |
| [`schema.sql`](file:///c:/Users/thanu/OneDrive/Documents/Desktop/TASK-2/sql/schema.sql) | Standalone database DDL defining `users`, `employees`, `tasks`, and `predictions_log` tables, foreign keys, unique indexes, and Row Level Security (RLS) policies. |
| [`seed.sql`](file:///c:/Users/thanu/OneDrive/Documents/Desktop/TASK-2/sql/seed.sql) | Standalone idempotent seed data inserting the default demo analyst account (`demo.analyst@company.com`), enterprise retention staff, and sample inference logs. |
| [`queries.sql`](file:///c:/Users/thanu/OneDrive/Documents/Desktop/TASK-2/sql/queries.sql) | Production analytical queries for cohort tracking, daily prediction volume, contract churn rates, and high-risk customer queues. |

---

## How to Apply to Supabase

### Option 1: Recommended Single-File Execution
1. Open your **Supabase Dashboard** -> Navigate to **SQL Editor**.
2. Open [`combined.sql`](file:///c:/Users/thanu/OneDrive/Documents/Desktop/TASK-2/sql/combined.sql), copy its entire contents, paste it into the SQL Editor, and click **Run**.
3. All tables, migrations, constraints, views, and initial seed data will be applied cleanly in a single step.

### Option 2: Modular Execution
1. Open your **Supabase Dashboard** -> Navigate to **SQL Editor**.
2. Create a new query, paste the contents of [`schema.sql`](file:///c:/Users/thanu/OneDrive/Documents/Desktop/TASK-2/sql/schema.sql), and click **Run**.
3. (Optional) Run [`seed.sql`](file:///c:/Users/thanu/OneDrive/Documents/Desktop/TASK-2/sql/seed.sql) to populate initial sample records.

## Local Development Persistence
The FastAPI backend (`backend/db.py`) connects to your remote Supabase instance when credentials are configured in `.env`. If running locally without remote credentials, it automatically provides a persistent local SQLite fallback in `data/app.db` with an identical schema.
