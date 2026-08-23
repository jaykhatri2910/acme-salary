import { query } from '../../config/db';

export interface AnalyticsFilters {
  department?: string;
  country?: string;
}

export interface SalaryStatistics {
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
}

export interface DepartmentBreakdown {
  department: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
}

export interface CountryBreakdown {
  country: string;
  countryCode: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
}

export interface PayBandDistribution {
  band: string | null;
  headcount: number;
}

export interface AnalyticsSummary {
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
  byDepartment: DepartmentBreakdown[];
  byCountry: CountryBreakdown[];
  payBandDistribution: PayBandDistribution[];
  currentExchangeRates: { currency: string; rateToUsd: number }[];
}

export interface ExportFilters {
  search?: string;
  department?: string;
  country?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ExportRow {
  employeeNo: string;
  employeeName: string;
  department: string;
  country: string;
  status: string;
  salary: number | null;
  currencyCode: string | null;
  payFrequency: string | null;
  effectiveDate: string | null;
}

/**
 * Returns analytics based on the current salary record for each employee.
 * Current salary:
 *   1. Latest effective_date
 *   2. created_at DESC as tie-breaker
 *
 * All aggregation is performed by PostgreSQL.
 */
export async function getAnalyticsSummary(
  filters: AnalyticsFilters = {},
): Promise<AnalyticsSummary> {
  const values: string[] = [];
  const conditions: string[] = [];

  if (filters.department) {
    values.push(filters.department);
    conditions.push(`e.department_id = $${values.length}`);
  }

  if (filters.country) {
    values.push(filters.country);
    conditions.push(`e.country_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    WITH current_salaries AS (
      SELECT
        s.employee_id,
        s.amount,
        s.currency_code,
        s.pay_frequency,
        s.band,
        ROW_NUMBER() OVER (
          PARTITION BY s.employee_id
          ORDER BY s.effective_date DESC, s.created_at DESC
        ) AS rn
      FROM salary_records s
    ),

    employee_salaries AS (
      SELECT
        e.id AS employee_id,
        e.status,
        d.name AS department,
        c.name AS country,
        c.code AS country_code,
        cs.band,
        (
          cs.amount * er.rate
        )::numeric AS salary_usd
      FROM employees e
      INNER JOIN current_salaries cs
        ON cs.employee_id = e.id
       AND cs.rn = 1
      INNER JOIN departments d
        ON d.id = e.department_id
      INNER JOIN countries c
        ON c.id = e.country_id
      INNER JOIN LATERAL (
        SELECT CASE
          WHEN cs.currency_code = 'USD' THEN 1.0
          ELSE (
            SELECT er.rate
            FROM exchange_rates er
            WHERE er.from_currency = cs.currency_code
              AND er.to_currency = 'USD'
            ORDER BY er.effective_date DESC
            LIMIT 1
          )
        END AS rate
      ) er ON TRUE
      ${whereClause}
    ),

    overall_stats AS (
      SELECT
        COUNT(*)::int AS headcount,
        COALESCE(SUM(salary_usd), 0)::numeric AS total_payroll_usd,
        COALESCE(AVG(salary_usd), 0)::numeric AS average_salary_usd,
        COALESCE(
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_usd),
          0
        )::numeric AS median_salary_usd,
        COALESCE(MIN(salary_usd), 0)::numeric AS min_salary_usd,
        COALESCE(MAX(salary_usd), 0)::numeric AS max_salary_usd
      FROM employee_salaries
    ),

    department_stats AS (
      SELECT
        department,
        COUNT(*)::int AS headcount,
        COALESCE(SUM(salary_usd), 0)::numeric AS total_payroll_usd,
        COALESCE(AVG(salary_usd), 0)::numeric AS average_salary_usd,
        COALESCE(
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_usd),
          0
        )::numeric AS median_salary_usd,
        COALESCE(MIN(salary_usd), 0)::numeric AS min_salary_usd,
        COALESCE(MAX(salary_usd), 0)::numeric AS max_salary_usd
      FROM employee_salaries
      GROUP BY department
      ORDER BY department
    ),

    country_stats AS (
      SELECT
        country,
        country_code AS "countryCode",
        COUNT(*)::int AS headcount,
        COALESCE(SUM(salary_usd), 0)::numeric AS total_payroll_usd,
        COALESCE(AVG(salary_usd), 0)::numeric AS average_salary_usd,
        COALESCE(
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_usd),
          0
        )::numeric AS median_salary_usd,
        COALESCE(MIN(salary_usd), 0)::numeric AS min_salary_usd,
        COALESCE(MAX(salary_usd), 0)::numeric AS max_salary_usd
      FROM employee_salaries
      GROUP BY country, country_code
      ORDER BY country
    ),

    band_stats AS (
      SELECT
        band,
        COUNT(*)::int AS headcount
      FROM employee_salaries
      GROUP BY band
      ORDER BY band NULLS LAST
    ),

    exchange_rates_summary AS (
      SELECT
        from_currency AS currency,
        rate AS rate_to_usd,
        ROW_NUMBER() OVER (PARTITION BY from_currency ORDER BY effective_date DESC) as rn
      FROM exchange_rates
      WHERE to_currency = 'USD'
    ),

    latest_rates AS (
      SELECT currency, rate_to_usd FROM exchange_rates_summary WHERE rn = 1
    )

    SELECT
      (
        SELECT row_to_json(overall_stats)
        FROM overall_stats
      ) AS overall,

      COALESCE(
        (
          SELECT json_agg(department_stats)
          FROM department_stats
        ),
        '[]'::json
      ) AS department_breakdown,

      COALESCE(
        (
          SELECT json_agg(country_stats)
          FROM country_stats
        ),
        '[]'::json
      ) AS country_breakdown,

      COALESCE(
        (
          SELECT json_agg(band_stats)
          FROM band_stats
        ),
        '[]'::json
      ) AS pay_band_distribution,

      COALESCE(
        (
          SELECT json_agg(latest_rates)
          FROM latest_rates
        ),
        '[]'::json
      ) AS current_exchange_rates
  `;

  const result = await query<{
    overall: {
      headcount: number;
      total_payroll_usd: string;
      average_salary_usd: string;
      median_salary_usd: string;
      min_salary_usd: string;
      max_salary_usd: string;
    };
    department_breakdown: Array<{
      department: string;
      headcount: number;
      total_payroll_usd: string;
      average_salary_usd: string;
      median_salary_usd: string;
      min_salary_usd: string;
      max_salary_usd: string;
    }>;
    country_breakdown: Array<{
      country: string;
      countryCode: string;
      headcount: number;
      total_payroll_usd: string;
      average_salary_usd: string;
      median_salary_usd: string;
      min_salary_usd: string;
      max_salary_usd: string;
    }>;
    pay_band_distribution: Array<{
      band: string | null;
      headcount: number;
    }>;
    current_exchange_rates: Array<{
      currency: string;
      rate_to_usd: string;
    }>;
  }>(sql, values);

  const row = result.rows[0];

  if (!row) {
    return {
      headcount: 0,
      totalPayrollUsd: 0,
      averageSalaryUsd: 0,
      medianSalaryUsd: 0,
      minSalaryUsd: 0,
      maxSalaryUsd: 0,
      byDepartment: [],
      byCountry: [],
      payBandDistribution: [],
      currentExchangeRates: [],
    };
  }

  const mapStatistics = (item: {
    headcount: number;
    total_payroll_usd: string | number;
    average_salary_usd: string | number;
    median_salary_usd: string | number;
    min_salary_usd: string | number;
    max_salary_usd: string | number;
  }) => ({
    headcount: item.headcount,
    totalPayrollUsd: Number(item.total_payroll_usd),
    averageSalaryUsd: Number(item.average_salary_usd),
    medianSalaryUsd: Number(item.median_salary_usd),
    minSalaryUsd: Number(item.min_salary_usd),
    maxSalaryUsd: Number(item.max_salary_usd),
  });

  return {
    ...mapStatistics(row.overall),
    byDepartment: row.department_breakdown.map((item) => ({
      department: item.department,
      ...mapStatistics(item),
    })),
    byCountry: row.country_breakdown.map((item) => ({
      country: item.country,
      countryCode: item.countryCode,
      ...mapStatistics(item),
    })),
    payBandDistribution: row.pay_band_distribution.map((item) => ({
      band: item.band,
      headcount: item.headcount,
    })),
    currentExchangeRates: row.current_exchange_rates.map((item) => ({
      currency: item.currency,
      rateToUsd: Number(item.rate_to_usd),
    })),
  };
}

/**
 * Fetch a chunk of employee records for exporting.
 */
export async function getExportChunk(
  filters: ExportFilters,
  limit: number,
  offset: number,
): Promise<ExportRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`e.status = $${values.length}`);
  }

