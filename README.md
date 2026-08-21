मार्ग Darshan — Accessible Public Transport Assistant

Your journey. Your accessibility. Your safety.

मार्ग Darshan — Navigate with accessibility, safety and confidence.

HACQUIRE 2026 — PS-05: Accessible Public Transport Assistant

Overview

**मार्ग Darshan is an accessibility-first public transport assistant designed to help passengers find safer, more accessible and more reliable journeys using buses, shared transport and campus vehicles.

Instead of simply selecting the shortest or fastest route, मार्ग Darshan considers the individual passenger's requirements and current transport conditions.

Core idea

Not the fastest route. The BEST route for YOU.

The system is designed for passengers including:

Wheelchair users

Elderly passengers

People with mobility difficulties

People who need to avoid stairs

People with visual or hearing accessibility requirements

Passengers who prefer low crowding

People travelling during late hours

Key Features

♿ Accessibility-Aware Route Planning

मार्ग Darshan evaluates routes using passenger-specific requirements such as:

Wheelchair compatibility

Step-free boarding

Ramp availability

Low-floor vehicles

Stair avoidance

Walking-distance tolerance

Transfer burden

Vehicle accessibility

Stop accessibility

Crowding preferences

Safety preferences

Routes receive explainable scores rather than only a generic shortest-path ranking.

🛡️ Safety Check-in

The journey safety system provides:

Journey-linked safety sessions

Periodic check-ins / heartbeat

Check-in deadlines

Overdue detection

Safety notifications

Emergency escalation

Emergency-contact workflow

Journey completion

Safety lifecycle:

START JOURNEY
      ↓
SAFETY ACTIVE
      ↓
HEARTBEAT / I'M SAFE
      ↓
CHECK-IN DUE
      ↓
OVERDUE
      ↓
EMERGENCY ESCALATION
      ↓
JOURNEY COMPLETE

🚌 Live Transport Conditions

मार्ग Darshan supports transport-condition information including:

Crowding

Delays

Vehicle status

Accessibility status

Passenger reports

Route-condition updates

The crowding system can use available observations, stored predictions and historical information. When reliable information is unavailable, the system can represent the condition as unknown rather than fabricating a value.

📢 Passenger Reporting

Passengers can report:

High/low crowding

Delays

Accessibility problems

Vehicle accessibility issues

Other transport conditions

Reports can feed back into the transport-condition workflow and operator dashboard.

🖥️ Operator Dashboard

Operators can monitor and update:

Routes

Vehicles

Delays

Crowding

Accessibility status

Passenger reports

Operational alerts

Changes to transport conditions can be reflected on the passenger side and used for route recommendation updates.

🔔 Notifications

The application supports notifications for:

Route changes

Delays

Crowding

Accessibility changes

Safety check-ins

Safety escalation

Passenger reports

Journey events

System Architecture

                         मार्ग Darshan
                           │
              ┌────────────┴────────────┐
              │                         │
         PASSENGER                 OPERATOR
              │                         │
       ┌──────┼──────┐           ┌──────┼──────┐
       │      │      │           │      │      │
    Profile  Trip  Journey    Routes Vehicles Reports
       │      │      │           │      │      │
       └──────┴──────┴───────────┴──────┴──────┘
                           │
                       API LAYER
                           │
             ┌─────────────┼─────────────┐
             │             │             │
       Accessibility     Safety       Transport
          Engine         Engine       Conditions
             │             │             │
             └─────────────┼─────────────┘
                           │
                        Database

Core Backend Engines

Accessibility Scorer

backend/src/engines/accessibility.scorer.ts

Responsible for evaluating route suitability based on passenger requirements and route characteristics.

Safety Engine

backend/src/engines/safety.engine.ts

Responsible for safety sessions, heartbeat monitoring, overdue detection and emergency escalation.

Crowding Engine

backend/src/engines/crowding.engine.ts

Responsible for resolving available crowding information and producing transport-condition data.

Journey Planner

backend/src/engines/journey.planner.ts

Responsible for journey and route-planning logic.

API Routes

Important backend route areas include:

backend/src/routes/
├── accessibility.router.ts
├── safety.router.ts
├── crowding.router.ts
├── reports.router.ts
└── transport.router.ts

The frontend communicates with the backend through the application's API layer.

Technology Stack

Frontend

React

Vite

TypeScript

Tailwind CSS

React Router

Leaflet / OpenStreetMap-compatible mapping

Lucide icons

Backend

Node.js

Express

TypeScript

REST APIs

Database

Prisma ORM

SQLite / PostgreSQL-compatible architecture

Authentication

JWT-based authentication

Project Structure

The project is organized broadly as:

Travel/
│
├── backend/
│   ├── src/
│   │   ├── engines/
│   │   │   ├── accessibility.scorer.ts
│   │   │   ├── safety.engine.ts
│   │   │   ├── crowding.engine.ts
│   │   │   └── journey.planner.ts
│   │   │
│   │   └── routes/
│   │       ├── accessibility.router.ts
│   │       ├── safety.router.ts
│   │       ├── crowding.router.ts
│   │       ├── reports.router.ts
│   │       └── transport.router.ts
│   │
│   └── ...
│
├── src/
│   ├── components/
│   ├── modules/
│   ├── pages/
│   ├── api/
│   └── ...
│
├── prisma/
│
├── public/
│
├── package.json
├── package-lock.json
├── vite.config.ts
└── README.md

