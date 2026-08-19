/* eslint-disable @typescript-eslint/no-namespace */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware.
 * Verifies the short-lived access JWT in the Authorization header.
 * Attaches decoded user info (id, role) to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      details: 'Authorization token missing or malformed',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      role: string;
    };

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid or expired authorization token',
    });
  }
}
