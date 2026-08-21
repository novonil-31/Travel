/**
 * ACCESS — Prisma client singleton
 * Reuses the same connection across the application.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Log slow queries (>200ms) in development
prisma.$on('query' as never, (e: { duration: number; query: string }) => {
  if (e.duration > 200) {
    logger.warn({ duration: e.duration, query: e.query }, 'Slow DB query');
  }
});

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ message: e.message }, 'Prisma error');
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
