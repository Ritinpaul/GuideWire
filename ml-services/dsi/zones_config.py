"""
DSI Zone Configuration — 25 zones across 5 Indian cities.
Used as a fallback when DB is unavailable, and for heatmap generation.
"""

ZONES: dict[str, dict] = {
    # ── MUMBAI ──────────────────────────────────────────────────────────────
    "b231ff08-8e6f-45b0-8c2d-94429bd5da56": {
        "city": "Mumbai", "name": "Andheri West",
        "lat": 19.1363, "lng": 72.8277,
        "flood_risk_score": 0.85, "historical_avg_aqi": 120,
        "avg_disruption_days": 5.5, "population_density_bucket": 5,
    },
    "8b5c92c8-89c0-43ed-a44b-4b13a37910dc": {
        "city": "Mumbai", "name": "Bandra",
        "lat": 19.0596, "lng": 72.8300,
        "flood_risk_score": 0.70, "historical_avg_aqi": 110,
        "avg_disruption_days": 4.0, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000003": {
        "city": "Mumbai", "name": "Dharavi",
        "lat": 19.0478, "lng": 72.8519,
        "flood_risk_score": 0.92, "historical_avg_aqi": 180,
        "avg_disruption_days": 6.5, "population_density_bucket": 5,
    },
    "a1d3e5f7-1234-4abc-9def-000000000004": {
        "city": "Mumbai", "name": "Colaba",
        "lat": 18.9067, "lng": 72.8147,
        "flood_risk_score": 0.60, "historical_avg_aqi": 90,
        "avg_disruption_days": 3.0, "population_density_bucket": 3,
    },
    "a1d3e5f7-1234-4abc-9def-000000000005": {
        "city": "Mumbai", "name": "Borivali East",
        "lat": 19.2307, "lng": 72.8567,
        "flood_risk_score": 0.75, "historical_avg_aqi": 130,
        "avg_disruption_days": 4.5, "population_density_bucket": 4,
    },
    # ── DELHI ────────────────────────────────────────────────────────────────
    "6d0d2bbf-85f0-4d43-a621-c4fc2156eb60": {
        "city": "Delhi", "name": "Connaught Place",
        "lat": 28.6304, "lng": 77.2177,
        "flood_risk_score": 0.20, "historical_avg_aqi": 350,
        "avg_disruption_days": 6.0, "population_density_bucket": 4,
    },
    "f6b8da0a-f0f5-4fb6-9773-f1dfc33bfbcf": {
        "city": "Delhi", "name": "Gurugram Sector 29",
        "lat": 28.4682, "lng": 77.0628,
        "flood_risk_score": 0.60, "historical_avg_aqi": 320,
        "avg_disruption_days": 5.0, "population_density_bucket": 3,
    },
    "a1d3e5f7-1234-4abc-9def-000000000008": {
        "city": "Delhi", "name": "Rohini",
        "lat": 28.7215, "lng": 77.0979,
        "flood_risk_score": 0.40, "historical_avg_aqi": 310,
        "avg_disruption_days": 4.5, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000009": {
        "city": "Delhi", "name": "Lajpat Nagar",
        "lat": 28.5700, "lng": 77.2435,
        "flood_risk_score": 0.25, "historical_avg_aqi": 340,
        "avg_disruption_days": 5.5, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000010": {
        "city": "Delhi", "name": "Okhla",
        "lat": 28.5498, "lng": 77.2706,
        "flood_risk_score": 0.35, "historical_avg_aqi": 380,
        "avg_disruption_days": 5.8, "population_density_bucket": 3,
    },
    # ── BANGALORE ────────────────────────────────────────────────────────────
    "17ef26db-1ee7-4146-a4c3-596542f7c006": {
        "city": "Bangalore", "name": "Koramangala",
        "lat": 12.9352, "lng": 77.6245,
        "flood_risk_score": 0.75, "historical_avg_aqi": 80,
        "avg_disruption_days": 7.5, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000012": {
        "city": "Bangalore", "name": "Whitefield",
        "lat": 12.9698, "lng": 77.7500,
        "flood_risk_score": 0.65, "historical_avg_aqi": 85,
        "avg_disruption_days": 6.0, "population_density_bucket": 3,
    },
    "a1d3e5f7-1234-4abc-9def-000000000013": {
        "city": "Bangalore", "name": "Indiranagar",
        "lat": 12.9784, "lng": 77.6408,
        "flood_risk_score": 0.55, "historical_avg_aqi": 75,
        "avg_disruption_days": 5.5, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000014": {
        "city": "Bangalore", "name": "HSR Layout",
        "lat": 12.9116, "lng": 77.6389,
        "flood_risk_score": 0.50, "historical_avg_aqi": 70,
        "avg_disruption_days": 5.0, "population_density_bucket": 3,
    },
    "a1d3e5f7-1234-4abc-9def-000000000015": {
        "city": "Bangalore", "name": "Marathahalli",
        "lat": 12.9591, "lng": 77.7013,
        "flood_risk_score": 0.60, "historical_avg_aqi": 90,
        "avg_disruption_days": 6.0, "population_density_bucket": 4,
    },
    # ── HYDERABAD ────────────────────────────────────────────────────────────
    "a1d3e5f7-1234-4abc-9def-000000000016": {
        "city": "Hyderabad", "name": "Banjara Hills",
        "lat": 17.4126, "lng": 78.4483,
        "flood_risk_score": 0.45, "historical_avg_aqi": 100,
        "avg_disruption_days": 3.5, "population_density_bucket": 3,
    },
    "a1d3e5f7-1234-4abc-9def-000000000017": {
        "city": "Hyderabad", "name": "Gachibowli",
        "lat": 17.4400, "lng": 78.3489,
        "flood_risk_score": 0.55, "historical_avg_aqi": 95,
        "avg_disruption_days": 4.0, "population_density_bucket": 3,
    },
    "a1d3e5f7-1234-4abc-9def-000000000018": {
        "city": "Hyderabad", "name": "Hitech City",
        "lat": 17.4474, "lng": 78.3762,
        "flood_risk_score": 0.50, "historical_avg_aqi": 90,
        "avg_disruption_days": 3.5, "population_density_bucket": 3,
    },
    "a1d3e5f7-1234-4abc-9def-000000000019": {
        "city": "Hyderabad", "name": "Secunderabad",
        "lat": 17.4399, "lng": 78.4983,
        "flood_risk_score": 0.40, "historical_avg_aqi": 110,
        "avg_disruption_days": 3.0, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000020": {
        "city": "Hyderabad", "name": "Ameerpet",
        "lat": 17.4374, "lng": 78.4482,
        "flood_risk_score": 0.45, "historical_avg_aqi": 115,
        "avg_disruption_days": 3.5, "population_density_bucket": 4,
    },
    # ── CHENNAI ──────────────────────────────────────────────────────────────
    "a1d3e5f7-1234-4abc-9def-000000000021": {
        "city": "Chennai", "name": "T Nagar",
        "lat": 13.0416, "lng": 80.2339,
        "flood_risk_score": 0.70, "historical_avg_aqi": 95,
        "avg_disruption_days": 5.0, "population_density_bucket": 5,
    },
    "a1d3e5f7-1234-4abc-9def-000000000022": {
        "city": "Chennai", "name": "Anna Nagar",
        "lat": 13.0878, "lng": 80.2101,
        "flood_risk_score": 0.65, "historical_avg_aqi": 88,
        "avg_disruption_days": 4.5, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000023": {
        "city": "Chennai", "name": "Velachery",
        "lat": 12.9785, "lng": 80.2209,
        "flood_risk_score": 0.88, "historical_avg_aqi": 100,
        "avg_disruption_days": 6.0, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000024": {
        "city": "Chennai", "name": "Adyar",
        "lat": 13.0002, "lng": 80.2564,
        "flood_risk_score": 0.75, "historical_avg_aqi": 90,
        "avg_disruption_days": 5.0, "population_density_bucket": 4,
    },
    "a1d3e5f7-1234-4abc-9def-000000000025": {
        "city": "Chennai", "name": "Tambaram",
        "lat": 12.9249, "lng": 80.1000,
        "flood_risk_score": 0.55, "historical_avg_aqi": 80,
        "avg_disruption_days": 4.0, "population_density_bucket": 3,
    },
}

