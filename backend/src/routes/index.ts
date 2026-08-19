import { Router } from 'express';
import healthRouter from '../modules/health/health.router';
import authRouter from '../modules/auth/auth.router';
import {
  employeesRouter,
  departmentsRouter,
  countriesRouter,
} from '../modules/employees/employees.router';
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

// Temporary test route to verify auth middleware
router.get('/test-protected', requireAuth, (req, res) => {
  res.status(200).json({ data: { user: req.user } });
});

export { healthRouter };
export default router;
