import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('Security Hardening & Boundary Defense Verification', () => {
  it('prevents user enumeration: returns uniform error message for non-existent and wrong password', async () => {
    // 1. Non-existent user
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent-user-xyz@example.com', password: 'password123' });

    expect(res1.status).toBe(401);
    expect(res1.body.success).toBe(false);
    expect(res1.body.error.message).toBe('Invalid credentials. Please check your email/phone and password.');

    // 2. Non-existent phone
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ phoneNumber: '9999999999', password: 'password123' });

    expect(res2.status).toBe(401);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.message).toBe('Invalid credentials. Please check your email/phone and password.');
  });

  it('bounds password length: rejects oversized passwords preventing bcrypt CPU exhaustion', async () => {
    const hugePassword = 'a'.repeat(200);
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attacker',
        email: 'attacker@example.com',
        password: hugePassword,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('safely handles non-numeric NaN query limits without throwing 500 error', async () => {
    const res = await request(app).get('/api/stops?limit=NaN');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('validates coordinate boundaries on /transport/route-geometry', async () => {
    const res = await request(app).get(
      '/api/transport/route-geometry?start_lat=999&start_lng=10&end_lat=20&end_lng=85'
    );
    expect(res.status).toBe(422); // Zod validation failure, gracefully handled
    expect(res.body.success).toBe(false);
  });

  it('requires authentication on emergency-sms and leaks no secrets', async () => {
    const { issueToken } = await import('../src/middleware/auth.middleware.js');
    const token = issueToken({ userId: 'sms-tester-1', role: 'PASSENGER' });

    // 1. Unauthenticated request is blocked
    const unauthRes = await request(app)
      .post('/api/safety/emergency-sms')
      .send({
        recipientPhone: '9861200000',
        senderName: 'Attacker',
        locationName: 'Campus Gate',
      });
    expect(unauthRes.status).toBe(401);

    // 2. Authenticated request succeeds safely
    const res = await request(app)
      .post('/api/safety/emergency-sms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipientPhone: '9861200000',
        senderName: 'Test Commuter',
        locationName: 'Campus Gate',
        latitude: 20.355,
        longitude: 85.814,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recipientPhone).toBe('9861200000');
    // Ensure fast2SmsResult (wallet balance / API errors) is NOT leaked to clients
    expect(res.body.data.fast2SmsResult).toBeUndefined();
  });

  it('validates coordinate boundaries on /vehicles/nearby', async () => {
    const res = await request(app).get('/api/vehicles/nearby?lat=999&lng=85');
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('prevents BOLA / IDOR on safety sessions: unauthorized user cannot complete other users sessions', async () => {
    const { issueToken } = await import('../src/middleware/auth.middleware.js');
    const { prisma } = await import('../src/db.js');

    const userA = await prisma.user.upsert({
      where: { email: 'sec_usera@test.com' },
      update: {},
      create: {
        name: 'User A',
        email: 'sec_usera@test.com',
        role: 'PASSENGER',
      },
    });

    const userB = await prisma.user.upsert({
      where: { email: 'sec_userb@test.com' },
      update: {},
      create: {
        name: 'User B',
        email: 'sec_userb@test.com',
        role: 'PASSENGER',
      },
    });

    const tokenA = issueToken({ userId: userA.id, role: 'PASSENGER' });
    const tokenB = issueToken({ userId: userB.id, role: 'PASSENGER' });

    const journey = await prisma.journey.create({
      data: {
        userId: userA.id,
        originLat: 20.35,
        originLng: 85.81,
        destinationLat: 20.36,
        destinationLng: 85.82,
        originName: 'Station A',
        destinationName: 'Station B',
        durationMinutes: 25,
      },
    });

    const session = await prisma.safetySession.create({
      data: {
        userId: userA.id,
        journeyId: journey.id,
        expectedArrivalAt: new Date(Date.now() + 25 * 60 * 1000),
      },
    });

    // User B attempts to complete User A's session -> must be 403 Forbidden
    const resBComplete = await request(app)
      .post('/api/safety/complete')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ sessionId: session.id });

    expect(resBComplete.status).toBe(403);
    expect(resBComplete.body.success).toBe(false);

    // User B attempts to trigger emergency on User A's session -> must be 403 Forbidden
    const resBEmergency = await request(app)
      .post('/api/safety/emergency')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ sessionId: session.id });

    expect(resBEmergency.status).toBe(403);
    expect(resBEmergency.body.success).toBe(false);

    // User A completes their own session -> succeeds
    const resAComplete = await request(app)
      .post('/api/safety/complete')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sessionId: session.id });

    expect(resAComplete.status).toBe(200);
    expect(resAComplete.body.success).toBe(true);

    // Clean up
    await prisma.safetySession.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.journey.delete({ where: { id: journey.id } }).catch(() => {});
  });

  it('sanitizes HTML tags from user comments in reports to prevent stored XSS', async () => {
    const { issueToken } = await import('../src/middleware/auth.middleware.js');
    const { prisma } = await import('../src/db.js');

    const testUser = await prisma.user.findFirst();
    const token = issueToken({ userId: testUser!.id, role: 'PASSENGER' });
    const existingRoute = await prisma.route.findFirst();
    const routeId = existingRoute ? existingRoute.id : 'ROUTE_11_DN';

    const res = await request(app)
      .post('/api/reports/crowding')
      .set('Authorization', `Bearer ${token}`)
      .send({
        routeId,
        level: 'HIGH',
        comment: '<script>alert("xss")</script>Bus was packed',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const reportId = res.body.data.reportId;
    const reportInDb = await prisma.report.findUnique({ where: { id: reportId } });
    expect(reportInDb?.comment).toBe('alert("xss")Bus was packed');
    expect(reportInDb?.comment).not.toContain('<script>');
  });

  it('rejects tampered or forged JWT tokens with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiIxMjMifQ.');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('enforces strict authentication, ownership, and privacy masking on carpools', async () => {
    const { issueToken } = await import('../src/middleware/auth.middleware.js');
    const tokenA = issueToken({ userId: 'carpool-user-a', email: 'owner@access.org', role: 'PASSENGER' });
    const tokenB = issueToken({ userId: 'carpool-user-b', email: 'rider@access.org', role: 'PASSENGER' });

    // 1. Unauthenticated creation is blocked
    const unauthCreate = await request(app).post('/api/carpools').send({
      originName: 'KIIT Campus 6',
      originCoords: [20.35, 85.81],
      destinationName: 'Bhubaneswar Station',
      destinationCoords: [20.26, 85.84],
    });
    expect(unauthCreate.status).toBe(401);

    // 2. Authenticated user A creates a carpool
    const createRes = await request(app)
      .post('/api/carpools')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hostName: 'Alice Commuter',
        hostPhone: '+91 98612 12345',
        originName: 'KIIT Campus 6',
        originCoords: [20.35, 85.81],
        destinationName: 'Bhubaneswar Station',
        destinationCoords: [20.26, 85.84],
      });
    expect(createRes.status).toBe(201);
    const rideId = createRes.body.data.id;
    expect(rideId).toBeDefined();

    // 3. Public GET /api/carpools masks phone and hides email
    const publicList = await request(app).get('/api/carpools');
    expect(publicList.status).toBe(200);
    const listedRide = publicList.body.data.find((r: any) => r.id === rideId);
    expect(listedRide).toBeDefined();
    expect(listedRide.userEmail).toBeUndefined();
    expect(listedRide.hostPhone).toContain('******');

    // 4. User B cannot delete User A's carpool
    const unauthorizedDelete = await request(app)
      .delete(`/api/carpools/${rideId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(unauthorizedDelete.status).toBe(403);

    // 5. User A cannot match their own carpool
    const selfMatch = await request(app)
      .post(`/api/carpools/${rideId}/accept`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ partnerName: 'Alice' });
    expect(selfMatch.status).toBe(400);

    // 6. User B accepts User A's carpool
    const matchRes = await request(app)
      .post(`/api/carpools/${rideId}/accept`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ partnerName: 'Bob Co-Rider', partnerPhone: '+91 94370 11223' });
    expect(matchRes.status).toBe(200);
    expect(matchRes.body.data.status).toBe('matched');

    // 7. User A deletes their own carpool
    const ownerDelete = await request(app)
      .delete(`/api/carpools/${rideId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ownerDelete.status).toBe(200);
    expect(ownerDelete.body.data.cancelled).toBe(true);
  });

  it('exchanges Google ID token for valid ACCESS backend session JWT via /auth/google', async () => {
    // Generate dummy valid 3-part base64 JWT with mock Google claims
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: '10987654321',
        email: 'google_commuter@example.com',
        name: 'Google Commuter',
        picture: 'https://example.com/avatar.jpg',
      })
    ).toString('base64');
    const dummyGoogleToken = `${header}.${payload}.mockSignature`;

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: dummyGoogleToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('google_commuter@example.com');

    // Verify the returned token is a genuine ACCESS backend token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.data.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('google_commuter@example.com');
  });
});
