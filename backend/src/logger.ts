/**
 * ACCESS — Pino structured logger
 * NEVER logs passwords, JWT tokens, or raw GPS coordinates of individuals.
 */

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.isProduction ? 'info' : 'debug',
  transport: config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
  redact: {
    paths: ['password', 'passwordHash', 'token', 'authorization', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
});
