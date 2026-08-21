/**
 * ACCESS — Authentication Router
 * POST /auth/register
 * POST /auth/login
 * GET  /auth/me
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { issueToken, requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phoneNumber: z.string().regex(/^\+?[0-9]{7,15}$/).optional(),
  password: z.string().min(8),
}).refine((d) => d.email || d.phoneNumber, {
  message: 'Either email or phone number is required',
});

const LoginSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  password: z.string(),
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

    // Check existing
    if (body.email) {
      const exists = await prisma.user.findUnique({ where: { email: body.email } });
      if (exists) {
        sendError(res, Errors.CONFLICT, 'Email already registered', 409);
        return;
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phoneNumber: body.phoneNumber,
        passwordHash,
        role: 'PASSENGER',
        profile: {
          create: {
            // Defaults — user can update later
          },
        },
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = issueToken({ userId: user.id, email: user.email ?? undefined, role: user.role });

    sendSuccess(res, { user, token }, 201);
  } catch (e) {
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
      where: body.email ? { email: body.email } : { phoneNumber: body.phoneNumber },
    });

    if (!user || !user.passwordHash) {
      sendError(res, Errors.UNAUTHORIZED, 'Invalid credentials', 401);
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      sendError(res, Errors.UNAUTHORIZED, 'Invalid credentials', 401);
      return;
    }

    const token = issueToken({ userId: user.id, email: user.email ?? undefined, role: user.role });

    sendSuccess(res, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (e) {
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
