/**
 * Claims routes — /api/v1/claims
 *
 * GET  /:id   → single claim detail including all PADS fraud_logs
 */
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/:id', async (req, res, next) => {
  try {
    const [claimRes, logsRes] = await Promise.all([
      pool.query(
        `SELECT c.*,
                c.claim_amount::float,
                c.fraud_score::float,
                t.type          AS trigger_type,
                t.dsi_score::float,
                t.severity_value::float,
                t.raw_data,
                t.detected_at,
                t.source        AS trigger_source,
                z.name          AS zone_name,
                z.city,
                z.lat::float,
                z.lng::float,
                p.plan_tier,
                p.premium_amount::float,
                p.coverage_amount::float,
                w.name          AS worker_name,
                w.phone         AS worker_phone
         FROM claims c
         JOIN policies p  ON p.id = c.policy_id
         JOIN triggers t  ON t.id = c.trigger_id
         JOIN zones z     ON z.id = t.zone_id
         JOIN workers w   ON w.id = p.worker_id
         WHERE c.id = $1::uuid`,
        [req.params.id],
      ),
      pool.query(
        `SELECT id, check_type, result, confidence::float, details, checked_at
         FROM fraud_logs
         WHERE claim_id = $1::uuid
         ORDER BY checked_at ASC`,
        [req.params.id],
      ),
    ]);

    if (!claimRes.rows[0]) return res.status(404).json({ error: 'Claim not found' });

    res.json({
      ...claimRes.rows[0],
      fraud_logs: logsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
