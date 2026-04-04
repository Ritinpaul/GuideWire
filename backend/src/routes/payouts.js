/**
 * Payouts routes — /api/v1/payouts
 *
 * GET  /:id  → single payout detail
 */
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT py.*,
              py.amount::float,
              c.claim_amount::float,
              c.status        AS claim_status,
              c.fraud_score::float,
              t.type          AS trigger_type,
              t.dsi_score::float,
              t.raw_data,
              z.name          AS zone_name,
              z.city,
              w.name          AS worker_name,
              w.phone         AS worker_phone
       FROM payouts py
       JOIN claims c    ON c.id = py.claim_id
       JOIN triggers t  ON t.id = c.trigger_id
       JOIN zones z     ON z.id = t.zone_id
       JOIN workers w   ON w.id = py.worker_id
       WHERE py.id = $1::uuid`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payout not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
