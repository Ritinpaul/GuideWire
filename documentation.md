# GIGASHIELD NEXUS — Technical Documentation

> AI-Powered Parametric Microinsurance for Gig Workers  
> Team Nuuvixx | Guidewire DevTrails Hackathon 2026

---

## Table of Contents

1. [Architecture](#architecture)
2. [Setup & Running Locally](#setup--running-locally)
3. [Backend API Reference](#backend-api-reference)
4. [ML Services Reference](#ml-services-reference)
5. [Database Schema](#database-schema)
6. [Environment Variables](#environment-variables)
7. [Docker & Deployment](#docker--deployment)

---

## Architecture

GIGASHIELD NEXUS is a three-layer system:

```
┌───────────────────────────────────────────────────────────┐
│  LAYER 3: INTELLIGENCE (Python Microservices)             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Shield-SAC   │ │ PADS Fraud   │ │ DSI Calculator   │  │
│  │ (FastAPI +   │ │ (FastAPI +   │ │ (Disruption      │  │
│  │  PyTorch)    │ │  SciPy)      │ │  Severity Index) │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────────┘  │
├─────────┼────────────────┼────────────────┼──────────────┤
│  LAYER 2: CORE ENGINE (Node.js + Express)                 │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Integration Gateway (Weather, Traffic, Orders)     │   │
│  ├────────────┬───────────────┬────────────────────┐  │   │
│  │ Policy     │ Claim         │ Payout Service     │  │   │
│  │ Service    │ Service       │ (Razorpay UPI)     │  │   │
│  └────────────┴───────────────┴────────────────────┘  │   │
├───────────────────────────────────────────────────────────┤
│  LAYER 1: EXPERIENCE (React PWA + WhatsApp Bot)           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Worker PWA   │ │ Admin Dash   │ │ WhatsApp Bot     │  │
│  │ (Onboarding, │ │ (DSI Heatmap,│ │ (Hindi/Tamil/    │  │
│  │  Storm Mode) │ │  XAI Panel)  │ │  Telugu/Marathi) │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### Services & Ports

| Service     | Port | Description                        |
|-------------|------|------------------------------------|
| frontend    | 5173 | React PWA (Vite dev server)        |
| backend     | 3001 | Node.js Express REST API           |
| shield-sac  | 8001 | DRL premium pricing engine         |
| pads        | 8002 | 5-layer fraud detection            |
| dsi         | 8003 | Disruption Severity Index          |
| postgres    | 5432 | Primary relational database        |
| redis       | 6379 | DSI score caching + session store  |

---

## Setup & Running Locally

### Prerequisites

- Docker Desktop with Compose v2
- Node.js 20 LTS (for local dev without Docker)
- Python 3.11+ (for local ML service dev)

### One-command startup (Docker)

```bash
docker compose --env-file .env.development up --build
```

### Health checks

```
GET http://localhost:3001/health
GET http://localhost:8001/health
GET http://localhost:8002/health
GET http://localhost:8003/health
```

### Admin login

- URL: `http://localhost:5173/admin/login`
- Default credentials: `admin` / `admin123`
- Returns a JWT that gates all `/api/v1/admin/*` endpoints and the WebSocket channel (`/ws?role=admin&token=...`)

### Database verification

```bash
docker compose exec postgres psql -U gigashield -d gigashield \
  -c "SELECT COUNT(*) AS zones FROM zones;"
docker compose exec postgres psql -U gigashield -d gigashield \
  -c "SELECT COUNT(*) AS workers FROM workers;"
docker compose exec postgres psql -U gigashield -d gigashield \
  -c "SELECT COUNT(*) AS triggers FROM triggers;"
```

Expected minimums after seed: zones ≥ 25, workers ≥ 50, triggers ≥ 75.

---

## Backend API Reference

Base URL: `http://localhost:3001/api/v1`

### Workers

| Method | Endpoint                | Description                  |
|--------|-------------------------|------------------------------|
| POST   | `/workers/register`     | Register a new worker        |
| GET    | `/workers/:id`          | Get worker profile           |
| PUT    | `/workers/:id`          | Update worker profile        |

### Policies

| Method | Endpoint                | Description                  |
|--------|-------------------------|------------------------------|
| POST   | `/policies`             | Create a new policy          |
| GET    | `/policies/:workerId`   | Get active policy for worker |
| DELETE | `/policies/:id`         | Cancel a policy              |

### Claims

| Method | Endpoint                | Description                  |
|--------|-------------------------|------------------------------|
| POST   | `/claims`               | Manually trigger a claim     |
| GET    | `/claims/:id`           | Get claim status             |
| GET    | `/claims/worker/:id`    | List claims for a worker     |

### Payouts

| Method | Endpoint                | Description                  |
|--------|-------------------------|------------------------------|
| GET    | `/payouts/:claimId`     | Get payout status for claim  |
| POST   | `/payouts/retry/:id`    | Retry a failed payout        |

### Pools (Shield Pools)

| Method | Endpoint                | Description                  |
|--------|-------------------------|------------------------------|
| POST   | `/pools`                | Create a new pool            |
| GET    | `/pools/:id`            | Get pool details             |
| POST   | `/pools/:id/join`       | Add worker to a pool         |

### Admin

All admin endpoints require `Authorization: Bearer <JWT>` header.

| Method | Endpoint                     | Description                     |
|--------|------------------------------|---------------------------------|
| GET    | `/admin/dashboard`           | KPI summary stats               |
| GET    | `/admin/triggers`            | List all active DSI triggers     |
| POST   | `/admin/triggers/inject`     | Inject a demo trigger (dev only)|
| GET    | `/admin/fraud-logs`          | Paginated fraud log entries      |
| GET    | `/admin/zones`               | Zone list with current DSI score |

---

## ML Services Reference

### Shield-SAC (`:8001`) — Dynamic Premium Pricing

**POST `/price`**

```json
Request:
{
  "worker_id": "w_123",
  "zone_id": "mumbai_andheri",
  "weekly_earnings": 4200,
  "rain_probability": 0.72,
  "active_days": 24,
  "claim_history_count": 0
}

Response:
{
  "premium": 42.50,
  "coverage": 4500,
  "tier": "HIGH",
  "explanation": [
    { "factor": "Rain probability 72%", "impact": "+₹8.20", "direction": "up" },
    { "factor": "Flood-prone zone",     "impact": "+₹6.10", "direction": "up" },
    { "factor": "Clean claim history",  "impact": "−₹4.80", "direction": "down" }
  ],
  "fairness": { "max_allowed": 46.43, "constraint_satisfied": true }
}
```

**Algorithm:** Soft Actor-Critic (SAC) with a safety shield constraint:  
`premium ≤ 5% × weekly_earnings` — enforced in the action space, not as a post-hoc cap.  
Fallback: XGBoost Regressor if DRL has not converged.

---

### PADS (`:8002`) — Physics-Aware Fraud Detection

**POST `/validate`**

```json
Request:
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

Response:
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

**Fraud score thresholds:**

| Score   | Decision         |
|:-------:|:----------------:|
| < 0.30  | `AUTO_APPROVE`   |
| 0.30–0.70 | `FLAG_FOR_REVIEW` |
| ≥ 0.70  | `AUTO_REJECT`    |

---

### DSI (`:8003`) — Disruption Severity Index

**POST `/dsi`**

```json
Request:
{
  "zone_id": "mumbai_andheri",
  "weather_score": 72,
  "traffic_score": 65,
  "order_volume_score": 58
}

Response:
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

**DSI formula:** `DSI = 0.40 × Weather + 0.30 × Traffic + 0.30 × Orders`

| DSI Score | Severity     | Payout     |
|:---------:|:------------:|:----------:|
| 0–30      | LOW          | —          |
| 31–50     | MODERATE     | —          |
| 51–65     | ELEVATED     | —          |
| 66–80     | HIGH         | 50%        |
| 81–90     | SEVERE       | 75%        |
| 91–100    | CATASTROPHIC | 100%       |

---

## Database Schema

7 tables | 6 ENUMs | 12 indexes

```
workers ──► policies ──► claims ──► payouts
   │            │           │
   └──► zones   │       triggers
                │
          shield_pools    fraud_logs
```

Migrations are located in `backend/migrations/` and run automatically on container startup.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Database
DATABASE_URL=postgresql://gigashield:password@localhost:5432/gigashield

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_here

# Razorpay (sandbox)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# OpenWeatherMap
OPENWEATHER_API_KEY=...

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# ML Service URLs (internal Docker networking)
SHIELD_SAC_URL=http://shield-sac:8001
PADS_URL=http://pads:8002
DSI_URL=http://dsi:8003

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

---

## Docker & Deployment

All services are containerized. Each service has its own `Dockerfile` and is orchestrated via `docker-compose.yml` at the project root.

```bash
# Build and start all services
docker compose up --build

# Stop all services
docker compose down

# Rebuild a single service
docker compose up --build backend

# View logs for a service
docker compose logs -f pads

# Run database migrations manually
docker compose exec backend npm run migrate
```

### CI/CD

GitHub Actions workflows are in `.github/workflows/` and run on every push to `main`:
- Lint and type-check frontend
- Run backend unit tests
- Build all Docker images

---

*Built with ❤️ by Team Recursive Minds*
