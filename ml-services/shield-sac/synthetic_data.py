"""
Shield-SAC Synthetic Training Data Generator.
Generates 50,000 worker-week records that reflect real Indian gig-worker economics.

17 features:
  Weather (7): rain_mm, temp_c, humidity, wind_kmh, aqi, cloud_pct, visibility_km
  Zone risk (3): flood_score, historical_disruption_rate, population_density_bucket
  Worker (4): avg_earnings, days_active, claim_count, claim_ratio
  Temporal (3): day_of_week, month, is_monsoon

Target: fair_premium_inr (what a fair actuarial premium should be for the week)
"""
from __future__ import annotations
import numpy as np
import pandas as pd


FEATURE_NAMES = [
    # Weather
    "rain_mm", "temp_c", "humidity", "wind_kmh", "aqi", "cloud_pct", "visibility_km",
    # Zone risk
    "flood_score", "historical_disruption_rate", "population_density_bucket",
    # Worker
    "avg_earnings", "days_active", "claim_count", "claim_ratio",
    # Temporal
    "day_of_week", "month", "is_monsoon",
]


def generate(n: int = 50_000, seed: int = 42) -> tuple[pd.DataFrame, pd.Series]:
    rng = np.random.default_rng(seed)

    # ── Temporal context ──────────────────────────────────────────────────
    month          = rng.integers(1, 13, n)
    is_monsoon     = ((month >= 6) & (month <= 9)).astype(int)
    day_of_week    = rng.integers(0, 7, n)

    # ── Weather (monsoon season has much more rain) ───────────────────────
    base_rain      = is_monsoon * rng.uniform(0, 80, n) + (1 - is_monsoon) * rng.uniform(0, 15, n)
    rain_mm        = np.clip(base_rain, 0, 200)

    temp_c         = rng.uniform(18, 44, n)
    humidity       = rng.uniform(30, 98, n)
    wind_kmh       = rng.uniform(5, 50, n)
    cloud_pct      = np.clip(rng.uniform(10, 95, n) + is_monsoon * 20, 0, 100)
    visibility_km  = np.clip(10 - rain_mm / 25 + rng.normal(0, 1, n), 0.5, 10)

    # AQI: Delhi/North India much higher
    aqi_base       = rng.choice([80, 150, 250, 350], n, p=[0.35, 0.30, 0.25, 0.10])
    aqi            = np.clip(aqi_base + rng.normal(0, 30, n), 10, 500)

    # ── Zone risk ─────────────────────────────────────────────────────────
    flood_score                = rng.uniform(0.1, 0.95, n)
    historical_disruption_rate = rng.uniform(0.05, 0.6, n)
    population_density_bucket  = rng.integers(1, 6, n)

    # ── Worker profile ────────────────────────────────────────────────────
    avg_earnings   = rng.uniform(300, 1500, n)
    days_active    = rng.integers(1, 366, n)
    claim_count    = rng.integers(0, 12, n)
    claim_ratio    = np.clip(claim_count / np.maximum(days_active / 30, 1) / 2, 0, 1)

    # ── Premium calculation (actuarial target) ────────────────────────────
    # Base: 2% of weekly earnings
    weekly_earnings = avg_earnings * 7
    base_prem = weekly_earnings * 0.02

    # Weather adjustment (+/- 50%)
    rain_adj  = np.log1p(rain_mm) / np.log1p(200)   # 0-1
    aqi_adj   = np.log1p(aqi)     / np.log1p(500)
    temp_adj  = np.abs(temp_c - 27) / 16
    weather_factor = 1 + 0.50 * (0.5 * rain_adj + 0.3 * aqi_adj + 0.2 * temp_adj)

    # Zone adjustment (+/- 40%)
    zone_factor = 1 + 0.40 * (0.6 * flood_score + 0.4 * historical_disruption_rate)

    # Worker history adjustment (+/- 30%) — more claims = higher premium
    history_factor = 1 + 0.30 * claim_ratio

    # Raw premium
    raw_premium = base_prem * weather_factor * zone_factor * history_factor

    # Fairness shield: NEVER exceed 5% of weekly earnings
    max_premium = weekly_earnings * 0.05
    fair_premium = np.minimum(raw_premium, max_premium)

    # Minimum premium ₹15
    fair_premium = np.maximum(fair_premium, 15)

    # Add small noise
    fair_premium = fair_premium * rng.uniform(0.97, 1.03, n)

    # ── Assemble DataFrame ─────────────────────────────────────────────────
    X = pd.DataFrame({
        "rain_mm":                      rain_mm,
        "temp_c":                       temp_c,
        "humidity":                     humidity,
        "wind_kmh":                     wind_kmh,
        "aqi":                          aqi,
        "cloud_pct":                    cloud_pct,
        "visibility_km":                visibility_km,
        "flood_score":                  flood_score,
        "historical_disruption_rate":   historical_disruption_rate,
        "population_density_bucket":    population_density_bucket.astype(float),
        "avg_earnings":                 avg_earnings,
        "days_active":                  days_active.astype(float),
        "claim_count":                  claim_count.astype(float),
        "claim_ratio":                  claim_ratio,
        "day_of_week":                  day_of_week.astype(float),
        "month":                        month.astype(float),
        "is_monsoon":                   is_monsoon.astype(float),
    })
    y = pd.Series(np.round(fair_premium, 2), name="fair_premium_inr")

    return X, y
