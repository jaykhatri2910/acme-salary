/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import {
  validateUserCredentials,
  createSession,
  refreshSession,
  revokeSession,
} from './auth.service';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const isProduction = env.NODE_ENV === 'production';

// Cookie options helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

/**
 * POST /auth/login
 * Public route to authenticate HR managers.
 * Returns access token in body and sets refresh token in cookie.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await validateUserCredentials(email, password);
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid email or password',
      });
      return;
    }

    const { accessToken, refreshToken } = await createSession(user.id, user.role);

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.status(200).json({
      data: {
        accessToken,
        user,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/refresh
 * Public route to refresh an access token.
 * Validates refresh token cookie and issues new access and rotated refresh tokens.
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const cookieToken = (req.cookies as { refreshToken?: string } | undefined)?.refreshToken;

    if (!cookieToken) {
      res.status(401).json({
        error: 'Unauthorized',
        details: 'Refresh token cookie is missing',
      });
      return;
    }

    const result = await refreshSession(cookieToken);
    if (!result) {
      res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid or expired refresh token',
      });
      return;
    }

    res.cookie('refreshToken', result.refreshToken, getCookieOptions());

    res.status(200).json({
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 * Public route to invalidate the refresh token and clear the cookie.
 */
router.post('/logout', async (req, res, next) => {
  try {
    const cookieToken = (req.cookies as { refreshToken?: string } | undefined)?.refreshToken;

    if (cookieToken) {
      await revokeSession(cookieToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    });

    res.status(200).json({
      data: {
        success: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
