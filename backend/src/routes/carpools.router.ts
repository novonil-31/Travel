/**
 * ACCESS — Carpools & Shared Rides Router
 * Supports multi-account real-time carpooling between commuters
 */

import { Router } from 'express';
import { sendSuccess } from '../middleware/response.js';

const router = Router();

export interface ServerCarpoolRide {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  role: 'driver' | 'passenger_split';
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  hostName: string;
  hostPhone: string;
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
  notes: string;
  createdAt: string;
  expiresAt: string;
  matchedWith?: string;
  matchedPhone?: string;
  matchedVehicle?: string;
  matchedAt?: string;
}

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
}

/**
 * GET /carpools
 * Retrieve active carpool requests
 */
router.get('/', (_req, res) => {
  pruneExpired();
  sendSuccess(res, activeCarpools);
});

/**
 * POST /carpools
 * Register a new carpool broadcast
 */
router.post('/', (req, res) => {
  pruneExpired();
  const body = req.body;
  const newId = body.id || `pool-req-${Date.now()}`;
  const expiresAt = body.expiresAt || new Date(Date.now() + 45 * 60 * 1000).toISOString();

  const newRide: ServerCarpoolRide = {
    id: newId,
    userId: body.userId || `user-${Date.now()}`,
    userEmail: body.userEmail,
    userName: body.userName || body.hostName || 'Commuter',
    role: body.role || 'passenger_split',
    status: 'pending',
    hostName: body.hostName || body.userName || 'Commuter',
    hostPhone: body.hostPhone || '+91 98612 00000',
    hostRating: 5.0,
    hostRidesCount: 1,
    hostVerification: 'Govt ID Verified',
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

  // Replace if exists, or prepend
  activeCarpools = [newRide, ...activeCarpools.filter((r) => r.id !== newId)];
  sendSuccess(res, newRide);
});

/**
 * POST /carpools/:id/accept
 * Accept / match a carpool request
 */
router.post('/:id/accept', (req, res) => {
  pruneExpired();
  const { id } = req.params;
  const { partnerName, partnerPhone, partnerVehicle } = req.body;

  const ride = activeCarpools.find((r) => r.id === id);
  if (!ride) {
    return res.status(404).json({ success: false, error: 'Carpool ride not found or expired' });
  }

  ride.status = 'matched';
  ride.matchedWith = partnerName || 'Verified Co-Rider';
  ride.matchedPhone = partnerPhone || '+91 98612 00000';
  ride.matchedVehicle = partnerVehicle;
  ride.matchedAt = new Date().toISOString();

  sendSuccess(res, ride);
});

/**
 * DELETE /carpools/:id
 * Cancel a carpool request
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  activeCarpools = activeCarpools.filter((r) => r.id !== id);
  sendSuccess(res, { cancelled: true, id });
});

export default router;
