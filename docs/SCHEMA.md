# ACCESS — Full System Architecture & Data Schema Specification
### Accessible Public Transport Assistant

> **Not the fastest route. The BEST route for YOU.**

---

## 1. System Overview Architecture

```text
+----------------------------------------------------------------------------------------------------+
|                                      CLIENT LAYER (FRONTEND)                                       |
|                                                                                                    |
|   +---------------------------------------+       +--------------------------------------------+   |
|   |         PASSENGER EXPERIENCE          |       |            OPERATOR EXPERIENCE             |   |
|   |  - Mobile Bottom Nav (Touch-first)    |       |  - Desktop Multi-column Command Center     |   |
|   |  - Route Discovery & Radial Scoring   |       |  - Real-time Telemetry & Recharts Engine   |   |
|   |  - Live Turn-by-Turn Journey View     |       |  - Route Condition & Delay Publisher       |   |
|   |  - Proactive Safety Heartbeat         |       |  - Passenger Report Triage Queue           |   |
|   +---------------------------------------+       +--------------------------------------------+   |
|                                       \               /                                            |
|                                    React 19 + TypeScript + Vite                                    |
|                                    Tailwind CSS + React Leaflet                                    |
|                                    Zustand / Reactive Store Layer                                  |
+----------------------------------------------------------------------------------------------------+
                                                |
                                    REST API / WebSocket JSON
                                                |
+----------------------------------------------------------------------------------------------------+
|                                    BACKEND ENGINE (NODE / FASTIFY / EXPRESS)                       |
|                                                                                                    |
|   +--------------------------+  +--------------------------+  +--------------------------------+   |
|   |     SAFETY CHECK-IN      |  |  ACCESSIBILITY SCORING   |  |     TRANSPORT REPORTING        |   |
|   |         SERVICE          |  |         ENGINE           |  |           SERVICE            |   |
|   |  - Heartbeat Watchdog    |  |  - Profile Weight Matrix |  |  - Crowding Aggregation        |   |
|   |  - Overdue Escalation    |  |  - Trade-off Computor    |  |  - Operator Alert Dispatch     |   |
|   |  - Emergency SMS / Call  |  |  - Real-time Re-ranking  |  |  - Anomaly Detection           |   |
|   +--------------------------+  +--------------------------+  +--------------------------------+   |
|                                                |                                                   |
|   +--------------------------------------------+-----------------------------------------------+   |
|   |                           MODULAR INTEGRATION ADAPTER BUS                                  |   |
|   |    [Map Service]  |  [Crowding ML]  |  [Notification Push]  |  [Voice UI]  |  [Offline DB] |   |
|   +--------------------------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------------------------+
                                                |
                                    Prisma ORM / Connection Pool
                                                |
+----------------------------------------------------------------------------------------------------+
|                                DATABASE LAYER (POSTGRESQL + POSTGIS)                               |
|                                                                                                    |
|   [users] 1---1 [accessibility_profiles]           [routes] 1---* [route_stops] *---1 [stops]      |
|     |                                                 |                                            |
|     +---* [emergency_contacts]                        +---* [vehicles]                             |
|     |                                                 |                                            |
|     +---* [journeys] 1---* [journey_segments]         +---1 [transport_conditions]                 |
|             |                                                 |                                    |
|             +---1 [safety_sessions]                           +---* [reports]                      |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Database Schema (PostgreSQL + PostGIS / Prisma Definition)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  PASSENGER
  OPERATOR
  ADMIN
}

enum MobilityType {
  WHEELCHAIR
  WALKING_DIFFICULTY
  ELDERLY
  NONE
}

enum StairsPreference {
  AVOID
  ACCEPTABLE
}

enum WalkingTolerance {
  MINIMAL
  LOW
  MODERATE
  HIGH
}

enum CrowdingPreference {
  AVOID
  LOW_PREFERENCE
  ACCEPTABLE
}

enum VisionType {
  LOW_VISION
  NORMAL
}

enum HearingType {
  HEARING_ASSISTANCE
  NORMAL
}

enum CrowdingLevel {
  LOW
  MEDIUM
  HIGH
}

enum AccessibilityStatus {
  AVAILABLE
  LIMITED
  UNAVAILABLE
}

enum VehicleStatusType {
  ACTIVE
  DELAYED
  OUT_OF_SERVICE
}

enum JourneyStatus {
  PLANNED
  ACTIVE
  COMPLETED
  CANCELLED
}

enum SafetyStatus {
  NOT_STARTED
  ACTIVE
  CHECK_IN_DUE
  OVERDUE
  SAFE
  EMERGENCY
  COMPLETED
}

enum ReportType {
  CROWDING
  DELAY
  ACCESSIBILITY
}

enum ReportStatus {
  NEW
  REVIEWED
  RESOLVED
}

enum SegmentType {
  WALK
  BOARD
  RIDE
  TRANSFER
  ALIGHT
}

enum VehicleType {
  BUS
  SHARED_TRANSPORT
  CAMPUS_VEHICLE
}

// ---------------- USER & ACCESSIBILITY ----------------

model User {
  id                String                 @id @default(uuid())
  email             String?                @unique
  name              String
  avatar            String?
  role              Role                   @default(PASSENGER)
  profile           AccessibilityProfile?
  emergencyContacts EmergencyContact[]
  journeys          Journey[]
  reports           Report[]
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt

  @@map("users")
}

model AccessibilityProfile {
  id                String             @id @default(uuid())
  userId            String             @unique
  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  mobility          MobilityType       @default(NONE)
  stairs            StairsPreference   @default(ACCEPTABLE)
  walkingTolerance  WalkingTolerance   @default(MODERATE)
  crowding          CrowdingPreference @default(ACCEPTABLE)
  vision            VisionType         @default(NORMAL)
  hearing           HearingType        @default(NORMAL)
  safetyPreferences String[]           // ["late-night", "prefer-safer", "safety-sensitive"]
  updatedAt         DateTime           @updatedAt

  @@map("accessibility_profiles")
}

model EmergencyContact {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  phone        String
  relationship String
  isPrimary    Boolean  @default(true)
  createdAt    DateTime @default(now())

  @@map("emergency_contacts")
}

// ---------------- TRANSIT NETWORK ----------------

model Stop {
  id          String      @id @default(uuid())
  name        String
  latitude    Float
  longitude   Float
  accessible  Boolean     @default(true)
  hasRamp     Boolean     @default(false)
  hasStairs   Boolean     @default(false)
  hasLighting Boolean     @default(true)
  sheltered   Boolean     @default(false)
  routeStops  RouteStop[]
  createdAt   DateTime    @default(now())

  @@map("stops")
}

model Route {
  id          String               @id
  name        String
  shortName   String
  vehicleType VehicleType          @default(BUS)
  color       String               @default("#059669")
  description String?
  active      Boolean              @default(true)
  stops       RouteStop[]
  vehicles    Vehicle[]
  condition   TransportCondition?
  reports     Report[]
  journeys    Journey[]
  createdAt   DateTime             @default(now())

  @@map("routes")
}

model RouteStop {
  id              String   @id @default(uuid())
  routeId         String
  route           Route    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  stopId          String
  stop            Stop     @relation(fields: [stopId], references: [id], onDelete: Cascade)
  order           Int
  arrivalOffset   Int      // in minutes from route start
  departureOffset Int

  @@unique([routeId, stopId, order])
  @@map("route_stops")
}

model Vehicle {
  id            String            @id @default(uuid())
  routeId       String
  route         Route             @relation(fields: [routeId], references: [id])
  name          String
  type          VehicleType
  capacity      Int
  accessible    Boolean           @default(true)
  hasRamp       Boolean           @default(false)
  hasLowFloor   Boolean           @default(false)
  status        VehicleStatusType @default(ACTIVE)
  currentStopId String?
  latitude      Float?
  longitude     Float?
  updatedAt     DateTime          @updatedAt

  @@map("vehicles")
}

// ---------------- REALTIME CONDITIONS ----------------

model TransportCondition {
  id            String              @id @default(uuid())
  routeId       String              @unique
  route         Route               @relation(fields: [routeId], references: [id], onDelete: Cascade)
  delay         Int                 @default(0) // in minutes
  crowding      CrowdingLevel       @default(LOW)
  accessibility AccessibilityStatus @default(AVAILABLE)
  vehicleStatus VehicleStatusType   @default(ACTIVE)
  updatedAt     DateTime            @updatedAt

  @@map("transport_conditions")
}

// ---------------- JOURNEY & SAFETY ----------------

model Journey {
  id                  String           @id @default(uuid())
  userId              String
  user                User             @relation(fields: [userId], references: [id])
  routeId             String
  route               Route            @relation(fields: [routeId], references: [id])
  originId            String
  destinationId       String
  originName          String
  destinationName     String
  routeName           String
  status              JourneyStatus    @default(PLANNED)
  startedAt           DateTime?
  completedAt         DateTime?
  eta                 DateTime?
  durationMinutes     Int
  accessibilityScore  Int
  safetyScore         Int
  reliabilityScore    Int
  comfortScore        Int
  overallScore        Int
  currentSegmentIndex Int              @default(0)
  currentStopId       String?
  delayMinutes        Int              @default(0)
  crowding            CrowdingLevel    @default(LOW)
  segments            JourneySegment[]
  safetySession       SafetySession?
  createdAt           DateTime         @default(now())

  @@map("journeys")
}

model JourneySegment {
  id          String      @id @default(uuid())
  journeyId   String
  journey     Journey     @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  type        SegmentType
  fromName    String
  toName      String
  fromId      String?
  toId        String?
  distance    Float?      // in meters
  duration    Int         // in minutes
  routeId     String?
  routeName   String?
  vehicleType VehicleType?
  accessible  Boolean     @default(true)
  stairs      Int         @default(0)
  crowding    CrowdingLevel?
  notes       String?
  order       Int

  @@map("journey_segments")
}

model SafetySession {
  id                       String       @id @default(uuid())
  journeyId                String       @unique
  journey                  Journey      @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  status                   SafetyStatus @default(NOT_STARTED)
  startedAt                DateTime     @default(now())
  lastCheckIn              DateTime?
  nextCheckInDue           DateTime?
  checkInIntervalMinutes   Int          @default(10)
  emergencyContactNotified Boolean      @default(false)
  updatedAt                DateTime     @updatedAt

  @@map("safety_sessions")
}

// ---------------- REPORTING & ALERTS ----------------

model Report {
  id                 String        @id @default(uuid())
  userId             String?
  user               User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  routeId            String
  route              Route         @relation(fields: [routeId], references: [id])
  routeName          String
  reportedBy         String        @default("Anonymous")
  type               ReportType
  crowding           CrowdingLevel?
  delayMinutes       Int?
  accessibilityIssue String?
  comment            String?
  status             ReportStatus  @default(NEW)
  createdAt          DateTime      @default(now())

  @@map("reports")
}

model Notification {
  id          String    @id @default(uuid())
  userId      String?
  type        String    // journey, delay, crowding, accessibility, safety, system, route-update
  title       String
  message     String
  read        Boolean   @default(false)
  routeId     String?
  journeyId   String?
  actionUrl   String?
  actionLabel String?
  createdAt   DateTime  @default(now())

  @@map("notifications")
}
```

