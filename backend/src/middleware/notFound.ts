import { Request, Response } from 'express';

/**
 * Catch-all 404 handler for routes that don't match any registered route.
 * Must be registered after all routers.
 */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}
