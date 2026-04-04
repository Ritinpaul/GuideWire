/**
 * Workers routes — /api/v1/workers
 *
 * POST   /register          → register worker, auto-detect zone, get premium recommendation
 * GET    /:id               → worker profile
 * GET    /:id/dashboard     → live dashboard (worker + active policy + claims summary)
 * GET    /:id/policies      → all policies for worker
 * GET    /:id/claims        → all claims for worker
 * GET    /:id/payouts       → all payouts for worker
 */
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validateBody } from '../middleware/validate.js';
import { calculatePremium } from '../services/mlClient.js';

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name:               z.string().min(2).max(100),
  phone:              z.string().regex(/^\+91\d{10}$/, 'Must be +91 followed by 10 digits'),
  city:               z.enum(['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai']),
  platform:           z.enum(['BLINKIT', 'ZEPTO', 'SWIGGY_INSTAMART', 'OTHER']),
  avg_daily_earnings: z.number().min(100).max(5000),
  language_pref:      z.string().default('en'),
  aadhaar_last4:      z.string().length(4).optional(),
  upi_id:             z.string().optional(),
});

const LoginSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/, 'Must be +91 followed by 10 digits'),
});

// ── Helper: build Shield-SAC features from worker + seasonal context ──────────
function buildPremiumFeatures(worker, zone) {
  const month     = new Date().getMonth() + 1;
  const isMonsoon = [6, 7, 8, 9].includes(month) ? 1 : 0;
  return {
    avg_earnings:               parseFloat(worker.avg_daily_earnings),
    flood_score:                zone ? parseFloat(zone.flood_risk_score) : 0.5,
    historical_disruption_rate: zone ? parseFloat(zone.avg_disruption_days_per_month) / 10 : 0.3,
    population_density_bucket:  3,
    days_active:                1,
    claim_count:                parseFloat(worker.claim_count ?? 0),
    claim_ratio:                parseFloat(worker.claim_ratio ?? 0),
    rain_mm:       isMonsoon ? 30 : 0,
    temp_c:        28,
    humidity:      isMonsoon ? 85 : 60,
    wind_kmh:      10,
    aqi:           zone ? parseFloat(zone.historical_avg_aqi ?? 120) : 120,
    cloud_pct:     30,
    visibility_km: 8,
    day_of_week:   new Date().getDay(),
    month,
    is_monsoon:    isMonsoon,
    language:      worker.language_pref ?? 'en',
  };
}

