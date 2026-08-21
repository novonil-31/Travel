/**
 * ACCESS — Profile Router
 * GET /profile
 * PUT /profile
 * POST /profile/emergency-contacts
 * DELETE /profile/emergency-contacts/:id
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';

const router = Router();

router.use(requireAuth);

const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profile: z.object({
    mobility: z.enum(['WHEELCHAIR', 'WALKING_DIFFICULTY', 'ELDERLY', 'VISUALLY_IMPAIRED', 'HEARING_IMPAIRED', 'NONE']).optional(),
    stairs: z.enum(['AVOID', 'ACCEPTABLE']).optional(),
    walkingToleranceM: z.number().min(50).max(2000).optional(),
    crowdingPref: z.enum(['AVOID', 'LOW_PREFERENCE', 'ACCEPTABLE']).optional(),
    safetyPref: z.enum(['NIGHT_SAFE_ONLY', 'WELL_LIT_ONLY', 'PREFER_BUSY_STOPS', 'NONE']).optional(),
    requiresWheelchair: z.boolean().optional(),
    requiresLowFloor: z.boolean().optional(),
    requiresAudioAids: z.boolean().optional(),
    requiresVisualAids: z.boolean().optional(),
    nightTravelOk: z.boolean().optional(),
    weightAccessibility: z.number().min(0).max(1).optional(),
    weightSafety: z.number().min(0).max(1).optional(),
    weightCrowding: z.number().min(0).max(1).optional(),
    weightReliability: z.number().min(0).max(1).optional(),
    weightTime: z.number().min(0).max(1).optional(),
    weightCost: z.number().min(0).max(1).optional(),
  }).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, phoneNumber: true, role: true, avatar: true,
        profile: true,
        emergencyContacts: {
          select: { id: true, name: true, phone: true, relationship: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        },
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

router.put('/', async (req, res, next) => {
  try {
    const body = ProfileUpdateSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.profile && {
          profile: {
            upsert: {
              create: body.profile,
              update: body.profile,
            },
          },
        }),
      },
      select: {
        id: true, name: true, email: true, profile: true,
      },
    });

    sendSuccess(res, user);
  } catch (e) {
    next(e);
  }
});

const ContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/),
  relationship: z.string().min(1),
  isPrimary: z.boolean().default(false),
});

router.post('/emergency-contacts', async (req, res, next) => {
  try {
    const body = ContactSchema.parse(req.body);

    const contact = await prisma.emergencyContact.create({
      data: { ...body, userId: req.user!.userId },
    });

    sendSuccess(res, contact, 201);
  } catch (e) {
    next(e);
  }
});

router.delete('/emergency-contacts/:id', async (req, res, next) => {
  try {
    await prisma.emergencyContact.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    sendSuccess(res, { message: 'Emergency contact removed' });
  } catch (e) {
    next(e);
  }
});

export default router;
