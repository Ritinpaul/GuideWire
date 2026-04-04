"""
DSI FastAPI Service — Port 8003
Endpoints:
  GET  /health
  GET  /dsi/heatmap          → all 25 zones with DSI scores
  GET  /dsi/{zone_id}        → single zone DSI
  POST /dsi/compute          → DSI from raw input (no DB/weather call)
"""
from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Optional

import asyncpg
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from calculator import WeatherInput, compute_dsi
from weather import get_weather
from zones_config import ZONES, get_dsi_level

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── App state ─────────────────────────────────────────────────────────────────
db_pool: Optional[asyncpg.Pool] = None
redis_client: Optional[aioredis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool, redis_client

    # Redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = aioredis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
        logger.info("✅ Redis connected")
    except Exception as exc:
        logger.warning("⚠️  Redis unavailable (%s) — caching disabled", exc)
        redis_client = None

    # PostgreSQL
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10, command_timeout=10)
            logger.info("✅ PostgreSQL connected")
        except Exception as exc:
            logger.warning("⚠️  PostgreSQL unavailable (%s) — using zone config fallback", exc)

    yield

    if db_pool:
        await db_pool.close()
    if redis_client:
        await redis_client.aclose()


app = FastAPI(
    title="GIGASHIELD DSI Service",
    description="Disruption Severity Index calculator for gig-worker zones",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _get_zone(zone_id: str) -> dict:
    """Resolve zone from DB, falling back to hardcoded config."""
    # Try DB first
    if db_pool:
        try:
            row = await db_pool.fetchrow(
                "SELECT id::text, city, name, lat::float, lng::float, "
                "flood_risk_score::float, historical_avg_aqi, "
                "avg_disruption_days_per_month::float FROM zones WHERE id = $1::uuid",
                zone_id,
            )
            if row:
                return {
                    "id":                   str(row["id"]),
                    "city":                 row["city"],
                    "name":                 row["name"],
                    "lat":                  float(row["lat"]),
                    "lng":                  float(row["lng"]),
                    "flood_risk_score":     float(row["flood_risk_score"]),
                    "historical_avg_aqi":   row["historical_avg_aqi"],
                    "avg_disruption_days":  float(row["avg_disruption_days_per_month"]),
                    "population_density_bucket": ZONES.get(zone_id, {}).get("population_density_bucket", 3),
                }
        except Exception as exc:
            logger.warning("DB zone lookup failed: %s", exc)

    # Fall back to hardcoded config
    zone = ZONES.get(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")
    return {"id": zone_id, **zone}


async def _compute_for_zone(zone: dict) -> dict:
    weather = await get_weather(zone, redis_client)
    w_input = WeatherInput(
        rain_mm=      weather["rain_mm"],
        temp_c=       weather["temp_c"],
        humidity=     weather["humidity"],
        wind_kmh=     weather["wind_kmh"],
        aqi=          weather["aqi"],
        cloud_pct=    weather["cloud_pct"],
        visibility_km=weather["visibility_km"],
    )
    result = compute_dsi(w_input, zone)
    return {
        "zone_id":              zone["id"],
        "city":                 zone["city"],
        "name":                 zone["name"],
        "lat":                  zone["lat"],
        "lng":                  zone["lng"],
        "dsi_score":            result.dsi_score,
        "level":                result.level,
        "s_weather":            result.s_weather,
        "s_traffic":            result.s_traffic,
        "s_orders":             result.s_orders,
        "breakdown":            result.breakdown,
        "trigger_threshold_met": result.trigger_threshold_met,
        "triggered_events":     result.triggered_events,
        "weather":              weather,
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "dsi",
        "db":    "connected" if db_pool else "unavailable",
        "redis": "connected" if redis_client else "unavailable",
        "zones_loaded": len(ZONES),
    }


@app.get("/dsi/heatmap")
async def heatmap():
    """Return DSI scores for all 25 zones (used by admin Leaflet map)."""
    import asyncio
    tasks = [
        _compute_for_zone({"id": zid, **zdata})
        for zid, zdata in ZONES.items()
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    zones_out = []
    for r in results:
        if isinstance(r, Exception):
            logger.warning("Heatmap compute failed for a zone: %s", r)
            continue
        zones_out.append(r)
    return {"zones": zones_out, "total": len(zones_out)}


@app.get("/dsi/{zone_id}")
async def dsi_for_zone(zone_id: str):
    """Compute DSI for a specific zone using live (or mock) weather data."""
    zone = await _get_zone(zone_id)
    return await _compute_for_zone(zone)


# ── Raw compute endpoint ──────────────────────────────────────────────────────
class ComputeRequest(BaseModel):
    zone_id: str
    rain_mm:        float = Field(0.0, ge=0)
    temp_c:         float = Field(28.0)
    humidity:       float = Field(60.0, ge=0, le=100)
    wind_kmh:       float = Field(10.0, ge=0)
    aqi:            float = Field(100.0, ge=0)
    cloud_pct:      float = Field(30.0, ge=0, le=100)
    visibility_km:  float = Field(10.0, ge=0)
    flood_risk_score: Optional[float] = None


@app.post("/dsi/compute")
async def compute_raw(req: ComputeRequest):
    """Compute DSI from raw inputs — no external API calls made."""
    zone = await _get_zone(req.zone_id)
    if req.flood_risk_score is not None:
        zone["flood_risk_score"] = req.flood_risk_score

    w_input = WeatherInput(
        rain_mm=      req.rain_mm,
        temp_c=       req.temp_c,
        humidity=     req.humidity,
        wind_kmh=     req.wind_kmh,
        aqi=          req.aqi,
        cloud_pct=    req.cloud_pct,
        visibility_km=req.visibility_km,
    )
    result = compute_dsi(w_input, zone)
    return {
        "zone_id":              req.zone_id,
        "zone_name":            zone["name"],
        "city":                 zone["city"],
        "dsi_score":            result.dsi_score,
        "level":                result.level,
        "s_weather":            result.s_weather,
        "s_traffic":            result.s_traffic,
        "s_orders":             result.s_orders,
        "breakdown":            result.breakdown,
        "trigger_threshold_met": result.trigger_threshold_met,
        "triggered_events":     result.triggered_events,
    }
