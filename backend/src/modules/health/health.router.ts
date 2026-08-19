import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 *
 * Used by Render as the deployment health check.
 * Returns 200 with a JSON payload confirming the service is up.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
