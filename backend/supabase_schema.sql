-- ==============================================================================
-- CUSTOMER CHURN PREDICTOR & AUTH PORTAL: COMBINED DATABASE SCRIPT
-- Target: PostgreSQL 15+ / Supabase
-- Description: Single-file execution containing:
--   1. Schema Creation (users & predictions_log tables)
--   2. Foreign Keys & Indexes
--   3. Row Level Security (RLS) & Policies
--   4. Documentation & Column Comments
--   5. Seed Data (Initial demo analyst user & sample predictions)
--   6. Analytical Views for Churn Intelligence
-- ==============================================================================

-- ==============================================================================
-- 1. TABLES DEFINITION
-- ==============================================================================

-- 1.1 Users Table (Authentication & User Profile)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1.2 Predictions Log Table (Inference History & SHAP Explainability)
CREATE TABLE IF NOT EXISTS public.predictions_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    input_features JSONB NOT NULL,
    churn_probability DOUBLE PRECISION NOT NULL,
    top_factors JSONB NOT NULL
);

-- ==============================================================================
-- 2. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email 
    ON public.users (email);

CREATE INDEX IF NOT EXISTS idx_predictions_log_timestamp 
    ON public.predictions_log (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_log_churn_prob 
    ON public.predictions_log (churn_probability);

CREATE INDEX IF NOT EXISTS idx_predictions_log_user_id 
    ON public.predictions_log (user_id);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow public select on predictions_log" ON public.predictions_log;
DROP POLICY IF EXISTS "Allow public insert on predictions_log" ON public.predictions_log;

CREATE POLICY "Allow public select on users" 
    ON public.users 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert on users" 
    ON public.users 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public select on predictions_log" 
    ON public.predictions_log 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert on predictions_log" 
    ON public.predictions_log 
    FOR INSERT 
    WITH CHECK (true);

-- ==============================================================================
-- 4. DOCUMENTATION & METADATA COMMENTS
-- ==============================================================================

COMMENT ON TABLE public.users IS 'Registered application users with bcrypt-hashed credentials';
COMMENT ON COLUMN public.users.hashed_password IS 'Bcrypt password hash with salt and rounds ($2b$12$...)';
COMMENT ON TABLE public.predictions_log IS 'Logs of customer churn predictions and local SHAP feature attributions';
COMMENT ON COLUMN public.predictions_log.input_features IS 'Customer input attributes snapshot in JSONB format';
COMMENT ON COLUMN public.predictions_log.churn_probability IS 'Predicted churn probability between 0.0000 and 1.0000';
COMMENT ON COLUMN public.predictions_log.top_factors IS 'Top 5 local SHAP attributions indicating directional feature impacts';

-- ==============================================================================
-- 5. ANALYTICAL VIEWS
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_high_risk_customers AS
SELECT 
    p.id AS prediction_id,
    p.timestamp,
    p.churn_probability,
    p.input_features->>'Contract' AS contract_type,
    p.input_features->>'tenure' AS tenure_months,
    p.input_features->>'MonthlyCharges' AS monthly_charges,
    p.input_features->>'InternetService' AS internet_service,
    p.top_factors->0->>'feature' AS primary_churn_driver,
    u.name AS evaluated_by_user,
    u.email AS evaluated_by_email
FROM public.predictions_log p
LEFT JOIN public.users u ON p.user_id = u.id
WHERE p.churn_probability >= 0.65;

CREATE OR REPLACE VIEW public.vw_contract_churn_summary AS
SELECT 
    input_features->>'Contract' AS contract_type,
    COUNT(*) AS total_evaluations,
    ROUND(AVG(churn_probability)::numeric, 4) AS avg_churn_rate,
    COUNT(*) FILTER (WHERE churn_probability >= 0.65) AS high_risk_count,
    COUNT(*) FILTER (WHERE churn_probability < 0.35) AS low_risk_count
FROM public.predictions_log
GROUP BY contract_type;

-- ==============================================================================
-- 6. INITIAL SEED DATA
-- ==============================================================================

INSERT INTO public.users (name, email, hashed_password)
VALUES (
    'Demo ML Analyst',
    'demo.analyst@company.com',
    '$2b$12$CyuMTaR8Euni3L0r9slld.GYx59B9yvB8h55P4x1Y7m9hDq0KqC82'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.predictions_log (input_features, churn_probability, top_factors)
VALUES (
    '{
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
        "TechSupport": "No"
    }'::jsonb,
    0.9175,
    '[
        {"feature": "Contract_Month-to-month", "shap_value": 0.6359, "effect": "Increases Churn Risk"},
        {"feature": "tenure", "shap_value": 0.5556, "effect": "Increases Churn Risk"},
        {"feature": "MonthlyCharges", "shap_value": 0.4307, "effect": "Increases Churn Risk"},
        {"feature": "PaymentMethod_Electronic check", "shap_value": 0.3849, "effect": "Increases Churn Risk"},
        {"feature": "InternetService_Fiber optic", "shap_value": 0.2695, "effect": "Increases Churn Risk"}
    ]'::jsonb
);

INSERT INTO public.predictions_log (input_features, churn_probability, top_factors)
VALUES (
    '{
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
        "TechSupport": "Yes"
    }'::jsonb,
    0.0008,
    '[
        {"feature": "tenure", "shap_value": -2.8241, "effect": "Decreases Churn Risk"},
        {"feature": "Contract_Month-to-month", "shap_value": -1.1961, "effect": "Decreases Churn Risk"},
        {"feature": "TotalCharges", "shap_value": -0.7669, "effect": "Decreases Churn Risk"},
        {"feature": "InternetService_Fiber optic", "shap_value": -0.5583, "effect": "Decreases Churn Risk"},
        {"feature": "Contract_Two year", "shap_value": -0.4663, "effect": "Decreases Churn Risk"}
    ]'::jsonb
);

SELECT 'Database schema, security policies, analytical views, and seed data applied successfully!' AS status;