The exact structure may evolve as the application is developed.

Getting Started

Prerequisites

Install:

Node.js

npm

Git

Verify:

node --version
npm --version
git --version

Installation

Clone the repository:

git clone https://github.com/novonil-31/Travel.git

Enter the project:

cd Travel

Install frontend dependencies:

npm install

If the backend has its own package configuration, enter the backend directory and install its dependencies:

cd backend
npm install

Environment Variables

Create the required environment files from the project's example configuration where available.

Do not commit secrets, API keys or passwords.

Typical frontend configuration may use:

VITE_API_BASE_URL=http://localhost:3000

Use the actual API port/configuration defined by the current backend configuration.

Database

The project uses Prisma for database access.

Use the Prisma commands defined by the current project configuration to:

Generate the Prisma client.

Apply database migrations/schema.

Seed development/demo data where a seed script is provided.

Typical commands are:

npx prisma generate

and, depending on the configured workflow:

npx prisma migrate dev

Do not run destructive database commands against production data.

Running the Application

Frontend

From the frontend project directory:

npm run dev

Vite will provide a local development URL, normally similar to:

http://localhost:5173

Backend

From the backend directory:

npm run dev

Use the port defined by the backend configuration.

The frontend's API base URL must point to the running backend.

Main User Journey

The intended product flow is:

Accessibility Profile
        ↓
Origin + Destination
        ↓
Route Discovery
        ↓
Accessibility Evaluation
        ↓
Route Ranking
        ↓
BEST ROUTE FOR YOU
        ↓
Start Journey
        ↓
Safety Check-in
        ↓
Live Transport Conditions
        ↓
Route Recalculation
        ↓
Notifications
        ↓
Passenger Reporting
        ↓
Journey Completion

Demonstration Scenario

A key demonstration scenario is a wheelchair passenger travelling from the KIIT/campus area toward Patia.

Passenger Profile

Wheelchair user
Avoid stairs
Low walking
Avoid crowds
Safety-sensitive journey

Journey

Campus Gate → Patia

मार्ग Darshan displays multiple routes and evaluates them using accessibility, safety, reliability and transport-condition factors.

The recommended route should explain why it was selected, for example:

✓ No stairs
✓ Accessible vehicle
✓ Low walking distance
✓ Low crowding
✓ High safety

The demonstration can then simulate a live condition change such as:

C2
Delay: +8 minutes
Crowding: HIGH

The passenger can receive an update and the route-ranking system can reconsider the available alternatives.

Accessibility Scoring

The accessibility engine is designed to produce multiple dimensions of route evaluation, including:

Accessibility

Safety

Crowding

Reliability

Time

Cost

Overall suitability

The result should be explainable.

Instead of only:

Route C3 — Score 92

मार्ग Darshan should communicate:

Recommended for you because:

✓ No stairs
✓ Accessible vehicle
✓ Low walking distance
✓ Lower crowding

This explainability is a central part of the product.

Safety Architecture

A safety session is linked to the passenger's journey.

The system can track:

ACTIVE
OVERDUE
SAFE
EMERGENCY
COMPLETED

Heartbeat/check-in events keep the session active.

If a check-in becomes overdue, the system can create a safety notification and escalate according to the configured safety workflow.

Transport Condition Architecture

Transport conditions can originate from multiple sources.

Conceptually:

Recent User Reports
        ↓
Stored Prediction
        ↓
Historical Baseline
        ↓
Unknown

The system should preserve information about the source and confidence of a condition where supported.

This prevents the application from presenting unsupported transport information as fact.

HACQUIRE 2026

मार्ग Darshan is being developed for:

HACQUIRE 2026

Problem Statement: PS-05 — Accessible Public Transport Assistant

The product is designed around the event's requirement for a functional transport-accessibility solution with modular software capabilities.

The project also supports separable capabilities intended for the HACQUIRE trading-floor model.

Planned/identified modular capabilities include:

CLUELESSAccessibilityEngine

Accessibility-aware route evaluation.

CLUELESSSafetyCheckin

Journey safety monitoring and escalation.

CLUELESSTransportCondition

Crowding, delay and accessibility-condition intelligence.

These modules must be separately packaged and documented before being represented as standalone tradable assets.

Team

CLUELESS

Team ID: HA-095-6558

Team Leader: Novonil Dhar Choudhury

Designated Trader: Aashish Raj

Trader Phone: 90564 59388

Repository

Main repository:

https://github.com/novonil-31/Travel

Development Principles

The project follows these principles:

Accessibility before shortest-path optimization.

Explainable recommendations rather than opaque scores.

Real transport conditions should influence route decisions.

Safety is part of the journey lifecycle.

Passenger reports should feed operational intelligence.

Modules should have clean interfaces where they are intended to be separated.

The application should degrade gracefully when live information is unavailable.

Do not fabricate real-time information.

Keep secrets and API credentials out of source control.

Prioritize a stable, demonstrable end-to-end product.

Status

मार्ग Darshan is an active hackathon project under development.

The final implementation, API contracts, database schema, deployment configuration and module packaging may continue to evolve during development.

For the most current implementation details, refer to the source code and project documentation in the repository.

License

Add the project's intended license here before public production use.
