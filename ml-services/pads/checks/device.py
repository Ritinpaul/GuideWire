"""
PADS Layer 1 — Device Integrity Check.
Detects emulators, rooted devices, and VPN usage.
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass
class DeviceCheckResult:
    result: str           # "PASS" | "FAIL" | "WARN"
    confidence: float     # 0.0–1.0
    fraud_contribution: float   # how much this adds to total fraud_score
    details: dict


def check_device(
    is_emulator: bool = False,
    is_rooted: bool = False,
    vpn_detected: bool = False,
    device_fingerprint: str = "",
) -> DeviceCheckResult:
    """
    Scoring logic:
      - Emulator detected  → FAIL (confidence 0.95, contribution 0.45)
      - Rooted device      → WARN (confidence 0.75, contribution 0.20)
      - VPN detected       → WARN (confidence 0.70, contribution 0.15)
      - Clean              → PASS (confidence 0.98, contribution 0.0)
    """
    issues = []
    contribution = 0.0
    confidence = 0.98

    if is_emulator:
        issues.append("emulator_detected")
        contribution += 0.45
        confidence = 0.95

    if is_rooted:
        issues.append("rooted_device")
        contribution += 0.20
        confidence = min(confidence, 0.80)

    if vpn_detected:
        issues.append("vpn_detected")
        contribution += 0.15
        confidence = min(confidence, 0.75)

    if contribution == 0:
        result = "PASS"
    elif contribution >= 0.40:
        result = "FAIL"
    else:
        result = "WARN"

    return DeviceCheckResult(
        result=result,
        confidence=round(confidence, 3),
        fraud_contribution=round(min(contribution, 1.0), 3),
        details={
            "is_emulator":       is_emulator,
            "is_rooted":         is_rooted,
            "vpn_detected":      vpn_detected,
            "fingerprint_length": len(device_fingerprint),
            "issues":            issues,
        },
    )
