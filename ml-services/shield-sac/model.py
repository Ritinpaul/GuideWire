"""
Shield-SAC Model — XGBoost premium pricer with Fairness Shield.

Fairness constraint (HARD GUARANTEE — always applied post-prediction):
  premium ≤ 5% of weekly earnings
  coverage ≥ 2× premium

Plan tiers (based on coverage amount):
  LOW:    coverage ≤ ₹1500   premium ~₹15–₹25
  MEDIUM: coverage ≤ ₹3000   premium ~₹25–₹45
  HIGH:   coverage > ₹3000   premium ~₹45–₹80
"""
from __future__ import annotations
import logging
import os
import pathlib
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from synthetic_data import FEATURE_NAMES, generate

logger = logging.getLogger(__name__)

MODEL_PATH = pathlib.Path(os.getenv("MODEL_PATH", "/app/models/shield_sac.pkl"))

PLAN_TIERS = {
    "LOW":    {"max_coverage": 1500,  "colour": "🟡"},
    "MEDIUM": {"max_coverage": 3000,  "colour": "🟠"},
    "HIGH":   {"max_coverage": 99999, "colour": "🔴"},
}

FAIRNESS_MAX_PREMIUM_PCT = 0.05   # 5% of weekly earnings
FAIRNESS_MIN_COVERAGE_MULT = 2.0  # coverage ≥ 2× premium
MIN_PREMIUM = 15.0


class ShieldSACModel:
    def __init__(self):
        self._model: Optional[xgb.XGBRegressor] = None
        self._explainer: Optional[shap.TreeExplainer] = None
        self._metrics: dict = {}
        self._trained: bool = False

    # ── Training ──────────────────────────────────────────────────────────
    def train(self, n_samples: int = 50_000):
        logger.info("Shield-SAC: generating %d synthetic training records...", n_samples)
        X, y = generate(n=n_samples)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.15, random_state=42
        )

        logger.info("Shield-SAC: training XGBoost...")
        self._model = xgb.XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.80,
            colsample_bytree=0.80,
            min_child_weight=5,
            random_state=42,
            tree_method="hist",
            n_jobs=-1,
        )
        self._model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )

        # Metrics
        y_pred = self._model.predict(X_test)
        self._metrics = {
            "mae":   round(float(mean_absolute_error(y_test, y_pred)), 2),
            "r2":    round(float(r2_score(y_test, y_pred)), 4),
            "n_train": len(X_train),
        }
        logger.info("Shield-SAC: training done — MAE=₹%.2f R²=%.4f ✅", self._metrics["mae"], self._metrics["r2"])

        # SHAP explainer
        self._explainer = shap.TreeExplainer(self._model)
        self._trained = True

        # Persist
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": self._model, "metrics": self._metrics}, MODEL_PATH)
        logger.info("Shield-SAC: model saved to %s", MODEL_PATH)

    def load(self) -> bool:
        if MODEL_PATH.exists():
            try:
                data = joblib.load(MODEL_PATH)
                self._model   = data["model"]
                self._metrics = data.get("metrics", {})
                self._explainer = shap.TreeExplainer(self._model)
                self._trained = True
                logger.info("Shield-SAC: model loaded from %s ✅", MODEL_PATH)
                return True
            except Exception as exc:
                logger.warning("Shield-SAC: failed to load saved model: %s", exc)
        return False

    def ensure_ready(self):
        """Load from disk if available, otherwise train from scratch."""
        if not self.load():
            self.train()

    # ── Prediction ────────────────────────────────────────────────────────
    def predict(self, features: dict, language: str = "en") -> dict:
        if not self._trained or self._model is None:
            raise RuntimeError("Model not trained")

        # Build feature vector in correct column order
        df = pd.DataFrame([{name: features.get(name, 0.0) for name in FEATURE_NAMES}])
        raw_premium = float(self._model.predict(df)[0])

        avg_earnings   = float(features.get("avg_earnings", 500))
        weekly_earnings = avg_earnings * 7

        # ── Fairness Shield ───────────────────────────────────────────────
        max_premium = weekly_earnings * FAIRNESS_MAX_PREMIUM_PCT
        premium     = max(MIN_PREMIUM, min(raw_premium, max_premium))

        # Coverage: 2× premium, then tier-bump if affordable
        coverage = max(premium * FAIRNESS_MIN_COVERAGE_MULT, 1500)

        # Determine plan tier
        if coverage <= 1500 or premium <= 25:
            tier     = "LOW"
            coverage = 1500
        elif coverage <= 3000 or premium <= 45:
            tier     = "MEDIUM"
            coverage = 3000
        else:
            tier     = "HIGH"
            coverage = 5000

        # Fairness re-check after tier snap
        premium = min(premium, max_premium)
        premium = round(premium, 2)

        # Confidence
        confidence = min(0.95, max(0.70, 1.0 - abs(raw_premium - premium) / max(premium, 1) * 0.2))

        # Fairness check metadata
        fairness_applied = raw_premium > max_premium
        fairness = {
            "applied":              fairness_applied,
            "raw_predicted_premium": round(raw_premium, 2),
            "max_allowed_premium":  round(max_premium, 2),
            "weekly_earnings":      round(weekly_earnings, 2),
            "premium_pct_earnings": round(premium / weekly_earnings * 100, 2),
        }

        # SHAP explanation
        from explain import get_shap_explanation
        x_array = df.values[0]
        shap_explanation = {}
        if self._explainer:
            try:
                shap_explanation = get_shap_explanation(
                    self._explainer, x_array, FEATURE_NAMES,
                    raw_premium, premium, language
                )
            except Exception as exc:
                logger.warning("SHAP explanation failed: %s", exc)

        return {
            "premium_inr":      premium,
            "coverage_inr":     float(coverage),
            "plan_tier":        tier,
            "confidence":       round(confidence, 3),
            "fairness_check":   fairness,
            "shap_explanation": shap_explanation,
            "model_metrics":    self._metrics,
        }


# Module-level singleton
_model = ShieldSACModel()


def get_model() -> ShieldSACModel:
    return _model
