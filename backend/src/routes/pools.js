/**
 * Shield Pools routes — /api/v1/pools
 *
 * POST  /join          → worker joins or creates pool for their zone
 * GET   /:id           → pool details + member count
 * GET   /zone/:zone_id → find pool for a zone
 */
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Discount tiers by member count
function calcDiscount(memberCount) {
  if (memberCount >= 26) return 20.00;
  if (memberCount >= 11) return 18.00;
  if (memberCount >= 5)  return 15.00;
  return 10.00;
}

const JoinSchema = z.object({
  worker_id: z.string().uuid(),
  zone_id:   z.string().uuid().optional(), // if omitted, auto-detect from worker
});

// ── POST /join ────────────────────────────────────────────────────────────────
router.post('/join', validateBody(JoinSchema), async (req, res, next) => {
  const { worker_id } = req.body;
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // Resolve zone_id from worker if not provided
    let zone_id = req.body.zone_id;
    if (!zone_id) {
      const { rows } = await dbClient.query(
        'SELECT zone_id FROM workers WHERE id = $1::uuid',
        [worker_id],
      );
      if (!rows[0]?.zone_id) {
        await dbClient.query('ROLLBACK');
        return res.status(422).json({ error: 'Worker has no zone assigned. Register first.' });
      }
      zone_id = rows[0].zone_id;
    }

    // Find existing ACTIVE pool for this zone
    let poolRow = (
      await dbClient.query(
        `SELECT * FROM shield_pools WHERE zone_id = $1::uuid AND status = 'ACTIVE' LIMIT 1`,
        [zone_id],
      )
    ).rows[0];

    let created = false;
    if (!poolRow) {
      // Create new pool
      const discount = calcDiscount(1);
      poolRow = (
        await dbClient.query(
          `INSERT INTO shield_pools (zone_id, member_count, premium_discount_pct, status)
           VALUES ($1::uuid, 1, $2, 'ACTIVE')
           RETURNING *`,
          [zone_id, discount],
        )
      ).rows[0];
      created = true;
    } else {
      // Increment member count + recalculate discount
      const newCount   = poolRow.member_count + 1;
      const newDiscount = calcDiscount(newCount);
      poolRow = (
        await dbClient.query(
          `UPDATE shield_pools
           SET member_count = $2, premium_discount_pct = $3
           WHERE id = $1::uuid
           RETURNING *`,
          [poolRow.id, newCount, newDiscount],
        )
      ).rows[0];
    }

    await dbClient.query('COMMIT');

    res.status(created ? 201 : 200).json({
      success:      true,
      action:       created ? 'created' : 'joined',
      pool: {
        id:                   poolRow.id,
        zone_id:              poolRow.zone_id,
        member_count:         poolRow.member_count,
        premium_discount_pct: parseFloat(poolRow.premium_discount_pct),
        status:               poolRow.status,
      },
    });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

// ── GET /zone/:zone_id ────────────────────────────────────────────────────────
router.get('/zone/:zone_id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT sp.*,
              sp.premium_discount_pct::float,
              sp.total_pool_fund::float,
              z.name AS zone_name, z.city
       FROM shield_pools sp
       JOIN zones z ON z.id = sp.zone_id
       WHERE sp.zone_id = $1::uuid AND sp.status = 'ACTIVE'
       LIMIT 1`,
      [req.params.zone_id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'No active pool for this zone' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT sp.*,
              sp.premium_discount_pct::float,
              sp.total_pool_fund::float,
              z.name AS zone_name, z.city
       FROM shield_pools sp
       JOIN zones z ON z.id = sp.zone_id
       WHERE sp.id = $1::uuid`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pool not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
