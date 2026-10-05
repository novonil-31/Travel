/**
 * ACCESS — Safety Router
 * POST /safety/start
 * POST /safety/heartbeat
 * POST /safety/complete
 * POST /safety/emergency
 * GET  /safety/:id
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  startSafetySession,
  recordHeartbeat,
  completeSafetySession,
  triggerEmergency,
} from '../engines/safety.engine.js';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';

const router = Router();

// Selective auth - emergency-sms is public to guarantee immediate lifesaving dispatch
const authenticatedRouter = Router();
authenticatedRouter.use(requireAuth);

const StartSchema = z.object({
  journeyId: z.string().uuid(),
  expectedArrivalAt: z.string().datetime(),
  heartbeatIntervalMinutes: z.number().min(1).max(60).optional(),
});

/**
 * @swagger
 * /safety/start:
 *   post:
 *     summary: Start a safety monitoring session
 *     tags: [Safety]
 */
router.post('/start', requireAuth, async (req, res, next) => {
  try {
    const body = StartSchema.parse(req.body);

    const session = await startSafetySession({
      journeyId: body.journeyId,
      userId: req.user!.userId,
      expectedArrivalAt: new Date(body.expectedArrivalAt),
      heartbeatIntervalMinutes: body.heartbeatIntervalMinutes,
    });

    sendSuccess(res, session, 201);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /safety/heartbeat:
 *   post:
 *     summary: Check in (I am safe)
 *     tags: [Safety]
 */
router.post('/heartbeat', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);

    const result = await recordHeartbeat(sessionId);
    if (!result) {
      sendError(res, Errors.NOT_FOUND, 'Safety session not found', 404);
      return;
    }

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /safety/complete:
 *   post:
 *     summary: Mark journey as completed safely
 *     tags: [Safety]
 */
router.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);

    const result = await completeSafetySession(sessionId);
    if (!result) {
      sendError(res, Errors.NOT_FOUND, 'Safety session not found', 404);
      return;
    }

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /safety/emergency:
 *   post:
 *     summary: Manually trigger emergency (SOS)
 *     tags: [Safety]
 */
router.post('/emergency', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);

    const result = await triggerEmergency(sessionId);
    if (!result) {
      sendError(res, Errors.NOT_FOUND, 'Safety session not found', 404);
      return;
    }

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

const EmergencySmsSchema = z.object({
  recipientPhone: z.string().min(6).max(20),
  recipientName: z.string().max(100).optional(),
  senderName: z.string().max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  locationName: z.string().max(200).optional(),
});

/**
 * @swagger
 * /safety/emergency-sms:
 *   post:
 *     summary: Dispatch real-time emergency SOS SMS telemetry via Fast2SMS
 *     tags: [Safety]
 */
router.post('/emergency-sms', async (req, res, next) => {
  try {
    const body = EmergencySmsSchema.parse(req.body);
    const { recipientPhone, recipientName, senderName, latitude, longitude, locationName } = body;

    const dispatchId = `sms-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const latStr = typeof latitude === 'number' ? latitude.toFixed(5) : '20.35550';
    const lngStr = typeof longitude === 'number' ? longitude.toFixed(5) : '85.81450';
    const mapLink = `https://maps.google.com/?q=${latStr},${lngStr}`;
    const message = `🚨 EMERGENCY ALERT: ${senderName || 'Passenger'} triggered SOS near ${locationName || 'Transit Corridor'}. Live GPS Location: ${mapLink}`;

    // Clean phone number to 10 digits for Indian carrier delivery
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '').slice(-10);

    const apiKey = process.env.FAST2SMS_API_KEY;
    let fast2SmsSent = false;
    let isWalletInactive = false;

    if (apiKey && cleanPhone.length === 10) {
      try {
        const f2sRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q', // Quick SMS Route
            message: message,
            language: 'english',
            flash: 0,
            numbers: cleanPhone,
          }),
        });

        const fast2SmsResult: any = await f2sRes.json();
        fast2SmsSent = fast2SmsResult?.return === true;
        isWalletInactive = fast2SmsResult?.status_code === 999;
      } catch (smsErr) {
        // Safe logging without leaking sensitive keys
        console.warn('[FAST2SMS ERROR]: Outbound dispatch failed');
      }
    }

    const carrierSmsUri = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
    const whatsAppUri = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`;

    sendSuccess(res, {
      dispatchId,
      status: fast2SmsSent
        ? 'DELIVERED_VIA_FAST2SMS'
        : isWalletInactive
        ? 'FAST2SMS_WALLET_INACTIVE'
        : 'CARRIER_SMS_READY',
      fast2SmsSuccess: fast2SmsSent,
      isWalletInactive,
      recipientPhone: cleanPhone,
      recipientName: recipientName || 'Emergency Contact',
      message,
      mapLink,
      carrierSmsUri,
      whatsAppUri,
      coordinates: [parseFloat(latStr), parseFloat(lngStr)],
      timestamp,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
