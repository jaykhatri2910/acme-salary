import { pool, query } from '../../config/db';
import crypto from 'crypto';

describe('Database Schema, Triggers, and Constraints', () => {
  let userId: string;
  let deptId: string;
  let countryId: string;

  beforeEach(async () => {
    // Clean up test tables in correct dependency order
    await query('TRUNCATE refresh_tokens, salary_records, employees, users, exchange_rates, countries, departments CASCADE');

    // Create reference data needed for tests
    userId = crypto.randomUUID();
    deptId = crypto.randomUUID();
    countryId = crypto.randomUUID();

    await query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'test_hr@acme.com', 'hashed_pass_here', 'Test HR', 'hr_manager']
    );

    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [
      deptId,
      'Engineering'
    ]);

    await query(
      'INSERT INTO countries (id, name, code, currency_code) VALUES ($1, $2, $3, $4)',
      [countryId, 'United States', 'US', 'USD']
    );
  });

  afterAll(async () => {
    // Close pg pool cleanly at the end of tests
    await pool.end();
  });

  it('auto-updates employees.updated_at via trigger on update', async () => {
    const empId = crypto.randomUUID();
    const hireDate = '2026-01-01';

    // Insert employee
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [empId, 'EMP-001', 'Alice', 'Smith', 'alice@acme.com', deptId, countryId, hireDate]
    );

    // Fetch initial state
    const res1 = await query<{ created_at: Date; updated_at: Date }>(
      'SELECT created_at, updated_at FROM employees WHERE id = $1',
      [empId]
    );
    expect(res1.rows[0].created_at).toBeDefined();
    expect(res1.rows[0].updated_at).toBeDefined();

    // Sleep for 10ms to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Update employee status
    await query('UPDATE employees SET status = $1 WHERE id = $2', ['inactive', empId]);

    // Fetch updated state
    const res2 = await query<{ created_at: Date; updated_at: Date }>(
      'SELECT created_at, updated_at FROM employees WHERE id = $1',
      [empId]
    );
    expect(res2.rows[0].created_at.toISOString()).toBe(res1.rows[0].created_at.toISOString());
    expect(res2.rows[0].updated_at.getTime()).toBeGreaterThan(res1.rows[0].updated_at.getTime());
  });

  it('determines current salary deterministically from append-only history', async () => {
    const empId = crypto.randomUUID();
    const hireDate = '2026-01-01';

    // Insert employee
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [empId, 'EMP-002', 'Bob', 'Jones', 'bob@acme.com', deptId, countryId, hireDate]
    );

    // Insert initial salary record (HIRE)
    const sal1Id = crypto.randomUUID();
    const hireDateObj = new Date('2026-01-01T09:00:00Z');
    await query(
      `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, grade, effective_date, reason, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [sal1Id, empId, 50000.00, 'USD', 'annual', 'G1', '2026-01-01', 'HIRE', userId, hireDateObj.toISOString()]
    );

    // Insert promo record (effective_date = 2026-06-01)
    const sal2Id = crypto.randomUUID();
    const promoDateObj = new Date('2026-06-01T09:00:00Z');
    await query(
      `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, grade, effective_date, reason, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [sal2Id, empId, 60000.00, 'USD', 'annual', 'G2', '2026-06-01', 'PROMOTION', userId, promoDateObj.toISOString()]
    );

    // Insert adjustment record with same effective date but later created_at (tie-breaker check)
    const sal3Id = crypto.randomUUID();
    const adjDateObj = new Date('2026-06-01T14:00:00Z');
    await query(
      `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, grade, effective_date, reason, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [sal3Id, empId, 62000.00, 'USD', 'annual', 'G2', '2026-06-01', 'PERFORMANCE_REVIEW', userId, adjDateObj.toISOString()]
    );

    // Fetch salary history using the window function to derive old and new amounts
    const historyRes = await query<{
      id: string;
      new_amount: string;
      old_amount: string | null;
      effective_date: Date;
      reason: string;
    }>(
      `SELECT
        id,
        amount AS new_amount,
        LAG(amount) OVER (
          PARTITION BY employee_id
          ORDER BY effective_date ASC, created_at ASC
        ) AS old_amount,
        effective_date,
        reason
       FROM salary_records
       WHERE employee_id = $1
       ORDER BY effective_date DESC, created_at DESC`,
      [empId]
    );

    expect(historyRes.rows).toHaveLength(3);

    // Latest salary first (effective_date = 2026-06-01, created_at = 14:00:00Z)
    expect(historyRes.rows[0].id).toBe(sal3Id);
    expect(Number(historyRes.rows[0].new_amount)).toBe(62000.00);
    expect(Number(historyRes.rows[0].old_amount)).toBe(60000.00);
    expect(historyRes.rows[0].reason).toBe('PERFORMANCE_REVIEW');

    // Middle salary second (effective_date = 2026-06-01, created_at = 09:00:00Z)
    expect(historyRes.rows[1].id).toBe(sal2Id);
    expect(Number(historyRes.rows[1].new_amount)).toBe(60000.00);
    expect(Number(historyRes.rows[1].old_amount)).toBe(50000.00);
    expect(historyRes.rows[1].reason).toBe('PROMOTION');

    // Initial salary last
    expect(historyRes.rows[2].id).toBe(sal1Id);
    expect(Number(historyRes.rows[2].new_amount)).toBe(50000.00);
    expect(historyRes.rows[2].old_amount).toBeNull();
    expect(historyRes.rows[2].reason).toBe('HIRE');
  });
});
