import { query } from '../../config/db';

export interface GetEmployeesParams {
  page: number;
  pageSize: number;
  search?: string;
  department?: string;
  country?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'department' | 'country' | 'salary';
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeListItem {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
    code: string;
  };
  employmentStatus: string;
  currentSalary: {
    amount: number;
    currencyCode: string;
    payFrequency: string;
  } | null;
}

export interface EmployeeDetail {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
    code: string;
  };
  employmentStatus: string;
  currentSalary: {
    id: string;
    amount: number;
    currencyCode: string;
    effectiveDate: string;
    payFrequency: string;
    grade: string | null;
    band: string | null;
  } | null;
}

export type Department = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export type Country = {
  id: string;
  name: string;
  code: string;
  [key: string]: unknown;
};

type EmployeeDbRow = {
  id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  hire_date: string;
  created_at: Date;
  updated_at: Date;
  department_name: string;
  department_id: string;
  country_name: string;
  country_id: string;
  country_code: string;
  salary_record_id?: string | null;
  current_salary: string | null;
  currency_code: string | null;
  pay_frequency: string | null;
  grade: string | null;
  salary_effective_date?: string | null;
  [key: string]: unknown;
};

/**
 * Maps grade values (e.g. G1-G5) to pay bands.
 */
function getBandFromGrade(grade: string | null): string | null {
  if (!grade) return null;
  switch (grade.toUpperCase()) {
    case 'G1':
      return 'Junior';
    case 'G2':
      return 'Mid';
    case 'G3':
      return 'Senior';
    case 'G4':
      return 'Lead';
    case 'G5':
      return 'Director';
    default:
      return grade;
  }
}

/**
 * Fetch a paginated, filtered, and sorted list of employees.
 * Employs a LATERAL join to efficiently fetch only the latest salary record.
 */
