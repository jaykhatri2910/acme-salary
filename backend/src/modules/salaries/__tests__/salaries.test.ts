import request from 'supertest';
import app from '../../../app';
import { query, pool } from '../../../config/db';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

interface TestSalaryRecord {
  id: string;
  employeeId: string;
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  payFrequency: string;
  grade: string | null;
  band: string | null;
  reason: string;
  notes: string | null;
  changedBy: {
    id: string;
    email: string;
  };
  createdAt: string;
}

interface TestSalaryHistoryItem {
  id: string;
  oldAmount: number | null;
  oldCurrencyCode: string | null;
  newAmount: number;
  currencyCode: string;
  effectiveDate: string;
  payFrequency: string;
  grade: string | null;
  band: string | null;
  reason: string;
  notes: string | null;
  changedBy: {
    id: string;
    email: string;
  };
  createdAt: string;
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

describe('Salaries API Endpoints', () => {
  let token: string;
  const testUserId = 'a3b5c7d9-1111-2222-3333-444455556666';
  const engDeptId = 'b1b2b3b4-1111-2222-3333-444455556666';
  const usCountryId = 'c1c2c3c4-1111-2222-3333-444455556666';
  const emp1Id = 'd1d2d3d4-1111-2222-3333-444455556666';
  const empNoSalaryId = 'e1e2e3e4-1111-2222-3333-444455556666';

  beforeEach(async () => {
    // Truncate all tables
    await query('TRUNCATE refresh_tokens, salary_records, employees, users, countries, departments CASCADE');

    // Create HR user
    token = jwt.sign({ userId: testUserId, role: 'hr_manager' }, env.JWT_SECRET);
    await query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [testUserId, 'hr_manager@acme.com', 'hash', 'Test HR Manager', 'hr_manager']
    );

    // Create department & country
    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [engDeptId, 'Engineering']);
    await query('INSERT INTO countries (id, name, code, currency_code) VALUES ($1, $2, $3, $4)', [
      usCountryId,
      'United States',
      'US',
      'USD',
    ]);

    // Insert Employee 1 (with salaries)
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp1Id, 'EMP-100', 'Alice', 'Smith', 'alice.smith@acme.com', engDeptId, usCountryId, 'active', '2026-01-01']
    );

