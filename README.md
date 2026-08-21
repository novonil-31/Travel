# ACCESS — Accessible Public Transport Assistant Backend

> **Not the fastest route. The BEST route for YOU.**  
> *Your journey. Your accessibility. Your safety.*

ACCESS is a production-grade backend service designed to empower passengers with disabilities, elderly commuters, night travelers, and crowd-sensitive passengers to plan safer and more accessible journeys across buses, campus shuttles, and shared transport.

---

## 🏗️ Architecture & Highlights

- **Explainable Multi-Criteria Planning**: Ranks routes by accessibility compatibility, stairs avoidance, walking tolerance, lighting/safety, crowding, and reliability rather than purely travel time.
- **Never Fabricate Data**: Every dynamic response carries source provenance (`source`, `confidence`, `observedAt`, `dataStatus`). If data is unavailable, it explicitly returns `status: "unknown"` with confidence metrics.
- **Dynamic Data Freshness**: Classifies real-time telemetry into `fresh` (<2m), `stale` (2-10m), or `expired` (>10m).
- **Proactive Safety Lifecycles**: Journey check-in heartbeats, ETA-driven overdue scanners, automated multi-stage escalations, and emergency alerts.
- **Closed-Loop Feedback & Crowding Baseline**: User post-trip feedback directly feeds into the statistical hourly baseline models without requiring opaque ML cold-starts.
- **Shared Transport & Stands**: Discovery of auto/taxi stands and known corridors with honest live-availability disclosures.
- **Deploy Anywhere**: Runs locally via SQLite / Prisma, scales to PostgreSQL/PostGIS, and deploys directly to Vercel Serverless.

---

## 🚀 Quick Start (Backend)

### 1. Install & Setup Database

```bash
cd backend
npm install
npx prisma db push
npm run db:seed
```

### 2. Run Automated Test Suite

```bash
npm run test
```

All 22 integration tests will execute against live database fixtures.

### 3. Run Development Server

```bash
npm run dev
```

- API Server: `http://localhost:3000`
- Interactive Swagger API Documentation: `http://localhost:3000/docs`
- Health Check: `http://localhost:3000/health`

---

## 🧪 Demo Scenario: KIIT to Patia (Wheelchair Commuter)

**Scenario**:
- Commuter Aarav has a **Wheelchair profile** (requires ramp, step-free boarding, avoids stairs, max 300m walking).
- Origin: **KIIT Square** (`20.3533, 85.8164`)
- Destination: **Patia Square** (`20.3625, 85.8241`)

**API Call**:
```bash
curl -X POST http://localhost:3000/api/journeys/plan \
  -H "Content-Type: application/json" \
  -d '{
    "origin": { "lat": 20.3533, "lng": 85.8164, "name": "KIIT Square" },
    "destination": { "lat": 20.3625, "lng": 85.8241, "name": "Patia Square" },
    "profileType": "WHEELCHAIR"
  }'
```

**ACCESS Decision**:
- **Bus A (Route 10)**: Arrives in 5 minutes, but ramp is reported broken and crowding is high.
- **Bus B (Route 11A)**: Arrives in 8 minutes, but has an operational ramp, low-floor boarding, and low crowding.
- **ACCESS Recommendation**: Recommends **Bus B (Rank #1)** with clear trade-off explanation:
  > *"Recommended because: Wheelchair ramp available, Low-floor bus (step-free), Predicted low crowding, Stop supports wheelchair boarding."*

---

## 🌐 API Overview

| Area | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/health` | Service health status |
| **Docs** | `GET` | `/docs` | OpenAPI / Swagger interactive UI |
| **Auth** | `POST` | `/api/auth/register` | Register new user & issue JWT |
| **Auth** | `POST` | `/api/auth/login` | Login with email/phone |
| **Profile** | `GET/PUT`| `/api/profile` | Manage accessibility preferences |
| **Stops** | `GET` | `/api/stops/nearby` | Find stops within radius (Haversine) |
| **Routes** | `GET` | `/api/routes/search` | Search transit routes |
| **Journeys**| `POST` | `/api/journeys/plan` | Core journey planning engine |
| **Journeys**| `POST` | `/api/journeys/:id/start` | Start journey & safety monitor |
| **Safety** | `POST` | `/api/safety/heartbeat` | Check-in / I am safe |
| **Safety** | `POST` | `/api/safety/emergency` | Trigger emergency escalation |
| **Crowding**| `GET` | `/api/crowding/route/:id` | Crowding estimate with provenance |
| **Fares** | `GET` | `/api/fares/estimate` | Exact or estimated fare range |
| **Shared** | `GET` | `/api/transport/stands/nearby` | Nearby auto/taxi stands |
| **Reports** | `POST` | `/api/reports/crowding` | Submit crowding report (deduped) |
| **Feedback**| `POST` | `/api/feedback/crowding` | Post-trip crowding feedback |
| **Admin** | `GET` | `/api/admin/sources` | Central Data Source registry |
| **Admin** | `POST` | `/api/admin/ml/train` | Trigger ML baseline recalculation |

---

## ☁️ Deployment (Vercel & Docker)

### Vercel Serverless
The backend contains `backend/api/index.ts` and `vercel.json` configured for serverless execution.
Simply connect the repository to Vercel and provide the environment variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`).

---

## 📄 Documentation Reference

- **Authoritative Progress Checkpoint**: [`PROJECT_STATE.md`](./PROJECT_STATE.md)
- **Engineer Handoff Guide**: [`HANDOFF.md`](./HANDOFF.md)
