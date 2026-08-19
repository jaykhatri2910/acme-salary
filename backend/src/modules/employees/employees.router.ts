/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { z } from 'zod';
import {
  getEmployees,
  getEmployeeById,
  getDepartments,
  getCountries,
} from './employees.service';
import { requireAuth } from '../../middleware/auth';
import { buildPaginationMeta } from '../../utils/pagination';

const employeesRouter = Router();
const departmentsRouter = Router();
const countriesRouter = Router();

const emptyStringToUndefined = (val: unknown) => (val === '' ? undefined : val);

const employeeQuerySchema = z.object({
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
  pageSize: z.preprocess(
    (val) => (val ? Number(val) : 25),
    z.number().int().min(1).max(100).default(25),
  ),
  search: z.preprocess(emptyStringToUndefined, z.string().optional()),
  department: z.preprocess(emptyStringToUndefined, z.string().uuid('Invalid department ID').optional()),
  country: z.preprocess(emptyStringToUndefined, z.string().uuid('Invalid country ID').optional()),
  status: z.preprocess(emptyStringToUndefined, z.enum(['active', 'inactive']).optional()),
  sortBy: z.preprocess(
    emptyStringToUndefined,
    z.enum(['name', 'department', 'country', 'salary']).optional(),
  ),
  sortOrder: z.preprocess((val) => val || 'asc', z.enum(['asc', 'desc']).default('asc')),
});

const employeeIdSchema = z.object({
  id: z.string().uuid('Invalid employee ID'),
});

/**
 * GET /employees
 * Protected endpoint returning a paginated list of employees.
 */
employeesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const params = employeeQuerySchema.parse(req.query);
    const { employees, total } = await getEmployees(params);
    res.status(200).json({
      data: employees,
      meta: buildPaginationMeta(params.page, params.pageSize, total),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /employees/:id
 * Protected endpoint returning detailed info for a single employee.
 */
employeesRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = employeeIdSchema.parse(req.params);
    const employee = await getEmployeeById(id);
    if (!employee) {
      res.status(404).json({
        error: 'Not Found',
        details: `Employee with ID ${id} not found`,
      });
      return;
    }
    res.status(200).json({
      data: employee,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /departments
 * Protected reference endpoint returning all departments.
 */
departmentsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const departments = await getDepartments();
    res.status(200).json({
      data: departments,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /countries
 * Protected reference endpoint returning all countries.
 */
countriesRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const countries = await getCountries();
    res.status(200).json({
      data: countries,
    });
  } catch (err) {
    next(err);
  }
});

export { employeesRouter, departmentsRouter, countriesRouter };
