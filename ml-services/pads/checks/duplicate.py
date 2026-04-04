"""
PADS Layer 4 — Duplicate Claim Check.
Queries the database to detect if a claim for the same (policy, trigger) pair
already exists.  If a claim was previously PAID or APPROVED, this is high-confidence fraud.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional


@dataclass
class DuplicateCheckResult:
    result: str
    confidence: float
    fraud_contribution: float
    details: dict


async def check_duplicate(
    policy_id: str,
    trigger_id: str,
    db_pool=None,
) -> DuplicateCheckResult:
    """
    Query for existing claim with same (policy_id, trigger_id).
    - PAID / APPROVED prior claim  → FAIL
    - FLAGGED prior claim          → WARN
    - No prior claim               → PASS
    - DB unavailable               → PASS with warning in details
    """
    if db_pool is None:
        return DuplicateCheckResult(
            result="PASS",
            confidence=0.50,
            fraud_contribution=0.0,
            details={"db_available": False, "note": "DB unavailable — skipped"},
        )

    try:
        row = await db_pool.fetchrow(
            """
            SELECT id::text, status
            FROM claims
            WHERE policy_id = $1::uuid AND trigger_id = $2::uuid
            LIMIT 1
            """,
            policy_id,
            trigger_id,
        )
    except Exception as exc:
        return DuplicateCheckResult(
            result="PASS",
            confidence=0.50,
            fraud_contribution=0.0,
            details={"db_available": False, "error": str(exc)},
        )

    if row is None:
        return DuplicateCheckResult(
            result="PASS",
            confidence=0.99,
            fraud_contribution=0.0,
            details={"duplicate_found": False, "existing_claim_id": None},
        )

    existing_status = row["status"]
    if existing_status in ("PAID", "APPROVED"):
        return DuplicateCheckResult(
            result="FAIL",
            confidence=0.99,
            fraud_contribution=0.50,
            details={
                "duplicate_found":   True,
                "existing_claim_id": row["id"],
                "existing_status":   existing_status,
            },
        )
    elif existing_status == "FLAGGED":
        return DuplicateCheckResult(
            result="WARN",
            confidence=0.85,
            fraud_contribution=0.25,
            details={
                "duplicate_found":   True,
                "existing_claim_id": row["id"],
                "existing_status":   existing_status,
            },
        )
    else:
        # INITIATED / FRAUD_CHECK / REJECTED — informational
        return DuplicateCheckResult(
            result="WARN",
            confidence=0.70,
            fraud_contribution=0.10,
            details={
                "duplicate_found":   True,
                "existing_claim_id": row["id"],
                "existing_status":   existing_status,
            },
        )
