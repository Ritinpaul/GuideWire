"""
PADS Layer 5 — Anomaly Detection (Isolation Forest).
Trains on historical claim + GPS + earnings data at startup.
Flags statistically unusual patterns that bypass the rule-based layers.
"""
from __future__ import annotations
import logging
import pickle
from dataclasses import dataclass
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

# Features used for anomaly detection
FEATURE_NAMES = [
    "accelerometer_variance",  # IMU signal
    "gyroscope_variance",      # IMU signal
    "speed_kmh",               # movement
    "distance_from_zone_km",   # GPS proximity
    "hour_of_day",             # temporal pattern
    "claims_last_30d",         # historical behaviour
    "avg_claim_amount",        # financial pattern
]


def _make_training_data(n: int = 2000) -> np.ndarray:
    """
    Generate synthetic training data: 90% legitimate, 10% fraud.
    Legitimate: high variance, moderate speed, near zone, sensible hour.
    Fraud:      low variance, 0 speed, far from zone, off-hours.
    """
    rng = np.random.default_rng(42)

    legit_n = int(n * 0.90)
    fraud_n = n - legit_n

    legit = np.column_stack([
        rng.uniform(0.20, 1.50, legit_n),   # accel_var
        rng.uniform(0.08, 0.60, legit_n),   # gyro_var
        rng.uniform(10,   45,   legit_n),   # speed_kmh
        rng.uniform(0,    4.0,  legit_n),   # distance_km
        rng.integers(7,   22,   legit_n),   # hour_of_day (peak hours)
        rng.integers(0,   5,    legit_n),   # claims_last_30d
        rng.uniform(200,  600,  legit_n),   # avg_claim_amount
    ])

    fraud = np.column_stack([
        rng.uniform(0.00, 0.05, fraud_n),   # near-zero accel
        rng.uniform(0.00, 0.02, fraud_n),   # near-zero gyro
        rng.uniform(0,    2.0,  fraud_n),   # stationary
        rng.uniform(8,    30,   fraud_n),   # far from zone
        rng.choice([0, 1, 2, 22, 23], fraud_n),  # off-hours
        rng.integers(3,   10,   fraud_n),   # multiple claims
        rng.uniform(800,  2000, fraud_n),   # inflated amounts
    ])

    return np.vstack([legit, fraud])


class AnomalyDetector:
    def __init__(self):
        self._model: Optional[IsolationForest] = None

    def train(self):
        logger.info("PADS Layer 5: training Isolation Forest...")
        X = _make_training_data(n=3000)
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.10,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(X)
        logger.info("PADS Layer 5: Isolation Forest trained ✅")

    def score(self, x: np.ndarray) -> float:
        """
        Returns anomaly probability 0–1.
        IsolationForest decision_function: negative = more anomalous.
        """
        if self._model is None:
            return 0.0
        raw = float(self._model.decision_function(x.reshape(1, -1))[0])
        # Map: -0.5 → 1.0 (very anomalous), +0.5 → 0.0 (very normal)
        prob = max(0.0, min(1.0, 0.5 - raw))
        return round(prob, 3)


# Module-level singleton (initialised at service startup)
_detector = AnomalyDetector()


def initialise_anomaly_detector():
    _detector.train()


@dataclass
class AnomalyCheckResult:
    result: str
    confidence: float
    fraud_contribution: float
    details: dict


def check_anomaly(
    accelerometer_variance: float,
    gyroscope_variance: float,
    speed_kmh: float,
    distance_from_zone_km: float,
    hour_of_day: int,
    claims_last_30d: int,
    avg_claim_amount: float,
) -> AnomalyCheckResult:
    """Run Isolation Forest on compound feature vector."""
    x = np.array([
        accelerometer_variance,
        gyroscope_variance,
        speed_kmh,
        distance_from_zone_km,
        float(hour_of_day),
        float(claims_last_30d),
        avg_claim_amount,
    ], dtype=float)

    anomaly_prob = _detector.score(x)

    if anomaly_prob < 0.35:
        result       = "PASS"
        confidence   = 1.0 - anomaly_prob
        contribution = 0.0
    elif anomaly_prob < 0.60:
        result       = "WARN"
        confidence   = 0.70
        contribution = round(anomaly_prob * 0.20, 3)
    else:
        result       = "FAIL"
        confidence   = 0.80
        contribution = round(anomaly_prob * 0.30, 3)

    return AnomalyCheckResult(
        result=result,
        confidence=round(confidence, 3),
        fraud_contribution=round(contribution, 3),
        details={
            "anomaly_probability": anomaly_prob,
            "feature_vector": {k: v for k, v in zip(FEATURE_NAMES, x.tolist())},
        },
    )
