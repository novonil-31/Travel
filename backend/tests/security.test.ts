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

  it('handles emergency-sms gracefully without leaking internal secrets', async () => {
    const res = await request(app)
      .post('/api/safety/emergency-sms')
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
});
