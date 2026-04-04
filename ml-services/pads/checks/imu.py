"""
PADS Layer 3 — IMU Kinematics Check (Physics-Based).
A delivery worker caught in heavy rain should show:
  - High accelerometer variance (vibrations from potholed roads, braking)
  - Non-zero gyroscope variance (turning, stopping)
  - Speed in a plausible range (5–50 kmh for two-wheeler)
A fraudster sitting at home submitting a fake claim shows:
  - Near-zero accelerometer and gyroscope variance
  - Speed of 0 (stationary)
"""
from __future__ import annotations
import math
from dataclasses import dataclass


# Thresholds (tuneable)
MIN_ACCEL_VARIANCE = 0.15  # m/s² standard deviation — below = suspicious
MIN_GYRO_VARIANCE  = 0.05  # rad/s — below = suspicious
MIN_SPEED_KMH      = 3.0   # km/h — below = suspicious for active delivery
MAX_SPEED_KMH      = 80.0  # km/h — above = unrealistic for 2-wheeler in city


@dataclass
class IMUCheckResult:
    result: str
    confidence: float
    fraud_contribution: float
    details: dict


def check_imu(
    accelerometer_variance: float,
    gyroscope_variance: float,
    speed_kmh: float,
) -> IMUCheckResult:
    """
    Physics-based scoring:
      All three channels suspicious → FAIL
      Two channels suspicious       → WARN
      One or zero suspicion         → PASS
    """
    suspicious_accel = accelerometer_variance < MIN_ACCEL_VARIANCE
    suspicious_gyro  = gyroscope_variance < MIN_GYRO_VARIANCE
    suspicious_speed = speed_kmh < MIN_SPEED_KMH or speed_kmh > MAX_SPEED_KMH

    suspect_count = sum([suspicious_accel, suspicious_gyro, suspicious_speed])

    if suspect_count == 0:
        result       = "PASS"
        confidence   = 0.92
        contribution = 0.0
    elif suspect_count == 1:
        result       = "PASS"       # one anomaly not enough to flag
        confidence   = 0.80
        contribution = 0.05
    elif suspect_count == 2:
        result       = "WARN"
        confidence   = 0.82
        contribution = 0.18
    else:
        # All three fail — very high probability of stationary fraud
        result       = "FAIL"
        confidence   = 0.88
        contribution = 0.30

    # Physics consistency bonus: unrealistically steady acceleration → stronger signal
    if suspicious_accel and accelerometer_variance < 0.02:
        contribution = min(contribution + 0.10, 0.50)

    return IMUCheckResult(
        result=result,
        confidence=confidence,
        fraud_contribution=round(contribution, 3),
        details={
            "accelerometer_variance":  accelerometer_variance,
            "gyroscope_variance":      gyroscope_variance,
            "speed_kmh":               speed_kmh,
            "suspicious_accel":        suspicious_accel,
            "suspicious_gyro":         suspicious_gyro,
            "suspicious_speed":        suspicious_speed,
            "thresholds": {
                "min_accel_variance": MIN_ACCEL_VARIANCE,
                "min_gyro_variance":  MIN_GYRO_VARIANCE,
                "min_speed_kmh":      MIN_SPEED_KMH,
                "max_speed_kmh":      MAX_SPEED_KMH,
            },
        },
    )
