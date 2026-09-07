You are a Staff-Level ML Engineer and Full-Stack Developer. We are building a modern, production-grade Customer Churn Predictor. 

TECH STACK:
- ML: scikit-learn, XGBoost, imbalanced-learn (SMOTE), SHAP
- Backend: FastAPI, Uvicorn, Supabase (PostgreSQL)
- Frontend: React (Vite), Tailwind CSS, Recharts, Lucide Icons

EXECUTION PROTOCOL:
Do not attempt to build the entire system at once. Execute this project in the 5 sequential phases below. For each phase, you must:
1. Write the code.
2. Run an execution test to prove it works.
3. Validate the explicit "Done Criteria".
4. STOP. Present your verification results and ask for my approval before proceeding to the next phase.

---

PHASE 1: Scaffolding & Database Setup
Task:
Initialize the repository structure (data/, notebooks/, src/, backend/, frontend/). Generate a `requirements.txt` with all necessary ML and backend Python packages. Create a `backend/db.py` utilizing the `supabase` Python client. Write a Supabase SQL script to create a `predictions_log` table (timestamp, input_features JSON, churn_probability, top_factors). 
Done Criteria: 
- Directory structure exists.
- `backend/db.py` contains a working initialization function connecting to Supabase via environment variables.

PHASE 2: Data Preprocessing & Class Balancing
Task: 
Assume `data/customer_churn.csv` is present. Write `src/preprocessing.py`. Build a scikit-learn `ColumnTransformer` pipeline that imputes missing values, applies One-Hot Encoding to categorical variables (contract type), and Standardizes numerical attributes (tenure, monthly charges). Write a script to apply SMOTE to the training set to address class imbalance.
Done Criteria: 
- The script executes successfully against the dataset.
- Prints the class distribution before and after SMOTE, proving balance was achieved. 

PHASE 3: Model Training, Evaluation & Explainability
Task:
Write `src/train.py` to train an XGBoost classifier on the SMOTE-balanced data. Serialize the entire pipeline (preprocessing + model) using `joblib` into `models/churn_pipeline.pkl`. Write `src/evaluate.py` to calculate ROC-AUC, Recall, and generate a Precision-Recall curve on a strictly held-out test set. Write `src/explain.py` that loads the model, runs SHAP TreeExplainer, and extracts the top 5 global drivers of churn.
Done Criteria:
- Training script successfully saves `churn_pipeline.pkl`.
- Evaluation script prints an ROC-AUC score > 0.75 and a clear confusion matrix.
- Explain script successfully outputs a list of the top 5 feature importances.

PHASE 4: FastAPI Backend Integration
Task:
Write `backend/main.py` using FastAPI. Load the `.pkl` artifact on startup. Create a `POST /predict` endpoint that accepts a Pydantic model of customer features. The endpoint must:
1. Pass the features through the pipeline to get a churn probability.
2. Calculate local SHAP values for that specific user to identify their top risk factors.
3. Asynchronously log the request and result to Supabase using `db.py`.
4. Return the probability and factors as JSON.
Done Criteria:
- FastAPI server starts successfully.
- You write and execute a local Python `requests` script sending dummy JSON to `/predict` and it returns a 200 OK with the correct response schema.

PHASE 5: Premium React Dashboard & UI Verification
Task:
Initialize a Vite React application in `frontend/`. Install Tailwind CSS, Recharts, and Lucide React. Build a sleek, modern dashboard featuring:
1. A clean input form for customer attributes (Tenure, Charges, Contract Type, etc.).
2. A visual prediction output (e.g., a color-coded circular gauge for Churn Risk).
3. A dynamic Recharts bar chart displaying the local SHAP risk factors returned by the API.
Done Criteria:
- The React app compiles without errors.
- Use your `/browser` tool to launch a headless Chrome instance, navigate to the local Vite server, fill out the form, and click submit. 
- Verify the UI successfully displays the API response. Take a screenshot of the passing UI test for my review.
