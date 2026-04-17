/**
 * Triggers routes — /api/v1/triggers
 *
 * POST  /inject          → ⚡ DEMO MAGIC BUTTON — fires trigger, creates claims, broadcasts WS
 * GET   /active          → list currently active triggers (not resolved, last 24h)
 * GET   /dsi/heatmap     → DSI service heatmap (DB fallback if unavailable)
 * GET   /dsi/:zone_id    → single-zone DSI (DB fallback if unavailable)
 */
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validateBody } from '../middleware/validate.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validateClaim, getZoneDSI, getDSIHeatmap } from '../services/mlClient.js';
import { broadcast } from '../ws/broadcast.js';

const router = Router();

// payout = coverage × tier_ratio × (dsi_score / 100), minimum ₹100
const TIER_RATIOS = { LOW: 0.20, MEDIUM: 0.25, HIGH: 0.30 };

function computeClaimAmount(planTier, coverageAmount, dsiScore) {
  const ratio = TIER_RATIOS[planTier] ?? 0.20;
  const severity = Math.max(0.30, (dsiScore ?? 50) / 100);
  const raw = parseFloat(coverageAmount) * ratio * severity;
  return Math.max(100, Math.round(raw));
}

function dsiLevelFromScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'UNKNOWN';
  if (n < 30) return 'NORMAL';
  if (n < 50) return 'ELEVATED';
  if (n < 70) return 'HIGH';
  return 'CRITICAL';
}

const InjectSchema = z.object({
  zone_id: z.string().uuid(),
  type: z.enum(['HEAVY_RAIN', 'FLOOD', 'HEATWAVE', 'POLLUTION', 'CURFEW', 'COMPOSITE_DSI']),
  severity_value: z.number().min(0),
  dsi_score: z.number().min(0).max(100).default(50),
  source: z.string().default('DEMO'),
  raw_data: z.record(z.unknown()).default({}),
});

const triggerInjectRateLimit = createRateLimiter({
  name: 'trigger_inject',
  windowMs: 60_000,
  max: 20,
  keyFn: (req) => `${req.ip || 'unknown'}:${req.admin?.username || 'admin'}`,
});