DSI_THRESHOLDS = {
    "LOW":      (0,  30),
    "MODERATE": (30, 50),
    "ELEVATED": (50, 65),
    "HIGH":     (65, 80),
    "CRITICAL": (80, 101),
}

TRIGGER_THRESHOLDS = {
    "HEAVY_RAIN":    {"rain_mm": 50},
    "FLOOD":         {"rain_mm": 100},
    "HEATWAVE":      {"temp_c": 40},
    "POLLUTION":     {"aqi": 300},
    "COMPOSITE_DSI": {"dsi_score": 65},
}


def get_dsi_level(score: float) -> str:
    for level, (lo, hi) in DSI_THRESHOLDS.items():
        if lo <= score < hi:
            return level
    return "CRITICAL"


def get_triggered_events(weather: dict, zone: dict, dsi_score: float) -> list[str]:
    events = []
    if weather.get("rain_mm", 0) >= TRIGGER_THRESHOLDS["HEAVY_RAIN"]["rain_mm"]:
        events.append("HEAVY_RAIN")
    if weather.get("rain_mm", 0) >= TRIGGER_THRESHOLDS["FLOOD"]["rain_mm"]:
        events.append("FLOOD")
    if weather.get("temp_c", 25) >= TRIGGER_THRESHOLDS["HEATWAVE"]["temp_c"]:
        events.append("HEATWAVE")
    if weather.get("aqi", 0) >= TRIGGER_THRESHOLDS["POLLUTION"]["aqi"]:
        events.append("POLLUTION")
    if dsi_score >= TRIGGER_THRESHOLDS["COMPOSITE_DSI"]["dsi_score"]:
        events.append("COMPOSITE_DSI")
    return events
