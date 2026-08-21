/**
 * ACCESS — Centralised configuration
 * All external credentials and URLs come from environment variables.
 * Never hard-code secrets.
 */

import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function optionalNum(key: string, defaultValue: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : defaultValue;
}

function optionalBool(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val.toLowerCase() === 'true';
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: optionalNum('PORT', 3000),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDemoMode: optionalBool('DEMO_MODE', false),

  // JWT
  jwtSecret: optional('JWT_SECRET', 'access-hackathon-secret-change-in-production'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

  // Database
  databaseUrl: optional('DATABASE_URL', 'file:./dev.db'),

  // GTFS Static feed — generic, configurable per deployment
  gtfs: {
    feedUrl: optional('GTFS_FEED_URL', ''),
    authHeader: optional('GTFS_AUTH_HEADER', ''),
    enabled: optionalBool('GTFS_ENABLED', false),
    downloadDir: optional('GTFS_DOWNLOAD_DIR', './data/gtfs'),
  },

  // GTFS-Realtime
  gtfsRt: {
    vehiclePositionsUrl: optional('GTFS_RT_VEHICLE_POSITIONS_URL', ''),
    tripUpdatesUrl: optional('GTFS_RT_TRIP_UPDATES_URL', ''),
    serviceAlertsUrl: optional('GTFS_RT_SERVICE_ALERTS_URL', ''),
    authHeader: optional('GTFS_RT_AUTH_HEADER', ''),
    enabled: optionalBool('GTFS_RT_ENABLED', false),
    pollIntervalSeconds: optionalNum('GTFS_RT_POLL_INTERVAL_SECONDS', 60),
  },

  // Odisha / CRUT / Mo Bus (credential-gated)
  odisha: {
    crutApiUrl: optional('CRUT_API_URL', ''),
    crutApiKey: optional('CRUT_API_KEY', ''),
    osrtcApiUrl: optional('OSRTC_API_URL', ''),
    enabled: optionalBool('ODISHA_PROVIDER_ENABLED', false),
  },

  // OpenStreetMap / Overpass
  osm: {
    overpassUrl: optional('OVERPASS_API_URL', 'https://overpass-api.de/api/interpreter'),
    cacheDir: optional('OSM_CACHE_DIR', './data/osm_cache'),
    cacheTtlHours: optionalNum('OSM_CACHE_TTL_HOURS', 24),
    enabled: optionalBool('OSM_ENABLED', true),
  },

  // Safety session configuration
  safety: {
    firstEscalationMinutes: optionalNum('SAFETY_FIRST_ESCALATION_MINUTES', 5),
    secondEscalationMinutes: optionalNum('SAFETY_SECOND_ESCALATION_MINUTES', 15),
    heartbeatIntervalMinutes: optionalNum('SAFETY_HEARTBEAT_INTERVAL_MINUTES', 10),
    sessionExpiryHours: optionalNum('SAFETY_SESSION_EXPIRY_HOURS', 4),
  },

  // Notifications (in-app always works; external channels optional)
  notifications: {
    smsTwilioAccountSid: optional('TWILIO_ACCOUNT_SID', ''),
    smsTwilioAuthToken: optional('TWILIO_AUTH_TOKEN', ''),
    smsTwilioFrom: optional('TWILIO_FROM_NUMBER', ''),
    smsEnabled: optionalBool('SMS_ENABLED', false),
    emailSendgridKey: optional('SENDGRID_API_KEY', ''),
    emailEnabled: optionalBool('EMAIL_ENABLED', false),
  },

  // Data freshness thresholds (seconds)
  freshness: {
    vehiclePositionFreshSec: optionalNum('FRESHNESS_VEHICLE_FRESH_SEC', 120),
    vehiclePositionStaleSec: optionalNum('FRESHNESS_VEHICLE_STALE_SEC', 600),
    crowdingFreshSec: optionalNum('FRESHNESS_CROWDING_FRESH_SEC', 300),
    crowdingStaleSec: optionalNum('FRESHNESS_CROWDING_STALE_SEC', 1800),
  },

  // ML / predictions
  ml: {
    crowdingMinSamples: optionalNum('ML_CROWDING_MIN_SAMPLES', 5),
    trainingIntervalHours: optionalNum('ML_TRAINING_INTERVAL_HOURS', 24),
  },

  // Data retention
  retention: {
    locationSignalsDays: optionalNum('RETENTION_LOCATION_SIGNALS_DAYS', 7),
    reportExpireHours: optionalNum('RETENTION_REPORT_EXPIRE_HOURS', 48),
    ingestionRunsDays: optionalNum('RETENTION_INGESTION_RUNS_DAYS', 30),
  },

  // Ingestion scheduler
  ingestion: {
    gtfsCron: optional('INGESTION_GTFS_CRON', '0 3 * * *'), // daily 3am
    osmCron: optional('INGESTION_OSM_CRON', '0 4 * * *'),   // daily 4am
    gtfsRtCron: optional('INGESTION_GTFS_RT_CRON', '*/1 * * * *'), // every minute
  },
} as const;
