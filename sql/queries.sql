-- ==============================================================================
-- Useful Analytical Queries for Churn Monitoring
-- ==============================================================================

-- 1. High-Risk Customer Queue (Probability >= 65%)
SELECT 
    id,
    timestamp,
    churn_probability,
    input_features->>'Contract' AS contract_type,
    input_features->>'tenure' AS tenure_months,
    input_features->>'MonthlyCharges' AS monthly_charges,
    top_factors->0->>'feature' AS primary_risk_factor
FROM public.predictions_log
WHERE churn_probability >= 0.65
ORDER BY churn_probability DESC, timestamp DESC
LIMIT 50;

-- 2. Daily Prediction Volume and Average Churn Risk
SELECT 
    DATE_TRUNC('day', timestamp) AS log_date,
    COUNT(*) AS total_predictions,
    ROUND(AVG(churn_probability)::numeric, 4) AS avg_churn_risk,
    COUNT(*) FILTER (WHERE churn_probability >= 0.65) AS high_risk_count,
    COUNT(*) FILTER (WHERE churn_probability < 0.35) AS low_risk_count
FROM public.predictions_log
GROUP BY 1
ORDER BY log_date DESC;

-- 3. Risk Distribution by Contract Type
SELECT 
    input_features->>'Contract' AS contract_type,
    COUNT(*) AS total_evaluations,
    ROUND(AVG(churn_probability)::numeric, 4) AS avg_churn_rate,
    ROUND(MIN(churn_probability)::numeric, 4) AS min_churn_rate,
    ROUND(MAX(churn_probability)::numeric, 4) AS max_churn_rate
FROM public.predictions_log
GROUP BY contract_type
ORDER BY avg_churn_rate DESC;

-- 4. Recent Active Users & Evaluation Counts
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at,
    COUNT(p.id) AS total_predictions_run
FROM public.users u
LEFT JOIN public.predictions_log p ON p.user_id = u.id
GROUP BY u.id, u.name, u.email, u.created_at
ORDER BY total_predictions_run DESC;
