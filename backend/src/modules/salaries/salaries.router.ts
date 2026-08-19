/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import {
  employeeExists,
  getCurrentSalary,
  createSalaryRecord,
  getSalaryHistory,
} from './salaries.service';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/pagination';

const router = Router();

const employeeIdSchema = z.string().uuid('Invalid employee ID format');

const createSalarySchema = z.object({
  amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
  currencyCode: z
    .string({ required_error: 'Currency code is required' })
    .length(3, 'Currency code must be exactly 3 characters')
    .toUpperCase(),
  payFrequency: z.enum(['monthly', 'annual'], {
    errorMap: () => ({ message: "Pay frequency must be 'monthly' or 'annual'" }),
  }),
  grade: z.string().optional(),
  band: z.string().optional(),
  effectiveDate: z
    .string({ required_error: 'Effective date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Effective date must be in YYYY-MM-DD format')
    .refine((val) => {
      const today = new Date().toISOString().split('T')[0];
      return val <= today;
    }, 'Effective date cannot be in the future'),
  reason: z.string({ required_error: 'Reason is required' }).min(1, 'Reason cannot be empty'),
  notes: z.string().optional(),
});

/**
 * GET /employees/:id/salary
 * Retrieve the current salary record of an employee.
 */
router.get(
  '/employees/:id/salary',
  requireAuth,
  async (req, res, next) => {
    try {
      const employeeId = req.params.id;
      const parsedId = employeeIdSchema.safeParse(employeeId);
      if (!parsedId.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: { id: ['Invalid employee ID format'] },
        });
        return;
      }

      const exists = await employeeExists(employeeId);
      if (!exists) {
        res.status(404).json({
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
            details: {},
          },
        });
        return;
      }

      const currentSalary = await getCurrentSalary(employeeId);
      res.status(200).json({ data: currentSalary });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /employees/:id/salary
 * Create a new salary record for an employee.
 */
router.post(
  '/employees/:id/salary',
  requireAuth,
  async (req, res, next) => {
    try {
      const employeeId = req.params.id;
      const parsedId = employeeIdSchema.safeParse(employeeId);
      if (!parsedId.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: { id: ['Invalid employee ID format'] },
        });
        return;
      }

      const exists = await employeeExists(employeeId);
      if (!exists) {
        res.status(404).json({
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
            details: {},
          },
        });
        return;
      }

      const parsedBody = createSalarySchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parsedBody.error.flatten().fieldErrors,
        });
        return;
      }

      // Actor ID is retrieved from JWT authentication credentials
      const actorId = req.user?.id;
      if (!actorId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const salaryRecord = await createSalaryRecord(employeeId, parsedBody.data, actorId);
      res.status(201).json({ data: salaryRecord });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /employees/:id/salary/history
 * Retrieve chronological salary changes for an employee.
 */
router.get(
  '/employees/:id/salary/history',
  requireAuth,
  async (req, res, next) => {
    try {
      const employeeId = req.params.id;
      const parsedId = employeeIdSchema.safeParse(employeeId);
      if (!parsedId.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: { id: ['Invalid employee ID format'] },
        });
        return;
      }

      const exists = await employeeExists(employeeId);
      if (!exists) {
        res.status(404).json({
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
            details: {},
          },
        });
        return;
      }

      // Check max limit constraint
      if (req.query.pageSize && Number(req.query.pageSize) > 100) {
        res.status(400).json({
          error: 'Validation failed',
          details: { pageSize: ['Page size cannot exceed 100'] },
        });
        return;
      }

      const { page, pageSize } = parsePaginationParams(req.query.page, req.query.pageSize);
      const { history, total } = await getSalaryHistory(employeeId, page, pageSize);

      res.status(200).json({
        data: history,
        meta: buildPaginationMeta(page, pageSize, total),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