---

## 3. Backend API Contract Specification (OpenAPI 3.0 / REST)

### Base URL: `/api/v1`

| Method | Endpoint | Description | Request Body | Response Body |
|---|---|---|---|---|
| `POST` | `/routes/search` | Dynamic multi-criteria route evaluation | `{ origin: string, destination: string, profile?: AccessibilityProfile }` | `{ results: RouteSearchResult[] }` |
| `GET` | `/routes/:id` | Get route details, stops & telemetry | — | `{ route: Route, condition: TransportCondition }` |
| `POST` | `/journeys/start` | Initialize a passenger trip & safety session | `{ routeId: string, origin: string, destination: string }` | `{ journey: Journey, safetySession: SafetySession }` |
| `POST` | `/journeys/:id/complete` | Conclude trip and log feedback | `{ rating?: string, feedback?: string }` | `{ success: boolean, journey: Journey }` |
| `POST` | `/checkin/start` | Start proactive safety monitoring | `{ journeyId: string, intervalMinutes?: number }` | `{ session: SafetySession }` |
| `POST` | `/checkin/heartbeat`| Register passenger safety confirmation | `{ sessionId: string }` | `{ session: SafetySession, status: "SAFE" }` |
| `POST` | `/checkin/emergency`| Escalate to emergency contact / service | `{ sessionId: string, location?: GeoCoords }` | `{ session: SafetySession, notified: true }` |
| `POST` | `/reports/crowding` | Submit crowd level update | `{ routeId: string, level: CrowdingLevel, comment?: string }`| `{ report: Report }` |
| `POST` | `/reports/delay` | Submit passenger delay observation | `{ routeId: string, delayMinutes: number }` | `{ report: Report }` |
| `POST` | `/reports/accessibility`| Report barrier/lift/ramp failure | `{ routeId: string, issue: string }` | `{ report: Report }` |
| `PUT` | `/operator/routes/:id/conditions` | Publish operator dispatch conditions | `{ delay: number, crowding: CrowdingLevel, accessibility: AccessibilityStatus }` | `{ condition: TransportCondition, affectedJourneys: number }` |

