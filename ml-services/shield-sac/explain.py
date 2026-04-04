"""
Shield-SAC SHAP Explainer.
Produces human-readable premium factor explanations for workers.
Language-aware: outputs both English and Hindi labels.
"""
from __future__ import annotations
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Human-readable factor labels (English + Hindi)
FACTOR_LABELS = {
    "rain_mm":                    {"en": "Rainfall risk",            "hi": "बारिश का जोखिम"},
    "temp_c":                     {"en": "Temperature stress",       "hi": "तापमान"},
    "humidity":                   {"en": "Humidity",                 "hi": "आर्द्रता"},
    "wind_kmh":                   {"en": "Wind risk",                "hi": "हवा का जोखिम"},
    "aqi":                        {"en": "Air quality",              "hi": "वायु गुणवत्ता"},
    "cloud_pct":                  {"en": "Cloud cover",              "hi": "बादल"},
    "visibility_km":              {"en": "Visibility",               "hi": "दृश्यता"},
    "flood_score":                {"en": "Flood-prone zone",         "hi": "बाढ़ क्षेत्र"},
    "historical_disruption_rate": {"en": "Historical disruptions",   "hi": "ऐतिहासिक व्यवधान"},
    "population_density_bucket":  {"en": "Area density",             "hi": "क्षेत्र घनत्व"},
    "avg_earnings":               {"en": "Your earnings level",      "hi": "आपकी कमाई"},
    "days_active":                {"en": "Active days on platform",  "hi": "सक्रिय दिन"},
    "claim_count":                {"en": "Past claims",              "hi": "पिछले दावे"},
    "claim_ratio":                {"en": "Claim history",            "hi": "दावा इतिहास"},
    "day_of_week":                {"en": "Day of week",              "hi": "सप्ताह का दिन"},
    "month":                      {"en": "Month / Season",           "hi": "महीना / मौसम"},
    "is_monsoon":                 {"en": "Monsoon season",           "hi": "मानसून मौसम"},
}


def get_shap_explanation(
    shap_explainer,
    feature_input: np.ndarray,
    feature_names: list[str],
    base_premium: float,
    final_premium: float,
    language: str = "en",
) -> dict:
    """
    Compute SHAP values and return a structured explanation object.
    Returns top 5 factors with direction (increase/decrease premium).
    """
    try:
        shap_values = shap_explainer(feature_input.reshape(1, -1))
        values = shap_values.values[0]
    except Exception as exc:
        logger.warning("SHAP computation failed: %s — using zero values", exc)
        values = np.zeros(len(feature_names))

    lang = language if language in ("en", "hi") else "en"

    factors = []
    for feature, value, raw_val in zip(feature_names, values, feature_input):
        label_dict = FACTOR_LABELS.get(feature, {"en": feature, "hi": feature})
        factors.append({
            "feature":       feature,
            "label":         label_dict[lang],
            "shap_value":    round(float(value), 2),
            "raw_value":     round(float(raw_val), 2),
            "direction":     "increases_premium" if value > 0 else "decreases_premium",
            "impact_inr":    round(float(value), 2),
        })

    # Sort by absolute impact, top 7
    factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
    top_factors = factors[:7]

    # Build human-readable summary
    top_increase = [f for f in top_factors if f["direction"] == "increases_premium"][:3]
    top_decrease = [f for f in top_factors if f["direction"] == "decreases_premium"][:2]

    if lang == "hi":
        increases_text = " • ".join(f"{f['label']}: +₹{abs(f['impact_inr']):.0f}" for f in top_increase)
        decreases_text = " • ".join(f"{f['label']}: -₹{abs(f['impact_inr']):.0f}" for f in top_decrease)
    else:
        increases_text = " • ".join(f"{f['label']}: +₹{abs(f['impact_inr']):.0f}" for f in top_increase)
        decreases_text = " • ".join(f"{f['label']}: -₹{abs(f['impact_inr']):.0f}" for f in top_decrease)

    return {
        "base_premium_inr":  round(base_premium, 2),
        "final_premium_inr": round(final_premium, 2),
        "top_factors":       top_factors,
        "increases_text":    increases_text,
        "decreases_text":    decreases_text,
        "language":          lang,
    }
