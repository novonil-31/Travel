import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/db.js';
import { scoreRoute, defaultProfile, PROFILE_PRESETS } from '../src/engines/accessibility.scorer.js';

let authToken = '';
let adminToken = '';
let userId = '';
let journeyId = '';
let safetySessionId = '';

beforeAll(async () => {
  await prisma.report.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('1. Health & Discovery Endpoints', () => {
  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('GET /stops/nearby returns stops with distance and accessibility tags', async () => {
    const res = await request(app)
      .get('/stops/nearby')
      .query({ lat: 20.3533, lng: 85.8164, radius: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('distanceM');
    expect(res.body.data[0]).toHaveProperty('accessibility');
    expect(res.body.data[0].accessibility).toHaveProperty('wheelchairBoarding');
  });

  it('GET /routes/search returns active routes', async () => {
    const res = await request(app).get('/routes/search').query({ q: '11' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].shortName).toContain('11');
  });
});

describe('2. Authentication & User Profile', () => {
  const testEmail = `test_${Date.now()}@access.org`;

  it('POST /auth/register creates user and returns JWT', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Integration Test User',
      email: testEmail,
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    authToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  it('POST /auth/login validates credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: testEmail,
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('POST /auth/login for Admin user', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'admin@access.org',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
    adminToken = res.body.data.token;
  });

  it('GET /auth/me returns profile info', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(userId);
  });

  it('PUT /profile updates accessibility preferences', async () => {
    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        profile: {
          mobility: 'WHEELCHAIR',
          requiresWheelchair: true,
          stairs: 'AVOID',
          walkingToleranceM: 300,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.mobility).toBe('WHEELCHAIR');
  });
});

describe('3. Core Accessibility Scoring Engine Unit Tests', () => {
  it('Penalizes inaccessible vehicles for wheelchair personas', () => {
    const profile = {
      ...defaultProfile(),
      ...PROFILE_PRESETS.WHEELCHAIR,
    };

    const inaccessibleBus = {
      wheelchairAccessible: false,
      hasRamp: false,
      hasLowFloor: false,
      hasAudioAnnouncements: false,
      hasVisualDisplay: false,
      stopHasRamp: true,
      stopHasLift: false,
      stopHasStairs: false,
      stopHasLighting: true,
      stopWheelchairBoarding: 1,
      walkingDistanceM: 100,
      hasStairsInPath: false,
      isNightRoute: false,
      stopHasShelter: true,
      crowdingLevel: 'LOW' as const,
      crowdingScore: 0.2,
      reliability: 0.9,
      delayMinutes: 0,
      fareEstimateINR: 15,
      travelTimeMinutes: 15,
    };

    const accessibleBus = {
      ...inaccessibleBus,
      wheelchairAccessible: true,
      hasRamp: true,
      hasLowFloor: true,
      travelTimeMinutes: 18,
    };

    const scoreInacc = scoreRoute(profile as any, inaccessibleBus);
    const scoreAcc = scoreRoute(profile as any, accessibleBus);

    expect(scoreAcc.overallScore).toBeGreaterThan(scoreInacc.overallScore);
    expect(scoreInacc.warnings).toContain('Vehicle is NOT wheelchair accessible');
  });
});

describe('4. Journey Planning & Hackathon Demo Scenario (PART 28)', () => {
  it('POST /journeys/plan recommends Bus B over Bus A for Wheelchair User', async () => {
    const res = await request(app)
      .post('/journeys/plan')
      .send({
        origin: { lat: 20.3533, lng: 85.8164, name: 'KIIT Square' },
        destination: { lat: 20.3625, lng: 85.8241, name: 'Patia Square' },
        profileType: 'WHEELCHAIR',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.options.length).toBeGreaterThan(0);

    const topOption = res.body.data.options[0];
    expect(topOption.rank).toBe(1);
    expect(topOption.accessibility.wheelchairCompatible).toBe(true);
    expect(topOption.recommendation).toBe('RECOMMENDED');
  });

  it('POST /journeys creates and saves a planned journey', async () => {
    const res = await request(app)
      .post('/journeys')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        originLat: 20.3533,
        originLng: 85.8164,
        destinationLat: 20.3625,
        destinationLng: 85.8241,
        originName: 'KIIT Campus',
        destinationName: 'Patia Square',
        durationMinutes: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    journeyId = res.body.data.id;
  });
});

describe('5. Safety Session Lifecycle', () => {
  it('POST /journeys/:id/start starts journey and initiates safety session', async () => {
    const res = await request(app)
      .post(`/journeys/${journeyId}/start`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.journey.status).toBe('ACTIVE');
    expect(res.body.data.safetySession.status).toBe('ACTIVE');
    safetySessionId = res.body.data.safetySession.id;
  });

  it('POST /safety/heartbeat updates check-in time', async () => {
    const res = await request(app)
      .post('/safety/heartbeat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ sessionId: safetySessionId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.lastHeartbeatAt).not.toBeNull();
  });

  it('POST /safety/complete safely resolves journey', async () => {
    const res = await request(app)
      .post('/safety/complete')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ sessionId: safetySessionId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SAFE');
  });
});

describe('6. Crowding & Feedback Engine', () => {
  it('GET /crowding/route/:id returns estimate with provenance', async () => {
    const routes = await prisma.route.findMany({ take: 1 });
    const res = await request(app).get(`/crowding/route/${routes[0].id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('level');
    expect(res.body.data).toHaveProperty('source');
    expect(res.body.data).toHaveProperty('confidence');
    expect(res.body.data).toHaveProperty('status');
  });

  it('POST /feedback/crowding records user observation', async () => {
    const routes = await prisma.route.findMany({ take: 1 });
    const res = await request(app)
      .post('/feedback/crowding')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        routeId: routes[0].id,
        level: 'LOW',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('7. Fares & Shared Transport', () => {
  it('GET /fares/estimate returns exact or range with source provenance', async () => {
    const routes = await prisma.route.findMany({ take: 1 });
    const res = await request(app)
      .get('/fares/estimate')
      .query({ routeId: routes[0].id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('currency', 'INR');
    expect(res.body.data).toHaveProperty('confidence');
  });

  it('GET /transport/stands/nearby returns auto stands with live availability disclosure', async () => {
    const res = await request(app)
      .get('/transport/stands/nearby')
      .query({ lat: 20.3540, lng: 85.8168, radius: 1500 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].liveAvailability.status).toBe('unavailable');
  });

  it('GET /transport/corridors/nearby returns known shared corridors', async () => {
    const res = await request(app)
      .get('/transport/corridors/nearby')
      .query({ lat: 20.3540, lng: 85.8168 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('8. Reports & Deduplication', () => {
  it('POST /reports/crowding creates report and flags rapid duplicate', async () => {
    const routes = await prisma.route.findMany({ take: 1 });
    const testRouteId = routes[0].id;

    const res1 = await request(app)
      .post('/reports/crowding')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ routeId: testRouteId, level: 'HIGH', comment: 'Initial report' });

    expect(res1.status).toBe(201);
    expect(res1.body.data.isDuplicate).toBe(false);

    // Rapid duplicate within 10 minutes by same user on same route
    const res2 = await request(app)
      .post('/reports/crowding')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ routeId: testRouteId, level: 'HIGH', comment: 'Duplicate report' });

    expect(res2.status).toBe(201);
    expect(res2.body.data.isDuplicate).toBe(true);
  });
});

describe('9. Admin Operations & ML Recomputation', () => {
  it('GET /admin/sources lists central data source registry', async () => {
    const res = await request(app)
      .get('/admin/sources')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /admin/ml/train triggers baseline prediction recomputation', async () => {
    const res = await request(app)
      .post('/admin/ml/train')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('updated');
  });
});
