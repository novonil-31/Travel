/**
 * ACCESS — Carpools & Shared Rides Router
 * Supports multi-account real-time carpooling between commuters
 */

import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';
import { requireAuth, type AuthPayload } from '../middleware/auth.middleware.js';

const router = Router();

export interface ServerCarpoolRide {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  role: 'driver' | 'passenger_split';
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  hostName: string;
  hostPhone?: string;
  hostRating: number;
  hostRidesCount: number;
  hostVerification: string;
  vehicleType: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  originName: string;
  originCoords: [number, number];
  destinationName: string;
  destinationCoords: [number, number];
  scheduledDepartureTime: string;
  departureMinutesAway: number;
  availableSeats: number;
  totalSeats: number;
  routeCorridor: string;
  meetingTime: string;
  optimalMeetingPoint: {
    name: string;
    distanceMeters: number;
    walkingMinutes: number;
    landmark: string;
    coordinates: [number, number];
  };
  farePerSeat: number;
  originalSoloFare: number;
  savingsPercent: number;
  hasRampOrBootSpace: boolean;
  notes?: string;
  createdAt: string;
  expiresAt: string;
  matchedUserId?: string;
  matchedWith?: string;
  matchedPhone?: string;
  matchedVehicle?: string;
  matchedAt?: string;
}

// Memory cap to completely prevent Heap Out-Of-Memory DoS
const MAX_ACTIVE_CARPOOLS = 200;

// In-memory persistent registry (persists as long as server runs)
let activeCarpools: ServerCarpoolRide[] = [];

// Helper: Prune expired rides (> 45 min)
function pruneExpired() {
  const now = Date.now();
  activeCarpools = activeCarpools.filter((r) => {
    if (r.status === 'cancelled') return false;
    const expTime = new Date(r.expiresAt).getTime();
    return expTime > now;
  });

  // If capped, evict oldest entries
  if (activeCarpools.length > MAX_ACTIVE_CARPOOLS) {
    activeCarpools = activeCarpools.slice(0, MAX_ACTIVE_CARPOOLS);
  }
}

// Extract optional user identity from token with strict algorithm pinning
function getAuthenticatedUser(req: any): AuthPayload | null {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as AuthPayload;
  } catch {
    return null;
  }
}

