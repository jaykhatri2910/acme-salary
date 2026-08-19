import { query } from '../../config/db';

export interface CreateSalaryInput {
  amount: number;
  currencyCode: string;
  payFrequency: string;
  grade?: string;
  band?: string;
  effectiveDate: string;
  reason: string;
  notes?: string;
}

export interface SalaryRecord {
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

export interface SalaryHistoryItem {
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

/**
 * Check if an employee exists in the database.
 */
export async function employeeExists(id: string): Promise<boolean> {
  const res = await query('SELECT 1 FROM employees WHERE id = $1', [id]);
  return res.rows.length > 0;
}

/**
 * Get the current salary record of an employee.
 * Current salary is defined as the record with the latest effective_date,
 * using created_at DESC as the deterministic tie-breaker.
 */
export async function getCurrentSalary(employeeId: string): Promise<SalaryRecord | null> {
  const sql = `
    SELECT
      s.id,
      s.employee_id,
      s.amount::numeric AS amount,
      s.currency_code,
      s.effective_date::text AS effective_date,
      s.pay_frequency,
      s.grade,
      s.band,
      s.reason,
      s.notes,
      s.created_at,
      u.id AS user_id,
      u.email AS user_email
    FROM salary_records s
    JOIN users u ON s.changed_by = u.id
    WHERE s.employee_id = $1
    ORDER BY s.effective_date DESC, s.created_at DESC
    LIMIT 1
  `;
  const res = await query<{
    id: string;
    employee_id: string;
    amount: string;
    currency_code: string;
    effective_date: string;
    pay_frequency: string;
    grade: string | null;
    band: string | null;
    reason: string;
    notes: string | null;
    created_at: Date;
    user_id: string;
    user_email: string;
    [key: string]: unknown;
  }>(sql, [employeeId]);

  if (res.rows.length === 0) {
    return null;
  }
  const row = res.rows[0];
  return {
    id: row.id,
    employeeId: row.employee_id,
    amount: Number(row.amount),
    currencyCode: row.currency_code.trim(),
    effectiveDate: row.effective_date,
    payFrequency: row.pay_frequency,
    grade: row.grade,
    band: row.band,
    reason: row.reason,
    notes: row.notes,
    changedBy: {
      id: row.user_id,
      email: row.user_email,
    },
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Create a new salary record for an employee.
 */
export async function createSalaryRecord(
  employeeId: string,
  data: CreateSalaryInput,
  actorId: string,
): Promise<SalaryRecord> {
  const sql = `
    INSERT INTO salary_records (
      employee_id,
      amount,
      currency_code,
      pay_frequency,
      grade,
      band,
      effective_date,
      reason,
      notes,
      changed_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, created_at
  `;
  const res = await query<{ id: string; created_at: Date; [key: string]: unknown }>(sql, [
    employeeId,
    data.amount,
    data.currencyCode.toUpperCase(),
    data.payFrequency,
    data.grade ?? null,
    data.band ?? null,
    data.effectiveDate,
    data.reason,
    data.notes ?? null,
    actorId,
  ]);

  const inserted = res.rows[0];

  // Fetch actor email
  const userSql = 'SELECT email FROM users WHERE id = $1';
  const userRes = await query<{ email: string; [key: string]: unknown }>(userSql, [actorId]);
  const actorEmail = userRes.rows[0]?.email ?? '';

  return {
    id: inserted.id,
    employeeId,
    amount: data.amount,
    currencyCode: data.currencyCode.toUpperCase(),
    effectiveDate: data.effectiveDate,
    payFrequency: data.payFrequency,
    grade: data.grade ?? null,
    band: data.band ?? null,
    reason: data.reason,
    notes: data.notes ?? null,
    changedBy: {
      id: actorId,
      email: actorEmail,
    },
    createdAt: inserted.created_at.toISOString(),
  };
}

/**
 * Get chronological salary history for an employee.
 * Uses window function LAG to resolve oldAmount and oldCurrencyCode.
 */
export async function getSalaryHistory(
  employeeId: string,
  page: number,
  pageSize: number,
): Promise<{ history: SalaryHistoryItem[]; total: number }> {
  const countSql = 'SELECT COUNT(*)::int AS total FROM salary_records WHERE employee_id = $1';
  const countRes = await query<{ total: number; [key: string]: unknown }>(countSql, [employeeId]);
  const total = countRes.rows[0]?.total ?? 0;

  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT
      sub.id,
      sub.employee_id,
      sub.amount::numeric AS new_amount,
      sub.old_amount::numeric AS old_amount,
      sub.old_currency_code,
      sub.currency_code,
      sub.effective_date::text AS effective_date,
      sub.pay_frequency,
      sub.grade,
      sub.band,
      sub.reason,
      sub.notes,
      sub.created_at,
      u.id AS user_id,
      u.email AS user_email
    FROM (
      SELECT
        s.id,
        s.employee_id,
        s.amount,
        LAG(s.amount) OVER (
          PARTITION BY s.employee_id
          ORDER BY s.effective_date ASC, s.created_at ASC
        ) AS old_amount,
        LAG(s.currency_code) OVER (
          PARTITION BY s.employee_id
          ORDER BY s.effective_date ASC, s.created_at ASC
        ) AS old_currency_code,
        s.currency_code,
        s.effective_date,
        s.pay_frequency,
        s.grade,
        s.band,
        s.reason,
        s.notes,
        s.changed_by,
        s.created_at
      FROM salary_records s
      WHERE s.employee_id = $1
    ) sub
    JOIN users u ON sub.changed_by = u.id
    ORDER BY sub.effective_date DESC, sub.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const res = await query<{
    id: string;
    employee_id: string;
    new_amount: string;
    old_amount: string | null;
    old_currency_code: string | null;
    currency_code: string;
    effective_date: string;
    pay_frequency: string;
    grade: string | null;
    band: string | null;
    reason: string;
    notes: string | null;
    created_at: Date;
    user_id: string;
    user_email: string;
    [key: string]: unknown;
  }>(sql, [employeeId, pageSize, offset]);

  const history: SalaryHistoryItem[] = res.rows.map((row) => ({
    id: row.id,
    oldAmount: row.old_amount !== null ? Number(row.old_amount) : null,
    oldCurrencyCode: row.old_currency_code ? row.old_currency_code.trim() : null,
    newAmount: Number(row.new_amount),
    currencyCode: row.currency_code.trim(),
    effectiveDate: row.effective_date,
    payFrequency: row.pay_frequency,
    grade: row.grade,
    band: row.band,
    reason: row.reason,
    notes: row.notes,
    changedBy: {
      id: row.user_id,
      email: row.user_email,
    },
    createdAt: row.created_at.toISOString(),
  }));

  return { history, total };
}