export async function getEmployees(
  params: GetEmployeesParams,
): Promise<{ employees: EmployeeListItem[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.status) {
    values.push(params.status);
    conditions.push(`e.status = $${values.length}`);
  }

  if (params.department) {
    values.push(params.department);
    conditions.push(`e.department_id = $${values.length}`);
  }

  if (params.country) {
    values.push(params.country);
    conditions.push(`e.country_id = $${values.length}`);
  }

  if (params.search) {
    const trimmed = params.search.trim();
    values.push(`%${trimmed}%`);
    conditions.push(
      `(e.first_name ILIKE $${values.length} OR e.last_name ILIKE $${values.length} OR (e.first_name || ' ' || e.last_name) ILIKE $${values.length} OR (e.last_name || ' ' || e.first_name) ILIKE $${values.length} OR e.employee_no ILIKE $${values.length})`,
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count of matched records (no need to perform joins or lateral subqueries)
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM employees e
    ${whereClause}
  `;
  const countRes = await query<{ total: number }>(countSql, values);
  const total = countRes.rows[0]?.total ?? 0;

  // Sorting
  let orderBy = 'ORDER BY e.last_name ASC, e.first_name ASC';
  const order = params.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const nullsOrder = params.sortOrder === 'desc' ? 'NULLS LAST' : 'NULLS FIRST';

  if (params.sortBy === 'name') {
    orderBy = `ORDER BY e.first_name ${order}, e.last_name ${order}`;
  } else if (params.sortBy === 'department') {
    orderBy = `ORDER BY d.name ${order}`;
  } else if (params.sortBy === 'country') {
    orderBy = `ORDER BY c.name ${order}`;
  } else if (params.sortBy === 'salary') {
    orderBy = `ORDER BY latest_sal.amount ${order} ${nullsOrder}`;
  }

  // Pagination params
  const limit = params.pageSize;
  const offset = (params.page - 1) * params.pageSize;

  const listValues = [...values];
  listValues.push(limit);
  const limitPlaceholder = `$${listValues.length}`;
  listValues.push(offset);
  const offsetPlaceholder = `$${listValues.length}`;

  const listSql = `
    SELECT
      e.id,
      e.employee_no,
      e.first_name,
      e.last_name,
      e.email,
      e.status,
      e.hire_date::text,
      e.created_at,
      e.updated_at,
      d.name AS department_name,
      d.id AS department_id,
      c.name AS country_name,
      c.id AS country_id,
      c.code AS country_code,
      latest_sal.amount AS current_salary,
      latest_sal.currency_code AS currency_code,
      latest_sal.pay_frequency AS pay_frequency,
      latest_sal.grade AS grade
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN countries c ON e.country_id = c.id
    LEFT JOIN LATERAL (
      SELECT amount, currency_code, pay_frequency, grade
      FROM salary_records
      WHERE employee_id = e.id
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    ) latest_sal ON true
    ${whereClause}
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;

  const listRes = await query<EmployeeDbRow>(listSql, listValues);

  const employees: EmployeeListItem[] = listRes.rows.map((row) => ({
    id: row.id,
    employeeNo: row.employee_no,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    email: row.email,
    department: {
      id: row.department_id,
      name: row.department_name,
    },
    country: {
      id: row.country_id,
      name: row.country_name,
      code: row.country_code,
    },
    employmentStatus: row.status,
    currentSalary: row.current_salary
      ? {
          amount: Number(row.current_salary),
          currencyCode: row.currency_code ?? '',
          payFrequency: row.pay_frequency ?? '',
        }
      : null,
  }));

  return { employees, total };
}

/**
 * Fetch a single employee by their ID, returning their current salary details.
 */
export async function getEmployeeById(id: string): Promise<EmployeeDetail | null> {
  const sql = `
    SELECT
      e.id,
      e.employee_no,
      e.first_name,
      e.last_name,
      e.email,
      e.status,
      e.hire_date::text,
      e.created_at,
      e.updated_at,
      d.name AS department_name,
      d.id AS department_id,
      c.name AS country_name,
      c.id AS country_id,
      c.code AS country_code,
      latest_sal.id AS salary_record_id,
      latest_sal.amount AS current_salary,
      latest_sal.currency_code AS currency_code,
      latest_sal.effective_date::text AS salary_effective_date,
      latest_sal.pay_frequency AS pay_frequency,
      latest_sal.grade AS grade
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN countries c ON e.country_id = c.id
    LEFT JOIN LATERAL (
      SELECT id, amount, currency_code, effective_date, pay_frequency, grade
      FROM salary_records
      WHERE employee_id = e.id
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    ) latest_sal ON true
    WHERE e.id = $1
  `;
  const res = await query<EmployeeDbRow>(sql, [id]);
  if (res.rows.length === 0) {
    return null;
  }
  const row = res.rows[0];
  return {
    id: row.id,
    employeeNo: row.employee_no,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    email: row.email,
    department: {
      id: row.department_id,
      name: row.department_name,
    },
    country: {
      id: row.country_id,
      name: row.country_name,
      code: row.country_code,
    },
    employmentStatus: row.status,
    currentSalary: row.current_salary
      ? {
          id: row.salary_record_id ?? '',
          amount: Number(row.current_salary),
          currencyCode: row.currency_code ?? '',
          effectiveDate: row.salary_effective_date ?? '',
          payFrequency: row.pay_frequency ?? '',
          grade: row.grade,
          band: getBandFromGrade(row.grade),
        }
      : null,
  };
}

/**
 * Fetch all departments ordered alphabetically.
 */
export async function getDepartments(): Promise<Department[]> {
  const res = await query<{ id: string; name: string }>(
    'SELECT id, name FROM departments ORDER BY name ASC',
  );
  return res.rows;
}

/**
 * Fetch all countries ordered alphabetically.
 */
export async function getCountries(): Promise<Country[]> {
  const res = await query<Country>(
    'SELECT id, name, code FROM countries ORDER BY name ASC',
  );
  return res.rows;
}
