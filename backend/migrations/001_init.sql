CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS
CREATE TYPE plan_tier AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE policy_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');
CREATE TYPE claim_status AS ENUM ('INITIATED', 'FRAUD_CHECK', 'APPROVED', 'REJECTED', 'PAID', 'FLAGGED');
CREATE TYPE trigger_type AS ENUM ('HEAVY_RAIN', 'FLOOD', 'HEATWAVE', 'POLLUTION', 'CURFEW', 'COMPOSITE_DSI');
CREATE TYPE fraud_check_type AS ENUM ('GPS_VALIDATION', 'IMU_KINEMATIC', 'DEVICE_CHECK', 'ANOMALY_DETECTION', 'DUPLICATE_CHECK');
CREATE TYPE payout_status AS ENUM ('INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ZONES
CREATE TABLE zones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city            VARCHAR(50) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    radius_km       DECIMAL(5,2) DEFAULT 3.0,
    flood_risk_score DECIMAL(4,3) DEFAULT 0.5,
    historical_avg_aqi INTEGER DEFAULT 150,
    avg_disruption_days_per_month DECIMAL(4,1) DEFAULT 3.0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- WORKERS
CREATE TABLE workers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(15) UNIQUE NOT NULL,
    aadhaar_hash    VARCHAR(64),
    city            VARCHAR(50) NOT NULL,
    zone_id         UUID REFERENCES zones(id),
    platform        VARCHAR(30) NOT NULL,  -- 'ZEPTO', 'BLINKIT', 'SWIGGY_INSTAMART'
    avg_daily_earnings DECIMAL(10,2) DEFAULT 0,
    risk_score      DECIMAL(4,3) DEFAULT 0.500,
    language_pref   VARCHAR(5) DEFAULT 'hi',  -- ISO 639-1
    onboarded_via   VARCHAR(20) DEFAULT 'APP', -- 'APP', 'WHATSAPP', 'IVR'
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- SHIELD POOLS
CREATE TABLE shield_pools (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID NOT NULL REFERENCES zones(id),
    member_count    INTEGER DEFAULT 0,
    premium_discount_pct DECIMAL(4,2) DEFAULT 15.00,
    total_pool_fund DECIMAL(12,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- POLICIES
CREATE TABLE policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       UUID NOT NULL REFERENCES workers(id),
    plan_tier       plan_tier NOT NULL,
    premium_amount  DECIMAL(10,2) NOT NULL,
    coverage_amount DECIMAL(10,2) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,  -- start_date + 7 days
    status          policy_status DEFAULT 'PENDING',
    pool_id         UUID REFERENCES shield_pools(id),
    shieldsac_confidence DECIMAL(4,3),
    shap_explanation JSONB,  -- top 5 factors
    created_at      TIMESTAMP DEFAULT NOW(),
    CONSTRAINT weekly_policy CHECK (end_date = start_date + 7)
);

-- TRIGGERS
CREATE TABLE triggers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID NOT NULL REFERENCES zones(id),
    type            trigger_type NOT NULL,
    severity_value  DECIMAL(10,2) NOT NULL,  -- mm rain, °C temp, AQI value, DSI score
    dsi_score       DECIMAL(5,2),
    raw_data        JSONB NOT NULL,
    source          VARCHAR(50) NOT NULL,  -- 'OPENWEATHERMAP', 'MOCK', 'ACLED'
    detected_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMP,
    CONSTRAINT valid_severity CHECK (severity_value >= 0)
);

-- CLAIMS
CREATE TABLE claims (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       UUID NOT NULL REFERENCES policies(id),
    trigger_id      UUID NOT NULL REFERENCES triggers(id),
    claim_amount    DECIMAL(10,2) NOT NULL,
    status          claim_status DEFAULT 'INITIATED',
    fraud_score     DECIMAL(4,3) DEFAULT 0.0,
    adjudication_type VARCHAR(20),  -- 'AUTO_APPROVE', 'AUTO_REJECT', 'MANUAL_REVIEW'
    payout_ref      VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW(),
    approved_at     TIMESTAMP,
    paid_at         TIMESTAMP,
    CONSTRAINT no_duplicate_claim UNIQUE (policy_id, trigger_id)
);

-- PAYOUTS
CREATE TABLE payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        UUID UNIQUE NOT NULL REFERENCES claims(id),
    worker_id       UUID NOT NULL REFERENCES workers(id),
    amount          DECIMAL(10,2) NOT NULL,
    upi_id          VARCHAR(50) NOT NULL,
    razorpay_ref    VARCHAR(100),
    status          payout_status DEFAULT 'INITIATED',
    initiated_at    TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP
);

-- FRAUD LOGS
CREATE TABLE fraud_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        UUID NOT NULL REFERENCES claims(id),
    check_type      fraud_check_type NOT NULL,
    result          VARCHAR(10) NOT NULL,  -- 'PASS', 'FAIL', 'WARN'
    confidence      DECIMAL(4,3) NOT NULL,
    details         JSONB,
    checked_at      TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_workers_zone ON workers(zone_id);
CREATE INDEX idx_workers_city ON workers(city);
CREATE INDEX idx_policies_worker ON policies(worker_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_dates ON policies(start_date, end_date);
CREATE INDEX idx_triggers_zone ON triggers(zone_id);
CREATE INDEX idx_triggers_detected ON triggers(detected_at);
CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_trigger ON claims(trigger_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_payouts_worker ON payouts(worker_id);
CREATE INDEX idx_fraud_logs_claim ON fraud_logs(claim_id);