router.post('/inject', requireAdmin, triggerInjectRateLimit, validateBody(InjectSchema), async (req, res, next) => {
  const { zone_id, type, severity_value, dsi_score, source, raw_data } = req.body;
  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    const { rows: [trigger] } = await dbClient.query(
      `INSERT INTO triggers
         (zone_id, type, severity_value, dsi_score, raw_data, source, detected_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [zone_id, type, severity_value, dsi_score, JSON.stringify(raw_data), source],
    );

    const { rows: policies } = await dbClient.query(
      `SELECT p.id AS policy_id,
              p.worker_id,
              p.plan_tier,
              p.coverage_amount::float,
              w.name AS worker_name,
              w.avg_daily_earnings::float,
              w.zone_id::text
       FROM policies p
       JOIN workers w ON w.id = p.worker_id
       WHERE w.zone_id = $1::uuid
         AND p.status = 'ACTIVE'
         AND CURRENT_DATE BETWEEN p.start_date AND p.end_date`,
      [zone_id],
    );

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
          claim_id: claim.id,
          policy_id: pol.policy_id,
          worker_id: pol.worker_id,
          worker_name: pol.worker_name,
          plan_tier: pol.plan_tier,
          claim_amount: amount,
        });
      }
    }

    await dbClient.query('COMMIT');

    _runPadsForClaims(claimsCreated, trigger, zone_id).catch((err) => {
      console.error('[TRIGGER] PADS background validation failed:', err.message);
    });

    const { rows: [zoneRow] } = await pool.query(
      `SELECT name, city FROM zones WHERE id = $1::uuid`,
      [zone_id],
    );

    broadcast('TRIGGER_FIRED', {
      trigger_id: trigger.id,
      zone_id,
      zone_name: zoneRow?.name ?? zone_id,
      city: zoneRow?.city ?? null,
      type,
      dsi_score,
      severity_value,
      source,
      claims_created: claimsCreated.length,
      claims: claimsCreated,
    });

    res.status(201).json({
      success: true,
      trigger: {
        id: trigger.id,
        zone_id: trigger.zone_id,
        type: trigger.type,
        severity_value: parseFloat(trigger.severity_value),
        dsi_score: parseFloat(trigger.dsi_score ?? 0),
        source: trigger.source,
        detected_at: trigger.detected_at,
      },
      policies_affected: policies.length,
      claims_created: claimsCreated.length,
      claims: claimsCreated,
    });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

async function _runPadsForClaims(claims, trigger, zone_id) {
  const zoneRes = await pool.query(
    'SELECT lat::float, lng::float, radius_km::float FROM zones WHERE id = $1::uuid',
    [zone_id],
  );
  const zone = zoneRes.rows[0] ?? { lat: 0, lng: 0, radius_km: 3 };

  for (const c of claims) {
    try {
      const padsResult = await validateClaim({
        claim_id: c.claim_id,
        policy_id: c.policy_id,
        trigger_id: trigger.id,
        zone_lat: zone.lat,
        zone_lng: zone.lng,
        zone_radius_km: zone.radius_km,
        worker_gps_lat: zone.lat + (Math.random() - 0.5) * 0.02,
        worker_gps_lng: zone.lng + (Math.random() - 0.5) * 0.02,
        accelerometer_variance: parseFloat((0.3 + Math.random() * 0.5).toFixed(2)),
        gyroscope_variance: parseFloat((0.1 + Math.random() * 0.2).toFixed(2)),
        speed_kmh: parseFloat((10 + Math.random() * 30).toFixed(1)),
        hour_of_day: new Date().getHours(),
        claims_last_30d: 0,
        avg_claim_amount: c.claim_amount,
      });

      const rec = padsResult.recommendation;
      const status = rec === 'AUTO_APPROVE' ? 'APPROVED'
        : rec === 'AUTO_REJECT' ? 'REJECTED'
          : 'FLAGGED';

      await pool.query(
        `UPDATE claims
         SET fraud_score = $2, status = $3, adjudication_type = $4,
             approved_at = CASE WHEN $3 = 'APPROVED' THEN NOW() ELSE NULL END
         WHERE id = $1::uuid`,
        [c.claim_id, padsResult.fraud_score, status, rec],
      );

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

      broadcast('CLAIM_STATUS_UPDATE', {
        claim_id: c.claim_id,
        worker_id: c.worker_id,
        status,
        fraud_score: padsResult.fraud_score,
        summary: padsResult.summary,
      });

      if (status === 'APPROVED') {
        await _initiatePayoutRecord(c);
      }
    } catch (innerErr) {
      console.error(`[PADS] Failed for claim ${c.claim_id}:`, innerErr.message);
    }
  }
}

async function _initiatePayoutRecord(claim) {
  try {
    const workerRes = await pool.query(
      'SELECT id FROM workers WHERE id = $1::uuid',
      [claim.worker_id],
    );
    if (!workerRes.rows[0]) return;

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

    setTimeout(async () => {  // 8s simulates Razorpay processing time
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
        payout_id: payout.id,
        claim_id: claim.claim_id,
        worker_id: claim.worker_id,
        amount: claim.claim_amount,
        razorpay_ref: ref,
        trigger_type: claim.trigger_type ?? 'HEAVY_RAIN',
        zone_name: claim.zone_name ?? claim.zone_id ?? 'Your zone',
      });
    }, 8_000);
  } catch (err) {
    console.error('[PAYOUT] Failed to create payout record:', err.message);
  }
}

router.get('/active', async (_req, res, next) => {
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

// ── LIVE WEATHER SCAN — Demo-defining feature ──────────────────────────────
// Fetches real/mock weather for all 25 zones via DSI heatmap,
// identifies zones breaching trigger threshold, and auto-fires triggers.
router.post('/live-scan', requireAdmin, async (req, res, next) => {
  try {
    const heatmapData = await getDSIHeatmap();
    const zones = Array.isArray(heatmapData?.zones) ? heatmapData.zones : [];

    if (zones.length === 0) {
      return res.json({
        success: true,
        scanned: 0,
        triggered: [],
        message: 'DSI service unavailable — no zones scanned.',
      });
    }

    const DSI_TRIGGER_THRESHOLD = 65;
    const triggered = [];
    const skipped = [];

    for (const z of zones) {
      const score = z.dsi_score ?? 0;
      if (score < DSI_TRIGGER_THRESHOLD) {
        skipped.push({ zone_id: z.zone_id, name: z.name, city: z.city, dsi_score: score, level: z.level });
        continue;
      }

      // Determine trigger type from the zone's triggered events
      const events = z.triggered_events ?? [];
      const type = events[0] ?? 'COMPOSITE_DSI';

      // Fire the trigger through the existing pipeline
      try {
        const dbClient = await pool.connect();
        try {
          await dbClient.query('BEGIN');
          const { rows: [trigger] } = await dbClient.query(
            `INSERT INTO triggers
               (zone_id, type, severity_value, dsi_score, raw_data, source, detected_at)
             VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())
             RETURNING *`,
            [z.zone_id, type, score / 10, score, JSON.stringify({
              weather: z.weather ?? {},
              breakdown: z.breakdown ?? {},
              source: 'LIVE_WEATHER_SCAN',
            }), 'LIVE_WEATHER'],
          );

          const { rows: policies } = await dbClient.query(
            `SELECT p.id AS policy_id, p.worker_id, p.plan_tier, p.coverage_amount::float,
                    w.name AS worker_name
             FROM policies p JOIN workers w ON w.id = p.worker_id
             WHERE w.zone_id = $1::uuid AND p.status = 'ACTIVE'
               AND CURRENT_DATE BETWEEN p.start_date AND p.end_date`,
            [z.zone_id],
          );

          const claimsCreated = [];
          for (const pol of policies) {
            const amount = computeClaimAmount(pol.plan_tier, pol.coverage_amount, score);
            const { rows: [claim] } = await dbClient.query(
              `INSERT INTO claims (policy_id, trigger_id, claim_amount, status, adjudication_type)
               VALUES ($1::uuid, $2::uuid, $3, 'INITIATED', 'PENDING')
               ON CONFLICT (policy_id, trigger_id) DO NOTHING RETURNING id`,
              [pol.policy_id, trigger.id, amount],
            );
            if (claim) claimsCreated.push({ claim_id: claim.id, policy_id: pol.policy_id, worker_id: pol.worker_id, worker_name: pol.worker_name, plan_tier: pol.plan_tier, claim_amount: amount });
          }

          await dbClient.query('COMMIT');

          // Fire PADS validation in background
          _runPadsForClaims(claimsCreated, trigger, z.zone_id).catch(() => {});

          broadcast('TRIGGER_FIRED', {
            trigger_id: trigger.id, zone_id: z.zone_id, zone_name: z.name, city: z.city,
            type, dsi_score: score, source: 'LIVE_WEATHER', claims_created: claimsCreated.length, claims: claimsCreated,
          });

          triggered.push({
            zone_id: z.zone_id, name: z.name, city: z.city, dsi_score: score, level: z.level,
            type, policies_affected: policies.length, claims_created: claimsCreated.length,
            weather: z.weather ?? {},
          });
        } catch (innerErr) {
          await dbClient.query('ROLLBACK');
          console.error(`[LIVE-SCAN] Zone ${z.name} trigger failed:`, innerErr.message);
        } finally {
          dbClient.release();
        }
      } catch (connErr) {
        console.error(`[LIVE-SCAN] DB connect failed for zone ${z.name}:`, connErr.message);
      }
    }

    res.json({
      success: true,
      scanned: zones.length,
      threshold: DSI_TRIGGER_THRESHOLD,
      triggered,
      below_threshold: skipped.length,
      message: triggered.length > 0
        ? `🔴 ${triggered.length} zone(s) breached DSI ${DSI_TRIGGER_THRESHOLD}. Claims auto-created.`
        : `All ${zones.length} zones below DSI ${DSI_TRIGGER_THRESHOLD}. No triggers fired.`,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/dsi/heatmap', async (_req, res, next) => {
  try {
    const data = await getDSIHeatmap();
    const zones = Array.isArray(data?.zones) ? data.zones : [];

    if (zones.length > 0) {
      return res.json(data);
    }

    const { rows } = await pool.query(
      `SELECT z.id AS zone_id,
              z.city,
              z.name,
              z.lat::float,
              z.lng::float,
              z.radius_km::float,
              COALESCE(ap.active_policies, 0)::int AS active_policies,
              lt.dsi_score::float,
              lt.detected_at
       FROM zones z
       LEFT JOIN (
         SELECT w.zone_id, COUNT(*)::int AS active_policies
         FROM workers w
         JOIN policies p ON p.worker_id = w.id
         WHERE p.status = 'ACTIVE'
         GROUP BY w.zone_id
       ) ap ON ap.zone_id = z.id
       LEFT JOIN LATERAL (
         SELECT t.dsi_score, t.detected_at
         FROM triggers t
         WHERE t.zone_id = z.id
           AND t.dsi_score IS NOT NULL
         ORDER BY t.detected_at DESC
         LIMIT 1
       ) lt ON true
       ORDER BY z.city, z.name`,
    );

    const fallbackZones = rows.map((z) => ({
      ...z,
      level: dsiLevelFromScore(z.dsi_score),
      source: 'db_fallback',
    }));

    res.json({ zones: fallbackZones, total: fallbackZones.length, source: 'db_fallback' });
  } catch (err) {
    next(err);
  }
});

router.get('/dsi/:zone_id', async (req, res, next) => {
  try {
    const data = await getZoneDSI(req.params.zone_id);
    if (data?.source !== 'mock_fallback') {
      return res.json(data);
    }

    const zoneId = req.params.zone_id;
    const { rows } = await pool.query(
      `SELECT z.id AS zone_id,
              z.city,
              z.name,
              z.lat::float,
              z.lng::float,
              lt.type AS trigger_type,
              lt.dsi_score::float,
              lt.detected_at,
              COALESCE(lt.raw_data, '{}'::jsonb) AS raw_data
       FROM zones z
       LEFT JOIN LATERAL (
         SELECT t.type, t.dsi_score, t.detected_at, t.raw_data
         FROM triggers t
         WHERE t.zone_id = z.id
           AND t.dsi_score IS NOT NULL
         ORDER BY t.detected_at DESC
         LIMIT 1
       ) lt ON true
       WHERE z.id = $1::uuid
       LIMIT 1`,
      [zoneId],
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const row = rows[0];
    res.json({
      zone_id: row.zone_id,
      city: row.city,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      dsi_score: row.dsi_score,
      level: dsiLevelFromScore(row.dsi_score),
      triggered_events: row.trigger_type ? [row.trigger_type] : [],
      breakdown: row.raw_data,
      detected_at: row.detected_at,
      source: 'db_fallback',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
