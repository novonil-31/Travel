/**
 * ACCESS — Authentication Router
 * POST /auth/register
 * POST /auth/login
 * GET  /auth/me
 * PUT  /auth/emergency-contact
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { issueToken, requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email address required').optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((d) => (d.email && d.email.length > 0) || (d.phoneNumber && d.phoneNumber.length > 0), {
  message: 'Either a valid email or phone number is required',
});

const LoginSchema = z.object({
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((d) => (d.email && d.email.length > 0) || (d.phoneNumber && d.phoneNumber.length > 0), {
  message: 'Either email or phone number is required to sign in',
});

const EmergencyContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(6, 'Valid emergency phone number is required'),
  relationship: z.string().optional(),
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);

    // Check existing email
    if (body.email && body.email.length > 0) {
      const exists = await prisma.user.findUnique({ where: { email: body.email } });
      if (exists) {
        sendError(res, Errors.CONFLICT, 'Email address already registered. Please sign in.', 409);
        return;
      }
    }

    // Check existing phone
    if (body.phoneNumber && body.phoneNumber.length > 0) {
      const existsPhone = await prisma.user.findFirst({ where: { phoneNumber: body.phoneNumber } });
      if (existsPhone) {
        sendError(res, Errors.CONFLICT, 'Phone number already registered. Please sign in.', 409);
        return;
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email || null,
        phoneNumber: body.phoneNumber || null,
        passwordHash,
        role: 'PASSENGER',
        profile: {
          create: {
            mobility: 'WHEELCHAIR',
            stairs: 'AVOID',
            walkingTolerance: 'LOW',
            crowding: 'AVOID',
            vision: 'NORMAL',
            hearing: 'NORMAL',
          },
        },
      },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true, createdAt: true },
    });

    const token = issueToken({ userId: user.id, email: user.email ?? undefined, role: user.role });

    sendSuccess(res, { user, token }, 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      sendError(res, Errors.VALIDATION_ERROR, e.errors[0]?.message || 'Validation failed', 400);
      return;
    }
    next(e);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive JWT
 *     tags: [Auth]
 */
router.post('/login', async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: body.email
        ? { email: body.email }
        : { phoneNumber: body.phoneNumber },
      include: {
        emergencyContacts: { where: { isPrimary: true }, take: 1 },
      },
    });

    if (!user || !user.passwordHash) {
      sendError(res, Errors.UNAUTHORIZED, 'Invalid credentials. User not found.', 401);
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      sendError(res, Errors.UNAUTHORIZED, 'Incorrect password. Please try again.', 401);
      return;
    }

    const token = issueToken({ userId: user.id, email: user.email ?? undefined, role: user.role });

    const primaryContact = user.emergencyContacts?.[0];

    sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        emergencyContact: primaryContact
          ? { name: primaryContact.name, phone: primaryContact.phone, relationship: primaryContact.relationship }
          : undefined,
      },
      token,
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      sendError(res, Errors.VALIDATION_ERROR, e.errors[0]?.message || 'Validation failed', 400);
      return;
    }
    next(e);
  }
});

/**
 * @swagger
 * /auth/emergency-contact:
 *   put:
 *     summary: Update or save user emergency contact
 *     tags: [Auth]
 */
router.put('/emergency-contact', requireAuth, async (req, res, next) => {
  try {
    const body = EmergencyContactSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if primary contact exists
    const existing = await prisma.emergencyContact.findFirst({
      where: { userId, isPrimary: true },
    });

    let savedContact;
    if (existing) {
      savedContact = await prisma.emergencyContact.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          phone: body.phone,
          relationship: body.relationship || 'Family',
        },
      });
    } else {
      savedContact = await prisma.emergencyContact.create({
        data: {
          userId,
          name: body.name,
          phone: body.phone,
          relationship: body.relationship || 'Family',
          isPrimary: true,
        },
      });
    }

    sendSuccess(res, {
      emergencyContact: {
        id: savedContact.id,
        name: savedContact.name,
        phone: savedContact.phone,
        relationship: savedContact.relationship,
      },
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      sendError(res, Errors.VALIDATION_ERROR, e.errors[0]?.message || 'Validation failed', 400);
      return;
    }
    next(e);
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, phoneNumber: true, role: true,
        profile: true,
        emergencyContacts: { select: { id: true, name: true, phone: true, relationship: true, isPrimary: true } },
        createdAt: true,
      },
    });

    if (!user) {
      sendError(res, Errors.NOT_FOUND, 'User not found', 404);
      return;
    }

    sendSuccess(res, user);
  } catch (e) {
    next(e);
  }
});

export default router;
