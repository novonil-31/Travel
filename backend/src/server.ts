import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ACCESS Transport API', timestamp: new Date().toISOString() });
});

// =========================================================================
// 1. ROUTE DISCOVERY & EVALUATION ENGINE
// =========================================================================
app.post('/api/routes/search', async (req, res) => {
  const { origin, destination, profile } = req.body;
  // TODO: Query Prisma and compute multi-criteria accessibility score
  res.json({ message: 'Route search endpoint ready for implementation', search: { origin, destination, profile } });
});

app.get('/api/routes/:id', async (req, res) => {
  const { id } = req.params;
  // TODO: Fetch route, stops, live vehicle telemetry and current conditions
  res.json({ message: 'Route detail endpoint ready for implementation', routeId: id });
});

// =========================================================================
// 2. JOURNEY LIFECYCLE & PASSENGER TRACKING
// =========================================================================
app.post('/api/journeys/start', async (req, res) => {
  const { routeId, origin, destination } = req.body;
  // TODO: Create active Journey record and initialize SafetySession in database
  res.json({ message: 'Journey start endpoint ready', journeyId: `journey-${Date.now()}` });
});

app.post('/api/journeys/:id/complete', async (req, res) => {
  const { id } = req.params;
  // TODO: Mark journey COMPLETED, calculate trip statistics and close safety session
  res.json({ message: 'Journey completion logged', journeyId: id });
});

// =========================================================================
// 3. PROACTIVE SAFETY CHECK-IN API (MODULE 1)
// =========================================================================
app.post('/api/checkin/start', async (req, res) => {
  const { journeyId, intervalMinutes = 10 } = req.body;
  res.json({ sessionId: `safety-${Date.now()}`, journeyId, status: 'ACTIVE', nextCheckInDue: new Date(Date.now() + intervalMinutes * 60000) });
});

app.post('/api/checkin/heartbeat', async (req, res) => {
  const { sessionId } = req.body;
  res.json({ sessionId, status: 'SAFE', lastCheckIn: new Date() });
});

app.post('/api/checkin/emergency', async (req, res) => {
  const { sessionId } = req.body;
  // TODO: Dispatch simulated emergency alerts / SMS to registered emergency contact
  res.json({ sessionId, status: 'EMERGENCY', emergencyContactNotified: true });
});

// =========================================================================
// 4. TRANSPORT CONDITION & INCIDENT REPORTING (MODULE 3)
// =========================================================================
app.post('/api/reports/crowding', async (req, res) => {
  const { routeId, crowding, comment } = req.body;
  res.status(201).json({ reportId: `rpt-${Date.now()}`, routeId, crowding, comment, status: 'NEW' });
});

app.post('/api/reports/delay', async (req, res) => {
  const { routeId, delayMinutes, comment } = req.body;
  res.status(201).json({ reportId: `rpt-${Date.now()}`, routeId, delayMinutes, comment, status: 'NEW' });
});

app.post('/api/reports/accessibility', async (req, res) => {
  const { routeId, accessibilityIssue, comment } = req.body;
  res.status(201).json({ reportId: `rpt-${Date.now()}`, routeId, accessibilityIssue, comment, status: 'NEW' });
});

// =========================================================================
// 5. OPERATOR DISPATCH & TELEMETRY PUBLISHER
// =========================================================================
app.get('/api/operator/routes', async (req, res) => {
  res.json({ message: 'Operator routes telemetry list' });
});

app.put('/api/operator/routes/:id/conditions', async (req, res) => {
  const { id } = req.params;
  const { delay, crowding, accessibility, vehicleStatus } = req.body;
  // TODO: Update TransportCondition and broadcast WebSocket event to active passengers
  res.json({ routeId: id, updated: { delay, crowding, accessibility, vehicleStatus }, timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`[ACCESS Backend] Service running on http://localhost:${PORT}`);
});
