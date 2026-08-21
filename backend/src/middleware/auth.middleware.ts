/**
 * ACCESS — JWT Authentication Middleware
 * Verifies Bearer tokens. Attaches decoded user to req.user.
 * Never logs the token itself.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { sendError, Errors } from './response.js';

export interface AuthPayload {
  userId: string;
  email?: string;
  role: string;
}

// Extend express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, Errors.UNAUTHORIZED, 'Missing or invalid Authorization header', 401);
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    sendError(res, Errors.UNAUTHORIZED, 'Token is invalid or expired', 401);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, Errors.UNAUTHORIZED, 'Not authenticated', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, Errors.FORBIDDEN, 'Insufficient permissions', 403);
      return;
    }
    next();
  };
}

export function issueToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}
