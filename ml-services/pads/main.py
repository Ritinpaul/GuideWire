"""
PADS FastAPI Service — Port 8002
Endpoints:
  GET  /health
  POST /validate        → run full 5-layer pipeline
  GET  /score/{claim_id} → retrieve stored fraud score from DB
  GET  /anomalies       → recent flagged/rejected claims
"""
from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from checks.anomaly import initialise_anomaly_detector
from pipeline import ValidationRequest, run_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── App state ─────────────────────────────────────────────────────────────────
db_pool: Optional[asyncpg.Pool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool

    # Train Isolation Forest (fast — ~1s)
    initialise_anomaly_detector()

    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10, command_timeout=10)
            logger.info("✅ PostgreSQL connected")
        except Exception as exc:
            logger.warning("⚠️  PostgreSQL unavailable: %s", exc)

    yield

    if db_pool:
        await db_pool.close()


app = FastAPI(
    title="GIGASHIELD PADS Service",
    description="Physics-Aware Dual-Sensor fraud detection — 5-layer pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Request Schema ───────────────────────────────────────────────────
class ValidateRequest(BaseModel):
    # Identifiers (optional — used for duplicate check)
    claim_id:   Optional[str] = None
    policy_id:  Optional[str] = None
    trigger_id: Optional[str] = None

    # Zone centre
    zone_lat:       float = Field(19.1363, description="Zone center latitude")
    zone_lng:       float = Field(72.8277, description="Zone center longitude")
    zone_radius_km: float = Field(3.0, ge=0.5, le=20)

    # Worker GPS
    worker_gps_lat: float = Field(19.1400)
    worker_gps_lng: float = Field(72.8300)

    # Device
    is_emulator:        bool = False
    is_rooted:          bool = False
    vpn_detected:       bool = False
    device_fingerprint: str  = ""

    # IMU
    accelerometer_variance: float = Field(0.35, ge=0)
    gyroscope_variance:     float = Field(0.12, ge=0)
    speed_kmh:              float = Field(18.0, ge=0)

    # Historical
    hour_of_day:      int   = Field(14, ge=0, le=23)
    claims_last_30d:  int   = Field(0, ge=0)
    avg_claim_amount: float = Field(350.0, ge=0)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "pads",
        "db": "connected" if db_pool else "unavailable",
        "anomaly_detector": "ready",
    }


@app.post("/validate")
async def validate(req: ValidateRequest):
    """Run the full 5-layer PADS pipeline on a claim."""
    pipeline_req = ValidationRequest(
        claim_id=              req.claim_id,
        policy_id=             req.policy_id,
        trigger_id=            req.trigger_id,
        zone_lat=              req.zone_lat,
        zone_lng=              req.zone_lng,
        zone_radius_km=        req.zone_radius_km,
        worker_gps_lat=        req.worker_gps_lat,
        worker_gps_lng=        req.worker_gps_lng,
        is_emulator=           req.is_emulator,
        is_rooted=             req.is_rooted,
        vpn_detected=          req.vpn_detected,
        device_fingerprint=    req.device_fingerprint,
        accelerometer_variance=req.accelerometer_variance,
        gyroscope_variance=    req.gyroscope_variance,
        speed_kmh=             req.speed_kmh,
        hour_of_day=           req.hour_of_day,
        claims_last_30d=       req.claims_last_30d,
        avg_claim_amount=      req.avg_claim_amount,
    )

    result = await run_pipeline(pipeline_req, db_pool)
    return {
        "fraud_score":      result.fraud_score,
        "recommendation":   result.recommendation,
        "auto_adjudicate":  result.auto_adjudicate,
        "checks":           result.checks,
        "summary":          result.summary,
        "validated_at":     result.validated_at,
    }


@app.get("/score/{claim_id}")
async def get_score(claim_id: str):
    """Retrieve stored fraud score for an existing claim from DB."""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    row = await db_pool.fetchrow(
        """
        SELECT c.id::text, c.fraud_score, c.status, c.adjudication_type,
               json_agg(json_build_object(
                   'check_type', fl.check_type,
                   'result', fl.result,
                   'confidence', fl.confidence::float,
                   'details', fl.details
               )) AS fraud_logs
        FROM claims c
        LEFT JOIN fraud_logs fl ON fl.claim_id = c.id
        WHERE c.id = $1::uuid
        GROUP BY c.id
        """,
        claim_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found")
    return dict(row)


@app.get("/anomalies")
async def get_anomalies(limit: int = 20):
    """Return recent FLAGGED/REJECTED claims for the admin fraud monitor."""
    if not db_pool:
        return {"anomalies": [], "note": "Database unavailable"}
    rows = await db_pool.fetch(
        """
        SELECT c.id::text, c.fraud_score::float, c.status, c.adjudication_type,
               c.created_at, p.plan_tier, w.name as worker_name, w.city
        FROM claims c
        JOIN policies p ON p.id = c.policy_id
        JOIN workers w ON w.id = p.worker_id
        WHERE c.status IN ('FLAGGED', 'REJECTED')
            OR c.fraud_score > 0.3
        ORDER BY c.created_at DESC
        LIMIT $1
        """,
        limit,
    )
    return {"anomalies": [dict(r) for r in rows], "total": len(rows)}
