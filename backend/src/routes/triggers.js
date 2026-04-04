/**
 * Triggers routes — /api/v1/triggers
 *
 * POST  /inject          → ⚡ DEMO MAGIC BUTTON — fires trigger, creates claims, broadcasts WS
 * GET   /active          → list currently active triggers (not resolved, last 24h)
 * GET   /dsi/heatmap     → proxy to DSI service heatmap (all 25 zones)
 * GET   /dsi/:zone_id    → proxy to DSI service for a single zone
 */
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validateBody } from '../middleware/validate.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { validateClaim, getZoneDSI, getDSIHeatmap } from '../services/mlClient.js';
import { broadcast } from '../ws/broadcast.js';

const router = Router();

// ── Claim amount formula ──────────────────────────────────────────────────────
// payout = coverage × tier_ratio × (dsi_score / 100), minimum ₹100
const TIER_RATIOS = { LOW: 0.20, MEDIUM: 0.25, HIGH: 0.30 };

function computeClaimAmount(planTier, coverageAmount, dsiScore) {
  const ratio      = TIER_RATIOS[planTier] ?? 0.20;
  const severity   = Math.max(0.30, (dsiScore ?? 50) / 100);  // floor 0.30
  const raw        = parseFloat(coverageAmount) * ratio * severity;
  return Math.max(100, Math.round(raw));
}

// ── Schemas ──────────────────────────────────────────────────────────────────
const InjectSchema = z.object({
  zone_id:        z.string().uuid(),
  type:           z.enum(['HEAVY_RAIN', 'FLOOD', 'HEATWAVE', 'POLLUTION', 'CURFEW', 'COMPOSITE_DSI']),
  severity_value: z.number().min(0),
  dsi_score:      z.number().min(0).max(100).default(50),
  source:         z.string().default('DEMO'),
  raw_data:       z.record(z.unknown()).default({}),
});

// ── POST /inject ──────────────────────────────────────────────────────────────
router.post('/inject', requireAdmin, validateBody(InjectSchema), async (req, res, next) => {
  const { zone_id, type, severity_value, dsi_score, source, raw_data } = req.body;
  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    // 1. Create trigger record
    const { rows: [trigger] } = await dbClient.query(
      `INSERT INTO triggers
         (zone_id, type, severity_value, dsi_score, raw_data, source, detected_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [zone_id, type, severity_value, dsi_score, JSON.stringify(raw_data), source],
    );

    // 2. Find all ACTIVE policies in the affected zone
    const { rows: policies } = await dbClient.query(
      `SELECT p.id         AS policy_id,
              p.worker_id,
              p.plan_tier,
              p.coverage_amount::float,
              w.name               AS worker_name,
              w.avg_daily_earnings::float,
              w.zone_id::text
       FROM policies p
       JOIN workers w ON w.id = p.worker_id
       WHERE w.zone_id = $1::uuid
         AND p.status = 'ACTIVE'
         AND CURRENT_DATE BETWEEN p.start_date AND p.end_date`,
      [zone_id],
    );

    // 3. Create one claim per policy (ON CONFLICT → skip duplicates)
    const claimsCreated = [];
    for (const pol of policies) {
      const amount = computeClaimAmount(pol.plan_tier, pol.coverage_amount, dsi_score);
      const { rows: [claim] } = await dbClient.query(
        `INSERT INTO claims
           (policy_id, trigger_id, claim_amount, status, adjudication_type)
         VALUES ($1::uuid, $2::uuid, $3, 'INITIATED', 'PENDING')
         ON CONFLICT (policy_id, trigger_id) DO NOTHING
         RETURNING id`,
        [pol.policy_id, trigger.id, amount],
      );
      if (claim) {
        claimsCreated.push({
          claim_id:    claim.id,
          worker_id:   pol.worker_id,
          worker_name: pol.worker_name,
          plan_tier:   pol.plan_tier,
          claim_amount: amount,
        });
      }
    }

    await dbClient.query('COMMIT');

    // 4. Async: run PADS validation + write fraud_logs for each claim
    // (fire-and-forget — response already sent, don't block on this)
    _runPadsForClaims(claimsCreated, trigger, zone_id).catch((err) =>
      console.error('[TRIGGER] PADS background validation failed:', err.message),
    );

    // 5. Broadcast via WebSocket to admin + affected workers
    broadcast('TRIGGER_FIRED', {
      trigger_id:     trigger.id,
      zone_id,
      type,
      dsi_score,
      severity_value,
      source,
      claims_created: claimsCreated.length,
      claims:         claimsCreated,
    });

    res.status(201).json({
      success:         true,
      trigger: {
        id:             trigger.id,
        zone_id:        trigger.zone_id,
        type:           trigger.type,
        severity_value: parseFloat(trigger.severity_value),
        dsi_score:      parseFloat(trigger.dsi_score ?? 0),
        source:         trigger.source,
        detected_at:    trigger.detected_at,
      },
      policies_affected: policies.length,
      claims_created:    claimsCreated.length,
      claims:            claimsCreated,
    });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

/**
 * Background: run PADS on each freshly-created claim,
 * update claim status, write fraud_logs.
 */
async function _runPadsForClaims(claims, trigger, zone_id) {
  const zoneRes = await pool.query(
    'SELECT lat::float, lng::float, radius_km::float FROM zones WHERE id = $1::uuid',
    [zone_id],
  );
  const zone = zoneRes.rows[0] ?? { lat: 0, lng: 0, radius_km: 3 };

  for (const c of claims) {
    try {
      const padsResult = await validateClaim({
        claim_id:               c.claim_id,
        policy_id:              c.policy_id,
        trigger_id:             trigger.id,
        zone_lat:               zone.lat,
        zone_lng:               zone.lng,
        zone_radius_km:         zone.radius_km,
        worker_gps_lat:         zone.lat + (Math.random() - 0.5) * 0.02,
        worker_gps_lng:         zone.lng + (Math.random() - 0.5) * 0.02,
        accelerometer_variance: parseFloat((0.3 + Math.random() * 0.5).toFixed(2)),
        gyroscope_variance:     parseFloat((0.1 + Math.random() * 0.2).toFixed(2)),
        speed_kmh:              parseFloat((10 + Math.random() * 30).toFixed(1)),
        hour_of_day:            new Date().getHours(),
        claims_last_30d:        0,
        avg_claim_amount:       c.claim_amount,
      });

      // Determine new claim status
      const rec    = padsResult.recommendation;
      const status = rec === 'AUTO_APPROVE' ? 'APPROVED'
                   : rec === 'AUTO_REJECT'  ? 'REJECTED'
                   : 'FLAGGED';

      // Update claim
      await pool.query(
        `UPDATE claims
         SET fraud_score = $2, status = $3, adjudication_type = $4,
             approved_at = CASE WHEN $3 = 'APPROVED' THEN NOW() ELSE NULL END
         WHERE id = $1::uuid`,
        [c.claim_id, padsResult.fraud_score, status, rec],
      );

      // Write fraud_logs (one row per PADS check)
      if (Array.isArray(padsResult.checks) && padsResult.checks.length > 0) {
        for (const chk of padsResult.checks) {
          await pool.query(
            `INSERT INTO fraud_logs (claim_id, check_type, result, confidence, details)
             VALUES ($1::uuid, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [
              c.claim_id,
              chk.type ?? chk.name ?? 'ANOMALY_DETECTION',
              chk.result,
              chk.confidence,
              JSON.stringify(chk.details ?? {}),
            ],
          );
        }
      }

      // Broadcast updated claim status to admin + worker
      broadcast('CLAIM_STATUS_UPDATE', {
        claim_id:    c.claim_id,
        worker_id:   c.worker_id,
        status,
        fraud_score: padsResult.fraud_score,
        summary:     padsResult.summary,
      });

      // If approved → create payout record (Razorpay integration placeholder)
      if (status === 'APPROVED') {
        await _initiatePayoutRecord(c);
      }
    } catch (innerErr) {
      console.error(`[PADS] Failed for claim ${c.claim_id}:`, innerErr.message);
    }
  }
}