---

## 4. Frontend State & Component Mapping

```text
[Global Store: AppState]
 ├── currentUser & accessibilityProfile  ===> ProfilePage, TopBar Badge Indicator
 ├── searchResults & scores              ===> RouteDiscoveryPage (RadialScore, ReasonList, LeafletMap)
 ├── activeJourney & safetySession       ===> ActiveJourneyPage (Heartbeat, OverdueModal, EmergencyModal)
 ├── transportConditions                 ===> HomePage, OperatorRoutesPage, LiveNotifications
 ├── reports & operatorAlerts            ===> OperatorReportsPage, Passenger Feedback Drawer
 └── accessibilitySettings               ===> HighContrast, LargerText, ReducedMotion
```

---

## 5. HACQUIRE Integration Adapter Interfaces

```typescript
export interface CrowdingProvider {
  predict(routeId: string): Promise<{ predicted: CrowdingLevel; confidence: number; estimatedLevel: string }>;
}

export interface SafetyCheckInProvider {
  startSession(journeyId: string): Promise<SafetySession>;
  heartbeat(sessionId: string): Promise<SafetySession>;
  triggerEmergency(sessionId: string): Promise<SafetySession>;
  completeSession(sessionId: string): Promise<SafetySession>;
}

export interface AccessibilityEvaluationProvider {
  evaluateRoute(profile: AccessibilityProfile, route: Route): Promise<{ score: number; factors: string[]; recommendation: string }>;
}
```
