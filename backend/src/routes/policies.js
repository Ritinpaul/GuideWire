/**
 * Policies routes — /api/v1/policies
 *
 * POST  /subscribe   → subscribe worker to weekly plan (calls Shield-SAC for premium)
 * GET   /:id         → policy detail
 */
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validateBody } from '../middleware/validate.js';
import { calculatePremium } from '../services/mlClient.js';

const router = Router();

const SubscribeSchema = z.object({
  worker_id:          z.string().uuid(),
  plan_tier:          z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  pool_id:            z.string().uuid().optional().nullable(),
  upi_id:             z.string().min(5).max(50),
  // Optional weather context for precision pricing
  rain_mm:            z.number().min(0).default(0),
  aqi:                z.number().min(0).default(100),
  flood_score:        z.number().min(0).max(1).default(0.5),
  language:           z.string().default('en'),
});

// ── POST /subscribe ───────────────────────────────────────────────────────────
router.post('/subscribe', validateBody(SubscribeSchema), async (req, res, next) => {
  const { worker_id, plan_tier, pool_id, upi_id, rain_mm, aqi, flood_score, language } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch worker (must exist)
    const workerRes = await client.query(
      `SELECT w.*, z.flood_risk_score::float AS zone_flood_risk,
              z.historical_avg_aqi, z.avg_disruption_days_per_month::float,
              z.name AS zone_name
       FROM workers w LEFT JOIN zones z ON z.id = w.zone_id
       WHERE w.id = $1::uuid`,
      [worker_id],
    );
    if (!workerRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Worker not found' });
    }
    const worker = workerRes.rows[0];

    // 2. Reject if already has ACTIVE policy
    const existingRes = await client.query(
      `SELECT id FROM policies
       WHERE worker_id = $1::uuid AND status = 'ACTIVE'
         AND CURRENT_DATE <= end_date`,
      [worker_id],
    );
    if (existingRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error:     'Active policy exists',
        policy_id: existingRes.rows[0].id,
        message:   'Worker already has an active 7-day policy. Wait for it to expire before subscribing again.',
      });
    }

    // 3. Get precise premium from Shield-SAC
    const month     = new Date().getMonth() + 1;
    const isMonsoon = [6, 7, 8, 9].includes(month) ? 1 : 0;
    const premiumData = await calculatePremium({
      avg_earnings:               parseFloat(worker.avg_daily_earnings),
      flood_score:                flood_score ?? worker.zone_flood_risk ?? 0.5,
      historical_disruption_rate: worker.avg_disruption_days_per_month
        ? worker.avg_disruption_days_per_month / 10 : 0.3,
      population_density_bucket:  3,
      days_active:                1,
      claim_count:                0,
      claim_ratio:                0,
      rain_mm:                    rain_mm ?? 0,
      temp_c:                     28,
      humidity:                   isMonsoon ? 85 : 60,
      wind_kmh:                   10,
      aqi:                        aqi ?? worker.historical_avg_aqi ?? 120,
      cloud_pct:                  30,
      visibility_km:              8,
      day_of_week:                new Date().getDay(),
      month,
      is_monsoon:                 isMonsoon,
      language,
    });

    // 4. Use Shield-SAC recommendation or user-chosen tier
    const resolvedTier       = plan_tier ?? premiumData.plan_tier ?? 'MEDIUM';
    const tierCoverage       = { LOW: 1500, MEDIUM: 3000, HIGH: 5000 };
    const premiumAmount      = parseFloat(premiumData.premium_inr);
    const coverageAmount     = tierCoverage[resolvedTier] ?? parseFloat(premiumData.coverage_inr);

    // 5. Apply pool discount if pool provided
    let finalPremium = premiumAmount;
    if (pool_id) {
      const poolRes = await client.query(
        `SELECT premium_discount_pct::float, member_count FROM shield_pools
         WHERE id = $1::uuid AND status = 'ACTIVE'`,
        [pool_id],
      );
      if (poolRes.rows[0]) {
        const discount = poolRes.rows[0].premium_discount_pct / 100;
        finalPremium = Math.max(15, premiumAmount * (1 - discount));
      }
    }

    // 6. Insert policy
    const today = new Date().toISOString().slice(0, 10);
    const end   = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const { rows } = await client.query(
      `INSERT INTO policies
         (worker_id, plan_tier, premium_amount, coverage_amount,
          start_date, end_date, status, pool_id,
          shieldsac_confidence, shap_explanation)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9)
       RETURNING *`,
      [
        worker_id, resolvedTier,
        Math.round(finalPremium * 100) / 100,
        coverageAmount,
        today, end,
        pool_id ?? null,
        premiumData.confidence ?? null,
        JSON.stringify(premiumData.shap_explanation ?? {}),
      ],
    );
    const policy = rows[0];

    // 7. Increment pool member count
    if (pool_id) {
      await client.query(
        `UPDATE shield_pools SET member_count = member_count + 1 WHERE id = $1::uuid`,
        [pool_id],
      );
    }

    // 8. Store UPI ID on worker record for payouts
    await client.query(
      `UPDATE workers SET updated_at = NOW() WHERE id = $1::uuid`,
      [worker_id],
    );

    await client.query('COMMIT');

    res.status(201).json({
      success:       true,
      policy: {
        id:              policy.id,
        worker_id:       policy.worker_id,
        plan_tier:       policy.plan_tier,
        premium_amount:  parseFloat(policy.premium_amount),
        coverage_amount: parseFloat(policy.coverage_amount),
        start_date:      policy.start_date,
        end_date:        policy.end_date,
        status:          policy.status,
        pool_id:         policy.pool_id,
      },
      shield_sac:    {
        premium_recommended: premiumAmount,
        premium_after_pool:  Math.round(finalPremium * 100) / 100,
        confidence:          premiumData.confidence,
        shap_explanation:    premiumData.shap_explanation,
        fairness_check:      premiumData.fairness_check,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              p.premium_amount::float,
              p.coverage_amount::float,
              p.shieldsac_confidence::float,
              w.name  AS worker_name,
              w.phone AS worker_phone,
              w.city  AS worker_city,
              sp.member_count,
              sp.premium_discount_pct::float
       FROM policies p
       JOIN workers w       ON w.id  = p.worker_id
       LEFT JOIN shield_pools sp ON sp.id = p.pool_id
       WHERE p.id = $1::uuid`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Policy not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
