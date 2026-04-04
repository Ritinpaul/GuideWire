/**
 * HTTP clients for all three Python ML microservices.
 * Every call has a graceful mock fallback so the backend stays functional
 * even when individual ML services are unavailable.
 */
import axios from 'axios';

const SHIELD_SAC_URL = process.env.SHIELD_SAC_URL ?? 'http://localhost:8001';
const PADS_URL       = process.env.PADS_URL       ?? 'http://localhost:8002';
const DSI_URL        = process.env.DSI_URL        ?? 'http://localhost:8003';

const http = axios.create({ timeout: 6000 });

// ─────────────────────────── Shield-SAC ──────────────────────────────────────

/**
 * Calculate fair premium for a worker.
 * Falls back to a simple 2.5% of weekly earnings if service is down.
 */
export async function calculatePremium(features) {
  try {
    const { data } = await http.post(`${SHIELD_SAC_URL}/calculate`, features);
    return data;
  } catch (err) {
    console.warn('[SHIELD-SAC] /calculate unavailable:', err.message);
    return _mockPremium(features.avg_earnings ?? 500);
  }
}

// Backward-compatible alias used by whatsappBot service.
export const callShieldSAC = calculatePremium;

function _mockPremium(avgEarnings) {
  const weekly  = avgEarnings * 7;
  const premium = Math.max(15, Math.round(weekly * 0.025));
  const tier    = premium <= 25 ? 'LOW' : premium <= 45 ? 'MEDIUM' : 'HIGH';
  const coverageMap = { LOW: 1500, MEDIUM: 3000, HIGH: 5000 };
  return {
    premium_inr:      premium,
    coverage_inr:     coverageMap[tier],
    plan_tier:        tier,
    confidence:       0.75,
    fairness_check:   { applied: false, raw_predicted_premium: premium, premium_pct_earnings: (premium / weekly * 100).toFixed(2) },
    shap_explanation: { top_factors: [], increases_text: '', decreases_text: '' },
    model_metrics:    {},
    source:           'mock_fallback',
  };
}

// ─────────────────────────── PADS ────────────────────────────────────────────

/**
 * Run 5-layer fraud validation on a claim.
 * Falls back to auto-approve with low score when PADS is down.
 */
export async function validateClaim(payload) {
  try {
    const { data } = await http.post(`${PADS_URL}/validate`, payload);
    return data;
  } catch (err) {
    console.warn('[PADS] /validate unavailable:', err.message);
    return {
      fraud_score:    0.05,
      recommendation:'AUTO_APPROVE',
      auto_adjudicate: true,
      checks:         [],
      summary:        'PADS service unavailable — defaulting to auto-approve',
      source:         'mock_fallback',
    };
  }
}

/**
 * Retrieve anomalies feed for admin dashboard.
 */
export async function getAnomalies(limit = 20) {
  try {
    const { data } = await http.get(`${PADS_URL}/anomalies`, { params: { limit } });
    return data;
  } catch (err) {
    console.warn('[PADS] /anomalies unavailable:', err.message);
    return { anomalies: [] };
  }
}

// ─────────────────────────── DSI ─────────────────────────────────────────────

/**
 * Get DSI score for a single zone.
 */
export async function getZoneDSI(zoneId) {
  try {
    const { data } = await http.get(`${DSI_URL}/dsi/${zoneId}`);
    return data;
  } catch (err) {
    console.warn('[DSI] /dsi/%s unavailable:', zoneId, err.message);
    return { dsi_score: 50, level: 'ELEVATED', triggered_events: [], source: 'mock_fallback' };
  }
}

/**
 * Get DSI heatmap for all 25 zones.
 */
export async function getDSIHeatmap() {
  try {
    const { data } = await http.get(`${DSI_URL}/dsi/heatmap`);
    return data;
  } catch (err) {
    console.warn('[DSI] /dsi/heatmap unavailable:', err.message);
    return { zones: [], source: 'mock_fallback' };
  }
}
