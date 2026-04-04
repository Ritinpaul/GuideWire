"""
OpenWeatherMap client with Redis caching (TTL 5 min).
Falls back to realistic mock data when API key is missing or limit reached.
"""
from __future__ import annotations
import json
import logging
import os
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

OWM_BASE = "https://api.openweathermap.org/data/2.5"
CACHE_TTL = 300  # 5 minutes


async def _fetch_weather_owm(lat: float, lng: float, api_key: str) -> dict:
    """Fetch current weather + AQI from OpenWeatherMap."""
    async with httpx.AsyncClient(timeout=8.0) as client:
        # Current weather
        weather_resp = await client.get(
            f"{OWM_BASE}/weather",
            params={"lat": lat, "lon": lng, "appid": api_key, "units": "metric"},
        )
        weather_resp.raise_for_status()
        w = weather_resp.json()

        # AQI
        aqi_resp = await client.get(
            f"{OWM_BASE}/air_pollution",
            params={"lat": lat, "lon": lng, "appid": api_key},
        )
        aqi_resp.raise_for_status()
        aqi_data = aqi_resp.json()

    rain_1h = w.get("rain", {}).get("1h", 0.0)
    rain_3h = w.get("rain", {}).get("3h", 0.0)
    rain_mm = max(rain_1h, rain_3h / 3)  # normalise to per-hour

    aqi_index = aqi_data["list"][0]["main"]["aqi"]  # 1=Good … 5=Very Poor
    # Map OWM AQI index (1-5) → approximate CAQI value (0-500)
    aqi_map = {1: 15, 2: 65, 3: 130, 4: 250, 5: 380}
    aqi_value = aqi_map.get(int(aqi_index), 100)

    return {
        "rain_mm":        round(rain_mm, 2),
        "temp_c":         round(w.get("main", {}).get("temp", 25.0), 1),
        "humidity":       w.get("main", {}).get("humidity", 60),
        "wind_kmh":       round(w.get("wind", {}).get("speed", 10.0) * 3.6, 1),
        "aqi":            aqi_value,
        "cloud_pct":      w.get("clouds", {}).get("all", 30),
        "visibility_km":  round(w.get("visibility", 10000) / 1000, 1),
        "description":    w["weather"][0]["description"] if w.get("weather") else "clear",
        "source":         "openweathermap",
        "fetched_at":     int(time.time()),
    }


def _mock_weather(zone: dict) -> dict:
    """
    Deterministic mock weather based on zone characteristics.
    Keeps the demo useful even without an API key.
    """
    import random
    import hashlib
    seed = int(hashlib.md5(f"{zone['lat']}{zone['lng']}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed + int(time.time() // 3600))  # changes hourly

    flood_risk = zone.get("flood_risk_score", 0.5)
    avg_aqi = zone.get("historical_avg_aqi", 120)

    rain_mm    = rng.uniform(0, 90 * flood_risk)
    temp_c     = rng.uniform(24, 40)
    wind_kmh   = rng.uniform(5, 30)
    humidity   = rng.randint(50, 95)
    aqi        = rng.randint(int(avg_aqi * 0.7), int(avg_aqi * 1.3))
    cloud_pct  = rng.randint(20, 90)
    vis_km     = rng.uniform(2, 10) if rain_mm > 20 else rng.uniform(6, 10)

    return {
        "rain_mm":       round(rain_mm, 2),
        "temp_c":        round(temp_c, 1),
        "humidity":      humidity,
        "wind_kmh":      round(wind_kmh, 1),
        "aqi":           aqi,
        "cloud_pct":     cloud_pct,
        "visibility_km": round(vis_km, 1),
        "description":   "mock data",
        "source":        "mock",
        "fetched_at":    int(time.time()),
    }


async def get_weather(zone: dict, redis_client=None) -> dict:
    """
    Fetch weather for a zone, using Redis cache if available.
    Falls back to mock if OWM key is absent or call fails.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    cache_key = f"weather::{zone['lat']:.4f}::{zone['lng']:.4f}"

    # ── Try cache ────────────────────────────────────────────────────────────
    if redis_client:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as exc:
            logger.warning("Redis get failed: %s", exc)

    # ── Try OpenWeatherMap ───────────────────────────────────────────────────
    if api_key and api_key not in ("demo_key", ""):
        try:
            data = await _fetch_weather_owm(zone["lat"], zone["lng"], api_key)
            if redis_client:
                try:
                    await redis_client.setex(cache_key, CACHE_TTL, json.dumps(data))
                except Exception:
                    pass
            return data
        except Exception as exc:
            logger.warning("OWM API failed (%s) — using mock weather", exc)

    # ── Mock fallback ────────────────────────────────────────────────────────
    data = _mock_weather(zone)
    if redis_client:
        try:
            await redis_client.setex(cache_key, 60, json.dumps(data))  # cache mock 1 min
        except Exception:
            pass
    return data