// ── POST /register ────────────────────────────────────────────────────────────
router.post('/register', validateBody(RegisterSchema), async (req, res, next) => {
  const { name, phone, city, platform, avg_daily_earnings, language_pref } = req.body;
  try {
    // 1. Find closest zone for the city
    const zoneResult = await pool.query(
      'SELECT * FROM zones WHERE city = $1 ORDER BY flood_risk_score DESC LIMIT 1',
      [city],
    );
    const zone    = zoneResult.rows[0] ?? null;
    const zone_id = zone?.id ?? null;

    // 2. Upsert worker (phone is unique)
    const { rows } = await pool.query(
      `INSERT INTO workers
         (name, phone, city, zone_id, platform, avg_daily_earnings, language_pref, onboarded_via)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'APP')
       ON CONFLICT (phone) DO UPDATE SET
         name               = EXCLUDED.name,
         city               = EXCLUDED.city,
         zone_id            = EXCLUDED.zone_id,
         platform           = EXCLUDED.platform,
         avg_daily_earnings = EXCLUDED.avg_daily_earnings,
         language_pref      = EXCLUDED.language_pref,
         updated_at         = NOW()
       RETURNING *`,
      [name, phone, city, zone_id, platform, avg_daily_earnings, language_pref],
    );
    const worker = rows[0];

    // 3. Get premium recommendation (non-blocking on failure)
    const premiumFeatures   = buildPremiumFeatures(worker, zone);
    const recommendedPlan   = await calculatePremium(premiumFeatures);

    res.status(201).json({
      success:         true,
      worker: {
        id:                 worker.id,
        name:               worker.name,
        phone:              worker.phone,
        city:               worker.city,
        zone_id:            worker.zone_id,
        zone_name:          zone?.name ?? null,
        platform:           worker.platform,
        avg_daily_earnings: parseFloat(worker.avg_daily_earnings),
        language_pref:      worker.language_pref,
        created_at:         worker.created_at,
      },
      recommended_plan: recommendedPlan,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { phone } = req.body;

    const { rows } = await pool.query(
      `SELECT w.id,
              w.name,
              w.phone,
              w.city,
              w.zone_id,
              w.platform,
              w.avg_daily_earnings::float AS avg_daily_earnings,
              w.language_pref,
              z.name AS zone_name
       FROM workers w
       LEFT JOIN zones z ON z.id = w.zone_id
       WHERE w.phone = $1
       LIMIT 1`,
      [phone],
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: 'Worker not found',
        message: 'No account found for this phone number. Please register first.',
      });
    }

    const worker = rows[0];

    const policyRes = await pool.query(
      `SELECT id, plan_tier, status, start_date, end_date
       FROM policies
       WHERE worker_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 1`,
      [worker.id],
    );

    res.json({
      success: true,
      worker,
      policy: policyRes.rows[0] ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.*,
              z.name            AS zone_name,
              z.city            AS zone_city,
              z.flood_risk_score::float AS zone_flood_risk
       FROM workers w
       LEFT JOIN zones z ON z.id = w.zone_id
       WHERE w.id = $1::uuid`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Worker not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/dashboard ────────────────────────────────────────────────────────
router.get('/:id/dashboard', async (req, res, next) => {
  const { id } = req.params;
  try {
    const [workerRes, policyRes, claimSummaryRes, payoutSummaryRes] = await Promise.all([
      pool.query(
        `SELECT w.*, z.name AS zone_name, z.flood_risk_score::float AS zone_flood_risk,
                z.historical_avg_aqi AS zone_aqi
         FROM workers w LEFT JOIN zones z ON z.id = w.zone_id WHERE w.id = $1::uuid`,
        [id],
      ),
      pool.query(
        `SELECT p.*, sp.member_count, sp.premium_discount_pct::float
         FROM policies p
         LEFT JOIN shield_pools sp ON sp.id = p.pool_id
         WHERE p.worker_id = $1::uuid AND p.status = 'ACTIVE'
         ORDER BY p.created_at DESC LIMIT 1`,
        [id],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_claims,
                COALESCE(SUM(c.claim_amount), 0)::float AS total_claimed,
                COUNT(*) FILTER (WHERE c.status = 'PAID')::int AS paid_claims
         FROM claims c
         JOIN policies p ON p.id = c.policy_id
         WHERE p.worker_id = $1::uuid`,
        [id],
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::float AS total_received,
                COUNT(*)::int AS total_payouts
         FROM payouts
         WHERE worker_id = $1::uuid AND status = 'COMPLETED'`,
        [id],
      ),
    ]);

    if (!workerRes.rows[0]) return res.status(404).json({ error: 'Worker not found' });

    res.json({
      worker:          workerRes.rows[0],
      active_policy:   policyRes.rows[0] ?? null,
      claims_summary:  claimSummaryRes.rows[0],
      payout_summary:  payoutSummaryRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/policies ─────────────────────────────────────────────────────────
router.get('/:id/policies', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              sp.member_count,
              sp.premium_discount_pct::float
       FROM policies p
       LEFT JOIN shield_pools sp ON sp.id = p.pool_id
       WHERE p.worker_id = $1::uuid
       ORDER BY p.created_at DESC`,
      [req.params.id],
    );
    res.json({ policies: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/claims ───────────────────────────────────────────────────────────
router.get('/:id/claims', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              c.claim_amount::float,
              c.fraud_score::float,
              t.type          AS trigger_type,
              t.dsi_score::float,
              t.detected_at,
              z.name          AS zone_name,
              z.city          AS zone_city
       FROM claims c
       JOIN policies p  ON p.id = c.policy_id
       JOIN triggers t  ON t.id = c.trigger_id
       JOIN zones z     ON z.id = t.zone_id
       WHERE p.worker_id = $1::uuid
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [req.params.id],
    );
    res.json({ claims: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/payouts ──────────────────────────────────────────────────────────
router.get('/:id/payouts', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT py.*,
              py.amount::float,
              c.claim_amount::float,
              t.type          AS trigger_type,
              t.dsi_score::float,
              z.name          AS zone_name,
              z.city          AS zone_city
       FROM payouts py
       JOIN claims c   ON c.id  = py.claim_id
       JOIN triggers t ON t.id  = c.trigger_id
       JOIN zones z    ON z.id  = t.zone_id
       WHERE py.worker_id = $1::uuid
       ORDER BY py.initiated_at DESC
       LIMIT 50`,
      [req.params.id],
    );
    res.json({ payouts: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

export default router;
