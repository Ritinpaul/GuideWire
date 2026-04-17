"""
DSI Calculator — Disruption Severity Index.

Formula:
    S_weather = 0.25*rain_sev + 0.20*temp_sev + 0.20*aqi_sev
              + 0.15*flood_sev + 0.10*wind_sev + 0.10*vis_sev
    S_traffic = dynamic simulation (zone-aware, time-of-day, stochastic noise)
    S_orders  = 100 * (1 - current_orders / expected_orders)
    DSI       = 0.40*S_weather + 0.30*S_traffic + 0.30*S_orders
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
import hashlib
import math
import random


@dataclass
class WeatherInput:
    rain_mm: float = 0.0
    temp_c: float = 28.0
    humidity: float = 60.0
    wind_kmh: float = 10.0
    aqi: float = 100.0
    cloud_pct: float = 30.0
    visibility_km: float = 10.0


@dataclass
class DSIResult:
    dsi_score: float
    level: str
    s_weather: float
    s_traffic: float
    s_orders: float
    breakdown: dict
    trigger_threshold_met: bool
    triggered_events: list[str]


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


def _rain_severity(rain_mm: float) -> float:
    """0mm→0, 50mm→40, 100mm→70, 200mm→100"""
    if rain_mm <= 0:
        return 0.0
    return _clamp(math.log1p(rain_mm) / math.log1p(200) * 100)


def _temp_severity(temp_c: float) -> float:
    """Comfort zone 22–32°C; deviations score higher. >43°C or <5°C→100."""
    center = 27.0
    deviation = abs(temp_c - center)
    return _clamp(deviation / 16 * 100)


def _aqi_severity(aqi: float) -> float:
    """AQI 0→0, 150→30, 300→70, 500→100 (non-linear)."""
    return _clamp(math.log1p(aqi) / math.log1p(500) * 100)


def _wind_severity(wind_kmh: float) -> float:
    """0→0, 40kmh→40, 100kmh→100."""
    return _clamp(wind_kmh / 100 * 100)


def _visibility_severity(vis_km: float) -> float:
    """10km clear→0, 0km→100, inverse."""
    return _clamp((1 - vis_km / 10) * 100)


def _flood_severity(flood_risk_score: float, rain_mm: float) -> float:
    """Flood risk only activates above 30mm rain."""
    if rain_mm < 30:
        return 0.0
    activation = _clamp((rain_mm - 30) / 70)  # scales 30–100mm → 0–1
    return _clamp(flood_risk_score * activation * 100)


def _compute_s_weather(w: WeatherInput, flood_risk_score: float) -> tuple[float, dict]:
    rain_sev  = _rain_severity(w.rain_mm)
    temp_sev  = _temp_severity(w.temp_c)
    aqi_sev   = _aqi_severity(w.aqi)
    wind_sev  = _wind_severity(w.wind_kmh)
    vis_sev   = _visibility_severity(w.visibility_km)
    flood_sev = _flood_severity(flood_risk_score, w.rain_mm)

    s_weather = (
        0.25 * rain_sev
        + 0.20 * temp_sev
        + 0.20 * aqi_sev
        + 0.15 * flood_sev
        + 0.10 * wind_sev
        + 0.10 * vis_sev
    )

    factors = {
        "rain_severity":       round(rain_sev, 2),
        "temp_severity":       round(temp_sev, 2),
        "aqi_severity":        round(aqi_sev, 2),
        "flood_severity":      round(flood_sev, 2),
        "wind_severity":       round(wind_sev, 2),
        "visibility_severity": round(vis_sev, 2),
    }
    return _clamp(s_weather), factors


def _compute_s_traffic(zone_id: str, rain_mm: float = 0.0) -> float:
    """
    Dynamic traffic congestion simulation.
    Varies by zone (deterministic offset from zone ID hash), hour of day
    (peak commute hours 8-10am and 5-8pm), rain amplification, and
    stochastic Gaussian noise for realistic variance between calls.
    """
    hour = datetime.now().hour

    # Peak commute hours produce higher congestion
    if 8 <= hour <= 10 or 17 <= hour <= 20:
        base = 72.0
    elif 11 <= hour <= 16:
        base = 48.0
    elif 6 <= hour <= 7 or 21 <= hour <= 22:
        base = 38.0
    else:
        base = 22.0  # late night / early morning

    # Deterministic per-zone offset so each zone has consistent personality
    zone_hash = int(hashlib.md5(zone_id.encode()).hexdigest()[:8], 16)
    zone_offset = (zone_hash % 25) - 12  # range: -12 to +12

    # Rain amplifies traffic congestion (waterlogged roads, slower movement)
    rain_boost = min(20.0, rain_mm * 0.25) if rain_mm > 5 else 0.0

    # Gaussian noise for natural variance
    noise = random.gauss(0, 4.5)

    return _clamp(base + zone_offset + rain_boost + noise)


def _compute_s_orders(rain_mm: float, expected_orders: float = 15.0) -> float:
    """
    Simulated order drop effect: heavy rain → fewer deliveries → higher income loss.
    """
    drop_factor = min(1.0, rain_mm / 150)  # 150mm wipes out all orders
    current = expected_orders * (1 - drop_factor * 0.85)
    return _clamp(100 * max(0, 1 - current / expected_orders))


def compute_dsi(weather: WeatherInput, zone: dict) -> DSIResult:
    from zones_config import get_dsi_level, get_triggered_events

    flood_risk = zone.get("flood_risk_score", 0.5)

    zone_id = zone.get("id", "default")
    s_weather, factors = _compute_s_weather(weather, flood_risk)
    s_traffic = _compute_s_traffic(zone_id, weather.rain_mm)
    s_orders  = _compute_s_orders(weather.rain_mm)

    dsi_score = round(0.40 * s_weather + 0.30 * s_traffic + 0.30 * s_orders, 2)
    level = get_dsi_level(dsi_score)

    weather_dict = {
        "rain_mm": weather.rain_mm,
        "temp_c":  weather.temp_c,
        "aqi":     weather.aqi,
    }
    triggered_events = get_triggered_events(weather_dict, zone, dsi_score)

    breakdown = {
        "s_weather": round(s_weather, 2),
        "s_traffic": round(s_traffic, 2),
        "s_orders":  round(s_orders, 2),
        "weather_factors": factors,
        "weights": {"weather": 0.40, "traffic": 0.30, "orders": 0.30},
    }

    return DSIResult(
        dsi_score=dsi_score,
        level=level,
        s_weather=round(s_weather, 2),
        s_traffic=round(s_traffic, 2),
        s_orders=round(s_orders, 2),
        breakdown=breakdown,
        trigger_threshold_met=bool(triggered_events),
        triggered_events=triggered_events,
    )
