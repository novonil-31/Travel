/**
 * ACCESS — Deterministic Database Seed
 *
 * All seed records are clearly tagged with source = "demo" or dataStatus = "CONFIRMED".
 * Implements the official hackathon demo scenario (KIIT -> Patia wheelchair selection).
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ACCESS database with verified Bhubaneswar test fixtures...');

  // 1. Data Sources
  const demoSource = await prisma.dataSource.upsert({
    where: { name: 'ACCESS Demo Data Provider' },
    update: {},
    create: {
      name: 'ACCESS Demo Data Provider',
      type: 'DEMO',
      license: 'MIT',
      attribution: 'ACCESS Hackathon Team Fixture Data',
      coverageDesc: 'Bhubaneswar Capital Region (KIIT - Patia Corridor)',
      isActive: true,
      isRealtime: false,
    },
  });

  const crutSource = await prisma.dataSource.upsert({
    where: { name: 'CRUT / Mo Bus Odisha' },
    update: {},
    create: {
      name: 'CRUT / Mo Bus Odisha',
      type: 'REST_API',
      url: 'https://crut.odisha.gov.in',
      authRequired: true,
      attribution: 'Capital Region Urban Transport, Government of Odisha',
      coverageDesc: 'Bhubaneswar, Cuttack, Puri Urban Areas',
      isActive: false, // Inactive until external credentials configured
      isRealtime: true,
      limitations: 'Official API access requires department authorization.',
    },
  });

  const osmSource = await prisma.dataSource.upsert({
    where: { name: 'OpenStreetMap Overpass API' },
    update: {},
    create: {
      name: 'OpenStreetMap Overpass API',
      type: 'REST_API',
      url: 'https://overpass-api.de/api/interpreter',
      license: 'ODbL',
      attribution: '© OpenStreetMap contributors',
      coverageDesc: 'Global geographic and accessibility tags',
      isActive: true,
    },
  });

  // 2. City
  const bhubaneswar = await prisma.city.upsert({
    where: { name: 'Bhubaneswar' },
    update: {},
    create: {
      name: 'Bhubaneswar',
      state: 'Odisha',
      country: 'IN',
      centerLat: 20.2961,
      centerLng: 85.8245,
      radiusKm: 25,
      timezone: 'Asia/Kolkata',
    },
  });

  // 3. Agency
  const agency = await prisma.agency.create({
    data: {
      cityId: bhubaneswar.id,
      name: 'CRUT - Mo Bus',
      url: 'https://crut.odisha.gov.in',
      timezone: 'Asia/Kolkata',
      sourceId: demoSource.id,
      gtfsAgencyId: 'CRUT_MOBUS',
    },
  });

  // 4. Stops (Along KIIT - Patia - Infocity Corridor)
  const stopKiit = await prisma.stop.create({
    data: {
      cityId: bhubaneswar.id,
      name: 'KIIT Square / Campus Gate',
      code: 'KIIT-01',
      latitude: 20.3533,
      longitude: 85.8164,
      wheelchairBoarding: 1, // Accessible
      hasRamp: true,
      hasLift: false,
      hasStairs: false,
      hasShelter: true,
      hasLighting: true,
      hasTactilePaving: true,
      sourceId: demoSource.id,
      confidence: 0.95,
      dataStatus: 'CONFIRMED',
    },
  });

  const stopInfocity = await prisma.stop.create({
    data: {
      cityId: bhubaneswar.id,
      name: 'Infocity Road',
      code: 'INFO-02',
      latitude: 20.3585,
      longitude: 85.8198,
      wheelchairBoarding: 1,
      hasRamp: true,
      hasStairs: false,
      hasShelter: true,
      hasLighting: true,
      sourceId: demoSource.id,
      confidence: 0.9,
      dataStatus: 'CONFIRMED',
    },
  });

  const stopPatia = await prisma.stop.create({
    data: {
      cityId: bhubaneswar.id,
      name: 'Patia Square / Big Bazaar',
      code: 'PATIA-03',
      latitude: 20.3625,
      longitude: 85.8241,
      wheelchairBoarding: 1,
      hasRamp: true,
      hasStairs: false,
      hasShelter: true,
      hasLighting: true,
      sourceId: demoSource.id,
      confidence: 0.95,
      dataStatus: 'CONFIRMED',
    },
  });

  const stopDamana = await prisma.stop.create({
    data: {
      cityId: bhubaneswar.id,
      name: 'Damana Square',
      code: 'DAM-04',
      latitude: 20.3392,
      longitude: 85.8125,
      wheelchairBoarding: 0,
      hasRamp: false,
      hasStairs: true,
      hasShelter: true,
      hasLighting: true,
      sourceId: demoSource.id,
      confidence: 0.85,
      dataStatus: 'CONFIRMED',
    },
  });

  const stopMasterCanteen = await prisma.stop.create({
    data: {
      cityId: bhubaneswar.id,
      name: 'Master Canteen Station',
      code: 'MC-05',
      latitude: 20.2644,
      longitude: 85.8398,
      wheelchairBoarding: 1,
      hasRamp: true,
      hasLift: true,
      hasStairs: true,
      hasShelter: true,
      hasLighting: true,
      sourceId: demoSource.id,
      confidence: 0.95,
      dataStatus: 'CONFIRMED',
    },
  });

  // 5. Routes
  // Route 10: Express Bus (Arrives sooner, but high crowding & broken ramp on Vehicle A)
  const route10 = await prisma.route.create({
    data: {
      agencyId: agency.id,
      sourceId: demoSource.id,
      gtfsRouteId: 'R-10',
      shortName: '10',
      longName: 'Route 10: Master Canteen to Patia Express',
      vehicleType: 'BUS',
      color: '#DC2626',
      typicallyWheelchairAccessible: false,
      typicallyLowFloor: false,
      isActive: true,
      confidence: 0.9,
      dataStatus: 'CONFIRMED',
    },
  });

  // Route 11: Accessible City Shuttle (Arrives 3 min later, low crowding & fully accessible ramp/low-floor on Vehicle B)
  const route11 = await prisma.route.create({
    data: {
      agencyId: agency.id,
      sourceId: demoSource.id,
      gtfsRouteId: 'R-11',
      shortName: '11A',
      longName: 'Route 11A: KIIT to Patia Accessible Transit',
      vehicleType: 'BUS',
      color: '#059669',
      typicallyWheelchairAccessible: true,
      typicallyLowFloor: true,
      isActive: true,
      confidence: 0.95,
      dataStatus: 'CONFIRMED',
    },
  });

  // Route 12: Campus Electric Shuttle
  const route12 = await prisma.route.create({
    data: {
      agencyId: agency.id,
      sourceId: demoSource.id,
      gtfsRouteId: 'R-12',
      shortName: 'SHUTTLE',
      longName: 'KIIT Campus Green Electric Shuttle',
      vehicleType: 'CAMPUS_SHUTTLE',
      color: '#2563EB',
      typicallyWheelchairAccessible: true,
      typicallyLowFloor: true,
      isActive: true,
      confidence: 0.9,
      dataStatus: 'CONFIRMED',
    },
  });

  // 6. Link Stops to Routes
  await prisma.routeStop.createMany({
    data: [
      { routeId: route10.id, stopId: stopKiit.id, sequence: 1 },
      { routeId: route10.id, stopId: stopInfocity.id, sequence: 2 },
      { routeId: route10.id, stopId: stopPatia.id, sequence: 3 },

      { routeId: route11.id, stopId: stopKiit.id, sequence: 1 },
      { routeId: route11.id, stopId: stopInfocity.id, sequence: 2 },
      { routeId: route11.id, stopId: stopPatia.id, sequence: 3 },

      { routeId: route12.id, stopId: stopKiit.id, sequence: 1 },
      { routeId: route12.id, stopId: stopInfocity.id, sequence: 2 },
    ],
  });

  // 7. Trips & Scheduled StopTimes
  const now = new Date();
  const currentHour = now.getHours();
  const nextHour = (currentHour + 1) % 24;

  const tripA = await prisma.trip.create({
    data: {
      routeId: route10.id,
      sourceId: demoSource.id,
      gtfsTripId: 'TRIP-10-A',
      headsign: 'Patia via Express Corridor',
      wheelchairAccessible: 0, // No
      monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true,
    },
  });

  await prisma.stopTime.createMany({
    data: [
      { tripId: tripA.id, stopId: stopKiit.id, stopSequence: 1, arrivalTime: `${String(currentHour).padStart(2, '0')}:05:00`, departureTime: `${String(currentHour).padStart(2, '0')}:05:00` },
      { tripId: tripA.id, stopId: stopInfocity.id, stopSequence: 2, arrivalTime: `${String(currentHour).padStart(2, '0')}:10:00`, departureTime: `${String(currentHour).padStart(2, '0')}:10:00` },
      { tripId: tripA.id, stopId: stopPatia.id, stopSequence: 3, arrivalTime: `${String(currentHour).padStart(2, '0')}:17:00`, departureTime: `${String(currentHour).padStart(2, '0')}:17:00` },
    ],
  });

  const tripB = await prisma.trip.create({
    data: {
      routeId: route11.id,
      sourceId: demoSource.id,
      gtfsTripId: 'TRIP-11-B',
      headsign: 'Patia Accessible Step-Free',
      wheelchairAccessible: 1, // Yes
      monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true,
    },
  });

  await prisma.stopTime.createMany({
    data: [
      { tripId: tripB.id, stopId: stopKiit.id, stopSequence: 1, arrivalTime: `${String(currentHour).padStart(2, '0')}:08:00`, departureTime: `${String(currentHour).padStart(2, '0')}:08:00` },
      { tripId: tripB.id, stopId: stopInfocity.id, stopSequence: 2, arrivalTime: `${String(currentHour).padStart(2, '0')}:14:00`, departureTime: `${String(currentHour).padStart(2, '0')}:14:00` },
      { tripId: tripB.id, stopId: stopPatia.id, stopSequence: 3, arrivalTime: `${String(currentHour).padStart(2, '0')}:22:00`, departureTime: `${String(currentHour).padStart(2, '0')}:22:00` },
    ],
  });

  // 8. Vehicles & Telemetry (Hackathon Demo Scenario PART 28)
  // Vehicle A on Route 10: ETA 5 min, High Crowding, Ramp broken
  const vehicleA = await prisma.vehicle.create({
    data: {
      routeId: route10.id,
      label: 'MoBus #OD-02-1001 (Bus A)',
      type: 'BUS',
      capacity: 55,
      wheelchairAccessible: 0,
      hasRamp: false,
      hasLowFloor: false,
      status: 'ACTIVE',
      sourceId: demoSource.id,
    },
  });

  await prisma.vehiclePosition.create({
    data: {
      vehicleId: vehicleA.id,
      routeId: route10.id,
      latitude: 20.3510,
      longitude: 85.8150,
      occupancyStatus: 'STANDING_ROOM_ONLY',
      source: 'demo_telemetry',
      observedAt: new Date(),
    },
  });

  await prisma.vehicleCondition.create({
    data: {
      vehicleId: vehicleA.id,
      rampOperational: 'UNAVAILABLE',
      source: 'user_report',
      reportedBy: 'Driver/Inspector Report',
      confidence: 0.9,
    },
  });

  // Vehicle B on Route 11: ETA 8 min, Low Crowding, Ramp Available + Low Floor
  const vehicleB = await prisma.vehicle.create({
    data: {
      routeId: route11.id,
      label: 'MoBus Accessible #OD-02-2002 (Bus B)',
      type: 'BUS',
      capacity: 45,
      wheelchairAccessible: 1,
      hasRamp: true,
      hasLowFloor: true,
      hasAudioAnnouncements: true,
      hasVisualDisplay: true,
      status: 'ACTIVE',
      sourceId: demoSource.id,
    },
  });

  await prisma.vehiclePosition.create({
    data: {
      vehicleId: vehicleB.id,
      routeId: route11.id,
      latitude: 20.3470,
      longitude: 85.8120,
      occupancyStatus: 'MANY_SEATS_AVAILABLE',
      source: 'demo_telemetry',
      observedAt: new Date(),
    },
  });

  await prisma.vehicleCondition.create({
    data: {
      vehicleId: vehicleB.id,
      rampOperational: 'AVAILABLE',
      liftOperational: 'AVAILABLE',
      source: 'operator_certified',
      confidence: 0.95,
    },
  });

  // 9. Crowding Observations & Predictions
  await prisma.crowdingObservation.createMany({
    data: [
      { routeId: route10.id, hourOfDay: currentHour, dayOfWeek: 0, isWeekend: false, level: 'HIGH', score: 0.82, source: 'demo' },
      { routeId: route10.id, hourOfDay: currentHour, dayOfWeek: 1, isWeekend: false, level: 'HIGH', score: 0.79, source: 'demo' },
      { routeId: route11.id, hourOfDay: currentHour, dayOfWeek: 0, isWeekend: false, level: 'LOW', score: 0.28, source: 'demo' },
      { routeId: route11.id, hourOfDay: currentHour, dayOfWeek: 1, isWeekend: false, level: 'LOW', score: 0.25, source: 'demo' },
    ],
  });

  await prisma.crowdingPrediction.createMany({
    data: [
      {
        routeId: route10.id,
        stopId: '',
        hourOfDay: currentHour,
        dayOfWeek: 0,
        isWeekend: false,
        predictedLevel: 'HIGH',
        predictedScore: 0.81,
        confidence: 0.85,
        sampleSize: 12,
        validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
      {
        routeId: route11.id,
        stopId: '',
        hourOfDay: currentHour,
        dayOfWeek: 0,
        isWeekend: false,
        predictedLevel: 'LOW',
        predictedScore: 0.26,
        confidence: 0.9,
        sampleSize: 15,
        validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    ],
  });

  // 10. Fares
  await prisma.fare.createMany({
    data: [
      {
        routeId: route10.id,
        currency: 'INR',
        priceExact: 15,
        isExact: true,
        source: 'CRUT Official Fare Table',
        confidence: 1.0,
        dataStatus: 'CONFIRMED',
      },
      {
        routeId: route11.id,
        currency: 'INR',
        priceExact: 20,
        isExact: true,
        source: 'CRUT Official Fare Table',
        confidence: 1.0,
        dataStatus: 'CONFIRMED',
      },
      {
        routeId: route12.id,
        currency: 'INR',
        priceExact: 0, // Free campus shuttle
        isExact: true,
        source: 'KIIT Campus Transport',
        confidence: 1.0,
        dataStatus: 'CONFIRMED',
      },
    ],
  });

  // 11. Transport Stands (Shared Auto & Taxi)
  await prisma.transportStand.createMany({
    data: [
      {
        name: 'KIIT Square Shared Auto Stand',
        type: 'AUTO_RICKSHAW',
        latitude: 20.3540,
        longitude: 85.8168,
        address: 'Near KIIT Gate 1, Chandaka Industrial Estate Road',
        operatingHours: '06:00 - 22:30',
        typicalFareMin: 15,
        typicalFareMax: 30,
        currency: 'INR',
        source: 'osm',
        confidence: 0.85,
        dataStatus: 'CONFIRMED',
      },
      {
        name: 'Patia Big Bazaar Auto Stand',
        type: 'AUTO_RICKSHAW',
        latitude: 20.3620,
        longitude: 85.8235,
        address: 'Patia Chowk, Nandankanan Road',
        operatingHours: '05:30 - 23:00',
        typicalFareMin: 20,
        typicalFareMax: 40,
        currency: 'INR',
        source: 'osm',
        confidence: 0.85,
        dataStatus: 'CONFIRMED',
      },
    ],
  });

  // 12. Shared Transport Corridors
  await prisma.sharedTransportCorridor.create({
    data: {
      name: 'KIIT Square <-> Patia Corridor',
      fromArea: 'KIIT Campus / Infocity',
      toArea: 'Patia Square',
      vehicleType: 'AUTO_RICKSHAW',
      fareMin: 15,
      fareMax: 25,
      currency: 'INR',
      operatingHours: '06:00 - 22:00',
      frequencyMins: 5,
      source: 'historical',
      confidence: 0.8,
    },
  });

  // 13. Demo Users (Wheelchair Persona "Aarav" & Admin)
  const passwordHash = await bcrypt.hash('password123', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'aarav@access.org' },
    update: {},
    create: {
      name: 'Aarav Sharma',
      email: 'aarav@access.org',
      phoneNumber: '+919876543210',
      passwordHash,
      role: 'PASSENGER',
      profile: {
        create: {
          mobility: 'WHEELCHAIR',
          stairs: 'AVOID',
          walkingToleranceM: 300,
          requiresWheelchair: true,
          requiresLowFloor: true,
          crowdingPref: 'LOW_PREFERENCE',
          safetyPref: 'NONE',
          weightAccessibility: 0.45,
          weightSafety: 0.2,
          weightCrowding: 0.15,
          weightReliability: 0.1,
          weightTime: 0.05,
          weightCost: 0.05,
        },
      },
      emergencyContacts: {
        create: {
          name: 'Priya Sharma (Sister)',
          phone: '+919876543211',
          relationship: 'Sister',
          isPrimary: true,
        },
      },
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@access.org' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@access.org',
      passwordHash,
      role: 'ADMIN',
      profile: {
        create: {},
      },
    },
  });

  console.log('Seed completed successfully!');
  console.log(`Demo passenger created: ${demoUser.email} (Password: password123)`);
  console.log(`Admin user created: ${adminUser.email} (Password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
