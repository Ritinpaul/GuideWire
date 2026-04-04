-- =========================
-- PHASE 0 SEED DATA
-- 25 zones (5 cities x 5 zones)
-- 50 workers
-- historical triggers + claim/payout examples
-- =========================

WITH city_seed(city, base_lat, base_lng, base_flood, base_aqi, base_disruption) AS (
		VALUES
			('Mumbai',    19.0760, 72.8777, 0.75, 140, 5.5),
			('Delhi',     28.6139, 77.2090, 0.45, 290, 6.2),
			('Bangalore', 12.9716, 77.5946, 0.55, 115, 4.8),
			('Hyderabad', 17.3850, 78.4867, 0.50, 135, 4.2),
			('Chennai',   13.0827, 80.2707, 0.70, 125, 5.0)
),
zone_seed AS (
		SELECT
			c.city,
			c.city || ' Zone ' || gs AS zone_name,
			c.base_lat + ((gs - 3) * 0.02) AS lat,
			c.base_lng + ((gs - 3) * 0.02) AS lng,
			2.5 + ((gs % 3) * 0.5) AS radius_km,
			LEAST(0.95, c.base_flood + (gs * 0.02)) AS flood_risk,
			c.base_aqi + (gs * 8) AS historical_avg_aqi,
			c.base_disruption + (gs * 0.3) AS disruption_days
		FROM city_seed c
		CROSS JOIN generate_series(1, 5) AS gs
)
INSERT INTO zones (city, name, lat, lng, radius_km, flood_risk_score, historical_avg_aqi, avg_disruption_days_per_month)
SELECT city, zone_name, lat, lng, radius_km, flood_risk, historical_avg_aqi, disruption_days
FROM zone_seed;

WITH zone_ranked AS (
		SELECT id, city, ROW_NUMBER() OVER (ORDER BY city, name) AS rn
		FROM zones
),
worker_seed AS (
		SELECT
			gs AS worker_num,
			'Worker ' || LPAD(gs::text, 2, '0') AS name,
			'+9199' || LPAD((10000000 + gs)::text, 8, '0') AS phone,
			CASE gs % 3
				WHEN 0 THEN 'BLINKIT'
				WHEN 1 THEN 'ZEPTO'
				ELSE 'SWIGGY_INSTAMART'
			END AS platform,
			450 + (gs * 12) AS avg_daily_earnings,
			ROUND((0.25 + ((gs % 10) * 0.06))::numeric, 3) AS risk_score,
			CASE gs % 4
				WHEN 0 THEN 'hi'
				WHEN 1 THEN 'en'
				WHEN 2 THEN 'ta'
				ELSE 'te'
			END AS language_pref
		FROM generate_series(1, 50) AS gs
)
INSERT INTO workers (name, phone, city, zone_id, platform, avg_daily_earnings, risk_score, language_pref, onboarded_via)
SELECT
	ws.name,
	ws.phone,
	zr.city,
	zr.id,
	ws.platform,
	ws.avg_daily_earnings,
	ws.risk_score,
	ws.language_pref,
	CASE WHEN ws.worker_num % 5 = 0 THEN 'WHATSAPP' ELSE 'APP' END
FROM worker_seed ws
JOIN zone_ranked zr ON zr.rn = ((ws.worker_num - 1) % 25) + 1;

INSERT INTO shield_pools (zone_id, member_count, premium_discount_pct, total_pool_fund, status)
SELECT
	z.id,
	COUNT(w.id)::int,
	CASE
		WHEN COUNT(w.id) BETWEEN 5 AND 10 THEN 15.00
		WHEN COUNT(w.id) BETWEEN 11 AND 25 THEN 18.00
		ELSE 20.00
	END,
	(COUNT(w.id) * 125)::numeric(12,2),
	'ACTIVE'
FROM zones z
JOIN workers w ON w.zone_id = z.id
GROUP BY z.id;

WITH worker_ranked AS (
		SELECT
			w.id AS worker_id,
			w.avg_daily_earnings,
			w.zone_id,
			ROW_NUMBER() OVER (ORDER BY w.created_at, w.id) AS rn
		FROM workers w
)
INSERT INTO policies (
		worker_id,
		plan_tier,
		premium_amount,
		coverage_amount,
		start_date,
		end_date,
		status,
		pool_id,
		shieldsac_confidence,
		shap_explanation
)
SELECT
	wr.worker_id,
	CASE wr.rn % 3
		WHEN 1 THEN 'LOW'::plan_tier
		WHEN 2 THEN 'MEDIUM'::plan_tier
		ELSE 'HIGH'::plan_tier
	END,
	CASE wr.rn % 3
		WHEN 1 THEN 15.00
		WHEN 2 THEN 30.00
		ELSE 50.00
	END,
	CASE wr.rn % 3
		WHEN 1 THEN 1000.00
		WHEN 2 THEN 2500.00
		ELSE 5000.00
	END,
	CURRENT_DATE - (((wr.rn % 5) * 2)::int),
	CURRENT_DATE - (((wr.rn % 5) * 2)::int) + 7,
	CASE WHEN wr.rn <= 35 THEN 'ACTIVE'::policy_status ELSE 'EXPIRED'::policy_status END,
	sp.id,
	ROUND((0.80 + ((wr.rn % 10) * 0.01))::numeric, 3),
	jsonb_build_array(
		jsonb_build_object('factor', 'rain_risk', 'impact', 7 + (wr.rn % 3)),
		jsonb_build_object('factor', 'claim_history', 'impact', -2),
		jsonb_build_object('factor', 'zone_flood_score', 'impact', 4 + (wr.rn % 2))
	)
