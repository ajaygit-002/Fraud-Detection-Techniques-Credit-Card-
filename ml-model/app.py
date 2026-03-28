from datetime import datetime
from typing import Dict, List

import numpy as np
from flask import Flask, jsonify, request
from sklearn.linear_model import LogisticRegression

app = Flask(__name__)

HIGH_RISK_MERCHANTS = {
    "electronics",
    "gift_cards",
    "luxury_goods",
    "crypto",
}


def build_training_data(size: int = 2500) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed=42)

    amount = rng.gamma(shape=2.0, scale=400.0, size=size)
    hour = rng.integers(0, 24, size=size)
    merchant_risk = rng.binomial(1, 0.25, size=size)
    international = rng.binomial(1, 0.2, size=size)

    noise = rng.normal(0, 0.7, size=size)
    fraud_score = (
        0.0018 * amount
        + 1.1 * (hour <= 5)
        + 1.6 * merchant_risk
        + 1.3 * international
        + noise
    )

    labels = (fraud_score > 2.4).astype(int)
    features = np.column_stack((amount, hour, merchant_risk, international))
    return features, labels


X_train, y_train = build_training_data()
MODEL = LogisticRegression(max_iter=500)
MODEL.fit(X_train, y_train)


def normalize_payload(payload: Dict[str, object]) -> Dict[str, object]:
    amount = float(payload.get("amount", 0))
    merchant = str(payload.get("merchant", "")).strip().lower()
    hour = int(payload.get("hour", datetime.utcnow().hour))
    international = bool(payload.get("international", False))

    return {
        "amount": amount,
        "hour": max(0, min(hour, 23)),
        "merchant_risk": 1 if merchant in HIGH_RISK_MERCHANTS else 0,
        "international": 1 if international else 0,
    }


def risk_bucket(probability: float) -> str:
    if probability >= 0.75:
        return "high"
    if probability >= 0.45:
        return "medium"
    return "low"


def build_reasons(features: Dict[str, object]) -> List[str]:
    reasons: List[str] = []
    if features["amount"] > 2500:
        reasons.append("high_amount")
    if features["hour"] <= 5:
        reasons.append("late_night_transaction")
    if features["merchant_risk"] == 1:
        reasons.append("high_risk_merchant")
    if features["international"] == 1:
        reasons.append("international_transaction")
    return reasons


@app.get("/health")
def health() -> tuple[Dict[str, str], int]:
    return {"status": "ok"}, 200


@app.post("/predict")
def predict() -> tuple[Dict[str, object], int]:
    payload = request.get_json(silent=True) or {}
    features = normalize_payload(payload)

    feature_vector = np.array(
        [
            [
                features["amount"],
                features["hour"],
                features["merchant_risk"],
                features["international"],
            ]
        ]
    )

    fraud_probability = float(MODEL.predict_proba(feature_vector)[0][1])
    score = risk_bucket(fraud_probability)
    reasons = build_reasons(features)

    response = {
        "fraud": fraud_probability >= 0.5,
        "confidence": round(fraud_probability, 4),
        "riskScore": score,
        "reasons": reasons,
    }
    return jsonify(response), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
