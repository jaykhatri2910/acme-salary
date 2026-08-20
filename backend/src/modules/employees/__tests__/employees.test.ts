import request from 'supertest';
import app from '../../../app';
import { query, pool } from '../../../config/db';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

interface TestEmployee {
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
    id?: string;
    amount: number;
    currencyCode: string;
    effectiveDate?: string;
    payFrequency: string;
    grade?: string | null;
    band?: string | null;
  } | null;
}

interface TestReference {
  id: string;
  name: string;
  code?: string;
}

interface ApiResponse<T = unknown> {
  data?: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
  details?: Record<string, string[]>;
}

describe('Employee API Endpoints', () => {
  let token: string;
  const testUserId = 'c28c8efd-bb7d-41a6-a36c-9c9891001a1c';
  
  const engDeptId = '2a830ad1-4828-406a-a23e-bce4e101bf88';
  const hrDeptId = '6e72b43b-4c5c-43f1-9316-2de5b7a149ff';
  
  const usCountryId = '112ab92c-6339-4d6b-b0b3-d08efb26c2e3';
  const inCountryId = '88cb077d-bb62-4217-a0cf-8a9d1234abcd';

  const emp1Id = 'e1111111-1111-1111-1111-111111111111';
  const emp2Id = 'e2222222-2222-2222-2222-222222222222';
  const emp3Id = 'e3333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    // Truncate in dependency order
    await query('TRUNCATE refresh_tokens, salary_records, employees, users, countries, departments CASCADE');

    // Create HR user
    token = jwt.sign({ userId: testUserId, role: 'hr_manager' }, env.JWT_SECRET);
    await query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [testUserId, 'hr_test@acme.com', 'hashed_password_placeholder', 'Test HR Manager', 'hr_manager']
    );

    // Create departments
    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [engDeptId, 'Engineering']);
    await query('INSERT INTO departments (id, name) VALUES ($1, $2)', [hrDeptId, 'Human Resources']);

    // Create countries
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

    // Insert Employee 1: Alice Smith (Engineering, US, active)
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp1Id, 'EMP-001', 'Alice', 'Smith', 'alice@acme.com', engDeptId, usCountryId, 'active', '2026-01-01']
    );
    await query(
      `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, grade, effective_date, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'f1111111-1111-1111-1111-111111111111',
        emp1Id,
        100000.00,
        'USD',
        'annual',
        'G3',
        '2026-01-01',
        'HIRE',
        testUserId,
      ]
    );

    // Insert Employee 2: Bob Jones (Engineering, IN, active)
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp2Id, 'EMP-002', 'Bob', 'Jones', 'bob@acme.com', engDeptId, inCountryId, 'active', '2026-02-01']
    );
    // Initial salary HIRE
    await query(
      `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, grade, effective_date, reason, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'f2222222-2222-2222-2222-222222222222',
        emp2Id,
        1500000.00,
        'INR',
        'monthly',
        'G2',
        '2026-02-01',
        'HIRE',
        testUserId,
        new Date('2026-02-01T09:00:00Z').toISOString(),
      ]
    );
    // Promotional salary update (later effective date and created_at)
    await query(
      `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, grade, effective_date, reason, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'f2222222-2222-2222-2222-333333333333',
        emp2Id,
        1600000.00,
        'INR',
        'monthly',
        'G2',
        '2026-06-01',
        'PROMOTION',
        testUserId,
        new Date('2026-06-01T09:00:00Z').toISOString(),
      ]
    );

    // Insert Employee 3: Charlie Brown (Human Resources, US, inactive)
    await query(
      `INSERT INTO employees (id, employee_no, first_name, last_name, email, department_id, country_id, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emp3Id, 'EMP-003', 'Charlie', 'Brown', 'charlie@acme.com', hrDeptId, usCountryId, 'inactive', '2026-03-01']
    );
    await query(
      `INSERT INTO salary_records (id, employee_id, amount, currency_code, pay_frequency, grade, effective_date, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'f3333333-3333-3333-3333-333333333333',
        emp3Id,
        80000.00,
        'USD',
        'annual',
        'G2',
        '2026-03-01',
        'HIRE',
        testUserId,
      ]
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/v1/employees', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/employees');
      const body = res.body as ApiResponse;
      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns a paginated list of employees with default sorting (lastName ASC)', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(3);
        expect(body.meta).toEqual({
          page: 1,
          pageSize: 25,
          total: 3,
          totalPages: 1,
        });

        // Assert default sort order: Brown -> Jones -> Smith
        expect(employees[0].lastName).toBe('Brown');
        expect(employees[1].lastName).toBe('Jones');
        expect(employees[2].lastName).toBe('Smith');

        // Assert Employee 2 has the rotated/latest salary record details (1600000 INR)
        const bob = employees.find((e) => e.id === emp2Id);
        expect(bob).toBeDefined();
        if (bob && bob.currentSalary) {
          expect(bob.currentSalary.amount).toBe(1600000);
          expect(bob.currentSalary.currencyCode).toBe('INR');
          expect(bob.currentSalary.payFrequency).toBe('monthly');
        }
      }
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/v1/employees?status=inactive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(1);
        expect(employees[0].id).toBe(emp3Id);
        expect(body.meta?.total).toBe(1);
        expect(body.meta?.totalPages).toBe(1);
      }
    });

    it('filters by department', async () => {
      const res = await request(app)
        .get(`/api/v1/employees?department=${hrDeptId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(1);
        expect(employees[0].id).toBe(emp3Id);
      }
    });

    it('filters by country', async () => {
      const res = await request(app)
        .get(`/api/v1/employees?country=${usCountryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(2);
        expect(employees.map((e) => e.firstName)).toContain('Alice');
        expect(employees.map((e) => e.firstName)).toContain('Charlie');
      }
    });

    it('supports search by name case-insensitively', async () => {
      const res = await request(app)
        .get('/api/v1/employees?search=ali')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(1);
        expect(employees[0].id).toBe(emp1Id);
      }
    });

    it('supports search by full name (first and last name)', async () => {
      const res = await request(app)
        .get('/api/v1/employees?search=Alice%20Smith')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(1);
        expect(employees[0].id).toBe(emp1Id);
      }
    });

    it('supports search by employee no', async () => {
      const res = await request(app)
        .get('/api/v1/employees?search=EMP-003')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(1);
        expect(employees[0].id).toBe(emp3Id);
      }
    });

    it('supports sorting by salary asc/desc', async () => {
      const resDesc = await request(app)
        .get('/api/v1/employees?sortBy=salary&sortOrder=desc')
        .set('Authorization', `Bearer ${token}`);

      expect(resDesc.status).toBe(200);
      const bodyDesc = resDesc.body as ApiResponse<TestEmployee[]>;
      const employeesDesc = bodyDesc.data;
      expect(employeesDesc).toBeDefined();
      if (employeesDesc) {
        expect(employeesDesc[0].id).toBe(emp2Id); // 1,600,000 INR
        expect(employeesDesc[1].id).toBe(emp1Id); // 100,000 USD
        expect(employeesDesc[2].id).toBe(emp3Id); // 80,000 USD
      }

      const resAsc = await request(app)
        .get('/api/v1/employees?sortBy=salary&sortOrder=asc')
        .set('Authorization', `Bearer ${token}`);

      expect(resAsc.status).toBe(200);
      const bodyAsc = resAsc.body as ApiResponse<TestEmployee[]>;
      const employeesAsc = bodyAsc.data;
      expect(employeesAsc).toBeDefined();
      if (employeesAsc) {
        expect(employeesAsc[0].id).toBe(emp3Id);
        expect(employeesAsc[1].id).toBe(emp1Id);
        expect(employeesAsc[2].id).toBe(emp2Id);
      }
    });

    it('respects pagination limit and offset', async () => {
      const res = await request(app)
        .get('/api/v1/employees?page=2&pageSize=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee[]>;
      const employees = body.data;
      expect(employees).toBeDefined();
      if (employees) {
        expect(employees).toHaveLength(1); // Charlie, Bob on page 1, Alice on page 2 (Brown -> Jones -> Smith)
        expect(employees[0].id).toBe(emp1Id);
        expect(body.meta).toEqual({
          page: 2,
          pageSize: 2,
          total: 3,
          totalPages: 2,
        });
      }
    });

    it('returns 400 validation error for excessive pageSize (> 100)', async () => {
      const res = await request(app)
        .get('/api/v1/employees?pageSize=101')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Validation failed');
      expect(body.details?.pageSize).toBeDefined();
    });

    it('returns 400 validation error for invalid UUID query params', async () => {
      const res = await request(app)
        .get('/api/v1/employees?department=not-a-uuid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Validation failed');
      expect(body.details?.department).toBeDefined();
    });
  });

  describe('GET /api/v1/employees/:id', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/employees/${emp1Id}`);
      expect(res.status).toBe(401);
    });

    it('returns employee details with current salary for valid ID', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${emp1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestEmployee>;
      const employee = body.data;
      expect(employee).toBeDefined();
      if (employee) {
        expect(employee.firstName).toBe('Alice');
        expect(employee.lastName).toBe('Smith');
        expect(employee.fullName).toBe('Alice Smith');
        expect(employee.email).toBe('alice@acme.com');
        expect(employee.department.name).toBe('Engineering');
        expect(employee.country.name).toBe('United States');
        expect(employee.country.code).toBe('US');
        expect(employee.employmentStatus).toBe('active');
        
        expect(employee.currentSalary).toBeDefined();
        if (employee.currentSalary) {
          expect(employee.currentSalary.amount).toBe(100000);
          expect(employee.currentSalary.currencyCode).toBe('USD');
          expect(employee.currentSalary.payFrequency).toBe('annual');
          expect(employee.currentSalary.grade).toBe('G3');
          expect(employee.currentSalary.band).toBe('Senior');
          expect(employee.currentSalary.effectiveDate).toBe('2026-01-01');
          expect(employee.currentSalary.id).toBeDefined();
        }
      }
    });

    it('returns 404 for non-existent employee UUID', async () => {
      const nonexistentId = '99999999-9999-9999-9999-999999999999';
      const res = await request(app)
        .get(`/api/v1/employees/${nonexistentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Not Found');
    });

    it('returns 400 for malformed employee ID', async () => {
      const res = await request(app)
        .get('/api/v1/employees/not-a-uuid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      const body = res.body as ApiResponse;
      expect(body.error).toBe('Validation failed');
      expect(body.details?.id).toBeDefined();
    });
  });

  describe('GET /api/v1/departments', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/departments');
      expect(res.status).toBe(401);
    });

    it('returns all departments ordered alphabetically', async () => {
      const res = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestReference[]>;
      const departments = body.data;
      expect(departments).toBeDefined();
      if (departments) {
        expect(departments).toHaveLength(2);
        expect(departments[0].name).toBe('Engineering');
        expect(departments[1].name).toBe('Human Resources');
      }
    });
  });

  describe('GET /api/v1/countries', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/countries');
      expect(res.status).toBe(401);
    });

    it('returns all countries ordered alphabetically', async () => {
      const res = await request(app)
        .get('/api/v1/countries')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<TestReference[]>;
      const countries = body.data;
      expect(countries).toBeDefined();
      if (countries) {
        expect(countries).toHaveLength(2);
        expect(countries[0].name).toBe('India');
        expect(countries[0].code).toBe('IN');
        expect(countries[1].name).toBe('United States');
        expect(countries[1].code).toBe('US');
      }
    });
  });
});