const CarpoolCreateSchema = z.object({
  role: z.enum(['driver', 'passenger_split']).default('passenger_split'),
  hostName: z.string().max(100).optional(),
  hostPhone: z.string().max(25).optional(),
  vehicleType: z.string().max(100).optional(),
  vehicleModel: z.string().max(100).optional(),
  vehiclePlate: z.string().max(30).optional(),
  originName: z.string().min(1).max(200),
  originCoords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  destinationName: z.string().min(1).max(200),
  destinationCoords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  scheduledDepartureTime: z.string().max(50).optional(),
  departTime: z.string().max(50).optional(),
  departureMinutesAway: z.number().min(0).max(1440).optional(),
  availableSeats: z.number().min(1).max(10).optional(),
  totalSeats: z.number().min(1).max(10).optional(),
  routeCorridor: z.string().max(250).optional(),
  meetingTime: z.string().max(50).optional(),
  optimalMeetingPoint: z.object({
    name: z.string().max(150),
    distanceMeters: z.number().min(0).max(50000),
    walkingMinutes: z.number().min(0).max(300),
    landmark: z.string().max(200),
    coordinates: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  }).optional(),
  farePerSeat: z.number().min(0).max(50000).optional(),
  originalSoloFare: z.number().min(0).max(50000).optional(),
  savingsPercent: z.number().min(0).max(100).optional(),
  hasRampOrBootSpace: z.boolean().optional(),
  notes: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /carpools
 * Retrieve active carpool requests with privacy masking
 */
router.get('/', (req, res) => {
  pruneExpired();
  const user = getAuthenticatedUser(req);

  // Mask private contact details unless user is creator or matched participant
  const sanitized = activeCarpools.map((r) => {
    const isOwner = !!(user && (user.userId === r.userId || user.role === 'ADMIN'));
    const isMatched = !!(user && user.userId === r.matchedUserId);

    if (isOwner || isMatched) {
      return r;
    }

    return {
      ...r,
      hostPhone: r.hostPhone
        ? r.hostPhone.replace(/(\+?\d{1,4}\s?)(\d{2})\d+(\d{2})/, '$1$2******$3')
        : undefined,
      matchedPhone: undefined,
      userEmail: undefined,
    };
  });

  sendSuccess(res, sanitized);
});

/**
 * POST /carpools
 * Register a new carpool broadcast (Requires Authentication)
 */
router.post('/', requireAuth, (req, res, next) => {
  try {
    pruneExpired();
    const body = CarpoolCreateSchema.parse(req.body);

    // Enforce server-generated unguessable ID to prevent ID spoofing / overwriting
    const newId = `pool-req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = body.expiresAt || new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const creatorId = req.user!.userId;

    const newRide: ServerCarpoolRide = {
      id: newId,
      userId: creatorId,
      userEmail: req.user!.email,
      userName: body.hostName || 'Commuter',
      role: body.role,
      status: 'pending',
      hostName: body.hostName || 'Commuter',
      hostPhone: body.hostPhone || '+91 98612 00000',
      hostRating: 5.0,
      hostRidesCount: 1,
      hostVerification: 'Registered Commuter',
      vehicleType: body.vehicleType || (body.role === 'driver' ? 'Car (Sedan/Hatchback)' : 'Shared Auto / Cab Split'),
      vehicleModel: body.vehicleModel,
      vehiclePlate: body.vehiclePlate,
      originName: body.originName,
      originCoords: body.originCoords,
      destinationName: body.destinationName,
      destinationCoords: body.destinationCoords,
      scheduledDepartureTime: body.scheduledDepartureTime || body.departTime || '09:30 AM',
      departureMinutesAway: body.departureMinutesAway || 5,
      availableSeats: body.availableSeats || 3,
      totalSeats: body.totalSeats || 4,
      routeCorridor: body.routeCorridor || `${body.originName} ↔ ${body.destinationName}`,
      meetingTime: body.meetingTime || body.departTime || '09:35 AM',
      optimalMeetingPoint: body.optimalMeetingPoint || {
        name: `${body.originName} Pickup Point`,
        distanceMeters: 40,
        walkingMinutes: 1,
        landmark: 'Designated step-free commuter curb',
        coordinates: body.originCoords,
      },
      farePerSeat: body.farePerSeat || 35,
      originalSoloFare: body.originalSoloFare || 120,
      savingsPercent: body.savingsPercent || 70,
      hasRampOrBootSpace: !!body.hasRampOrBootSpace,
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    activeCarpools = [newRide, ...activeCarpools].slice(0, MAX_ACTIVE_CARPOOLS);
    sendSuccess(res, newRide, 201);
  } catch (e) {
    next(e);
  }
});

const CarpoolAcceptSchema = z.object({
  partnerName: z.string().max(100).optional(),
  partnerPhone: z.string().max(25).optional(),
  partnerVehicle: z.string().max(100).optional(),
});

/**
 * POST /carpools/:id/accept
 * Accept / match a carpool request (Requires Authentication)
 */
router.post('/:id/accept', requireAuth, (req, res, next) => {
  try {
    pruneExpired();
    const { id } = req.params;
    const body = CarpoolAcceptSchema.parse(req.body);

    const ride = activeCarpools.find((r) => r.id === id);
    if (!ride) {
      sendError(res, Errors.NOT_FOUND, 'Carpool ride not found or expired', 404);
      return;
    }

    if (ride.userId === req.user!.userId) {
      sendError(res, Errors.CONFLICT, 'You cannot match with your own carpool request', 400);
      return;
    }

    if (ride.status === 'matched') {
      sendError(res, Errors.CONFLICT, 'Carpool ride has already been matched', 409);
      return;
    }

    ride.status = 'matched';
    ride.matchedUserId = req.user!.userId;
    ride.matchedWith = body.partnerName || req.user!.email || 'Verified Co-Rider';
    ride.matchedPhone = body.partnerPhone || '+91 98612 00000';
    ride.matchedVehicle = body.partnerVehicle;
    ride.matchedAt = new Date().toISOString();

    sendSuccess(res, ride);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /carpools/:id
 * Cancel a carpool request (Requires Authentication & Ownership)
 */
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const ride = activeCarpools.find((r) => r.id === id);

  if (!ride) {
    sendError(res, Errors.NOT_FOUND, 'Carpool ride not found or already cancelled', 404);
    return;
  }

  if (req.user!.role !== 'ADMIN' && ride.userId !== req.user!.userId) {
    sendError(res, Errors.FORBIDDEN, 'You do not have permission to cancel this carpool request', 403);
    return;
  }

  activeCarpools = activeCarpools.filter((r) => r.id !== id);
  sendSuccess(res, { cancelled: true, id });
});

export default router;