/**
 * Create a payout record for an approved claim.
 * Real Razorpay calls go here in Phase 3.
 */
async function _initiatePayoutRecord(claim) {
  try {
    // Fetch UPI ID from worker (stored on registration or policy subscription)
    const workerRes = await pool.query(
      'SELECT id FROM workers WHERE id = $1::uuid',
      [claim.worker_id],
    );
    if (!workerRes.rows[0]) return;

    // Idempotent: skip if payout already exists
    const existing = await pool.query(
      'SELECT id FROM payouts WHERE claim_id = $1::uuid',
      [claim.claim_id],
    );
    if (existing.rows[0]) return;

    const { rows: [payout] } = await pool.query(
      `INSERT INTO payouts (claim_id, worker_id, amount, upi_id, status)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'PROCESSING')
       RETURNING *`,
      [claim.claim_id, claim.worker_id, claim.claim_amount, 'demo@upi'],
    );

    // TODO Phase 3: call Razorpay sandbox API here
    // Simulate 30s payout processing
    setTimeout(async () => {
      const ref = `pay_DEMO_${Date.now()}`;
      await pool.query(
        `UPDATE payouts SET status = 'COMPLETED', razorpay_ref = $2, completed_at = NOW()
         WHERE id = $1::uuid`,
        [payout.id, ref],
      );
      await pool.query(
        `UPDATE claims SET status = 'PAID', paid_at = NOW(), payout_ref = $2 WHERE id = $1::uuid`,
        [claim.claim_id, ref],
      );
      broadcast('PAYOUT_COMPLETED', {
        payout_id:   payout.id,
        claim_id:    claim.claim_id,
        worker_id:   claim.worker_id,
        amount:      claim.claim_amount,
        razorpay_ref: ref,
      });
    }, 30_000);
  } catch (err) {
    console.error('[PAYOUT] Failed to create payout record:', err.message);
  }
}

// ── GET /active ───────────────────────────────────────────────────────────────
router.get('/active', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*,
              t.dsi_score::float,
              t.severity_value::float,
              z.name AS zone_name, z.city,
              COUNT(c.id)::int AS claims_count
       FROM triggers t
       JOIN zones z ON z.id = t.zone_id
       LEFT JOIN claims c ON c.trigger_id = t.id
       WHERE t.detected_at > NOW() - INTERVAL '24 hours'
         AND t.resolved_at IS NULL
       GROUP BY t.id, z.name, z.city
       ORDER BY t.detected_at DESC
       LIMIT 50`,
    );
    res.json({ triggers: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// ── GET /dsi/heatmap — MUST come before /dsi/:zone_id ────────────────────────
router.get('/dsi/heatmap', async (_req, res, next) => {
  try {
    const data = await getDSIHeatmap();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── GET /dsi/:zone_id ─────────────────────────────────────────────────────────
router.get('/dsi/:zone_id', async (req, res, next) => {
  try {
    const data = await getZoneDSI(req.params.zone_id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
