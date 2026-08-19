/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getAnalyticsSummary, getExportChunk } from './analytics.service';

const router = Router();

const analyticsQuerySchema = z.object({
  department: z.string().uuid('Invalid department ID format').optional(),
  country: z.string().uuid('Invalid country ID format').optional(),
});

const exportQuerySchema = z.object({
  search: z.string().trim().optional(),
  department: z.string().uuid('Invalid department ID format').optional(),
  country: z.string().uuid('Invalid country ID format').optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['name', 'department', 'country', 'salary']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * GET /analytics/summary
 * Retrieve payroll analytics summary.
 */
router.get(
  '/analytics/summary',
  requireAuth,
  async (req, res, next) => {
    try {
      const parsedQuery = analyticsQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parsedQuery.error.flatten().fieldErrors,
        });
        return;
      }

      const summary = await getAnalyticsSummary(parsedQuery.data);

      res.status(200).json({
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /analytics/export
 * Export filtered employee and salary records as a CSV stream.
 */
router.get(
  '/analytics/export',
  requireAuth,
  async (req, res, next) => {
    try {
      const parsedQuery = exportQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parsedQuery.error.flatten().fieldErrors,
        });
        return;
      }

      // Configure headers for CSV attachment streaming
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="salary-export.csv"');

      // Write CSV headers row
      const headers = [
        'employee_no',
        'employee_name',
        'department',
        'country',
        'status',
        'salary',
        'currency_code',
        'pay_frequency',
        'effective_date',
      ];
      res.write(headers.join(',') + '\n');

      const filters = parsedQuery.data;
      const limit = 1000;
      let offset = 0;
      let hasMore = true;

      // Helper function to escape special characters for RFC 4180 CSV compliance
      const escapeCsvValue = (val: string | number | boolean | null | undefined): string => {
        if (val === null || val === undefined) {
          return '';
        }
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      while (hasMore) {
        const chunk = await getExportChunk(filters, limit, offset);
        if (chunk.length === 0) {
          break;
        }

        for (const row of chunk) {
          const fields = [
            row.employeeNo,
            row.employeeName,
            row.department,
            row.country,
            row.status,
            row.salary,
            row.currencyCode,
            row.payFrequency,
            row.effectiveDate,
          ];
          res.write(fields.map(escapeCsvValue).join(',') + '\n');
        }

        offset += limit;
        if (chunk.length < limit) {
          hasMore = false;
        }
      }

      res.end();
    } catch (err) {
      next(err);
    }
  },
);

export default router;