    // Insert Employee 2 (no salaries)
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [empNoSalaryId, 'EMP-200', 'Bob', 'Jones', 'bob.jones@acme.com', engDeptId, usCountryId, 'active', '2026-02-01']
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/v1/employees/:id/salary', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/employees/${emp1Id}/salary`);
      expect(res.status).toBe(401);
    });

    it('returns 404 with standard code for nonexistent employee ID', async () => {
      const nonexistentId = '99999999-9999-9999-9999-999999999999';
      const res = await request(app)
        .get(`/api/v1/employees/${nonexistentId}/salary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      const body = res.body as ApiResponse;
      expect(body.error).toBeDefined();
      if (body.error && typeof body.error === 'object') {
        expect(body.error.code).toBe('EMPLOYEE_NOT_FOUND');
      }
    });

    it('returns 400 for malformed employee ID', async () => {
      const res = await request(app)
        .get('/api/v1/employees/not-a-uuid/salary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Validation failed');
    });

    it('returns null if employee exists but has no salary records', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${empNoSalaryId}/salary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse;
      expect(body.data).toBeNull();
    });

    it('returns current salary matching latest effectiveDate', async () => {
      // Seed historical records
      await query(
        `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, effective_date, reason, changed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [emp1Id, 80000, 'USD', 'annual', '2026-01-01', 'HIRE', testUserId]
      );
      await query(
        `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, effective_date, reason, changed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [emp1Id, 85000, 'USD', 'annual', '2026-06-01', 'PROMOTION', testUserId]
      );

      const res = await request(app)
        .get(`/api/v1/employees/${emp1Id}/salary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestSalaryRecord>;
      const record = body.data;
      expect(record).toBeDefined();
      if (record) {
        expect(record.amount).toBe(85000);
        expect(record.effectiveDate).toBe('2026-06-01');
        expect(record.changedBy.email).toBe('hr_manager@acme.com');
      }
    });

    it('applies createdAt DESC tie-breaker for same effectiveDate', async () => {
      // Seed two records with same effectiveDate but different createdAt
      const rec1Id = 'f1111111-1111-1111-1111-111111111111';
      const rec2Id = 'f2222222-2222-2222-2222-222222222222';

      await query(
        `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, effective_date, reason, changed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [rec1Id, emp1Id, 90000, 'USD', 'annual', '2026-08-01', 'HIRE', testUserId, '2026-08-01T10:00:00.000Z']
      );

      await query(
        `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, effective_date, reason, changed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [rec2Id, emp1Id, 95000, 'USD', 'annual', '2026-08-01', 'ADJUSTMENT', testUserId, '2026-08-01T14:00:00.000Z']
      );

      const res = await request(app)
        .get(`/api/v1/employees/${emp1Id}/salary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestSalaryRecord>;
      const record = body.data;
      expect(record).toBeDefined();
      if (record) {
        expect(record.amount).toBe(95000);
        expect(record.reason).toBe('ADJUSTMENT');
      }
    });
  });

  describe('POST /api/v1/employees/:id/salary', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).post(`/api/v1/employees/${emp1Id}/salary`).send({});
      expect(res.status).toBe(401);
    });

    it('creates a new salary record successfully with valid payload', async () => {
      const payload = {
        amount: 110000,
        currencyCode: 'USD',
        payFrequency: 'annual',
        grade: 'G4',
        band: 'Lead',
        effectiveDate: '2026-08-01',
        reason: 'Annual salary review',
        notes: 'Exceptional performance',
      };

      const res = await request(app)
        .post(`/api/v1/employees/${emp1Id}/salary`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      const body = res.body as ApiResponse<TestSalaryRecord>;
      const record = body.data;
      expect(record).toBeDefined();
      if (record) {
        expect(record.amount).toBe(110000);
        expect(record.band).toBe('Lead');
        expect(record.changedBy.id).toBe(testUserId);
        expect(record.changedBy.email).toBe('hr_manager@acme.com');
      }
    });

    it('returns 400 validation error for negative amount', async () => {
      const payload = {
        amount: -100,
        currencyCode: 'USD',
        payFrequency: 'annual',
        effectiveDate: '2026-08-01',
        reason: 'Promotion',
      };

      const res = await request(app)
        .post(`/api/v1/employees/${emp1Id}/salary`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Validation failed');
      expect(body.details?.amount).toBeDefined();
    });

    it('returns 400 validation error for future effective date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const futureDateStr = tomorrow.toISOString().split('T')[0];

      const payload = {
        amount: 70000,
        currencyCode: 'USD',
        payFrequency: 'annual',
        effectiveDate: futureDateStr,
        reason: 'Future planning',
      };

      const res = await request(app)
        .post(`/api/v1/employees/${emp1Id}/salary`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Validation failed');
      expect(body.details?.effectiveDate).toBeDefined();
    });
  });

  describe('GET /api/v1/employees/:id/salary/history', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/employees/${emp1Id}/salary/history`);
      expect(res.status).toBe(401);
    });

    it('returns paginated chronological salary changes', async () => {
      // Seed salary history: three records
      await query(
        `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, effective_date, reason, changed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [emp1Id, 80000, 'USD', 'annual', '2026-01-01', 'HIRE', testUserId, '2026-01-01T09:00:00.000Z']
      );
      await query(
        `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, effective_date, reason, changed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [emp1Id, 85000, 'USD', 'annual', '2026-06-01', 'PROMOTION', testUserId, '2026-06-01T09:00:00.000Z']
      );
      await query(
        `INSERT INTO salary_records (employee_id, amount, currency_code, pay_frequency, effective_date, reason, changed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [emp1Id, 1500000, 'INR', 'monthly', '2026-08-01', 'RELOCATION', testUserId, '2026-08-01T09:00:00.000Z']
      );

      const res = await request(app)
        .get(`/api/v1/employees/${emp1Id}/salary/history?page=1&pageSize=5`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestSalaryHistoryItem[]>;
      const history = body.data;
      expect(history).toBeDefined();
      if (history) {
        expect(history).toHaveLength(3);
        expect(body.meta).toEqual({
          page: 1,
          pageSize: 5,
          total: 3,
          totalPages: 1,
        });

        // Sorting check: newest effective date first
        expect(history[0].newAmount).toBe(1500000);
        expect(history[0].currencyCode).toBe('INR');
        expect(history[0].oldAmount).toBe(85000);
        expect(history[0].oldCurrencyCode).toBe('USD'); // Multi-currency check passes!

        expect(history[1].newAmount).toBe(85000);
        expect(history[1].oldAmount).toBe(80000);
        expect(history[1].oldCurrencyCode).toBe('USD');

        // First record must have oldAmount = null
        expect(history[2].newAmount).toBe(80000);
        expect(history[2].oldAmount).toBeNull();
        expect(history[2].oldCurrencyCode).toBeNull();
      }
    });

    it('returns 400 for excessive pageSize (> 100)', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${emp1Id}/salary/history?pageSize=101`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Validation failed');
    });
  });
});
