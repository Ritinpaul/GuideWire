# 🛡 GIGASHIELD NEXUS — MVP

## 🚀 AI-Powered Parametric Insurance for Gig Workers

## (Quick-Commerce)

## 🎯 Problem Statement

Gig delivery partners (Zepto, Blinkit, Swiggy Instamart) lose **20 ‒ 30 % of their income** due to external
disruptions like heavy rain, floods, extreme heat, and curfews.

They currently have:

```
❌ No income protection
❌ No instant compensation
❌ No safety net
```
## 💡 Our Solution

**GIGASHIELD NEXUS** is an **AI-powered parametric insurance platform** that:

```
Predicts disruption risks
Dynamically calculates weekly premiums
Automatically triggers claims
Instantly pays workers for lost income
```
⚡ **No paperwork. No claims process. Fully automated.**

## 👤 Target Persona: Quick-Commerce Delivery Partners

We focus on:

```
Zepto / Blinkit / Instamart workers
10 ‒ 15 min delivery pressure
High income volatility due to micro-disruptions
```
## 🔥 Why Quick-Commerce?

```
Rain for 30 mins = entire batch income lost
High density → better risk modeling
Immediate impact → perfect for parametric triggers
```

## 🧠 Core Features (MVP)

### 1. 📊 AI-Powered Risk Assessment

We use a **lightweight ML model** (not heavy DRL for MVP) to calculate risk:

#### Inputs:

```
Weather forecast (rain, temperature, AQI)
Zone risk score (flood-prone areas)
Worker activity history
Demand surge level
```
#### Output:

```
Weekly Premium (₹ 15 ‒ ₹ 50 )
Coverage Amount (₹ 1000 ‒ ₹ 5000 )
```
#### Constraint:

```
Premium ≤ 5 % of weekly earnings
```
### 2. 💰 Weekly Pricing Model

```
Workers subscribe weekly
Pricing adapts based on risk level of their zone
```
```
Risk Level Weekly Premium Coverage
Low Risk ₹ 15 ₹ 1000
Medium Risk ₹ 30 ₹ 2500
High Risk ₹ 50 ₹ 5000
```
### 3. 🌧 Parametric Triggers (Automated)

We use API + mock data for disruption detection.

#### Triggers:


```
Disruption Condition Payout
Heavy Rain Rain > 50 mm/hr ₹ 200 ‒₹ 400
Flood Waterlogging zone active ₹ 400 ‒₹ 800
Heatwave Temp > 42 °C ₹ 200
Pollution AQI > 400 ₹ 150
Curfew/Strike Civic alert detected ₹ 300
```
⚡ Trigger → Claim → Payout (Fully automatic)

### 4. 🛡 Intelligent Fraud Detection (Simplified MVP)

We implement **3 -layer fraud protection** :

#### Layer 1 : Device Check

```
Detect emulator / rooted device
```
#### Layer 2 : Location Validation

```
GPS + IP consistency
Reject spoofed locations
```
#### Layer 3 : Behavior Analysis

```
Detect abnormal claims using anomaly detection
```
### 5. ⚡ Instant Payout System

```
Trigger detected via API/mock
Claim auto-approved
Payment processed via Razorpay (test mode)
```
⏱ Total Time: **< 3 minutes**

### 6. 📱 User Experience

#### 🏠 Home Screen

```
Weekly premium
Active coverage
Risk forecast (next 7 days)
```

#### ⚠ Storm Mode

```
Real-time disruption alert
Countdown to payout
```
#### ✅ Payout Screen

```
Amount credited
UPI reference ID
Reason (e.g., "Heavy Rain Protection")
```
### 7. 📊 Analytics Dashboard

#### 👷 Worker View:

```
Earnings protected
Claims received
Weekly coverage status
```
#### 🧑‍💼 Admin View:

```
Active policies
Loss ratio
Trigger frequency
Fraud alerts
```
## 🔗 Integrations (MVP)

```
System Purpose
Weather API (OpenWeather / Mock) Rain, temp data
AQI API Pollution levels
Civic Data (Mock/ACLED) Curfews, strikes
Razorpay Sandbox Instant payout
Map API Zone detection
```
## ⚙ System Architecture

### Frontend:


```
React Native / PWA
```
### Backend:

```
Node.js (Express)
```
### Database:

```
PostgreSQL
```
### AI/ML:

```
Python (Scikit-learn)
Risk model + anomaly detection
```
## 🔄 Workflow

```
1. User signs up (basic onboarding)
2. Selects weekly insurance plan
3. System calculates premium using AI
4. Worker pays premium
5. APIs continuously monitor disruptions
6. Trigger detected → claim auto-initiated
7. Fraud checks executed
8. Payout processed instantly
```
## 🎬 Demo Flow ( 5 Minutes)

```
1. Show worker onboarding ( 30 sec)
2. Show premium calculation (live)
3. Inject fake weather event (rainstorm)
4. Trigger fires automatically
5. Fraud check passes
6. ₹ payout received via UPI (Razorpay)
```
## 📈 Success Metrics

```
Onboarding time: < 60 sec
Premium calculation: < 2 sec
Trigger detection: < 30 sec
Payout time: < 3 min
```

```
Fraud detection accuracy: > 90 %
```
## 🧩 Future Scope (Post-MVP Vision)

```
DRL-based pricing (Shield-SAC)
Hyperlocal prediction (ConvLSTM)
Smartphone sensor crowdsourcing
Government integration (Bima Sugam)
Large-scale fraud graph detection
```
## 🏆 Why We Win

```
✅ Fully aligned with problem constraints
✅ Strong AI but practical implementation
✅ Real-time parametric automation
✅ Instant payouts (key differentiator)
✅ Simple, clear, demo-ready system
✅ Emotional + scalable impact
```
## 💬 Tagline

**"Not insurance. Income protection in 3 minutes."**


