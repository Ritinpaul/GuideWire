# GIGASHIELD NEXUS — Technical Documentation

> AI-Powered Parametric Microinsurance for India's Gig Workers  
> Team Nuuvixx | Guidewire DevTrails Hackathon 2026

---

## Table of Contents

1. [Demo & Live Links](#demo--live-links)
2. [Architecture](#architecture)
3. [Setup & Running Locally](#setup--running-locally)
4. [Frontend — Screens & Design System](#frontend--screens--design-system)
5. [Backend API Reference](#backend-api-reference)
6. [ML Services Reference](#ml-services-reference)
7. [Telegram Bot](#telegram-bot)
8. [Database Schema](#database-schema)
9. [Environment Variables](#environment-variables)
10. [Security & Compliance](#security--compliance)
11. [Docker & Deployment](#docker--deployment)

---

## Demo & Live Links

| Resource | Link |
|----------|------|
| 🎬 **Demo Video** | [Watch on Google Drive](https://drive.google.com/file/d/14ga3pqhmhaUCemufXEPR6od2vAh0Gc0f/view?usp=sharing) |
| 🤖 **Telegram Bot** | [t.me/Gigasheild_bot](https://t.me/Gigasheild_bot) |
| 📦 **GitHub Repository** | [github.com/Ritinpaul/GuideWire](https://github.com/Ritinpaul/GuideWire) |

> **Demo Video** showcases the full end-to-end user journey: landing page → worker onboarding → dashboard → live weather trigger → Storm Mode pipeline → UPI payout confirmation — all in under 3 minutes.

---

## Architecture

GIGASHIELD NEXUS is a three-layer system with 7 containerized services:

```
┌───────────────────────────────────────────────────────────┐
│  LAYER 3: INTELLIGENCE (Python Microservices)             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Shield-SAC   │ │ PADS Fraud   │ │ DSI Calculator   │  │
│  │ (FastAPI +   │ │ (FastAPI +   │ │ (Live Weather +  │  │
│  │  XGBoost)    │ │  SciPy)      │ │  Dynamic Traffic)│  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────────┘  │
├─────────┼────────────────┼────────────────┼──────────────┤
│  LAYER 2: CORE ENGINE (Node.js + Express + WebSocket)     │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Policy Service │ Claim Service │ Payout (Razorpay) │   │
│  │ JWT Auth │ Rate Limiting │ Zod Validation          │   │
│  └────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────┤
│  LAYER 1: EXPERIENCE                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Worker PWA   │ │ Admin War    │ │ Telegram Bot     │  │
│  │ (Dashboard,  │ │ Room (PADS   │ │ (Hindi/English   │  │
│  │  Storm Mode) │ │ Demo, XAI)   │ │  onboarding)     │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└───────────────────────────────────────────────────────────┘
         ↕                ↕                ↕
    PostgreSQL 16      Redis 7      OpenWeatherMap 3.0
```

### Services & Ports

| Service | Port | Health Check | Description |
|---------|------|-------------|-------------|
| **Frontend** | 5173 | — | React 18 PWA (Vite dev server) |
| **Backend** | 3001 | `/health` | Node.js Express REST API + WebSocket |
| **Shield-SAC** | 8001 | `/health` | DRL premium pricing engine (XGBoost + SHAP) |
| **PADS** | 8002 | `/health` | 5-layer fraud detection pipeline |
| **DSI** | 8003 | `/health` | Disruption Severity Index calculator |
| **PostgreSQL** | 5432 | — | Primary relational database (7 tables) |
| **Redis** | 6379 | — | DSI score caching + session store |

---

## Setup & Running Locally

### Prerequisites

- Docker Desktop with Compose v2
- Node.js 20 LTS (for local dev without Docker)
- Python 3.11+ (for local ML service dev)

### One-Command Startup (Docker)

```bash
docker compose --env-file .env.development up --build
```

### Local Development (without Docker)

```bash
# Terminal 1 — Frontend
cd frontend && npm install && npm run dev

# Terminal 2 — Backend
cd backend && npm install && npm run dev

# Terminal 3 — ML Services (each in separate terminal)
cd ml-services/shield-sac && pip install -r requirements.txt && uvicorn main:app --port 8001
cd ml-services/pads && pip install -r requirements.txt && uvicorn main:app --port 8002
cd ml-services/dsi && pip install -r requirements.txt && uvicorn main:app --port 8003
```

### Health Checks

```
GET http://localhost:3001/health    → Backend
GET http://localhost:8001/health    → Shield-SAC
GET http://localhost:8002/health    → PADS
GET http://localhost:8003/health    → DSI
```

### Admin Login

- URL: `http://localhost:5173/admin/login`
- Credentials sourced from environment variables: `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- Returns a JWT that gates all `/api/v1/admin/*` endpoints and the WebSocket channel (`/ws?role=admin&token=...`)

### Database Verification

```bash
docker compose exec postgres psql -U gigashield -d gigashield \
  -c "SELECT COUNT(*) AS zones FROM zones;"
docker compose exec postgres psql -U gigashield -d gigashield \
  -c "SELECT COUNT(*) AS workers FROM workers;"
docker compose exec postgres psql -U gigashield -d gigashield \
  -c "SELECT COUNT(*) AS triggers FROM triggers;"
```

Expected minimums after seed: **25** zones, **50** workers, **75** triggers.

---

## Frontend — Screens & Design System

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary Background | `#F5F5F0` | Cream surface for all primary screens |
| Card Surface | `#FFFFFF` | White cards with `rgba(0,0,0,0.06)` borders |
| Dark Cards | `#1A1A1A` | Shield status card, quick routes, feature cards |
| Accent | `#B8FF00` | CTAs, active states, highlights, lime glow |
| Success | `#16A34A` | Live indicators, paid status, positive values |
| Danger | `#DC2626` | Error states, rejected claims |
| Heading Font | `Space Grotesk 700` | All headings, stats, monetary values |
| Body Font | `Inter 300–700` | Body text, labels, navigation, descriptions |

### Screen Inventory (9 Screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 1 | **Landing Page** | `/` | Full-width cream layout with animated map pin, rain/cloud effects, pricing cards, testimonials, and CTA buttons |
| 2 | **Worker Login** | `/login` | Floating dark card on animated background with phone number authentication |
| 3 | **Onboarding Wizard** | `/onboard` | 4-step wizard (Language → Personal → UPI → Plan) with SHAP explanation on dark floating card |
| 4 | **Worker Dashboard** | `/home` | Full-screen cream background, dark shield card, DSI risk gauge, dynamic 7-day forecast (auto-computed from current day), stats, quick routes |
| 5 | **Claims History** | `/claims` | Full-screen light theme, white expandable cards, PADS fraud score visualization, semantic status badges, filter pills |
| 6 | **Storm Mode** | `/storm` | Full-screen red/orange gradient, live Leaflet map with affected zone, animated 4-step pipeline, confetti on payout |
| 7 | **Payout Confirmation** | `/payout` | Centered success card with canvas confetti animation and Razorpay reference |
| 8 | **Admin Login** | `/admin/login` | Dark card floating layout with admin JWT authentication |
| 9 | **Admin Dashboard** | `/admin` | Full-width dark dashboard — KPIs, DSI heatmap, live weather scan, PADS physics demo, XAI panel, fraud monitor, trigger timeline |

### Shared Components

| Component | File | Description |
|-----------|------|-------------|
| `BottomNav` | `components/BottomNav.jsx` | Glassmorphism bottom navigation — full-width with `backdrop-filter: blur(24px)`, centered 600px icon group |
| `GigShieldLogo` | `components/layout/GigShieldLogo.jsx` | SVG shield logo with lime gradient, used across all screens |
| `OnboardingBackground` | `components/layout/OnboardingBackground.jsx` | Animated floating gradient shapes for auth/onboarding screens |
| `ShapWaterfall` | `components/ShapWaterfall.jsx` | SHAP explainability chart for premium factor breakdown |
| `PayoutConfetti` | `components/PayoutConfetti.jsx` | Canvas-based confetti celebration on successful payouts |
| `ErrorState` | `components/ErrorState.jsx` | Consistent error display component with retry action |
| `LoadingSkeleton` | `components/LoadingSkeleton.jsx` | Shimmer loading skeleton for async data |

### Responsive Architecture

- **Full-screen layouts**: All pages span 100% viewport width with `#F5F5F0` cream background
- **Content max-width**: `1280px` centered content containers for readability on large screens
- **Mobile-first**: All layouts work seamlessly on 360px–1536px+ viewports
- **Bottom navigation**: Full-width glassmorphism bar with icons centered in a 600px group

---

## Backend API Reference

Base URL: `http://localhost:3001/api/v1`

### Workers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/workers/register` | Register a new worker | — |
| POST | `/workers/login` | Worker login by phone number | — |
| GET | `/workers/:id` | Get worker profile | — |
| GET | `/workers/:id/dashboard` | Dashboard summary (policy, zone, DSI) | — |
| GET | `/workers/:id/policies` | Worker policy history | — |
| GET | `/workers/:id/claims` | Worker claims list | — |
| GET | `/workers/:id/payouts` | Worker payout history | — |

### Policies

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/policies/subscribe` | Subscribe worker to a coverage plan | — |
| GET | `/policies/:id` | Get policy detail | — |

### Claims

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/claims/:id` | Get claim status and fraud logs | — |

### Payouts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/payouts/:id` | Get payout detail and Razorpay reference | — |

### Pools (Shield Pools)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/pools/join` | Join or create a zone pool | — |
| GET | `/pools/:id` | Get pool details | — |
| GET | `/pools/zone/:zone_id` | Get active pool by zone | — |

### Admin (JWT Required)

All admin endpoints require `Authorization: Bearer <JWT>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | KPI summary (active workers, policies, claims, payouts) |
| GET | `/admin/zones` | Zone list with active policy counts and DSI data |
| GET | `/admin/workers` | Search workers for admin panel (query param: `?q=name`) |
| GET | `/admin/workers/explain` | Worker explainability snapshot with SHAP data |
| GET | `/admin/fraud/logs` | Fraud monitor feed with per-layer results |

### Triggers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/triggers/inject` | Inject demo trigger (fires full pipeline) | Admin JWT |
| POST | `/triggers/scan-live` | Live weather scan → auto-trigger across zones | Admin JWT |
| GET | `/triggers/active` | Recent active triggers | — |
| GET | `/triggers/dsi/heatmap` | DSI heatmap data for all 25 zones | — |
| GET | `/triggers/dsi/:zone_id` | Zone-level DSI detail with component scores | — |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `ws://localhost:3001/ws?role=admin&token=<JWT>` | Real-time event stream for admin dashboard |
| `ws://localhost:3001/ws?role=worker&worker_id=<ID>` | Real-time event stream for worker Storm Mode |

**Event Types:** `trigger:fired`, `claim:created`, `pads:result`, `payout:complete`, `dsi:update`

---

## ML Services Reference

### Shield-SAC (`:8001`) — Dynamic Premium Pricing

**POST `/price`**

```json
// Request
{
  "worker_id": "w_123",
  "zone_id": "mumbai_andheri",
  "weekly_earnings": 4200,
  "rain_probability": 0.72,
  "active_days": 24,
  "claim_history_count": 0
}

// Response
{
  "premium": 42.50,
  "coverage": 4500,
  "tier": "HIGH",
  "explanation": [
    { "factor": "Rain probability 72%", "impact": "+₹8.20", "direction": "up" },
    { "factor": "Flood-prone zone",     "impact": "+₹6.10", "direction": "up" },
    { "factor": "AQI forecast 280",     "impact": "+₹3.40", "direction": "up" },
    { "factor": "24 active days",       "impact": "−₹2.10", "direction": "down" },
    { "factor": "Clean claim history",  "impact": "−₹4.80", "direction": "down" }
  ],
  "fairness": { "max_allowed": 46.43, "constraint_satisfied": true }
}
```

**Algorithm:** Soft Actor-Critic (SAC) with a safety shield constraint:  
`premium ≤ 5% × weekly_earnings` — enforced in the action space, not as a post-hoc cap.  
**Fallback:** XGBoost Regressor with identical SHAP explainability if DRL has not converged.

**Reward Function:**  
$$R = 1.0 \times premium - 1.2 \times payout - 10.0 \times fairness\_violation - 2.0 \times churn$$

---

### PADS (`:8002`) — Physics-Aware Fraud Detection

**POST `/validate`**

```json
// Request
{
  "claim_id": "c_456",
  "worker_id": "w_123",
  "gps_lat": 19.1136,
  "gps_lon": 72.8697,
  "imu_accel_variance": 1.23,
  "imu_gyro_fft_peak": 0.88,
  "step_count": 340,
  "device_integrity_score": 0.95
}

// Response
{
  "fraud_score": 0.18,
  "decision": "AUTO_APPROVE",
  "layers": {
    "L1_device": 0.05,
    "L2_gps_ip": 0.10,
    "L3_imu": 0.12,
    "L4_duplicate": 0.00,
    "L5_behavioral": 0.20
  }
}
```

**5-Layer Pipeline:**

| Layer | Check | Weight | Method |
|:-----:|-------|:------:|--------|
| L1 | Device Integrity | 0.15 | SafetyNet / Play Integrity attestation |
| L2 | GPS-IP Consistency | 0.25 | Haversine distance < 5km + IP geolocation |
| **L3** | **IMU Kinematics** *(novel)* | **0.25** | Accelerometer variance + gyroscope FFT |
| L4 | Duplicate Prevention | 0.15 | Database UNIQUE constraint |
| L5 | Behavioral Anomaly | 0.20 | Isolation Forest on claim patterns |

**Fraud Score Thresholds:**

| Score | Decision |
|:-----:|:--------:|
| < 0.30 | ✅ `AUTO_APPROVE` |
| 0.30–0.70 | ⚠️ `FLAG_FOR_REVIEW` |
| ≥ 0.70 | ❌ `AUTO_REJECT` |

---

### DSI (`:8003`) — Disruption Severity Index

**POST `/dsi`**

```json
// Request
{
  "zone_id": "mumbai_andheri",
  "weather_score": 72,
  "traffic_score": 65,
  "order_volume_score": 58
}

// Response
{
  "dsi": 66.1,
  "severity": "HIGH",
  "payout_percentage": 50,
  "components": {
    "weather": { "value": 72, "weight": 0.40 },
    "traffic": { "value": 65, "weight": 0.30 },
    "orders":  { "value": 58, "weight": 0.30 }
  }
}
```

**DSI Formula:** `DSI = 0.40 × Weather + 0.30 × Traffic + 0.30 × Orders`

| DSI Score | Severity | Payout |
|:---------:|:--------:|:------:|
| 0–30 | LOW | — |
| 31–50 | MODERATE | — |
| 51–65 | ELEVATED | Monitoring intensified |
| 66–80 | HIGH | **50%** of coverage |
| 81–90 | SEVERE | **75%** of coverage |
| 91–100 | CATASTROPHIC | **100%** of coverage |

---

## Telegram Bot

### Overview

GIGASHIELD includes a **Telegram Bot** as an alternative onboarding and notification channel, complementing the PWA and WhatsApp experiences. The bot provides a conversational interface in Hindi and English for workers who prefer Telegram.

**Bot Link:** [t.me/Gigasheild_bot](https://t.me/Gigasheild_bot)

### Capabilities

| Feature | Description |
|---------|-------------|
| **Onboarding** | Conversational registration flow — language, city, earnings, UPI ID |
| **Plan Selection** | View available tiers (Basic/Pro/Elite) and subscribe |
| **Status Check** | View active policy, coverage amount, and expiry date |
| **Claim Alerts** | Push notifications when a weather trigger fires in the worker's zone |
| **Payout Confirmation** | Real-time notification when UPI payout is credited |
| **DSI Updates** | Daily zone risk summary when DSI exceeds monitoring threshold |
| **Bilingual Support** | Full Hindi and English interface with `/language` toggle |

### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Begin onboarding or return to main menu |
| `/status` | View active policy and coverage details |
| `/claims` | View recent claims and payout history |
| `/language` | Switch between English and Hindi |
| `/help` | Display available commands and support info |

### Integration Architecture

```
Worker (Telegram) ──► Telegram Bot API ──► Backend API (Express)
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              Policy Service      WebSocket Events
                              (subscribe/status)  (trigger/payout alerts)
```

---

## Database Schema

**7 tables · 6 ENUMs · 12 indexes** — designed for fast claim processing.

### Entity Relationship

```
workers ──► policies ──► claims ──► payouts
   │            │           │
   └──► zones   │       triggers
                │
          shield_pools    fraud_logs
```

### Core Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `workers` | Registered gig workers | phone, city, weekly_earnings, upi_id, aadhaar_last4 |
| `zones` | 25 geographic zones across 5 cities | city, lat, lng, risk_category, flood_prone |
| `policies` | Active/expired worker policies | worker_id, zone_id, tier, premium, coverage, expires_at |
| `triggers` | Weather disruption events | zone_id, trigger_type, dsi_score, severity |
| `claims` | Auto-generated claims from triggers | policy_id, trigger_id, amount, status, fraud_score |
| `payouts` | UPI payout records | claim_id, razorpay_ref, utr, status |
| `fraud_logs` | Per-layer PADS results for each claim | claim_id, check_type, score, result |
| `shield_pools` | Zone-level risk pools | zone_id, total_premium, total_coverage, members |

### ENUMs

| Enum | Values |
|------|--------|
| `policy_tier` | `LOW`, `MEDIUM`, `HIGH` |
| `policy_status` | `ACTIVE`, `EXPIRED`, `CANCELLED` |
| `trigger_type` | `HEAVY_RAIN`, `FLOOD`, `HEATWAVE`, `POLLUTION`, `CURFEW`, `COMPOSITE_DSI` |
| `claim_status` | `INITIATED`, `APPROVED`, `PAID`, `REJECTED`, `FLAGGED` |
| `payout_status` | `PENDING`, `COMPLETED`, `FAILED` |
| `adjudication_type` | `AUTO_APPROVE`, `AUTO_REJECT`, `FLAG_FOR_REVIEW` |

Migrations are located in `backend/migrations/` and run automatically on container startup via `db.js` initialization.

---

## Environment Variables

Copy `.env.example` to `.env.development` and configure:

```env
# ─── Database ─────────────────────────────────────────────
DATABASE_URL=postgresql://gigashield:password@localhost:5432/gigashield

# ─── Redis ────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── JWT ──────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_here

# ─── Razorpay (sandbox) ──────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# ─── OpenWeatherMap ───────────────────────────────────────
OPENWEATHER_API_KEY=...

# ─── Twilio (WhatsApp) ───────────────────────────────────
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# ─── Telegram Bot ────────────────────────────────────────
TELEGRAM_BOT_TOKEN=...

# ─── ML Service URLs (internal Docker networking) ────────
SHIELD_SAC_URL=http://shield-sac:8001
PADS_URL=http://pads:8002
DSI_URL=http://dsi:8003

# ─── Admin ───────────────────────────────────────────────
ADMIN_USERNAME=gw_admin
ADMIN_PASSWORD=replace_with_strong_password
ADMIN_JWT_SECRET=replace_with_min_24_char_secret_value
ADMIN_JWT_EXPIRES_IN=8h
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## Security & Compliance

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT with configurable expiry for admin endpoints |
| **Rate Limiting** | Sliding window on `/auth`, `/triggers/inject`, `/triggers/scan-live` |
| **Input Validation** | Zod schemas on all request bodies with structured error responses |
| **CORS** | Environment-specific origin allowlisting |
| **Request Tracing** | UUID v4 `X-Request-Id` header on every API response |
| **Data Privacy** | DPDPA-2023 compliant — Aadhaar stored as last 4 digits only |
| **Duplicate Claims** | Database `UNIQUE(policy_id, trigger_id)` constraint |
| **Graceful Shutdown** | SIGTERM handler with connection draining |
| **WebSocket Auth** | JWT validation on WebSocket upgrade for admin channels |

---

## Docker & Deployment

All 7 services are containerized. Each service has its own `Dockerfile` and is orchestrated via `docker-compose.yml` at the project root.

### Common Commands

```bash
# Build and start all services
docker compose --env-file .env.development up --build

# Stop all services
docker compose down

# Rebuild a single service
docker compose up --build backend

# View logs for a service
docker compose logs -f pads

# Run database migrations manually
docker compose exec backend npm run migrate

# Access PostgreSQL shell
docker compose exec postgres psql -U gigashield -d gigashield
```

### Production Checklist

| Item | Status |
|------|--------|
| Environment variables set (no defaults in prod) | Required |
| `JWT_SECRET` and `ADMIN_JWT_SECRET` are 24+ char secrets | Required |
| Razorpay switched from sandbox to live keys | Required |
| CORS origins updated to production domain | Required |
| PostgreSQL connection pool configured for load | Recommended |
| Redis persistence enabled | Recommended |
| HTTPS termination via reverse proxy (nginx/Caddy) | Required |
| Health check monitoring configured | Recommended |

---

<div align="center">

**Built with ❤️ by Team Nuuvixx** | [Guidewire DevTrails Hackathon 2026](https://github.com/Ritinpaul/GuideWire)

</div>
