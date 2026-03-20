# 🛡️ GIGASHIELD NEXUS — AI-Powered Parametric Microinsurance for Gig Workers

> **Team Nuuvixx** | Guidewire DevTrails Hackathon 2026
> *"Not insurance. Income protection in 3 minutes."*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Persona-Based Scenarios](#3-persona-based-scenarios)
4. [Application Workflow](#4-application-workflow)
5. [Weekly Premium Model](#5-weekly-premium-model)
6. [Parametric Triggers](#6-parametric-triggers)
7. [Platform Choice: Progressive Web App (PWA)](#7-platform-choice-progressive-web-app-pwa)
8. [AI/ML Integration](#8-aiml-integration)
9. [System Architecture](#9-system-architecture)
10. [Tech Stack](#10-tech-stack)
11. [Database Design](#11-database-design)
12. [Development Plan](#12-development-plan)
13. [Business Model & Unit Economics](#13-business-model--unit-economics)
14. [Regulatory Alignment](#14-regulatory-alignment)
15. [Competitive Differentiation](#15-competitive-differentiation)

---

## 1. Executive Summary

**GIGASHIELD NEXUS** is an AI-powered parametric microinsurance platform that protects quick-commerce delivery workers (Zepto, Blinkit, Swiggy Instamart) from income loss due to external disruptions — heavy rain, floods, extreme heat, pollution, and civic unrest.

### How It Works (30-Second Version)

```
Worker subscribes weekly (₹15-₹50) via WhatsApp or PWA
    ↓
AI calculates personalized premium based on zone risk + weather forecast
    ↓
System continuously monitors weather, traffic, and disruption data
    ↓
Disruption detected → Claim auto-created → Fraud check → Payout via UPI
    ↓
Worker receives ₹200-₹800 in under 3 minutes. Zero paperwork.
```

### Core Innovation

| Feature | What Makes It Different |
|---------|------------------------|
| **Shield-SAC Pricing** | Deep Reinforcement Learning with mathematical fairness — premium *cannot* exceed 5% of weekly earnings |
| **PADS Fraud Detection** | Physics-based fraud using smartphone IMU sensors — GPS spoofers can't fake accelerometer data |
| **Disruption Severity Index** | Composite score (weather 40% + traffic 30% + order volume 30%) — not binary on/off triggers |
| **Zero-Touch Claims** | Trigger → validate → pay in < 3 minutes with no human intervention |
| **WhatsApp-First Onboarding** | Sign up in Hindi/Marathi/Tamil/Telugu without downloading an app |

---

## 2. Problem Statement

### The Scale

- **12 million** gig delivery workers in India (NITI Aayog, 2024)
- **40%** earn less than ₹15,000/month
- **20-30%** income loss during disruption events (monsoon, heatwaves, pollution)
- **Zero** existing income protection products designed for this population

### The Gap

| What Exists | Why It Fails |
|-------------|-------------|
| Traditional health/life insurance | Doesn't cover income loss from weather |
| Crop insurance (PMFBY) | For farmers only, not urban gig workers |
| Platform sick pay (Swiggy/Zomato) | Only for illness, not weather disruptions; minimal coverage |
| Manual claims process | Takes 30-45 days — gig workers need money *today* |

### The Opportunity

Quick-commerce delivery workers face a unique vulnerability: their income is directly tied to weather conditions, yet no insurance product addresses this. A 30-minute rainstorm in Mumbai can eliminate an entire shift's earnings (₹500-₹800) for every active delivery partner in the affected zone.

### Why Quick-Commerce Specifically

```
✓ 10-15 minute delivery windows → even minor disruptions halt operations
✓ High delivery density → better risk modeling (more data per zone)
✓ Platform APIs exist → demand surge and order volume data available
✓ Income impact is immediate and measurable → perfect parametric fit
```

---

## 3. Persona-Based Scenarios

### Persona 1: Rahul Sharma — The Young Earner

```
👤 Profile
   Name:      Rahul Sharma
   Age:       26
   City:      Mumbai (Andheri West)
   Platform:  Blinkit
   Income:    ₹600-800/day on good days
   Dependents: Mother + younger sister in college
   Risk:      HIGH (flood-prone zone, monsoon exposure)
```

**Scenario: Mumbai Monsoon Flash Flood**

```
📅 Tuesday, July 15, 2:30 PM

Rahul has been delivering since 8 AM. He's made ₹450 so far today.
At 2:30 PM, heavy rain starts — 80mm/hr in his zone.

WITHOUT GIGASHIELD:
  ❌ Blinkit pauses orders in his zone
  ❌ Rahul waits 4 hours for rain to stop
  ❌ Resumes at 6:30 PM, makes only ₹150 more
  ❌ Daily earnings: ₹600 (₹200 less than average)
  ❌ Monthly loss from 8 rainy days: ₹12,000+
  ❌ Sister's college fees delayed

WITH GIGASHIELD:
  ✅ Rahul subscribed last Monday (₹42/week via WhatsApp)
  ✅ At 2:32 PM, GIGASHIELD detects 80mm/hr rainfall in Andheri West
  ✅ DSI score jumps to 82 (SEVERE)
  ✅ Claim auto-created, PADS fraud check passes (Rahul's phone is in the zone)
  ✅ At 2:34 PM, ₹400 credited to Rahul's UPI
  ✅ WhatsApp message: "बारिश में आपकी कमाई सुरक्षित! ₹400 आपके खाते में।"
  ✅ Rahul waits out the rain knowing his income is protected
```

---

### Persona 2: Sunita Kumari — The Working Mother

```
👤 Profile
   Name:      Sunita Kumari
   Age:       32
   City:      Delhi (Lajpat Nagar)
   Platform:  Zepto
   Income:    ₹500/day average
   Dependents: 2 children (ages 5 and 8)
   Risk:      MEDIUM (heatwave + pollution zone)
```

**Scenario: Delhi Heatwave + Pollution Double Hit**

```
📅 Monday, May 20, 11:00 AM

Temperature: 44°C. AQI: 430. IMD issues heatwave advisory.
Zepto reduces delivery slots. Sunita can't work safely.

WITHOUT GIGASHIELD:
  ❌ Forced to choose: risk heatstroke or lose a day's income
  ❌ Takes the day off — earns ₹0
  ❌ 6 heatwave days in May → ₹3,000 lost
  ❌ Combined with pollution days (Nov-Jan): ₹8,000+ annual loss

WITH GIGASHIELD:
  ✅ Subscribed at LOW tier (₹15/week — 3% of weekly earnings)
  ✅ GIGASHIELD detects: Temperature 44°C (>42°C threshold) + AQI 430 (>400 threshold)
  ✅ Two triggers fire simultaneously
  ✅ Higher payout applied: ₹200 (heatwave) — no double-dipping
  ✅ Payout in 2 minutes. Sunita rests safely at home.
  ✅ Over the heatwave season: ₹1,200 recovered across 6 events
  ✅ ROI: Paid ₹60 in premiums (4 weeks), received ₹1,200 in payouts
```

---

### Persona 3: Arjun Das — The Shield Pool Organizer

```
👤 Profile
   Name:      Arjun Das
   Age:       29
   City:      Bangalore (Koramangala)
   Platform:  Swiggy Instamart
   Income:    ₹700/day average
   Dependents: Wife + elderly father
   Risk:      MEDIUM (seasonal rain, moderate flood risk)
```

**Scenario: Community Shield Pool Activation**

```
📅 Saturday, September 6, 4:00 PM

Arjun organized 15 delivery workers in Koramangala into a Shield Pool.
Each pays ₹25/week instead of ₹30 (17% discount via pool).
Heavy rain hits Koramangala — 60mm/hr sustained for 2 hours.

WHAT HAPPENS:
  ✅ GIGASHIELD detects rain threshold breach for Koramangala zone
  ✅ DSI score: 71 (HIGH)
  ✅ All 15 pool members get claims auto-created simultaneously
  ✅ PADS validates each member's location (all in zone)
  ✅ 14 of 15 pass fraud check → ₹300 each paid out
  ✅ 1 member flagged (GPS shows them in a different city) → claim rejected
  ✅ Arjun's pool reputation strengthens → 3 new members join next week
  ✅ Pool fund grows → premiums drop further to ₹23/week
```

---

### Persona 4: Kavitha R — The Low-Tech User

```
👤 Profile
   Name:      Kavitha R
   Age:       38
   City:      Chennai (T. Nagar)
   Platform:  Blinkit
   Income:    ₹450/day average
   Digital literacy: Basic (uses WhatsApp, UPI)
   Language:  Tamil
   Risk:      LOW (less weather disruption outside monsoon)
```

**Scenario: WhatsApp-Only Onboarding**

```
📅 Wednesday, June 3

Kavitha's friend tells her about GIGASHIELD.
She messages the WhatsApp number.

ONBOARDING FLOW (< 90 seconds):
  1. Bot: "வணக்கம்! மொழியை தேர்வு செய்யவும் | Hello! Choose language"
     Kavitha: "Tamil"

  2. Bot: "உங்கள் பெயர் என்ன? What is your name?"
     Kavitha: "Kavitha"

  3. Bot: "நீங்கள் எந்த platform-ல் வேலை செய்கிறீர்கள்? | Which delivery platform?"
     Kavitha taps: "Blinkit"

  4. Bot: "தினசரி சராசரி வருமானம்? | Average daily earnings?"
     Kavitha: "450"

  5. Bot auto-detects zone from phone location: "T. Nagar, Chennai"

  6. Bot: "உங்களுக்கான திட்டம்: ₹15/வாரம், ₹1000 பாதுகாப்பு
          Plan for you: ₹15/week, ₹1000 coverage
          ✅ Subscribe?"
     Kavitha: "Yes"

  7. Razorpay UPI autopay link sent → Kavitha approves
  8. Bot: "🛡️ Shield ACTIVE! உங்கள் வருமானம் பாதுகாக்கப்படுகிறது."

  TOTAL TIME: 73 seconds. Zero app downloads.
```

---

## 4. Application Workflow

### 4.1 End-to-End Worker Journey

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ONBOARDING   │     │  ACTIVE       │     │  DISRUPTION   │
│               │     │  PROTECTION   │     │  EVENT        │
│ WhatsApp/PWA  │────▶│              │────▶│              │
│ → Language    │     │ Home screen   │     │ Storm Mode    │
│ → Platform    │     │ shows:        │     │ activates:    │
│ → Earnings    │     │ • Coverage ₹  │     │ • Alert shown │
│ → Zone detect │     │ • Risk forcast│     │ • Progress bar│
│ → Premium calc│     │ • Shield Pool │     │ • ETA payout  │
│ → UPI autopay │     │ • ROI tracker │     │               │
└──────────────┘     └──────────────┘     └───────┬──────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  WEEKLY       │     │  PAYOUT       │     │  CLAIM        │
│  RENEWAL      │     │  RECEIVED     │     │  PROCESSING   │
│               │◀────│              │◀────│              │
│ Auto-renew    │     │ UPI credit    │     │ Auto-create   │
│ or adjust     │     │ WhatsApp msg  │     │ PADS fraud chk│
│ plan tier     │     │ Amount + ref  │     │ Adjudicate    │
│               │     │ Share button  │     │ Payout init   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 4.2 Claim Processing Pipeline (< 3 Minutes)

```
TIME    EVENT                           SYSTEM ACTION
─────   ─────────────────────────       ───────────────────────────────
T+0s    Heavy Rain detected             Weather Oracle polls OpenWeatherMap
        (80mm/hr in Zone A)             → data sent to Analytics Manager

T+5s    DSI calculated: 82/100          DSI Service computes composite score
        Threshold breached (>65)        → event emitted to message queue

T+10s   Claims auto-created             Find all active policies in Zone A
        for 23 insured workers          → create claim record per policy

T+15s   PADS fraud validation           5-layer check runs in parallel:
        (per claim, parallel)           ✓ Device check (not emulator)
                                        ✓ GPS+IP consistency
                                        ✓ IMU kinematic validation
                                        ✓ Duplicate claim prevention
                                        ✓ Behavioral anomaly detection

T+30s   Adjudication complete           fraud_score < 0.3 → AUTO_APPROVE
        21 approved, 1 flagged,         fraud_score 0.3-0.7 → FLAG
        1 rejected (GPS spoof)          fraud_score > 0.7 → REJECT

T+35s   Payouts initiated              Razorpay Instant Payout API called
        21 UPI transfers queued         Amount based on DSI severity level

T+120s  Payouts complete                UPI credits confirmed
        (< 2 min processing)            WhatsApp notification sent to each worker
        
T+150s  TOTAL: 2 min 30 sec            Audit log: trigger → claim → payout
```

### 4.3 Admin Workflow

```
MONITORING (Continuous):
  Admin dashboard shows real-time:
  ├── Active policies count + trend
  ├── DSI heatmap (zone-level risk visualization)
  ├── Claims today (count, total ₹, auto-approve rate)
  ├── Loss ratio (claims paid ÷ premiums collected)
  ├── Fraud rate (flagged + rejected ÷ total claims)
  └── XAI panel (SHAP explanation for any worker's premium)

DEMO MODE:
  Admin can inject triggers via control panel:
  ├── Select zone from dropdown
  ├── Select trigger type (rain/flood/heat/pollution/curfew)
  ├── Set severity slider
  └── Click "Inject" → entire pipeline fires live
```

---

## 5. Weekly Premium Model

### 5.1 Why Weekly (Not Monthly or Annual)

| Factor | Weekly Model Advantage |
|--------|----------------------|
| **Cash flow** | Gig workers are paid daily/weekly — matches their income cycle |
| **Flexibility** | Workers can skip weeks when not working (no lock-in) |
| **Risk accuracy** | Weather risk changes week-to-week — weekly pricing captures actual conditions |
| **Affordability** | ₹15-₹50/week is psychologically easier than ₹200/month |
| **Trust building** | Low commitment → workers try it → see value → retain |

### 5.2 Three-Tier Structure

| Tier | Weekly Premium | Weekly Coverage | Target Workers | Payout Range |
|------|---------------|----------------|----------------|-------------|
| **🟢 LOW** | ₹15 | ₹1,000 | Low-risk zones, non-monsoon season | ₹100-₹300 |
| **🟡 MEDIUM** | ₹30 | ₹2,500 | Moderate zones, seasonal risk | ₹200-₹500 |
| **🔴 HIGH** | ₹50 | ₹5,000 | High-risk zones (Mumbai monsoon, Delhi AQI) | ₹400-₹800 |

### 5.3 Dynamic Pricing via Shield-SAC

The premium is NOT a fixed lookup table. Shield-SAC (our AI pricing engine) calculates a personalized premium for each worker each week based on:

```
INPUT FEATURES (17 dimensions):
├── Weather Forecast (7): rain_mm, temperature, humidity, wind, AQI, cloud_cover, visibility
├── Zone Risk (3): flood_score, historical_disruption_rate, population_density
├── Worker Profile (4): avg_earnings, activity_days, claim_count, claim_ratio
└── Temporal (3): day_of_week, month, is_monsoon_season

OUTPUT:
├── premium_amount: ₹15-₹50 (continuous, not discrete tiers)
└── coverage_amount: ₹1,000-₹5,000

HARD CONSTRAINT (Mathematical Guarantee):
  Premium ≤ 5% of worker's estimated weekly earnings
  Example: Worker earning ₹600/day × 6 days = ₹3,600/week
           Maximum premium: ₹180 (well above our ₹50 cap)
           
  This is enforced in the algorithm itself (not just a business rule).
  The "Shield" in Shield-SAC is a mathematical safety constraint.
```

### 5.4 Shield Pool Discounts

Workers in the same zone can form **Shield Pools** (community micro-insurance groups):

| Pool Size | Premium Discount | How It Works |
|-----------|-----------------|-------------|
| 3-10 workers | 15% off | Collective risk sharing reduces individual cost |
| 11-25 workers | 18% off | Larger pool = more stable loss ratio |
| 26+ workers | 20% off | Zone-level community insurance effect |

Example: Rahul's ₹42/week premium → ₹34/week with 15 pool members (₹8/week saved).

### 5.5 Payment Flow

```
SUBSCRIPTION:
  Worker selects plan tier (or accepts AI recommendation)
  → Razorpay UPI Autopay mandate created
  → ₹15-₹50 debited weekly (every Monday)
  → Policy activates immediately upon payment

RENEWAL:
  Auto-renews if UPI autopay active
  Premium recalculated each week (may go up/down based on forecast)
  Worker notified of new premium via WhatsApp on Sunday evening

CANCELLATION:
  Worker can cancel anytime via WhatsApp ("cancel" message)
  No cancellation fee
  Coverage ends at current week's expiry
```

---

## 6. Parametric Triggers

### 6.1 What Are Parametric Triggers?

Unlike traditional insurance (where you file a claim and an adjuster investigates), **parametric triggers** automatically detect that a qualifying event has occurred and pays out without any human filing or review.

Our system monitors external data sources continuously and triggers payouts when predefined thresholds are breached.

### 6.2 Trigger Definitions

| # | Trigger Type | Threshold | Data Source | Payout Range | Avg Frequency |
|---|-------------|-----------|-------------|-------------|---------------|
| 1 | **Heavy Rain** | Rainfall > 50 mm/hr sustained for 30+ min | OpenWeatherMap API | ₹200–₹400 | 4×/month (Mumbai monsoon) |
| 2 | **Flood** | Waterlogging zone officially active OR water level > threshold | CWC / IMD alerts (mock) | ₹400–₹800 | 2×/month (monsoon) |
| 3 | **Heatwave** | Temperature > 42°C | OpenWeatherMap + IMD | ₹200 | 6×/month (May-Jun, Delhi) |
| 4 | **Air Pollution** | AQI > 400 (Hazardous) | CPCB API (mock) | ₹150 | 8×/month (Nov-Jan, Delhi) |
| 5 | **Curfew/Strike** | Official civic alert detected | ACLED / GoI (mock) | ₹300 | 0.5×/month |

### 6.3 Disruption Severity Index (DSI) — Composite Trigger

Instead of relying solely on individual binary triggers, we compute a **Disruption Severity Index** per zone every 5 minutes:

```
DSI = 0.40 × Weather_Score + 0.30 × Traffic_Score + 0.30 × Order_Score

WHERE:
  Weather_Score (0-100):
    = normalized(25×rain + 20×temp + 20×AQI + 15×flood + 10×wind + 10×visibility)
    Each sub-factor rated 0-4 (none/light/moderate/heavy/extreme)

  Traffic_Score (0-100):
    = 50×delay_index + 25×road_closures + 25×transit_disruption

  Order_Score (0-100):
    = 100 × (1 - current_orders / expected_orders)
    When platform orders drop 50%, Order_Score = 50
```

### 6.4 DSI-Based Graduated Payouts

| DSI Score | Severity Level | Action | Payout |
|-----------|---------------|--------|--------|
| 0–30 | 🟢 LOW | No action | None |
| 31–50 | 🟡 MODERATE | Alert sent to workers | None |
| 51–65 | 🟠 ELEVATED | Alert + monitoring intensified | None |
| 66–80 | 🔴 HIGH | Claim auto-created | 50% of coverage |
| 81–90 | 🟣 SEVERE | Claim auto-created | 75% of coverage |
| 91–100 | ⚫ CATASTROPHIC | Claim + pool activation | 100% of coverage |

**Why this is better than binary triggers:** A DSI of 60 (heavy rain + moderate traffic) doesn't trigger payout, but a DSI of 75 (moderate rain + severe traffic + order collapse) does — because the *combined* disruption is severe even if no single threshold is breached.

### 6.5 Anti-Gaming Rules

```
1. DEDUPLICATION: Same trigger type in same zone within 6 hours = 1 trigger
2. MAX PAYOUT: One payout per worker per trigger event
3. MULTIPLE TRIGGERS: If rain AND flood fire simultaneously → higher payout applies
4. POLICY REQUIRED: Must have active policy at time of trigger
5. ZONE BOUND: Worker must be in the affected zone (validated by PADS)
```

---

## 7. Platform Choice: Progressive Web App (PWA)

### Why PWA Over Native Mobile App

| Criterion | Native App (React Native) | **PWA (React)** ✅ |
|-----------|---------------------------|---------------------|
| **Download barrier** | Must install from Play Store | Open URL — zero friction |
| **WhatsApp integration** | Users leave WhatsApp → Play Store → install → open | WhatsApp link opens PWA instantly |
| **Low-end device support** | Requires storage space + RAM | Runs in browser, minimal storage |
| **Development speed** | Separate iOS/Android builds | Single codebase, fastest iteration |
| **Offline access** | Native advantage | PWA service workers cache key screens |
| **Push notifications** | Native advantage | PWA supports push notifications |
| **Gig worker behavior** | Extra app = extra friction | Workers already use WhatsApp + UPI |

### Why NOT a Pure WhatsApp Bot

While WhatsApp is our **primary onboarding** channel, a PWA gives us:
- Rich data visualizations (risk forecast charts, DSI heatmap)
- Real-time Storm Mode animation
- Interactive XAI dashboard
- Claims history and analytics

**Strategy: WhatsApp for onboarding + notifications, PWA for rich experience.**

---

## 8. AI/ML Integration

### 8.1 Shield-SAC — Dynamic Premium Pricing

**What:** A Soft Actor-Critic (SAC) reinforcement learning agent with a safety shield that calculates optimal weekly premiums while guaranteeing fairness constraints.

```
ARCHITECTURE:
  ┌──────────────────────────────────────────────────┐
  │  SHIELD-SAC PRICING ENGINE                        │
  │                                                    │
  │  State (17-dim):  Worker + Zone + Weather + Time  │
  │         │                                          │
  │         ▼                                          │
  │  ┌─────────────┐   ┌─────────────┐               │
  │  │ Actor Network│   │ Critic      │               │
  │  │ (Policy π)   │   │ Network     │               │
  │  │ → Premium ₹  │   │ (Value Q)   │               │
  │  │ → Coverage ₹ │   │             │               │
  │  └──────┬──────┘   └─────────────┘               │
  │         │                                          │
  │         ▼                                          │
  │  ┌─────────────────────────────────┐              │
  │  │  SHIELD (Safety Constraint)      │              │
  │  │  IF premium > 5% of earnings:    │              │
  │  │    premium = 5% of earnings      │              │
  │  │  IF coverage < 2× premium:       │              │
  │  │    coverage = 2× premium         │              │
  │  └──────┬──────────────────────────┘              │
  │         │                                          │
  │         ▼                                          │
  │  ┌─────────────────────────────────┐              │
  │  │  SHAP EXPLAINER                  │              │
  │  │  Top 5 features → why this ₹     │              │
  │  └─────────────────────────────────┘              │
  └──────────────────────────────────────────────────┘

REWARD FUNCTION:
  R = 1.0 × premium_collected
    - 1.2 × claim_payout          (penalize underpaying)
    - 10.0 × fairness_violation   (hard penalty for constraint breach)
    - 2.0 × churn_penalty         (penalize pricing that loses workers)

TRAINING:
  Pre-trained on 50,000 synthetic worker-weeks
  Generated from: IMD weather data + mock worker profiles
  Training time: ~4 hours on single GPU

FALLBACK (if DRL doesn't converge):
  XGBoost Regressor + fairness post-processing
  Training time: 10 minutes | Same SHAP explanability
```

**XAI Output Example:**

```json
{
  "premium": 42.50,
  "coverage": 4500,
  "explanation": [
    {"factor": "Rain probability 72%", "impact": "+₹8.20", "direction": "↑"},
    {"factor": "Flood-prone zone", "impact": "+₹6.10", "direction": "↑"},
    {"factor": "AQI forecast 280", "impact": "+₹3.40", "direction": "↑"},
    {"factor": "24 active days (reliable)", "impact": "-₹2.10", "direction": "↓"},
    {"factor": "Clean claim history", "impact": "-₹4.80", "direction": "↓"}
  ],
  "fairness": {
    "max_allowed": 46.43,
    "constraint_satisfied": true
  }
}
```

---

### 8.2 PADS — Physics-Aware Disruption Sensing (Fraud Detection)

**What:** A 5-layer fraud detection pipeline that uses physics-based validation alongside behavioral analysis.

```
LAYER 1: DEVICE INTEGRITY
  Check: Is device an emulator or rooted?
  Method: Device attestation (SafetyNet / Play Integrity mock)
  Result: Binary PASS/FAIL

LAYER 2: GPS-IP CONSISTENCY
  Check: Is the worker actually in the claimed zone?
  Method: Haversine distance(GPS coords, zone center) < zone radius
          AND IP geolocation city == zone city
  Threshold: < 5km distance, IP must match

LAYER 3: IMU KINEMATIC VALIDATION (OUR NOVEL CONTRIBUTION)
  Check: Did the worker actually have their phone on their person outdoors?
  Method:
    • Accelerometer variance > 0.5 → device being carried (not desk-mounted)
    • Gyroscope FFT pattern matches walking/riding
    • Step count > 0 in last hour → human activity
  Why it matters: GPS spoofers generate fake coordinates, but they
                  CAN'T generate matching accelerometer/gyroscope data.
                  A phone sitting on a desk has zero movement variance.

LAYER 4: DUPLICATE CLAIM PREVENTION
  Check: Has this worker already claimed for this trigger?
  Method: Database UNIQUE constraint (policy_id + trigger_id)
  Result: Deterministic PASS/FAIL

LAYER 5: BEHAVIORAL ANOMALY DETECTION
  Check: Is this claim pattern unusual for this worker?
  Method: Isolation Forest trained on:
    • claim_frequency (claims per month)
    • claim_amount_mean
    • time_since_last_claim
    • trigger_type_distribution
  Threshold: anomaly_score > 0.7 → FLAG for review

SCORE AGGREGATION:
  fraud_score = weighted_avg(L1×0.15, L2×0.25, L3×0.25, L4×0.15, L5×0.20)

  Decision:
    fraud_score < 0.3   → AUTO_APPROVE
    0.3 ≤ score < 0.7   → FLAG_FOR_REVIEW
    fraud_score ≥ 0.7   → AUTO_REJECT
```

---

### 8.3 DSI Engine — Disruption Severity Intelligence

```
WHAT: Composite real-time score (0-100) per zone, computed every 5 minutes
WHY:  Binary triggers miss compound disruptions; DSI captures the full picture

COMPUTATION:
  1. Weather Oracle polls OpenWeatherMap → normalize to 0-100
  2. Traffic Oracle polls Google Maps (or mock) → normalize to 0-100
  3. Order Oracle polls platform API (simulated) → normalize to 0-100
  4. DSI = 0.4×Weather + 0.3×Traffic + 0.3×Orders
  5. Cache in Redis (TTL: 5 min)
  6. If DSI > threshold → emit trigger event

VISUALIZATION:
  Admin dashboard shows DSI heatmap on interactive Leaflet map
  Each zone colored by current DSI: 🟢🟡🟠🔴🟣
```

---

## 9. System Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: INTELLIGENCE SERVICES (Python Microservices)          │
│                                                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Shield-SAC       │ │ PADS Fraud       │ │ DSI Calculator    │ │
│  │ Pricing Engine   │ │ Detection        │ │ (Disruption       │ │
│  │ (FastAPI+PyTorch)│ │ (FastAPI+SciPy)  │ │  Severity Index)  │ │
│  └────────┬────────┘ └────────┬────────┘ └────────┬──────────┘ │
│           │                    │                     │            │
├───────────┼────────────────────┼─────────────────────┼────────────┤
│           ▼                    ▼                     ▼            │
│  LAYER 2: CORE ENGINE (Node.js + Guidewire Integration)          │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Integration Gateway (REST Orchestrator)                    │   │
│  │ ┌────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────────┐ │   │
│  │ │Weather │ │Traffic  │ │Civic Data│ │Platform Orders  │ │   │
│  │ │Oracle  │ │Oracle   │ │Oracle    │ │Oracle           │ │   │
│  │ └────────┘ └─────────┘ └──────────┘ └─────────────────┘ │   │
│  └───────────────────────────┬───────────────────────────────┘   │
│                               ▼                                   │
│  ┌──────────────┐ ┌──────────────────┐ ┌──────────────────────┐ │
│  │ Policy       │ │ Claim            │ │ Payout Service       │ │
│  │ Service      │ │ Service          │ │ (Razorpay UPI)       │ │
│  │ (Create,     │ │ (Auto-create,    │ │                      │ │
│  │  Renew,      │ │  Adjudicate,     │ │                      │ │
│  │  Cancel)     │ │  PADS integrate) │ │                      │ │
│  └──────────────┘ └──────────────────┘ └──────────────────────┘ │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  LAYER 1: EXPERIENCE (React PWA + WhatsApp)                       │
│                                                                   │
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────────┐ │
│  │ Worker PWA       │ │ Admin Dashboard   │ │ WhatsApp Bot      │ │
│  │ • Onboarding     │ │ • DSI Heatmap     │ │ • Onboarding      │ │
│  │ • Shield Status  │ │ • XAI Panel       │ │ • Notifications   │ │
│  │ • Storm Mode     │ │ • Fraud Monitor   │ │ • Claim Status    │ │
│  │ • Payout Screen  │ │ • Demo Control    │ │ • Hindi/Tamil/etc │ │
│  └─────────────────┘ └──────────────────┘ └───────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## 10. Tech Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| **Frontend** | React | 18.3+ | Hooks, Suspense, fastest UI dev |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first, rapid prototyping |
| **Charts** | Recharts | 2.x | React-native charting for DSI visualization |
| **Maps** | Leaflet + React-Leaflet | 4.x | Open-source maps for zone heatmaps |
| **Backend** | Node.js + Express | 20 LTS | REST APIs, webhook handling, integration layer |
| **ML Services** | Python + FastAPI | 3.11+ | Async ML inference, auto-generated OpenAPI docs |
| **ML/DRL** | PyTorch | 2.x | Shield-SAC training + inference |
| **ML Utilities** | Scikit-learn, SHAP, NumPy, SciPy | Latest | Anomaly detection, XAI, IMU kinematics |
| **Database** | PostgreSQL | 16+ | Relational, JSONB for flexible schemas |
| **Cache** | Redis | 7+ | DSI score caching, session management |
| **WhatsApp** | Twilio WhatsApp Business API | Latest | Regional language bot with template messages |
| **Payments** | Razorpay Instant Payout | Sandbox v2 | UPI instant disbursement, webhook support |
| **Weather** | OpenWeatherMap | 3.0 | Real-time weather for 5 Indian cities |
| **Containerization** | Docker + Docker Compose | 24+ | Local dev + deployment |
| **CI/CD** | GitHub Actions | Latest | Build → lint → test → deploy pipeline |

---

## 11. Database Design

### Entity Relationship Diagram

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   workers     │     │   policies       │     │   claims          │
├──────────────┤     ├─────────────────┤     ├──────────────────┤
│ id (PK)       │──┐  │ id (PK)          │──┐  │ id (PK)           │
│ name          │  │  │ worker_id (FK) ◄─┘  │  │ policy_id (FK) ◄─┘
│ phone (unique)│  │  │ plan_tier        │  │  │ trigger_id (FK)   │
│ city          │  │  │ premium_amount   │  │  │ claim_amount      │
│ zone_id (FK)  │  │  │ coverage_amount  │  │  │ status            │
│ platform      │  │  │ start_date       │  │  │ fraud_score       │
│ avg_earnings  │  │  │ end_date         │  │  │ payout_ref        │
│ risk_score    │  │  │ status           │  │  │ created_at        │
│ language_pref │  │  │ pool_id (FK)     │  │  │ approved_at       │
└──────────────┘  │  │ shap_explanation │  │  │ paid_at           │
       │          │  └─────────────────┘  │  └──────────────────┘
       │          │                        │
       ▼          │  ┌──────────────────┐  │  ┌──────────────────┐
┌──────────────┐  │  │   triggers        │  │  │   payouts         │
│   zones       │  │  ├──────────────────┤  │  ├──────────────────┤
├──────────────┤  │  │ id (PK)           │  │  │ id (PK)           │
│ id (PK)       │  │  │ zone_id (FK)     │  │  │ claim_id (FK)     │
│ city          │  │  │ type (ENUM)      │  └──│ worker_id (FK)    │
│ name          │  │  │ severity_value   │     │ amount            │
│ lat / lng     │  │  │ dsi_score        │     │ upi_id            │
│ flood_risk    │  │  │ raw_data (JSON)  │     │ razorpay_ref      │
│ historical_aqi│  │  │ detected_at      │     │ status            │
└──────────────┘  │  └──────────────────┘     └──────────────────┘
                   │
                   │  ┌──────────────────┐     ┌──────────────────┐
                   │  │   shield_pools    │     │   fraud_logs      │
                   │  ├──────────────────┤     ├──────────────────┤
                   └──│ id (PK)           │     │ id (PK)           │
                      │ zone_id (FK)     │     │ claim_id (FK)     │
                      │ member_count     │     │ check_type (ENUM) │
                      │ premium_discount │     │ result (P/F/W)    │
                      │ total_pool_fund  │     │ confidence        │
                      │ status           │     │ details (JSON)    │
                      └──────────────────┘     └──────────────────┘

7 Tables | 6 ENUMs | 12 Indexes
```

---

## 12. Development Plan

### Phase 1: Ideation & Foundation (Weeks 1–2) ← **Current Phase**
- [x] Market research and persona development
- [x] Parametric trigger threshold definition
- [x] Architecture design
- [x] Tech stack selection
- [x] Idea Document (this README)

### Phase 2: Core Development (Weeks 3–4)
- [ ] PostgreSQL schema implementation + seed data
- [ ] Worker onboarding API + policy subscription API
- [ ] Shield-SAC pricing engine (training + inference API)
- [ ] Parametric trigger engine (5 triggers + DSI)
- [ ] React PWA shell (6 core screens)
- [ ] Weather API integration (OpenWeatherMap)

### Phase 3: Intelligence & Automation (Weeks 5–6)
- [ ] Zero-touch claim pipeline (trigger → claim → adjudicate → payout)
- [ ] PADS 5-layer fraud detection service
- [ ] Razorpay sandbox payout integration
- [ ] XAI dashboard (SHAP waterfall charts)
- [ ] WhatsApp onboarding bot (Hindi + English)
- [ ] Admin dashboard (DSI heatmap, fraud monitor, demo control)

### Phase 4: Polish & Submission (Weeks 7–8)
- [ ] End-to-end testing (happy path + edge cases)
- [ ] UI polish (animations, error handling, loading states)
- [ ] Shield Pool feature
- [ ] 10-slide pitch deck
- [ ] 5-minute demo video
- [ ] Deployment + final submission

---

## 13. Business Model & Unit Economics

### Revenue Model

```
Revenue per worker per week: ₹15-₹50 (average ₹30)
Annual revenue per worker: ₹30 × 52 = ₹1,560

At 1,000 workers: ₹30,000/week → ₹15.6L/year
At 10,000 workers: ₹3L/week → ₹1.56Cr/year
At 100,000 workers: ₹30L/week → ₹15.6Cr/year
```

### Cost Structure

```
Claims payout:       60-70% of premium revenue (target loss ratio)
Tech infrastructure: 10-15% (cloud, APIs, Razorpay fees)
Operations:          5-10% (support, compliance)
Margin:              10-20%
```

### Unit Economics

| Metric | Value |
|--------|-------|
| Average weekly premium | ₹30 |
| Average claim payout | ₹300 |
| Trigger frequency | ~8% per worker per week |
| Expected loss per worker per week | 0.08 × ₹300 = ₹24 |
| Loss ratio | 24/30 = 80% (within target) |
| Break-even | ~500 insured workers |
| Fraud rate target | < 3% |

### Revenue Streams (Future)

1. **Platform partnerships** — Zepto/Blinkit subsidize premiums for worker retention
2. **Government integration** — PMJJBY-aligned product, Bima Sugam distribution
3. **Data licensing** — Anonymized disruption data for urban planners
4. **Reinsurance** — Partner with large insurers for risk distribution

---

## 14. Regulatory Alignment

| Regulation | Status | Plan |
|------------|--------|------|
| **IRDAI Sandbox** | Applicable | Apply for regulatory sandbox for parametric microinsurance |
| **Bima Sugam** | Ready to integrate | Digital-first platform alignment |
| **PMJJBY** | Aligned | Premium range and coverage amounts match government scheme |
| **DPDP Act 2023** | Compliant by design | Aadhaar hashed, GPS data purged after validation |
| **RBI UPI Guidelines** | Followed | Razorpay handles compliance for instant payouts |

---

## 15. Competitive Differentiation

| Dimension | Generic Hackathon Team | GIGASHIELD NEXUS |
|-----------|----------------------|------------------|
| **Pricing** | Static 3-tier table | Shield-SAC DRL with mathematical fairness |
| **Triggers** | Binary threshold (rain > X) | Composite DSI (weather + traffic + orders) |
| **Fraud detection** | GPS validation only | PADS: 5-layer with physics-based IMU validation |
| **Claims** | Manual or basic automation | Zero-touch: 3 minutes end-to-end |
| **Onboarding** | App download required | WhatsApp-first in regional languages |
| **Community** | Individual only | Shield Pools with 15-20% premium discount |
| **Transparency** | "AI-calculated" (opaque) | SHAP-based XAI: every factor explained |
| **Premium constraint** | Business rule | Mathematical guarantee (cannot be breached) |
| **Demo** | Working prototype | Narrative + enterprise architecture + live automation |

---

## 🔗 Repository Structure

```
GIGASHIELD/
├── README.md                ← This document
├── submission/              ← Phase deliverables
├── frontend/                ← React PWA (Phase 2+)
├── backend/                 ← Node.js Express API (Phase 2+)
├── ml-services/             ← Python microservices (Phase 2+)
│   ├── shield-sac/          ← Pricing engine
│   ├── pads/                ← Fraud detection
│   └── dsi/                 ← Disruption Severity Index
├── infra/                   ← Docker, CI/CD configs (Phase 2+)
└── docs/                    ← Architecture diagrams, pitch deck
```

---

## 💬 Tagline

> *"Not insurance. Income protection in 3 minutes."*

> *"बारिश हो या आंधी, आपकी कमाई सुरक्षित है।"*
> *(Rain or storm, your earnings are protected.)*

---

**Team Nuuvixx** | Guidewire DevTrails Hackathon 2026
