"""
PADS Layer 2 — GPS / IP Consistency Check.
Validates that claimed worker GPS location is within their registered zone.
Haversine formula for distance calculation.
"""
from __future__ import annotations
import math
from dataclasses import dataclass

# Max acceptable distance between worker GPS and zone centre
ZONE_RADIUS_BUFFER_KM = 5.0   # 5 km beyond stated zone radius


@dataclass
class GPSCheckResult:
    result: str
    confidence: float
    fraud_contribution: float
    details: dict


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def check_gps(
    zone_lat: float,
    zone_lng: float,
    zone_radius_km: float,
    worker_gps_lat: float,
    worker_gps_lng: float,
) -> GPSCheckResult:
    """
    Acceptable radius = zone_radius_km + ZONE_RADIUS_BUFFER_KM.
    Beyond that:
      distance > 2× → FAIL (high probability of GPS spoof)
      distance > 1× → WARN
      within         → PASS
    """
    distance = _haversine_km(zone_lat, zone_lng, worker_gps_lat, worker_gps_lng)
    max_radius = zone_radius_km + ZONE_RADIUS_BUFFER_KM
    overflow_ratio = distance / max_radius if max_radius > 0 else 0

    if overflow_ratio <= 1.0:
        result = "PASS"
        confidence = 0.95
        contribution = 0.0
    elif overflow_ratio <= 2.0:
        result = "WARN"
        confidence = 0.75
        contribution = round(0.10 * (overflow_ratio - 1.0), 3)
    else:
        result = "FAIL"
        confidence = 0.90
        # Scales from 0.20 at 2× to 0.50 at 5× and beyond
        contribution = round(min(0.50, 0.20 + 0.10 * (overflow_ratio - 2.0)), 3)

    return GPSCheckResult(
        result=result,
        confidence=confidence,
        fraud_contribution=contribution,
        details={
            "distance_km":     round(distance, 3),
            "zone_radius_km":  zone_radius_km,
            "max_allowed_km":  max_radius,
            "overflow_ratio":  round(overflow_ratio, 3),
            "zone_center":     {"lat": zone_lat, "lng": zone_lng},
            "worker_gps":      {"lat": worker_gps_lat, "lng": worker_gps_lng},
        },
    )