FROM worker_ranked wr
LEFT JOIN shield_pools sp ON sp.zone_id = wr.zone_id;

WITH zone_ranked AS (
		SELECT id, ROW_NUMBER() OVER (ORDER BY city, name) AS rn
		FROM zones
),
trigger_seed AS (
		SELECT
			zr.id AS zone_id,
			gs AS seq,
			CASE gs % 6
				WHEN 0 THEN 'HEAVY_RAIN'::trigger_type
				WHEN 1 THEN 'FLOOD'::trigger_type
				WHEN 2 THEN 'HEATWAVE'::trigger_type
				WHEN 3 THEN 'POLLUTION'::trigger_type
				WHEN 4 THEN 'CURFEW'::trigger_type
				ELSE 'COMPOSITE_DSI'::trigger_type
			END AS trigger_type,
			(55 + (zr.rn % 25) + (gs * 3))::numeric(10,2) AS severity,
			LEAST(98, 45 + (zr.rn % 30) + (gs * 4))::numeric(5,2) AS dsi_score,
			NOW() - (gs || ' days')::interval - ((zr.rn % 6) || ' hours')::interval AS detected_at
		FROM zone_ranked zr
		CROSS JOIN generate_series(1, 3) AS gs
)
INSERT INTO triggers (zone_id, type, severity_value, dsi_score, raw_data, source, detected_at)
SELECT
	zone_id,
	trigger_type,
	severity,
	dsi_score,
	jsonb_build_object('severity', severity, 'dsi_score', dsi_score, 'seed', true),
	CASE WHEN seq = 3 THEN 'MOCK' ELSE 'OPENWEATHERMAP' END,
	detected_at
FROM trigger_seed;

WITH active_policies AS (
		SELECT id AS policy_id, worker_id
		FROM policies
		WHERE status = 'ACTIVE'
),
zone_triggers AS (
		SELECT t.id AS trigger_id, t.zone_id, t.dsi_score
		FROM triggers t
		WHERE t.detected_at < NOW() - INTERVAL '6 hours'
),
eligible_claims AS (
		SELECT
			ap.policy_id,
			ap.worker_id,
			zt.trigger_id,
			zt.dsi_score,
			ROW_NUMBER() OVER (PARTITION BY ap.policy_id ORDER BY zt.dsi_score DESC) AS rn
		FROM active_policies ap
		JOIN workers w ON w.id = ap.worker_id
		JOIN zone_triggers zt ON zt.zone_id = w.zone_id
)
INSERT INTO claims (policy_id, trigger_id, claim_amount, status, fraud_score, adjudication_type, approved_at, paid_at)
SELECT
	ec.policy_id,
	ec.trigger_id,
	ROUND((150 + (ec.dsi_score * 3.5))::numeric, 2),
	CASE WHEN ec.rn % 3 = 0 THEN 'FLAGGED'::claim_status ELSE 'PAID'::claim_status END,
	CASE WHEN ec.rn % 3 = 0 THEN 0.62 ELSE 0.18 END,
	CASE WHEN ec.rn % 3 = 0 THEN 'MANUAL_REVIEW' ELSE 'AUTO_APPROVE' END,
	NOW() - INTERVAL '2 hours',
	CASE WHEN ec.rn % 3 = 0 THEN NULL ELSE NOW() - INTERVAL '90 minutes' END
FROM eligible_claims ec
WHERE ec.rn = 1;

INSERT INTO payouts (claim_id, worker_id, amount, upi_id, razorpay_ref, status, initiated_at, completed_at)
SELECT
	c.id,
	p.worker_id,
	c.claim_amount,
	LOWER(REPLACE(w.name, ' ', '')) || '@upi',
	'pay_seed_' || SUBSTRING(c.id::text, 1, 8),
	CASE WHEN c.status = 'PAID' THEN 'COMPLETED'::payout_status ELSE 'PROCESSING'::payout_status END,
	NOW() - INTERVAL '85 minutes',
	CASE WHEN c.status = 'PAID' THEN NOW() - INTERVAL '75 minutes' ELSE NULL END
FROM claims c
JOIN policies p ON p.id = c.policy_id
JOIN workers w ON w.id = p.worker_id;

INSERT INTO fraud_logs (claim_id, check_type, result, confidence, details)
SELECT
	c.id,
	checks.check_type,
	CASE
		WHEN c.status = 'FLAGGED' AND checks.check_type IN ('GPS_VALIDATION', 'ANOMALY_DETECTION') THEN 'WARN'
		ELSE 'PASS'
	END,
	CASE
		WHEN c.status = 'FLAGGED' THEN 0.58
		ELSE 0.91
	END,
	jsonb_build_object('seed', true, 'claim_status', c.status)
FROM claims c
CROSS JOIN (VALUES
	('DEVICE_CHECK'::fraud_check_type),
	('GPS_VALIDATION'::fraud_check_type),
	('IMU_KINEMATIC'::fraud_check_type),
	('DUPLICATE_CHECK'::fraud_check_type),
	('ANOMALY_DETECTION'::fraud_check_type)
) AS checks(check_type);
