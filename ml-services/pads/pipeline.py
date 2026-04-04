"""
PADS Pipeline — 5-layer fraud orchestrator.
Runs all checks, aggregates score, and returns final recommendation.

Fraud score = sum of fraud_contribution from each layer (capped at 1.0).
Recommendation:
  score < 0.30  → AUTO_APPROVE
  score < 0.60  → MANUAL_REVIEW
  score ≥ 0.60  → AUTO_REJECT
"""
from __future__ import annotations
import asyncio
import datetime
import logging
from dataclasses import asdict, dataclass
from typing import Optional

from checks.device import check_device
from checks.gps import check_gps
from checks.imu import check_imu
from checks.duplicate import check_duplicate
from checks.anomaly import check_anomaly

logger = logging.getLogger(__name__)

THRESHOLDS = {
    "AUTO_APPROVE":  0.30,
    "MANUAL_REVIEW": 0.60,
}


@dataclass
class ValidationRequest:
    # Claim identifiers
    claim_id:   Optional[str] = None
    policy_id:  Optional[str] = None
    trigger_id: Optional[str] = None

    # Zone info
    zone_lat:        float = 0.0
    zone_lng:        float = 0.0
    zone_radius_km:  float = 3.0

    # Worker GPS at time of trigger
    worker_gps_lat:  float = 0.0
    worker_gps_lng:  float = 0.0

    # Device signals
    is_emulator:            bool  = False
    is_rooted:              bool  = False
    vpn_detected:           bool  = False
    device_fingerprint:     str   = ""

    # IMU signals
    accelerometer_variance: float = 0.3
    gyroscope_variance:     float = 0.1
    speed_kmh:              float = 15.0

    # Historical context
    hour_of_day:       int   = 14
    claims_last_30d:   int   = 0
    avg_claim_amount:  float = 350.0


@dataclass
class ValidationResult:
    fraud_score:         float
    recommendation:      str
    auto_adjudicate:     bool
    checks:              list[dict]
    summary:             str
    validated_at:        str


async def run_pipeline(req: ValidationRequest, db_pool=None) -> ValidationResult:
    """Run all 5 layers concurrently (duplicate check needs DB, rest are pure)."""

    # ── Compute GPS distance for anomaly layer ────────────────────────────
    import math
    def haversine(lat1, lng1, lat2, lng2):
        R = 6371.0
        r = math.radians
        a = (math.sin(r(lat2 - lat1) / 2) ** 2
             + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lng2 - lng1) / 2) ** 2)
        return 2 * R * math.asin(math.sqrt(a))

    dist_from_zone = haversine(req.zone_lat, req.zone_lng, req.worker_gps_lat, req.worker_gps_lng)

    # ── Run ALL layers ────────────────────────────────────────────────────
    device_r = check_device(req.is_emulator, req.is_rooted, req.vpn_detected, req.device_fingerprint)
    gps_r    = check_gps(req.zone_lat, req.zone_lng, req.zone_radius_km, req.worker_gps_lat, req.worker_gps_lng)
    imu_r    = check_imu(req.accelerometer_variance, req.gyroscope_variance, req.speed_kmh)
    dup_r    = await check_duplicate(req.policy_id, req.trigger_id, db_pool)
    anom_r   = check_anomaly(
        req.accelerometer_variance,
        req.gyroscope_variance,
        req.speed_kmh,
        dist_from_zone,
        req.hour_of_day,
        req.claims_last_30d,
        req.avg_claim_amount,
    )

    # ── Aggregate ─────────────────────────────────────────────────────────
    checks = [
        {"layer": 1, "name": "DEVICE_CHECK",    "type": "DEVICE_CHECK",    **asdict(device_r)},
        {"layer": 2, "name": "GPS_VALIDATION",  "type": "GPS_VALIDATION",  **asdict(gps_r)},
        {"layer": 3, "name": "IMU_KINEMATIC",   "type": "IMU_KINEMATIC",   **asdict(imu_r)},
        {"layer": 4, "name": "DUPLICATE_CHECK", "type": "DUPLICATE_CHECK", **asdict(dup_r)},
        {"layer": 5, "name": "ANOMALY_DETECTION","type": "ANOMALY_DETECTION",**asdict(anom_r)},
    ]

    total_contribution = sum(c["fraud_contribution"] for c in checks)
    fraud_score = round(min(1.0, total_contribution), 3)

    if fraud_score < THRESHOLDS["AUTO_APPROVE"]:
        recommendation = "AUTO_APPROVE"
        auto_adjudicate = True
        summary = f"All checks passed. Fraud score {fraud_score:.2f} is below threshold."
    elif fraud_score < THRESHOLDS["MANUAL_REVIEW"]:
        recommendation = "MANUAL_REVIEW"
        auto_adjudicate = False
        failed = [c["name"] for c in checks if c["result"] != "PASS"]
        summary = f"Marginal fraud score {fraud_score:.2f}. Flagged layers: {', '.join(failed)}."
    else:
        recommendation = "AUTO_REJECT"
        auto_adjudicate = True
        failed = [c["name"] for c in checks if c["result"] == "FAIL"]
        summary = f"High fraud score {fraud_score:.2f}. Failed: {', '.join(failed)}."

    return ValidationResult(
        fraud_score=fraud_score,
        recommendation=recommendation,
        auto_adjudicate=auto_adjudicate,
        checks=checks,
        summary=summary,
        validated_at=datetime.datetime.utcnow().isoformat() + "Z",
    )
