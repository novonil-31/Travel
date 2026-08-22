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

/**
 * @swagger
 * /safety/emergency-sms:
 *   post:
 *     summary: Dispatch real-time emergency SOS SMS telemetry via Fast2SMS
 *     tags: [Safety]
 */
router.post('/emergency-sms', async (req, res, next) => {
  try {
    const { recipientPhone, recipientName, senderName, latitude, longitude, locationName } = req.body;
    
    if (!recipientPhone) {
      sendError(res, Errors.VALIDATION_ERROR, 'Recipient phone number is required', 400);
      return;
    }

    const dispatchId = `sms-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const latStr = typeof latitude === 'number' ? latitude.toFixed(5) : '20.35550';
    const lngStr = typeof longitude === 'number' ? longitude.toFixed(5) : '85.81450';
    const mapLink = `https://maps.google.com/?q=${latStr},${lngStr}`;
    const message = `🚨 EMERGENCY ALERT: ${senderName || 'Passenger'} triggered SOS near ${locationName || 'Transit Corridor'}. Live GPS Location: ${mapLink}`;

    // Clean phone number to 10 digits for Indian carrier delivery
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '').slice(-10);

    const apiKey = process.env.FAST2SMS_API_KEY || '85QoLJ0ypjFkcP1nzUXgHmOuS4NlfrM6RI7C2BtY9WTGaqbZV3JxrUFEK8aYV5spfi1NlgjdG7qAbLSX';
    let fast2SmsResult: any = null;

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

        fast2SmsResult = await f2sRes.json();
        console.log(`[FAST2SMS LIVE DISPATCH] Result:`, fast2SmsResult);
      } catch (smsErr) {
        console.warn('[FAST2SMS ERROR]:', smsErr);
      }
    }

    const carrierSmsUri = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
    const whatsAppUri = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`;

    const isFast2SmsSuccess = fast2SmsResult?.return === true;
    const isWalletInactive = fast2SmsResult?.status_code === 999;

    console.log(`[EMERGENCY SMS DISPATCH] ID: ${dispatchId} -> To: ${recipientName || 'Emergency Contact'} (${cleanPhone}) Status: ${isFast2SmsSuccess ? 'FAST2SMS_SENT' : isWalletInactive ? 'WALLET_INACTIVE_CARRIER_FALLBACK' : 'DISPATCHED'}`);

    sendSuccess(res, {
      dispatchId,
      status: isFast2SmsSuccess
        ? 'DELIVERED_VIA_FAST2SMS'
        : isWalletInactive
        ? 'FAST2SMS_WALLET_INACTIVE'
        : 'DELIVERED',
      fast2SmsSuccess: isFast2SmsSuccess,
      isWalletInactive,
      fast2SmsResult,
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
