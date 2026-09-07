-- ==============================================================================
-- Customer Churn Predictor: Seed Script (Idempotent & 42P10-Proof)
-- Populates initial test analyst, enterprise staff, and demo prediction records
-- ==============================================================================

-- 1. Insert Initial Demo User
-- Password is: SecurePassword2026! (bcrypt hash: $2b$12$CyuMTaR8Euni3L0r9slld.GYx59B9yvB8h55P4x1Y7m9hDq0KqC82)
INSERT INTO public.users (name, email, hashed_password)
SELECT 
    'Demo ML Analyst',
    'demo.analyst@company.com',
    '$2b$12$CyuMTaR8Euni3L0r9slld.GYx59B9yvB8h55P4x1Y7m9hDq0KqC82'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE LOWER(email) = LOWER('demo.analyst@company.com')
);

-- 2. Insert Enterprise Retention Staff
INSERT INTO public.employees (name, full_name, role, job_title, department, avatar_initials, email, is_seeded)
SELECT v.name, v.full_name, v.role, v.job_title, v.department, v.avatar_initials, v.email, TRUE
FROM (VALUES 
    ('Elena Rostova', 'Elena Rostova', 'Senior Retention Specialist', 'Senior Retention Specialist', 'Customer Success', 'ER', 'elena.rostova@enterprise.ai'),
    ('Marcus Vance', 'Marcus Vance', 'Key Account Executive', 'Key Account Executive', 'Enterprise Accounts', 'MV', 'marcus.vance@enterprise.ai'),
    ('Sarah Chen', 'Sarah Chen', 'Churn Risk Analyst', 'Churn Risk Analyst', 'Risk & Operations', 'SC', 'sarah.chen@enterprise.ai'),
    ('David Miller', 'David Miller', 'Customer Lifecycle Manager', 'Customer Lifecycle Manager', 'Client Operations', 'DM', 'david.miller@enterprise.ai')
) AS v(name, full_name, role, job_title, department, avatar_initials, email)
WHERE NOT EXISTS (
    SELECT 1 FROM public.employees e WHERE LOWER(e.email) = LOWER(v.email)
);

-- 3. Insert Sample High-Risk Prediction Log
INSERT INTO public.predictions_log (employee_id, input_features, churn_probability, top_factors)
SELECT 
    (SELECT id FROM public.employees WHERE email = 'elena.rostova@enterprise.ai' LIMIT 1),
    '{
        "customer_name": "Acme Global Dynamics",
        "tenure": 2,
        "Contract": "Month-to-month",
        "MonthlyCharges": 94.5,
        "InternetService": "Fiber optic",
        "PaymentMethod": "Electronic check"
    }'::jsonb,
    0.9175,
    '[
        {"feature": "Contract_Month-to-month", "shap_value": 0.6359, "effect": "Increases Churn Risk"},
        {"feature": "tenure", "shap_value": 0.5556, "effect": "Increases Churn Risk"},
        {"feature": "MonthlyCharges", "shap_value": 0.4307, "effect": "Increases Churn Risk"}
    ]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.predictions_log 
    WHERE input_features->>'customer_name' = 'Acme Global Dynamics'
);

-- 4. Insert Sample Low-Risk Prediction Log
INSERT INTO public.predictions_log (employee_id, input_features, churn_probability, top_factors)
SELECT 
    (SELECT id FROM public.employees WHERE email = 'marcus.vance@enterprise.ai' LIMIT 1),
    '{
        "customer_name": "Starlight Logistics",
        "tenure": 62,
        "Contract": "Two year",
        "MonthlyCharges": 42.0,
        "InternetService": "DSL",
        "PaymentMethod": "Bank transfer (automatic)"
    }'::jsonb,
    0.0008,
    '[
        {"feature": "tenure", "shap_value": -2.8241, "effect": "Decreases Churn Risk"},
        {"feature": "Contract_Month-to-month", "shap_value": -1.1961, "effect": "Decreases Churn Risk"}
    ]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.predictions_log 
    WHERE input_features->>'customer_name' = 'Starlight Logistics'
);
