import { Router } from 'express';
import healthRouter from '../modules/health/health.router';
import authRouter from '../modules/auth/auth.router';
import {
  employeesRouter,
  departmentsRouter,
  countriesRouter,
} from '../modules/employees/employees.router';
import salariesRouter from '../modules/salaries/salaries.router';
import analyticsRouter from '../modules/analytics/analytics.router';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Mount versioned API routes.
 * All business feature routes will be registered here under /api/v1.
 */

router.use('/auth', authRouter);
router.use('/employees', employeesRouter);
router.use('/departments', departmentsRouter);
router.use('/countries', countriesRouter);
router.use('/', salariesRouter);
router.use('/', analyticsRouter);

// Temporary test route to verify auth middleware
router.get('/test-protected', requireAuth, (req, res) => {
  res.status(200).json({ data: { user: req.user } });
});

export { healthRouter };
export default router;