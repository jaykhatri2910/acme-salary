/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import request from 'supertest';
import app from '../../app';
import { query } from '../../config/db';
import { hashPassword } from '../../utils/crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

describe('Phase 10: Security & Auth Gatekeeping Integration Tests', () => {
  let validToken: string;
  const testUserId = 'c1111111-1111-1111-1111-111111111111';
  const testEmpId = 'e1111111-1111-1111-1111-111111111111';
  const deptId = 'd1111111-1111-1111-1111-111111111111';
  const countryId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    // Clean & seed isolated test fixtures
    await query('TRUNCATE refresh_tokens, salary_records, employees, users, countries, departments CASCADE');

    const passwordHash = hashPassword('password123');
    await query(
      `INSERT INTO users (id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [testUserId, 'sec_test_hr@acme.com', passwordHash, 'Security HR', 'hr_manager'],
    );

    validToken = jwt.sign(
      { userId: testUserId, email: 'sec_test_hr@acme.com', role: 'hr_manager' },
      env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [deptId, 'Security Dept']);
    await query('INSERT INTO countries (id, name, code, currency_code) VALUES ($1, $2, $3, $4)', [
      countryId,
      'United States',
      'US',
      'USD',
    ]);

    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEmpId, 'EMP-SEC-001', 'Sec', 'User', 'sec.user@acme.com', deptId, countryId, 'active', '2026-01-01'],
    );
  });

  describe('QA-7: Authentication Gatekeeping (401 for all protected endpoints)', () => {
    const protectedGetEndpoints = [
      '/api/v1/employees',
      `/api/v1/employees/e1111111-1111-1111-1111-111111111111`,
      `/api/v1/employees/e1111111-1111-1111-1111-111111111111/salary`,
      `/api/v1/employees/e1111111-1111-1111-1111-111111111111/salary/history`,
      '/api/v1/analytics/summary',
      '/api/v1/analytics/export',
      '/api/v1/departments',
      '/api/v1/countries',
    ];

    it.each(protectedGetEndpoints)(
      'GET %s returns 401 when accessed without token',
      async (endpoint) => {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(401);
      },
    );

    it('POST /api/v1/employees/:id/salary returns 401 without token', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${testEmpId}/salary`)
        .send({
          amount: 100000,
          currencyCode: 'USD',
          effectiveDate: '2026-01-01',
          payFrequency: 'annual',
          reason: 'Unauthorized test',
        });
      expect(res.status).toBe(401);
    });

    it('rejects malformed or invalid JWT tokens with 401', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
    });
  });

  describe('QA-3: Error Responses (400, 404)', () => {
    it('returns 400 for invalid query parameters on /employees', async () => {
      const res = await request(app)
        .get('/api/v1/employees?page=invalid&pageSize=-5')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(400);
    });

    it('returns 400 when creating a salary with amount <= 0', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${testEmpId}/salary`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 0,
          currencyCode: 'USD',
          effectiveDate: '2026-01-01',
          payFrequency: 'annual',
          reason: 'Invalid 0 amount',
        });
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent employee UUID on GET /employees/:id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/employees/${nonExistentId}`)
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Salary Append-Only & Forbidden Field Isolation', () => {
    it('does not allow PUT or DELETE methods on salary endpoints', async () => {
      const putRes = await request(app)
        .put(`/api/v1/employees/${testEmpId}/salary`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: 120000 });
      expect(putRes.status).toBe(404);

      const deleteRes = await request(app)
        .delete(`/api/v1/employees/${testEmpId}/salary`)
        .set('Authorization', `Bearer ${validToken}`);
      expect(deleteRes.status).toBe(404);
    });

    it('derives changedBy from authenticated user and ignores spoofed changedBy/employeeId in body', async () => {
      const postRes = await request(app)
        .post(`/api/v1/employees/${testEmpId}/salary`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 98000,
          currencyCode: 'USD',
          effectiveDate: '2026-01-01',
          payFrequency: 'annual',
          reason: 'Security check',
          changedBy: { id: 'spoofed-id', email: 'hacker@evil.com' },
          employeeId: 'spoofed-emp-id',
          createdAt: '1970-01-01T00:00:00Z',
        });

      expect(postRes.status).toBe(201);
      const record = postRes.body.data;
      expect(record.employeeId).toBe(testEmpId);
      expect(record.changedBy.email).toBe('sec_test_hr@acme.com');
      expect(record.changedBy.id).toBe(testUserId);
    });
  });
});
