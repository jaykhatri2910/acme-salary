import request from 'supertest';
import app from '../../../app';
import { query, pool } from '../../../config/db';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

interface TestDepartmentBreakdown {
  department: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
}

interface TestCountryBreakdown {
  country: string;
  countryCode: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
}

interface TestPayBandDistribution {
  band: string | null;
  headcount: number;
}

interface TestAnalyticsSummary {
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
  byDepartment: TestDepartmentBreakdown[];
  byCountry: TestCountryBreakdown[];
  payBandDistribution: TestPayBandDistribution[];
}

interface ApiResponse<T = unknown> {
  data?: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string | { code: string; message: string; details: unknown };
  details?: Record<string, string[]>;
}

describe('Analytics API Endpoints', () => {
  let token: string;
  const testUserId = 'a3b5c7d9-1111-2222-3333-444455556666';
  const engDeptId = 'b1b2b3b4-1111-2222-3333-444455556666';
  const hrDeptId = 'b1b2b3b4-2222-2222-3333-444455556666';
  const usCountryId = 'c1c2c3c4-1111-2222-3333-444455556666';
  const inCountryId = 'c1c2c3c4-2222-2222-3333-444455556666';
  const emp1Id = 'd1d2d3d4-1111-2222-3333-444455556666';
  const emp2Id = 'd1d2d3d4-2222-2222-3333-444455556666';
  const emp3Id = 'd1d2d3d4-3333-3333-3333-444455556666';

  beforeEach(async () => {
    // Truncate all tables
    await query(
      'TRUNCATE refresh_tokens, salary_records, employees, users, countries, departments, exchange_rates CASCADE',
    );

    // Create HR user
    token = jwt.sign({ userId: testUserId, role: 'hr_manager' }, env.JWT_SECRET);
    await query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [testUserId, 'hr_manager@acme.com', 'hash', 'Test HR Manager', 'hr_manager'],
    );

    // Create departments & countries
    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [engDeptId, 'Engineering']);
    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [
      hrDeptId,
      'Human Resources',
    ]);
    await query('INSERT INTO countries (id, name, code, currency_code) VALUES ($1, $2, $3, $4)', [
      usCountryId,
      'United States',
      'US',
      'USD',
    ]);
    await query('INSERT INTO countries (id, name, code, currency_code) VALUES ($1, $2, $3, $4)', [
      inCountryId,
      'India',
      'IN',
      'INR',
    ]);

    // Create exchange rate: 1 INR = 0.012 USD
    await query(
      "INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES ('INR', 'USD', 0.012, '2026-01-01')",
    );

    // Insert Employee 1: Alice Smith (Engineering, US, active) -> 100,000 USD
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp1Id, 'EMP-100', 'Alice', 'Smith', 'alice@acme.com', engDeptId, usCountryId, 'active', '2026-01-01'],
    );
    await query(
      `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, grade, band, effective_date, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp1Id, 100000, 'USD', 'annual', 'G3', 'Senior', '2026-01-01', 'HIRE', testUserId],
    );

    // Insert Employee 2: Bob Jones (Engineering, IN, active) -> 1,600,000 INR (19,200 USD)
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp2Id, 'EMP-200', 'Bob', 'Jones', 'bob@acme.com', engDeptId, inCountryId, 'active', '2026-02-01'],
    );
    await query(
      `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, grade, band, effective_date, reason, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [emp2Id, 1500000, 'INR', 'monthly', 'G2', 'Mid', '2026-02-01', 'HIRE', testUserId, '2026-02-01T09:00:00.000Z'],
    );
    await query(
      `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, grade, band, effective_date, reason, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [emp2Id, 1600000, 'INR', 'monthly', 'G2', 'Mid', '2026-06-01', 'PROMOTION', testUserId, '2026-06-01T09:00:00.000Z'],
    );

    // Insert Employee 3: Charlie Brown (HR, US, inactive) -> 80,000 USD
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp3Id, 'EMP-300', 'Charlie', 'Brown', 'charlie@acme.com', hrDeptId, usCountryId, 'inactive', '2026-03-01'],
    );
    await query(
      `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, grade, band, effective_date, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp3Id, 80000, 'USD', 'annual', 'G2', 'Mid', '2026-03-01', 'HIRE', testUserId],
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/v1/analytics/summary', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/analytics/summary');
      expect(res.status).toBe(401);
    });

    it('returns aggregated summary statistics successfully', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestAnalyticsSummary>;
      const data = body.data;
      expect(data).toBeDefined();

      if (data) {
        expect(data.headcount).toBe(3);
        expect(data.totalPayrollUsd).toBe(199200); // 100000 + 19200 (1600000*0.012) + 80000
        expect(data.averageSalaryUsd).toBe(66400); // 199200 / 3
        expect(data.medianSalaryUsd).toBe(80000); // Bob 19200, Charlie 80000, Alice 100000
        expect(data.minSalaryUsd).toBe(19200);
        expect(data.maxSalaryUsd).toBe(100000);

        // Department breakdown checks
        expect(data.byDepartment).toBeDefined();
        expect(data.byDepartment).toHaveLength(2);
        const engDept = data.byDepartment.find((d) => d.department === 'Engineering');
        expect(engDept).toBeDefined();
        if (engDept) {
          expect(engDept.headcount).toBe(2);
          expect(engDept.totalPayrollUsd).toBe(119200);
        }

        // Country breakdown checks
        expect(data.byCountry).toBeDefined();
        expect(data.byCountry).toHaveLength(2);
        const usCountry = data.byCountry.find((c) => c.country === 'United States');
        expect(usCountry).toBeDefined();
        if (usCountry) {
          expect(usCountry.countryCode).toBe('US');
          expect(usCountry.headcount).toBe(2);
          expect(usCountry.totalPayrollUsd).toBe(180000);
        }

        // Pay Band Distribution checks
        expect(data.payBandDistribution).toBeDefined();
        expect(data.payBandDistribution).toHaveLength(2);
        const seniorBand = data.payBandDistribution.find((b) => b.band === 'Senior');
        expect(seniorBand).toBeDefined();
        if (seniorBand) {
          expect(seniorBand.headcount).toBe(1);
        }
      }
    });

    it('filters summary statistics by department', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/summary?department=${hrDeptId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestAnalyticsSummary>;
      const data = body.data;
      expect(data).toBeDefined();
      if (data) {
        expect(data.headcount).toBe(1);
        expect(data.totalPayrollUsd).toBe(80000);
      }
    });

    it('filters summary statistics by country', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/summary?country=${inCountryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestAnalyticsSummary>;
      const data = body.data;
      expect(data).toBeDefined();
      if (data) {
        expect(data.headcount).toBe(1);
        expect(data.totalPayrollUsd).toBe(19200);
      }
    });
  });

  describe('GET /api/v1/analytics/export', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/analytics/export');
      expect(res.status).toBe(401);
    });

    it('streams CSV export with correct headers and attachment configurations', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toBe('attachment; filename="salary-export.csv"');

      const csvText = res.text;
      const lines = csvText.trim().split('\n');
      expect(lines).toHaveLength(4); // Headers + 3 Employees

      // Verify header format
      expect(lines[0]).toBe(
        'employee_no,employee_name,department,country,status,salary,currency_code,pay_frequency,effective_date',
      );

      // Verify row sorting and tie-breaker retrieval
      // Default order is last_name ASC, first_name ASC: Brown -> Jones -> Smith
      expect(lines[1]).toContain('EMP-300,Charlie Brown,Human Resources,United States,inactive,80000,USD,annual,2026-03-01');
      expect(lines[2]).toContain('EMP-200,Bob Jones,Engineering,India,active,1600000,INR,monthly,2026-06-01');
      expect(lines[3]).toContain('EMP-100,Alice Smith,Engineering,United States,active,100000,USD,annual,2026-01-01');
    });

    it('applies filters to CSV export', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/export?status=active&department=${engDeptId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const csvText = res.text;
      const lines = csvText.trim().split('\n');
      expect(lines).toHaveLength(3); // Headers + 2 Active Engineering Employees
      expect(csvText).toContain('EMP-100');
      expect(csvText).toContain('EMP-200');
      expect(csvText).not.toContain('EMP-300'); // Charlie (HR, Inactive) excluded
    });

    it('applies custom sorting to CSV export', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/export?sortBy=salary&sortOrder=desc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const csvText = res.text;
      const lines = csvText.trim().split('\n');
      // desc order: Bob (1600000 INR) -> Alice (100000 USD) -> Charlie (80000 USD)
      expect(lines[1]).toContain('EMP-200');
      expect(lines[2]).toContain('EMP-100');
      expect(lines[3]).toContain('EMP-300');
    });
  });
});