  if (filters.department) {
    values.push(filters.department);
    conditions.push(`e.department_id = $${values.length}`);
  }

  if (filters.country) {
    values.push(filters.country);
    conditions.push(`e.country_id = $${values.length}`);
  }

  if (filters.search) {
    const trimmed = filters.search.trim();
    values.push(`%${trimmed}%`);
    conditions.push(
      `(e.first_name ILIKE $${values.length} OR e.last_name ILIKE $${values.length} OR (e.first_name || ' ' || e.last_name) ILIKE $${values.length} OR (e.last_name || ' ' || e.first_name) ILIKE $${values.length} OR e.employee_no ILIKE $${values.length})`,
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Sorting
  let orderBy = 'ORDER BY e.last_name ASC, e.first_name ASC';
  const order = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const nullsOrder = filters.sortOrder === 'desc' ? 'NULLS LAST' : 'NULLS FIRST';

  if (filters.sortBy === 'name') {
    orderBy = `ORDER BY e.first_name ${order}, e.last_name ${order}`;
  } else if (filters.sortBy === 'department') {
    orderBy = `ORDER BY d.name ${order}`;
  } else if (filters.sortBy === 'country') {
    orderBy = `ORDER BY c.name ${order}`;
  } else if (filters.sortBy === 'salary') {
    orderBy = `ORDER BY latest_sal.amount ${order} ${nullsOrder}`;
  }

  const chunkValues = [...values];
  chunkValues.push(limit);
  const limitPlaceholder = `$${chunkValues.length}`;
  chunkValues.push(offset);
  const offsetPlaceholder = `$${chunkValues.length}`;

  const sql = `
    SELECT
      e.employee_no,
      e.first_name,
      e.last_name,
      e.status,
      d.name AS department_name,
      c.name AS country_name,
      latest_sal.amount::numeric AS current_salary,
      latest_sal.currency_code AS currency_code,
      latest_sal.pay_frequency AS pay_frequency,
      latest_sal.effective_date::text AS salary_effective_date
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN countries c ON e.country_id = c.id
    LEFT JOIN LATERAL (
      SELECT amount, currency_code, pay_frequency, effective_date
      FROM salary_records
      WHERE employee_id = e.id
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    ) latest_sal ON true
    ${whereClause}
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;

  const res = await query<{
    employee_no: string;
    first_name: string;
    last_name: string;
    status: string;
    department_name: string;
    country_name: string;
    current_salary: string | null;
    currency_code: string | null;
    pay_frequency: string | null;
    salary_effective_date: string | null;
    [key: string]: unknown;
  }>(sql, chunkValues);

  return res.rows.map((row) => ({
    employeeNo: row.employee_no,
    employeeName: `${row.first_name} ${row.last_name}`,
    department: row.department_name,
    country: row.country_name,
    status: row.status,
    salary: row.current_salary !== null ? Number(row.current_salary) : null,
    currencyCode: row.currency_code ? row.currency_code.trim() : null,
    payFrequency: row.pay_frequency,
    effectiveDate: row.salary_effective_date,
  }));
}