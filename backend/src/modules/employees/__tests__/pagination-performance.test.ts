/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import request from 'supertest';
import app from '../../../app';
import { query } from '../../../config/db';
import { hashPassword } from '../../../utils/crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

describe('Phase 10: Pagination Boundaries & Performance Budget Tests (QA-4, QA-6)', () => {
  let token: string;
  const testUserId = 'd2222222-2222-2222-2222-222222222222';
  const engDeptId = '2a830ad1-4828-406a-a23e-bce4e101bf88';
  const usCountryId = '112ab92c-6339-4d6b-b0b3-d08efb26c2e3';

  beforeEach(async () => {
    await query('TRUNCATE refresh_tokens, salary_records, employees, users, countries, departments CASCADE');

    const passwordHash = hashPassword('password123');
    await query(
      `INSERT INTO users (id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [testUserId, 'perf_test_hr@acme.com', passwordHash, 'Perf HR', 'hr_manager'],
    );

    token = jwt.sign(
      { userId: testUserId, email: 'perf_test_hr@acme.com', role: 'hr_manager' },
      env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [engDeptId, 'Engineering']);
    await query('INSERT INTO countries (id, name, code, currency_code) VALUES ($1, $2, $3, $4)', [
      usCountryId,
      'United States',
      'US',
      'USD',
    ]);

    // Insert sample employees for pagination verification
    const employeeRows: unknown[][] = [];
    for (let i = 1; i <= 30; i++) {
      const empNo = `EMP-TEST-${String(i).padStart(3, '0')}`;
      employeeRows.push([
        crypto.randomUUID(),
        empNo,
        `First${i}`,
        `Last${i}`,
        `test.${i}@acme.com`,
        engDeptId,
        usCountryId,
        'active',
        '2026-01-01',
      ]);
    }

    for (const row of employeeRows) {
      await query(
        `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        row,
      );
    }
  });

  it('QA-4: Handles first page (page 1) boundary correctly', async () => {
    const res = await request(app)
      .get('/api/v1/employees?page=1&pageSize=25')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(25);
    expect(res.body.data.length).toBe(25);
    expect(res.body.meta.total).toBe(30);
    expect(res.body.meta.totalPages).toBe(2);
  });

  it('QA-4: Handles empty search result boundaries gracefully without errors', async () => {
    const res = await request(app)
      .get('/api/v1/employees?search=nonexistent_employee_query_xyz_12345')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
    expect(res.body.meta.totalPages).toBe(0);
  });

  it('QA-6: Deep pagination query executes within performance budget (< 500ms)', async () => {
    const startTime = performance.now();

    const res = await request(app)
      .get('/api/v1/employees?page=2&pageSize=25')
      .set('Authorization', `Bearer ${token}`);

    const duration = performance.now() - startTime;

    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(2);
    expect(res.body.data.length).toBe(5);

    // Performance budget: DB + Express query response should be well under 500ms
    expect(duration).toBeLessThan(500);
  });
});
