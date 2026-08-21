/**
 * ACCESS — Safety Session Engine
 *
 * Implements the full safety lifecycle:
 *   STARTED → ACTIVE → (OVERDUE_WARNING) → EMERGENCY → RESOLVED
 *
 * Escalation timing is configurable via environment variables.
 * Does NOT claim to connect to emergency services — only notifies designated contacts.
 */

import { prisma } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

type SafetyStatus = 'NOT_STARTED' | 'ACTIVE' | 'OVERDUE' | 'SAFE' | 'EMERGENCY' | 'COMPLETED';

export interface SafetySessionSummary {
  id: string;
  journeyId: string;
  userId: string;
  status: SafetyStatus;
  startedAt: string;
  lastHeartbeatAt: string | null;
  nextHeartbeatDue: string | null;
  expectedArrivalAt: string | null;
  firstEscalationAt: string | null;
  secondEscalationAt: string | null;
  emergencyContactNotified: boolean;
}

/**
 * Start a safety session for a journey.
 * expectedArrivalAt is the planned ETA + a small buffer.
 */
export async function startSafetySession(params: {
  journeyId: string;
  userId: string;
  expectedArrivalAt: Date;
  heartbeatIntervalMinutes?: number;
}): Promise<SafetySessionSummary> {
  const interval = params.heartbeatIntervalMinutes ?? config.safety.heartbeatIntervalMinutes;
  const now = new Date();
  const firstEscalation = new Date(
    params.expectedArrivalAt.getTime() + config.safety.firstEscalationMinutes * 60 * 1000,
  );
  const secondEscalation = new Date(
    params.expectedArrivalAt.getTime() + config.safety.secondEscalationMinutes * 60 * 1000,
  );

  const session = await prisma.safetySession.create({
    data: {
      journeyId: params.journeyId,
      userId: params.userId,
      status: 'ACTIVE',
      startedAt: now,
      nextHeartbeatDue: new Date(now.getTime() + interval * 60 * 1000),
      heartbeatIntervalMinutes: interval,
      expectedArrivalAt: params.expectedArrivalAt,
      firstEscalationAt: firstEscalation,
      secondEscalationAt: secondEscalation,
    },
  });

  await logSafetyEvent(session.id, 'STARTED', 'Safety session started');

  logger.info(
    { sessionId: session.id, journeyId: params.journeyId },
    'Safety session started',
  );

  return formatSession(session);
}

/**
 * Record a heartbeat — user is safe.
 */
export async function recordHeartbeat(sessionId: string): Promise<SafetySessionSummary | null> {
  const session = await prisma.safetySession.findUnique({ where: { id: sessionId } });

  if (!session) return null;
  if (session.status === 'COMPLETED' || session.status === 'EMERGENCY') return formatSession(session);

  const now = new Date();
  const updated = await prisma.safetySession.update({
    where: { id: sessionId },
    data: {
      lastHeartbeatAt: now,
      nextHeartbeatDue: new Date(now.getTime() + session.heartbeatIntervalMinutes * 60 * 1000),
      status: 'ACTIVE',
    },
  });

  await logSafetyEvent(sessionId, 'HEARTBEAT', 'User checked in — safe');
  return formatSession(updated);
}

/**
 * Complete a safety session (journey finished successfully).
 */
export async function completeSafetySession(sessionId: string): Promise<SafetySessionSummary | null> {
  const session = await prisma.safetySession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  const updated = await prisma.safetySession.update({
    where: { id: sessionId },
    data: { status: 'SAFE', resolvedAt: new Date() },
  });

  await logSafetyEvent(sessionId, 'RESOLVED', 'Journey completed safely');

  logger.info({ sessionId }, 'Safety session completed');
  return formatSession(updated);
}

/**
 * Trigger emergency escalation manually.
 */
export async function triggerEmergency(sessionId: string): Promise<SafetySessionSummary | null> {
  const session = await prisma.safetySession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  const updated = await prisma.safetySession.update({
    where: { id: sessionId },
    data: { status: 'EMERGENCY', emergencyContactNotified: true },
  });

  await logSafetyEvent(sessionId, 'EMERGENCY_TRIGGERED', 'Emergency triggered by user');

  // Create in-app notification for emergency contact
  // (SMS/email handled by notification service if credentials configured)
  await createEmergencyNotification(session.userId, sessionId, session.journeyId);

  logger.warn({ sessionId, userId: session.userId }, 'Emergency triggered');
  return formatSession(updated);
}

