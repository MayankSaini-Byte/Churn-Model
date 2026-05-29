import os
import json
import pickle
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

MODEL_PATH  = os.path.join("models", "logistic_model.pkl")
SCALER_PATH = os.path.join("models", "scaler.pkl")
META_PATH   = os.path.join("models", "model_meta.json")

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(META_PATH, "r") as f:
    model_meta = json.load(f)

OPTIMAL_THRESHOLD = model_meta["optimal_threshold"]

print("[OK] Model and scaler loaded successfully.")
print(f"[OK] Optimal threshold: {OPTIMAL_THRESHOLD:.4f}")
print(f"[OK] ROC-AUC (test):    {model_meta['roc_auc']}")
print(f"[OK] PR-AUC  (test):    {model_meta['pr_auc']}")

FEATURE_COLUMNS = model_meta["feature_columns"]


def build_feature_row(data: dict) -> pd.DataFrame:
    row = {col: 0 for col in FEATURE_COLUMNS}

    row["tenure"]         = float(data.get("tenure", 0))
    row["MonthlyCharges"] = float(data.get("MonthlyCharges", 0))

    if data.get("gender")           == "Male":  row["gender_Male"]          = 1
    if data.get("SeniorCitizen")    == "Yes":   row["SeniorCitizen_Yes"]    = 1
    if data.get("Partner")          == "Yes":   row["Partner_Yes"]          = 1
    if data.get("Dependents")       == "Yes":   row["Dependents_Yes"]       = 1
    if data.get("PaperlessBilling") == "Yes":   row["PaperlessBilling_Yes"] = 1

    ml = data.get("MultipleLines", "No")
    if ml == "No phone service":  row["MultipleLines_No phone service"] = 1
    elif ml == "Yes":             row["MultipleLines_Yes"]              = 1

    isp = data.get("InternetService", "DSL")
    if isp == "Fiber optic":  row["InternetService_Fiber optic"] = 1
    elif isp == "No":         row["InternetService_No"]          = 1

    os_ = data.get("OnlineSecurity", "No")
    if os_ == "No internet service":  row["OnlineSecurity_No internet service"] = 1
    elif os_ == "Yes":                row["OnlineSecurity_Yes"]                 = 1

    ob = data.get("OnlineBackup", "No")
    if ob == "No internet service":  row["OnlineBackup_No internet service"] = 1
    elif ob == "Yes":                row["OnlineBackup_Yes"]                  = 1

    dp = data.get("DeviceProtection", "No")
    if dp == "No internet service":  row["DeviceProtection_No internet service"] = 1
    elif dp == "Yes":                row["DeviceProtection_Yes"]                 = 1

    ts = data.get("TechSupport", "No")
    if ts == "No internet service":  row["TechSupport_No internet service"] = 1
    elif ts == "Yes":                row["TechSupport_Yes"]                  = 1

    stv = data.get("StreamingTV", "No")
    if stv == "No internet service":  row["StreamingTV_No internet service"] = 1
    elif stv == "Yes":                row["StreamingTV_Yes"]                  = 1

    smv = data.get("StreamingMovies", "No")
    if smv == "No internet service":  row["StreamingMovies_No internet service"] = 1
    elif smv == "Yes":                row["StreamingMovies_Yes"]                  = 1

    contract = data.get("Contract", "Month-to-month")
    if contract == "One year":   row["Contract_One year"]  = 1
    elif contract == "Two year": row["Contract_Two year"]  = 1

    pm = data.get("PaymentMethod", "Bank transfer")
    if pm == "Credit card":        row["PaymentMethod_Credit card"]      = 1
    elif pm == "Electronic check": row["PaymentMethod_Electronic check"] = 1
    elif pm == "Mailed check":     row["PaymentMethod_Mailed check"]     = 1

    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


def get_recommendation(churn_probability: float) -> dict:
    prob_pct = churn_probability * 100

    if prob_pct < 35:
        return {
            "risk_level": "Low",
            "risk_color": "green",
            "title": "Customer Likely to Stay",
            "message": (
                "This customer shows strong loyalty signals. "
                "Continue delivering excellent service and consider "
                "offering loyalty rewards to maintain retention."
            ),
            "actions": [
                "Offer loyalty discount or upgrade",
                "Send personalized satisfaction survey",
                "Introduce premium add-on services",
            ],
        }
    elif prob_pct < 60:
        return {
            "risk_level": "Medium",
            "risk_color": "orange",
            "title": "Moderate Churn Risk",
            "message": (
                "This customer shows some warning signs. "
                "Proactive engagement now can significantly improve retention."
            ),
            "actions": [
                "Reach out with a personalized offer",
                "Review billing concerns or service issues",
                "Offer contract upgrade with discount",
            ],
        }
    else:
        return {
            "risk_level": "High",
            "risk_color": "red",
            "title": "High Churn Risk — Immediate Action Required",
            "message": (
                "This customer is at serious risk of leaving. "
                "An immediate, targeted retention strategy is strongly recommended."
            ),
            "actions": [
                "Assign dedicated account manager",
                "Offer significant discount or free service month",
                "Escalate to retention team immediately",
            ],
        }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()

        feature_df = build_feature_row(data)
        feature_scaled = scaler.transform(feature_df)
        churn_prob = float(model.predict_proba(feature_scaled)[0][1])
        stay_prob  = 1.0 - churn_prob
        prediction = int(churn_prob >= OPTIMAL_THRESHOLD)
        recommendation = get_recommendation(churn_prob)

        response = {
            "success":           True,
            "prediction":        prediction,
            "churn_label":       "Churn" if prediction == 1 else "No Churn",
            "churn_probability": round(churn_prob * 100, 2),
            "stay_probability":  round(stay_prob  * 100, 2),
            "recommendation":    recommendation,
            "threshold_used":    round(OPTIMAL_THRESHOLD * 100, 1),
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
