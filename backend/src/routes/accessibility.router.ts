/**
 * ACCESS — Accessibility Router
 * POST /accessibility/evaluate
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  scoreRoute,
  defaultProfile,
  PROFILE_PRESETS,
  type AccessibilityProfile,
  type RouteCharacteristics,
} from '../engines/accessibility.scorer.js';
import { sendSuccess } from '../middleware/response.js';

const router = Router();

const ProfileSchema = z.object({
  requiresWheelchair: z.boolean().optional(),
  requiresLowFloor: z.boolean().optional(),
  requiresAudioAids: z.boolean().optional(),
  requiresVisualAids: z.boolean().optional(),
  stairs: z.enum(['AVOID', 'ACCEPTABLE']).optional(),
  walkingToleranceM: z.number().min(50).max(3000).optional(),
  crowdingPref: z.enum(['AVOID', 'LOW_PREFERENCE', 'ACCEPTABLE']).optional(),
  safetyPref: z.enum(['NIGHT_SAFE_ONLY', 'WELL_LIT_ONLY', 'PREFER_BUSY_STOPS', 'NONE']).optional(),
  nightTravelOk: z.boolean().optional(),
  weightAccessibility: z.number().min(0).max(1).optional(),
  weightSafety: z.number().min(0).max(1).optional(),
  weightCrowding: z.number().min(0).max(1).optional(),
  weightReliability: z.number().min(0).max(1).optional(),
  weightTime: z.number().min(0).max(1).optional(),
  weightCost: z.number().min(0).max(1).optional(),
});

const EvaluateSchema = z.object({
  profileType: z.enum(['WHEELCHAIR', 'ELDERLY', 'VISUALLY_IMPAIRED', 'NIGHT_TRAVELLER', 'GENERAL']).optional(),
  customProfile: ProfileSchema.optional(),
  route: z.object({
    wheelchairAccessible: z.boolean().default(false),
    hasRamp: z.boolean().default(false),
    hasLowFloor: z.boolean().default(false),
    hasAudioAnnouncements: z.boolean().default(false),
    hasVisualDisplay: z.boolean().default(false),
    stopHasRamp: z.boolean().default(false),
    stopHasLift: z.boolean().default(false),
    stopHasStairs: z.boolean().default(false),
    stopHasLighting: z.boolean().default(true),
    stopWheelchairBoarding: z.number().min(0).max(2).default(0),
    walkingDistanceM: z.number().default(200),
    hasStairsInPath: z.boolean().default(false),
    isNightRoute: z.boolean().default(false),
    stopHasShelter: z.boolean().default(true),
    crowdingLevel: z.enum(['EMPTY', 'LOW', 'MEDIUM', 'HIGH', 'FULL', 'UNKNOWN']).default('LOW'),
    crowdingScore: z.number().nullable().default(0.2),
    reliability: z.number().default(0.8),
    delayMinutes: z.number().default(0),
    fareEstimateINR: z.number().nullable().default(20),
    travelTimeMinutes: z.number().default(25),
  }),
});

/**
 * @swagger
 * /accessibility/evaluate:
 *   post:
 *     summary: Evaluate and score a route for a specific accessibility profile
 *     tags: [Accessibility]
 */
router.post('/evaluate', (req, res, next) => {
  try {
    const body = EvaluateSchema.parse(req.body);

    const base = defaultProfile();
    const preset = body.profileType ? PROFILE_PRESETS[body.profileType] ?? {} : {};
    const mergedProfile: AccessibilityProfile = {
      ...base,
      ...preset,
      ...body.customProfile,
    };

    const evaluation = scoreRoute(mergedProfile, body.route as RouteCharacteristics);

    sendSuccess(res, {
      profileUsed: body.profileType ?? 'CUSTOM',
      evaluation,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