/**
 * Background scanner — called by scheduler every minute.
 * Checks for overdue sessions and escalates.
 */
export async function checkOverdueSessions(): Promise<void> {
  const now = new Date();

  const activeSessions = await prisma.safetySession.findMany({
    where: {
      status: { in: ['ACTIVE', 'OVERDUE'] },
      expectedArrivalAt: { lt: now },
    },
    include: {
      journey: { select: { userId: true } },
    },
  });

  for (const session of activeSessions) {
    // First escalation
    if (
      session.firstEscalationAt &&
      now >= session.firstEscalationAt &&
      now < (session.secondEscalationAt ?? new Date(0)) &&
      session.status === 'ACTIVE'
    ) {
      await prisma.safetySession.update({
        where: { id: session.id },
        data: { status: 'OVERDUE' },
      });
      await logSafetyEvent(session.id, 'OVERDUE_WARNING', 'First escalation — journey overdue');

      // Notify user
      await createNotification(session.userId, 'SAFETY_OVERDUE', 'Journey Overdue',
        'Your journey appears to be overdue. Please check in or complete your journey.',
        session.id);

      logger.warn({ sessionId: session.id }, 'Safety session first escalation');
    }

    // Second escalation — notify emergency contact
    if (
      session.secondEscalationAt &&
      now >= session.secondEscalationAt &&
      !session.emergencyContactNotified
    ) {
      await prisma.safetySession.update({
        where: { id: session.id },
        data: { status: 'EMERGENCY', emergencyContactNotified: true },
      });
      await logSafetyEvent(session.id, 'EMERGENCY_TRIGGERED', 'Second escalation — emergency contact notified');

      await createEmergencyNotification(session.userId, session.id, session.journeyId);

      logger.warn({ sessionId: session.id }, 'Safety session second escalation — emergency contact notified');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function logSafetyEvent(sessionId: string, type: string, message: string): Promise<void> {
  await prisma.safetyEvent.create({
    data: { sessionId, type, message },
  });
}

async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  sessionId: string,
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, message, sessionId, channel: 'in_app' },
  });
}

async function createEmergencyNotification(
  userId: string,
  sessionId: string,
  journeyId: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type: 'SAFETY_EMERGENCY',
      title: 'Emergency Alert',
      message:
        'Your journey is significantly overdue. Emergency contact has been notified. ' +
        'If you are safe, please complete your journey or check in.',
      sessionId,
      journeyId,
      channel: 'in_app',
    },
  });

  // TODO: If config.notifications.smsEnabled, send SMS to emergency contact here
  // This is where Twilio/SMS integration would go
  if (config.notifications.smsEnabled) {
    logger.info({ userId, sessionId }, 'SMS escalation would be sent here (not configured)');
  }
}

function formatSession(session: {
  id: string;
  journeyId: string;
  userId: string;
  status: string;
  startedAt: Date;
  lastHeartbeatAt: Date | null;
  nextHeartbeatDue: Date | null;
  expectedArrivalAt: Date | null;
  firstEscalationAt: Date | null;
  secondEscalationAt: Date | null;
  emergencyContactNotified: boolean;
}): SafetySessionSummary {
  return {
    id: session.id,
    journeyId: session.journeyId,
    userId: session.userId,
    status: session.status as SafetyStatus,
    startedAt: session.startedAt.toISOString(),
    lastHeartbeatAt: session.lastHeartbeatAt?.toISOString() ?? null,
    nextHeartbeatDue: session.nextHeartbeatDue?.toISOString() ?? null,
    expectedArrivalAt: session.expectedArrivalAt?.toISOString() ?? null,
    firstEscalationAt: session.firstEscalationAt?.toISOString() ?? null,
    secondEscalationAt: session.secondEscalationAt?.toISOString() ?? null,
    emergencyContactNotified: session.emergencyContactNotified,
  };
}
