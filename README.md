# ACCESS — Accessible Public Transport Assistant
> **Not the fastest route. The BEST route for YOU.**  
> *Your journey. Your accessibility. Your safety.*

---

## 🌟 Overview
**ACCESS** is an accessibility-first public transport navigation and safety assistant. Unlike traditional transit apps that solely optimize for the shortest transit time, ACCESS calculates the **optimal route for each individual's mobility profile** (wheelchair, stair avoidance, low walking tolerance, crowd sensitivity, low vision, hearing assistance, and late-night travel).

---

## 📱 Features (Desktop & Mobile Optimized)

- **Explainable Route Decisions**: Transparent scoring comparing Accessibility, Safety, Reliability, and Comfort with clear trade-off explanations.
- **Proactive Safety Check-in Lifecycle**: Live heartbeat monitor with automatic overdue escalation and emergency contact alert workflows.
- **Live Transport Conditions & Recalculations**: Real-time delay and crowd level telemetry updates trigger automatic route re-ranking.
- **Closed-Loop Passenger Incident Reporting**: Passengers can report crowding and lift/ramp outages directly into the operator triage queue.
- **Operator Command Center**: Live fleet telemetry, Recharts analytics, route condition publisher, and report resolution workflow.
- **Modular Adapter Architecture**: Built for the HACQUIRE integration sprint with tradable plug-and-play modules (Safety Check-in, Evaluation Engine, Condition Reporting, Maps, Crowding ML, Push Notifications).

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Leaflet (OpenStreetMap), Recharts, Lucide React, Zustand-style Reactive Context Store.
- **Backend (Architecture & Stubs)**: Node.js, Express / Fastify, Prisma ORM, WebSockets.
- **Database (Schema)**: PostgreSQL + PostGIS with complete Prisma models.
- **Design System**: High contrast mode, large text mode, reduced motion support, responsive bottom nav for mobile & multi-column split view for desktop.

---

## 🚀 Quick Start

### 1. Install & Run Frontend
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production
```bash
npm run build
```

---

## 📚 Documentation & Schemas

- Complete System Architecture & Database Schema: [`docs/SCHEMA.md`](./docs/SCHEMA.md)
- Prisma Database Models: [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma)
- Backend Service Stubs: [`backend/src/server.ts`](./backend/src/server.ts)

---

## 🧪 Demo Scenarios

1. **Profile Setup**: Select wheelchair persona (*Aarav*).
2. **Trip Search**: Route search between *Campus Gate* and *Patia*.
3. **Smart Recommendation**: Observe Route C3 chosen over faster C2 due to zero stairs and accessible boarding.
4. **Safety Tracking**: Start journey and test the active safety check-in heartbeat.
5. **Operator Delay Injection**: Go to `/operator/routes`, set C2 delay to +8 min and crowding to HIGH, and watch passenger routes re-rank instantly.
