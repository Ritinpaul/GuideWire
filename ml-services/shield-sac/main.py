"""
Shield-SAC FastAPI Service — Port 8001
Endpoints:
  GET  /health
  POST /calculate          → single premium calculation with SHAP
  POST /batch-calculate    → up to 50 workers at once
  GET  /explain/{worker_id} → re-explain stored premium from DB
"""
from __future__ import annotations
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model import FEATURE_NAMES, get_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

db_pool: Optional[asyncpg.Pool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    # Train / load model — runs in thread pool to avoid blocking event loop
    logger.info("Shield-SAC: initialising model...")
    await asyncio.get_event_loop().run_in_executor(None, get_model().ensure_ready)
    logger.info("Shield-SAC: model ready ✅")

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
    title="GIGASHIELD Shield-SAC Pricing Service",
    description="XGBoost premium pricer with Fairness Shield and SHAP explainability",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class PremiumRequest(BaseModel):
    worker_id:   Optional[str] = None
    zone_id:     Optional[str] = None
    language:    str   = Field("en", pattern="^(en|hi|ta|te|mr)$")

    # Weather (7)
    rain_mm:        float = Field(0.0,  ge=0,   le=500)
    temp_c:         float = Field(27.0, ge=-5,  le=55)
    humidity:       float = Field(60.0, ge=0,   le=100)
    wind_kmh:       float = Field(10.0, ge=0,   le=200)
    aqi:            float = Field(100,  ge=0,   le=500)
    cloud_pct:      float = Field(30.0, ge=0,   le=100)
    visibility_km:  float = Field(10.0, ge=0,   le=15)

    # Zone risk (3)
    flood_score:                    float = Field(0.5,  ge=0, le=1)
    historical_disruption_rate:     float = Field(0.2,  ge=0, le=1)
    population_density_bucket:      float = Field(3.0,  ge=1, le=5)

    # Worker (4)
    avg_earnings:  float = Field(500.0, ge=50,  le=5000)
    days_active:   float = Field(90.0,  ge=1,   le=365)
    claim_count:   float = Field(0.0,   ge=0)
    claim_ratio:   float = Field(0.0,   ge=0,   le=1)

    # Temporal (3)
    day_of_week:   float = Field(3.0,  ge=0, le=6)
    month:         float = Field(7.0,  ge=1, le=12)
    is_monsoon:    float = Field(0.0,  ge=0, le=1)


class BatchPremiumRequest(BaseModel):
    workers: list[PremiumRequest] = Field(..., max_items=50)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    model = get_model()
    return {
        "status":        "ok",
        "service":       "shield-sac",
        "model_trained": model._trained,
        "model_metrics": model._metrics,
        "db":            "connected" if db_pool else "unavailable",
    }


@app.post("/calculate")
async def calculate(req: PremiumRequest):
    """Calculate fair premium for a single worker with full SHAP explanation."""
    features = {name: getattr(req, name) for name in FEATURE_NAMES}
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: get_model().predict(features, req.language)
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {
        "worker_id":  req.worker_id,
        "zone_id":    req.zone_id,
        **result,
    }


@app.post("/batch-calculate")
async def batch_calculate(req: BatchPremiumRequest):
    """Calculate premiums for up to 50 workers concurrently."""
    async def _calc(w: PremiumRequest):
        features = {name: getattr(w, name) for name in FEATURE_NAMES}
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: get_model().predict(features, w.language)
        )
        return {"worker_id": w.worker_id, **result}

    results = await asyncio.gather(*[_calc(w) for w in req.workers], return_exceptions=True)
    successes = [r for r in results if not isinstance(r, Exception)]
    errors    = [str(r) for r in results if isinstance(r, Exception)]
    return {"results": successes, "errors": errors}


@app.get("/explain/{worker_id}")
async def explain_worker(worker_id: str, language: str = "en"):
    """Re-explain the most recent premium for a worker stored in DB."""
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database unavailable")

    row = await db_pool.fetchrow(
        """
        SELECT p.shap_explanation, p.premium_amount::float, p.coverage_amount::float,
               p.plan_tier, p.shieldsac_confidence::float,
               w.avg_daily_earnings::float, w.city, w.zone_id::text
        FROM policies p
        JOIN workers w ON w.id = p.worker_id
        WHERE w.id = $1::uuid
          AND p.status = 'ACTIVE'
        ORDER BY p.created_at DESC
        LIMIT 1
        """,
        worker_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"No active policy found for worker '{worker_id}'")

    return {
        "worker_id":        worker_id,
        "premium_inr":      row["premium_amount"],
        "coverage_inr":     row["coverage_amount"],
        "plan_tier":        row["plan_tier"],
        "confidence":       row["shieldsac_confidence"],
        "shap_explanation": dict(row["shap_explanation"]) if row["shap_explanation"] else {},
        "language":         language,
    }
