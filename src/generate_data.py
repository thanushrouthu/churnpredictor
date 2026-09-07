"""
Script to generate realistic Telco Customer Churn dataset matching IBM / Kaggle schema.
Ensures representative class imbalance (~26% Churn = Yes, ~74% Churn = No), categorical features,
numerical features, and missing values to thoroughly exercise the preprocessing and SMOTE pipeline.
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)
n_samples = 3500

customer_ids = [f"{i:04d}-{np.random.choice(['ABCD', 'WXYZ', 'LMNO'])}{np.random.randint(10, 99)}" for i in range(n_samples)]

genders = np.random.choice(["Male", "Female"], size=n_samples, p=[0.5, 0.5])
senior_citizens = np.random.choice([0, 1], size=n_samples, p=[0.84, 0.16])
partners = np.random.choice(["Yes", "No"], size=n_samples, p=[0.48, 0.52])
dependents = np.where(partners == "No", 
                      np.random.choice(["Yes", "No"], size=n_samples, p=[0.10, 0.90]),
                      np.random.choice(["Yes", "No"], size=n_samples, p=[0.45, 0.55]))

contracts = np.random.choice(["Month-to-month", "One year", "Two year"], size=n_samples, p=[0.55, 0.21, 0.24])
paperless = np.random.choice(["Yes", "No"], size=n_samples, p=[0.59, 0.41])
payment_methods = np.random.choice(
    ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"],
    size=n_samples,
    p=[0.34, 0.23, 0.22, 0.21]
)

tenures = []
for c in contracts:
    if c == "Month-to-month":
        tenures.append(int(np.clip(np.random.exponential(scale=12), 1, 72)))
    elif c == "One year":
        tenures.append(int(np.clip(np.random.normal(loc=36, scale=12), 1, 72)))
    else:
        tenures.append(int(np.clip(np.random.normal(loc=56, scale=10), 1, 72)))
tenures = np.array(tenures)

internet_services = np.random.choice(["Fiber optic", "DSL", "No"], size=n_samples, p=[0.44, 0.34, 0.22])
online_security = []
tech_support = []
for inet in internet_services:
    if inet == "No":
        online_security.append("No internet service")
        tech_support.append("No internet service")
    else:
        online_security.append(np.random.choice(["Yes", "No"], p=[0.38, 0.62]))
        tech_support.append(np.random.choice(["Yes", "No"], p=[0.37, 0.63]))

monthly_charges = []
for inet, sec in zip(internet_services, online_security):
    base = 20.0 if inet == "No" else (70.0 if inet == "Fiber optic" else 45.0)
    extra = 15.0 if sec == "Yes" else 0.0
    jitter = np.random.normal(loc=0, scale=5.0)
    monthly_charges.append(round(float(np.clip(base + extra + jitter, 18.0, 118.0)), 2))
monthly_charges = np.array(monthly_charges)

total_charges = [round(float(m * t + np.random.normal(0, 5)), 2) for m, t in zip(monthly_charges, tenures)]

# Inject realistic missing values
total_charges = [None if np.random.rand() < 0.015 else tc for tc in total_charges]
tenures_with_nan = [np.nan if np.random.rand() < 0.01 else t for t in tenures]

# Ground Truth Churn with ~26% Churn rate (imbalanced)
churn_probs = []
for i in range(n_samples):
    z = -2.3  # lower base logit for realistic imbalance
    if contracts[i] == "Month-to-month":
        z += 1.3
    elif contracts[i] == "Two year":
        z -= 1.4
    if internet_services[i] == "Fiber optic":
        z += 0.85
    if payment_methods[i] == "Electronic check":
        z += 0.55
    if online_security[i] == "No":
        z += 0.45
    if senior_citizens[i] == 1:
        z += 0.25
    z -= 0.045 * (tenures[i] if not np.isnan(tenures[i]) else 24)
    z += 0.012 * monthly_charges[i]
    prob = 1.0 / (1.0 + np.exp(-z))
    churn_probs.append(prob)

churn_labels = ["Yes" if np.random.rand() < p else "No" for p in churn_probs]

df = pd.DataFrame({
    "customerID": customer_ids,
    "gender": genders,
    "SeniorCitizen": senior_citizens,
    "Partner": partners,
    "Dependents": dependents,
    "tenure": tenures_with_nan,
    "InternetService": internet_services,
    "OnlineSecurity": online_security,
    "TechSupport": tech_support,
    "Contract": contracts,
    "PaperlessBilling": paperless,
    "PaymentMethod": payment_methods,
    "MonthlyCharges": monthly_charges,
    "TotalCharges": total_charges,
    "Churn": churn_labels
})

out_dir = Path(__file__).resolve().parent.parent / "data"
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / "customer_churn.csv"
df.to_csv(out_file, index=False)
print(f"Successfully generated {len(df)} records in {out_file}")
print("Class distribution:")
print(df["Churn"].value_counts())
print(df["Churn"].value_counts(normalize=True))
