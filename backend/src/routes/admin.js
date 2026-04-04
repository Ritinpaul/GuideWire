/**
 * Admin stats route — /api/v1/admin
 *
 * GET /stats      → KPI summary for the dashboard
 * GET /zones      → all zones with DSI + policy counts
 */
import { Router } from 'express';
import pool       from '../db/pool.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = Router();
router.use(requireAdmin);

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const [policiesRes, claimsRes, payoutsRes, fraudRes] = await Promise.all([
      // Active policies
      pool.query(`SELECT COUNT(*)::int AS total,
                         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_7d
                  FROM policies WHERE status = 'ACTIVE'`),
      // Claims today
      pool.query(`SELECT COUNT(*)::int AS total,
                         COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid,
                         COUNT(*) FILTER (WHERE status = 'FLAGGED')::int AS flagged
                  FROM claims WHERE created_at::date = CURRENT_DATE`),
      // Total payouts this week (loss ratio numerator)
      pool.query(`SELECT COALESCE(SUM(amount), 0)::float AS total_paid
                  FROM payouts WHERE status = 'COMPLETED'
                    AND completed_at > NOW() - INTERVAL '7 days'`),
      // Fraud rate
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE status = 'REJECTED')::float /
                    NULLIF(COUNT(*), 0) * 100 AS fraud_rate
                  FROM claims WHERE created_at > NOW() - INTERVAL '30 days'`),
    ]);

    const activePolicies = policiesRes.rows[0]?.total ?? 0;
    const claimsToday    = claimsRes.rows[0]?.total    ?? 0;
    const paidToday      = claimsRes.rows[0]?.paid     ?? 0;
    const totalPaid      = payoutsRes.rows[0]?.total_paid ?? 0;
    const fraudRate      = parseFloat((fraudRes.rows[0]?.fraud_rate ?? 0).toFixed(1));

    // Loss ratio = paid_premium / claims_paid (simplified mock for hackathon)
    const lossRatio = activePolicies > 0
      ? Math.min(95, Math.round((totalPaid / (activePolicies * 30)) * 100))
      : 62;

    res.json({
      active_policies:  activePolicies,
      policies_delta:   `+${policiesRes.rows[0]?.new_7d ?? 0} this week`,
      claims_today:     claimsToday,
      claims_delta:     paidToday,
      loss_ratio:       lossRatio,
      fraud_rate:       fraudRate,
      total_paid_inr:   totalPaid,
      timestamp:        new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /zones ────────────────────────────────────────────────────────────────
router.get('/zones', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT z.id, z.name, z.city,
              z.lat::float, z.lng::float, z.radius_km::float,
              COUNT(p.id) FILTER (WHERE p.status = 'ACTIVE')::int AS active_policies
       FROM zones z
       LEFT JOIN workers w ON w.zone_id = z.id
       LEFT JOIN policies p ON p.worker_id = w.id AND p.status = 'ACTIVE'
       GROUP BY z.id
       ORDER BY z.city, z.name`
    );
    res.json({ zones: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// ── GET /workers (for XAI search) ────────────────────────────────────────────
router.get('/workers', async (req, res, next) => {
  const q = req.query.q ?? '';
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.name, w.phone, w.city, w.platform, w.avg_daily_earnings::float,
              p.plan_tier, p.premium_amount::float, p.coverage_amount::float,
              p.shap_explanation
       FROM workers w
       LEFT JOIN policies p ON p.worker_id = w.id AND p.status = 'ACTIVE'
       WHERE w.name ILIKE $1 OR w.phone ILIKE $1
       LIMIT 10`,
      [`%${q}%`]
    );
    res.json({ workers: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
