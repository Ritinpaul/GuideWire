<div align="center">

# 🛡️ GIGASHIELD NEXUS

### AI-Powered Parametric Microinsurance for India's Gig Workers

> **Team Nuuvixx** | Guidewire DevTrails Hackathon 2026

[![React 18](https://img.shields.io/badge/React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js 20](https://img.shields.io/badge/Node.js%2020-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL%2016-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Guidewire](https://img.shields.io/badge/Guidewire-DevTrails%202026-FF6B00?style=for-the-badge)](https://guidewire.com)

*"Not insurance. Income protection in 3 minutes."*

[![Demo Video](https://img.shields.io/badge/🎬_Demo_Video-Watch_Now-B8FF00?style=for-the-badge)](https://drive.google.com/file/d/14ga3pqhmhaUCemufXEPR6od2vAh0Gc0f/view?usp=sharing)
[![Telegram Bot](https://img.shields.io/badge/🤖_Telegram_Bot-Try_It-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/Gigasheild_bot)
[![GitHub](https://img.shields.io/badge/📦_Source_Code-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Ritinpaul/GuideWire)

</div>

---

## 💡 The Problem

Every day, **12 million** gig delivery workers in India face an invisible tax on their income: **weather**. A 30-minute rainstorm in Mumbai wipes out an entire shift's earnings (₹500–₹800). Across monsoon season, that compounds to **₹12,000+ in lost income** — devastating for someone earning less than ₹15,000/month.

> *Why does crop insurance exist for farmers, but **zero** income protection products exist for urban gig workers whose livelihoods are just as weather-dependent?*

Traditional insurance fails here: monthly premiums don't match daily pay cycles, 30-day claims don't help someone who needs money *today*, and app-based onboarding fails when your user base has never downloaded anything beyond WhatsApp.

**GIGASHIELD NEXUS** is the answer — a system where the *weather itself* triggers your payout, and the money lands in your UPI wallet before the rain stops.

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (with Compose v2)

### One-Command Launch

```bash
docker compose --env-file .env.development up --build
```

| Service | Port | Health Check |
|---------|------|-------------|
| **Frontend** (Vite + React) | [localhost:5173](http://localhost:5173) | — |
| **Backend** (Express) | [localhost:3001](http://localhost:3001/health) | `/health` |
| **Shield-SAC** (ML Pricing) | [localhost:8001](http://localhost:8001/health) | `/health` |
| **PADS** (Fraud Detection) | [localhost:8002](http://localhost:8002/health) | `/health` |
| **DSI** (Disruption Index) | [localhost:8003](http://localhost:8003/health) | `/health` |
| **PostgreSQL 16** | 5432 | — |
| **Redis 7** | 6379 | — |

### Admin Access

1. Open `http://localhost:5173/admin/login`
2. Credentials are loaded from `.env.development` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
3. JWT token is used for all admin REST endpoints and WebSocket channels

### Database Verification

```bash
docker compose exec postgres psql -U gigashield -d gigashield -c "SELECT COUNT(*) AS zones FROM zones;"
docker compose exec postgres psql -U gigashield -d gigashield -c "SELECT COUNT(*) AS workers FROM workers;"
docker compose exec postgres psql -U gigashield -d gigashield -c "SELECT COUNT(*) AS triggers FROM triggers;"
```

Expected: **25** zones, **50** workers, **75** triggers.

---

## 🔍 What It Does

```
Worker subscribes weekly (₹15–₹50) via WhatsApp or PWA
    ↓
AI calculates personalized premium with SHAP explainability in Hindi/English
    ↓
System monitors 25 zones across 5 cities with live weather data
    ↓
Disruption detected → Claim auto-created → 5-layer fraud check → UPI payout
    ↓
Worker receives ₹200–₹800 in under 3 minutes. Zero paperwork.
```

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Shield-SAC Pricing** | RL agent with mathematical fairness guarantee — premium ***cannot*** exceed 5% of weekly earnings |
| **PADS Fraud Detection** | 5-layer pipeline with **IMU sensor validation** — GPS spoofers can't fake accelerometer physics |
| **Disruption Severity Index** | Composite score: `weather × 0.40 + traffic × 0.30 + orders × 0.30` — not binary triggers |
| **🛰️ Live Weather Scan** | Real-time scan of all 25 zones → auto-trigger claims when DSI ≥ 65 |
| **🔬 PADS Physics Demo** | Side-by-side spoofer vs rider comparison making novel fraud detection visible |
| **Zero-Touch Claims** | Trigger → Validate → Pay in **< 3 minutes** with zero human intervention |
| **WhatsApp + Telegram** | Sign up in Hindi/English via [Telegram Bot](https://t.me/Gigasheild_bot) or WhatsApp — **73 seconds** |
| **XAI Transparency** | Every premium explained with SHAP waterfall charts — no black boxes |

### Three-Tier Coverage

| Tier | Weekly Premium | Weekly Coverage | Payout Range |
|:----:|:--------------:|:--------------:|:------------:|
| 🟢 **Basic Shield** | ₹15 | ₹1,500 | ₹100–₹300 |
| 🟡 **Pro Shield** | ₹30 | ₹3,000 | ₹200–₹500 |
| 🔴 **Elite Shield** | ₹50 | ₹5,000 | ₹400–₹800 |

### DSI-Based Graduated Payouts

$$DSI = 0.40 \times Weather + 0.30 \times Traffic + 0.30 \times Orders$$

| DSI Score | Severity | Payout |
|:---------:|:--------:|:------:|
| 0–50 | 🟢 Normal | — |
| 51–65 | 🟠 Elevated | Monitoring intensified |
| 66–80 | 🔴 High | **50%** of coverage |
| 81–90 | 🟣 Severe | **75%** of coverage |
| 91–100 | ⚫ Catastrophic | **100%** of coverage |

> **Why DSI matters:** A score of 75 (*moderate rain + severe traffic + order collapse*) triggers a payout even when no single metric crosses its individual threshold — because the *combined* disruption kills earnings.

---

## 🎨 Design System & UI/UX

GIGASHIELD features a **unified design language** across all screens, built with a custom design system:

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| **Primary Background** | `#F5F5F0` (Cream) | Landing page, dashboard, claims |
| **Card Surface** | `#FFFFFF` | White cards with subtle shadows |
| **Dark Cards** | `#1A1A1A` | Shield status, quick routes, feature cards |
| **Accent** | `#B8FF00` (Neon Lime) | CTAs, active states, highlights |
| **Typography** | Space Grotesk + Inter | Headings + body text |

### Key UI Screens

| Screen | Description |
|--------|-------------|
| **Landing Page** | Full-width cream layout with animated map pin, rain effects, floating clouds, pricing cards, testimonials |
| **Onboarding Wizard** | Floating dark card with multi-step wizard — language, personal, UPI, plan selection with SHAP explanation |
| **Worker Dashboard** | Full-screen cream background with dark shield card, DSI risk gauge, dynamic 7-day forecast, quick routes |
| **Claims History** | Full-screen light theme, white expandable claim cards, PADS fraud score bars, semantic status badges |
| **Storm Mode** | Full-screen red gradient with live Leaflet map, animated pipeline progress, confetti on payout |
| **Admin War Room** | Dark dashboard with KPIs, DSI heatmap, PADS physics demo, XAI panel, fraud monitor |

### Responsive Architecture

- **Mobile-first**: All layouts work seamlessly on 360px–1536px+ viewports
- **Content containers**: Max-width 1280px centered content for readability on large screens
- **Glassmorphism**: Frosted-glass bottom navigation with `backdrop-filter: blur(24px)`
- **Micro-animations**: Pulse effects, skeleton loading, smooth transitions, confetti celebrations

---

## 🔗 Guidewire Product Integration

| GIGASHIELD Component | Guidewire Equivalent | What It Proves |
|---------------------|---------------------|---------------|
| **Shield-SAC** (AI Pricing) | **RatingEngine / PolicyCenter** | Automated, compliant premium calculation with embedded fairness constraints |
| **PADS** (Fraud Detection) | **ClaimCenter + FraudBuster** | Multi-layer claim validation with novel physics-aware anti-spoofing |
| **DSI Calculator** | **HazardHub / RiskManager** | Real-time geographic risk scoring with composite multi-factor triggers |
| **Trigger Pipeline** | **Gateway / BRE** | Event-driven policy execution with automated claim-to-payout orchestration |
| **SHAP Explainability** | **Analytics / DataHub** | Decision transparency for regulatory compliance and customer trust |

---

## 🏗 Architecture

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
│  LAYER 1: EXPERIENCE (React PWA + Telegram + WhatsApp)    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Worker PWA   │ │ Admin War    │ │ Telegram +       │  │
│  │ (Dashboard,  │ │ Room (PADS   │ │ WhatsApp Bot     │  │
│  │  Storm Mode) │ │ Demo, XAI)   │ │ (73s onboarding) │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└───────────────────────────────────────────────────────────┘
         ↕                ↕                ↕
    PostgreSQL 16      Redis 7      OpenWeatherMap 3.0
```

### Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React 18 · Vite 5 · Leaflet · Canvas Confetti | PWA with bilingual UI, DSI maps, SHAP charts |
| **Backend** | Node.js 20 · Express · Zod · JWT · WebSocket | REST APIs, real-time events, trigger pipeline |
| **ML Services** | FastAPI · XGBoost · SHAP · Scikit-learn | Pricing, fraud detection, disruption scoring |
| **Database** | PostgreSQL 16 (7 tables, 6 enums, 12 indexes) | Relational with JSONB for flexible schemas |
| **Cache** | Redis 7 (5-min TTL) | DSI score caching, session management |
| **Payments** | Razorpay Instant Payout API | UPI instant disbursement |
| **Weather** | OpenWeatherMap 3.0 | Real-time data for 5 Indian metros |
| **Infra** | Docker Compose (7 services) | Full containerized deployment |

### AI/ML Deep Dive

#### Shield-SAC — Dynamic Premium Pricing

```json
{
  "premium": 42.50,
  "coverage": 4500,
  "explanation": [
    {"factor": "Rain probability 72%", "impact": "+₹8.20", "direction": "↑"},
    {"factor": "Flood-prone zone",     "impact": "+₹6.10", "direction": "↑"},
    {"factor": "AQI forecast 280",     "impact": "+₹3.40", "direction": "↑"},
    {"factor": "24 active days",       "impact": "−₹2.10", "direction": "↓"},
    {"factor": "Clean claim history",  "impact": "−₹4.80", "direction": "↓"}
  ],
  "fairness": { "max_allowed": 46.43, "constraint_satisfied": true }
}
```

$$R = 1.0 \times premium - 1.2 \times payout - 10.0 \times fairness\_violation - 2.0 \times churn$$

#### PADS — Physics-Aware Fraud Detection

| Layer | Check | Method |
|:-----:|-------|--------|
| **L1** | Device integrity | SafetyNet / Play Integrity attestation |
| **L2** | GPS-IP consistency | Haversine distance < 5km + IP geolocation |
| **L3** | **IMU kinematics** *(novel)* | Accelerometer variance + gyroscope FFT |
| **L4** | Duplicate prevention | Database UNIQUE constraint |
| **L5** | Behavioral anomaly | Isolation Forest on claim patterns |

$$fraud = 0.15 \times L1 + 0.25 \times L2 + 0.25 \times L3 + 0.15 \times L4 + 0.20 \times L5$$

| Score | Decision |
|:-----:|----------|
| < 0.3 | ✅ `AUTO_APPROVE` |
| 0.3–0.7 | ⚠️ `FLAG_FOR_REVIEW` |
| ≥ 0.7 | ❌ `AUTO_REJECT` |

### Database Schema

**7 tables · 6 ENUMs · 12 indexes** — designed for fast claim processing:

```
workers ──► policies ──► claims ──► payouts
   │            │           │
   └──► zones   │       triggers
                │
          shield_pools    fraud_logs
```

---

## 🧱 Challenges We Overcame

1. **Parametric trigger calibration** — Solved with DSI composite scoring and graduated payouts instead of binary thresholds
2. **Fairness in AI pricing** — Embedded the constraint directly in the SAC algorithm's action space — mathematically impossible to violate
3. **Fraud detection without over-blocking** — IMU kinematic validation (Layer 3) dramatically reduced false positives while catching GPS spoofers
4. **Sub-3-minute claim processing** — Pipeline parallelization + Redis DSI caching + 5-layer PADS running concurrently
5. **Multilingual WhatsApp onboarding** — Conversational flow for workers with basic digital literacy, in under 73 seconds
6. **Data scarcity for ML training** — Generated 50,000 synthetic worker-weeks using IMD weather data + mock profiles
7. **UI/UX consistency at scale** — Built a custom design system with shared tokens (`#F5F5F0` / `#1A1A1A` / `#B8FF00`) ensuring visual cohesion across 9 screens

---

## 🏆 Key Accomplishments

- ⚡ **73-second** WhatsApp onboarding — zero app downloads, zero forms
- 🕐 **< 3 minute** end-to-end claim pipeline — trigger detection to UPI credit
- 🛡️ **Mathematical fairness** — premium cap enforced in the optimization space, not as a business rule
- 🔬 **Novel IMU fraud detection** — accelerometer + gyroscope verify physical presence (unforgeable)
- 📊 **Composite DSI scoring** — captures compound disruptions that binary triggers miss
- 🛰️ **Live weather integration** — real-time scan → auto-trigger across 25 zones
- 🧠 **Full XAI transparency** — SHAP waterfall charts in Hindi showing every pricing factor
- 🎨 **Premium unified UI** — cream/dark dual-tone design language consistent from landing page to dashboard
- 🔗 **Guidewire alignment** — maps to PolicyCenter, ClaimCenter, HazardHub, and DataHub

---

## 🚀 What's Next

| Phase | Focus |
|-------|-------|
| **Immediate** | Pre-storm income forecasting · Real-time traffic API · Durable payout orchestration |
| **6 months** | Platform partnerships (Zepto, Blinkit, Swiggy) for subsidized worker protection |
| **1 year** | IRDAI regulatory sandbox approval · Bima Sugam integration · Reinsurance partnerships |
| **2 years** | Geographic expansion (Jakarta, Manila, Lagos) · Product expansion (health, vehicle) |

### Unit Economics at Scale

```
At   1,000 workers: ₹30K/week   →  ₹15.6L/year
At  10,000 workers: ₹3L/week    →  ₹1.56Cr/year  
At 100,000 workers: ₹30L/week   →  ₹15.6Cr/year  (break-even at ~500 workers)
```

---

## 📁 Repository Structure

```
GIGASHIELD/
├── README.md                     ← You are here
├── info.md                       ← Detailed project overview & innovations
├── implementation.md             ← Strategic execution roadmap
├── documentation.md              ← Full API reference
├── frontend/                     ← React 18 PWA (Worker + Admin)
│   └── src/
│       ├── pages/                 ← 9 screens: Landing, Home, Onboarding,
│       │                             StormMode, Claims, Payout, Login,
│       │                             AdminDashboard, AdminAccess
│       ├── components/            ← BottomNav, ShapWaterfall, PayoutConfetti,
│       │   ├── admin/              ← KPIs, DSI Heatmap, PADSComparison, XAI
│       │   └── layout/             ← GigShieldLogo, OnboardingBackground
│       ├── hooks/                 ← useWebSocket
│       └── services/              ← API client, language utilities
├── backend/                      ← Node.js Express API
│   └── src/
│       ├── routes/                 ← Auth, Claims, Triggers (+ Live Scan)
│       ├── middleware/             ← JWT, Rate Limiting, Zod, Error Handler
│       └── ws/                     ← WebSocket broadcast
├── ml-services/                  ← Python ML microservices
│   ├── shield-sac/                 ← DRL pricing engine (XGBoost + SHAP)
│   ├── pads/                       ← 5-layer fraud detection pipeline
│   └── dsi/                        ← Disruption Severity Index calculator
└── docker-compose.yml            ← 7-service orchestration
```

---

## 🔒 Security & Compliance

| Area | Implementation |
|------|---------------|
| **Authentication** | JWT with expiry enforcement for all admin endpoints |
| **Rate Limiting** | Sliding window on auth and trigger injection routes |
| **Input Validation** | Zod schema validation with structured error responses |
| **CORS** | Environment-specific allowlisting (dev vs production) |
| **Traceability** | UUID v4 request ID on every API call |
| **Data Privacy** | DPDPA-2023 compliant — Aadhaar last 4 digits only |
| **Duplicate Prevention** | Database UNIQUE constraints on policy_id + trigger_id |
| **Graceful Shutdown** | SIGTERM handling for containerized environments |

---

<div align="center">

### 💬 Tagline

> *"Not insurance. Income protection in 3 minutes."*

> *"बारिश हो या आंधी, आपकी कमाई सुरक्षित है।"*
> *(Rain or storm, your earnings are protected.)*

---

**Built with ❤️ by Team Nuuvixx** | [Guidewire DevTrails Hackathon 2026](https://github.com/Ritinpaul/GuideWire)

</div>
