/* eslint-disable no-console */
import { Client } from 'pg';
import crypto from 'crypto';
import { env } from '../../config/env';

// Mulberry32 PRNG for deterministic data generation
function createRandom(seed: number) {
  let h = seed | 0;
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let imul = Math.imul(h ^ (h >>> 15), h | 1);
    imul = (imul + Math.imul(imul ^ (imul >>> 7), imul | 61)) | 0;
    return ((imul ^ (imul >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(42); // Fixed seed for determinism

function getGrade(salaryUsd: number): string {
  if (salaryUsd < 60000) return 'G1';
  if (salaryUsd < 90000) return 'G2';
  if (salaryUsd < 120000) return 'G3';
  if (salaryUsd < 150000) return 'G4';
  return 'G5';
}

const FIRST_NAMES = [
  'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Elijah', 'Charlotte', 'William', 'Sophia',
  'James', 'Amelia', 'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Evelyn', 'Alexander', 'Harper',
  'Mason', 'Camila', 'Michael', 'Gianna', 'Ethan', 'Abigail', 'Daniel', 'Luna', 'Jacob', 'Ella',
  'Logan', 'Elizabeth', 'Jackson', 'Sofia', 'Levi', 'Avery', 'Sebastian', 'Scarlett', 'Mateo', 'Emily',
  'Jack', 'Aria', 'Owen', 'Penelope', 'Theodore', 'Chloe', 'Aiden', 'Layla', 'Samuel', 'Mila',
  'Joseph', 'Nora', 'John', 'Hazel', 'David', 'Madison', 'Wyatt', 'Ellie', 'Carter', 'Lily',
  'Julian', 'Nova', 'Luke', 'Isla', 'Grayson', 'Grace', 'Jaxon', 'Aubrey', 'Andrew', 'Stella',
  'Lincoln', 'Natalie', 'Joshua', 'Zoe', 'Christopher', 'Lillian', 'Kevin', 'Hannah', 'Adrian', 'Lucy'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morrison', 'Murphy', 'Cook', 'Rogers', 'Morgan', 'Peterson', 'Cooper', 'Reed'
];

// Helper to hash passwords deterministically
function hashPassword(password: string): string {
  const salt = 'acme_salary_salt_2026';
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `pbkdf2_${salt}_${hash}`;
}

async function batchInsert(
  client: Client,
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize = 1000
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (const val of row) {
        values.push(val);
        rowPlaceholders.push(`$${paramIndex++}`);
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;
    await client.query(query, values);
  }
}

async function run() {
  console.log('[seed] Starting deterministic database seeding...');

  const connectionString = env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean existing data (in correct dependency order)
    console.log('[seed] Cleaning existing tables...');
    await client.query('TRUNCATE refresh_tokens, salary_records, employees, users, exchange_rates, countries, departments CASCADE');

    // 2. Seed departments
    console.log('[seed] Seeding departments...');
    const depts = ['Engineering', 'Product', 'Sales', 'Marketing', 'Human Resources', 'Finance'];
    const deptRows: unknown[][] = [];
    for (const d of depts) {
      deptRows.push([crypto.randomUUID(), d]);
    }
    await batchInsert(client, 'departments', ['id', 'name'], deptRows);

    // Fetch department IDs for mapping
    const deptRes = await client.query<{ id: string; name: string }>('SELECT id, name FROM departments');
    const deptMap = new Map(deptRes.rows.map(r => [r.name, r.id]));

    // 3. Seed countries
    console.log('[seed] Seeding countries...');
    const countries = [
      { name: 'United States', code: 'US', currency: 'USD' },
      { name: 'United Kingdom', code: 'GB', currency: 'GBP' },
      { name: 'India', code: 'IN', currency: 'INR' },
      { name: 'Germany', code: 'DE', currency: 'EUR' },
      { name: 'Canada', code: 'CA', currency: 'CAD' }
    ];
    const countryRows: unknown[][] = [];
    for (const c of countries) {
      countryRows.push([crypto.randomUUID(), c.name, c.code, c.currency]);
    }
    await batchInsert(client, 'countries', ['id', 'name', 'code', 'currency_code'], countryRows);

    // Fetch country IDs
    const countryRes = await client.query<{ id: string; code: string; currency_code: string }>('SELECT id, code, currency_code FROM countries');
    const countryMap = new Map(countryRes.rows.map(r => [r.code, r]));

    // 4. Seed exchange rates (effective_date = 2020-01-01)
    console.log('[seed] Seeding exchange rates...');
    const rates = [
      { from: 'USD', to: 'USD', rate: 1.0 },
      { from: 'GBP', to: 'USD', rate: 1.30 },
      { from: 'EUR', to: 'USD', rate: 1.10 },
      { from: 'INR', to: 'USD', rate: 0.012 },
      { from: 'CAD', to: 'USD', rate: 0.74 }
    ];
    const rateRows: unknown[][] = [];
    const effDate = '2020-01-01';

    for (const r of rates) {
      rateRows.push([r.from, r.to, r.rate, effDate]);
      // Add reverse rates
      if (r.from !== r.to) {
        rateRows.push([r.to, r.from, Number((1 / r.rate).toFixed(6)), effDate]);
      }
    }
    await batchInsert(client, 'exchange_rates', ['from_currency', 'to_currency', 'rate', 'effective_date'], rateRows);

    // 5. Seed HR Manager
    console.log('[seed] Seeding HR Manager...');
    const hrManagerId = crypto.randomUUID();
    const passwordHash = hashPassword('password123');
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, $5)`,
      [hrManagerId, 'admin@acme.com', passwordHash, 'HR Admin', 'hr_manager']
    );

    // 6. Generate 10,000 employees and their salary records
    console.log('[seed] Generating 10,000 employees...');
    const employeeRows: unknown[][] = [];
    const salaryRows: unknown[][] = [];
    const secondarySalaryRows: unknown[][] = [];

    const countryCodes = ['US', 'IN', 'GB', 'DE', 'CA'];
    const countryCumDist = [0.40, 0.70, 0.80, 0.90, 1.00]; // US: 40%, IN: 30%, GB: 10%, DE: 10%, CA: 10%

    const deptNames = ['Engineering', 'Product', 'Sales', 'Marketing', 'Human Resources', 'Finance'];
    const deptCumDist = [0.45, 0.60, 0.80, 0.90, 0.95, 1.00]; // Eng: 45%, Prod: 15%, Sales: 20%, Mktg: 10%, HR: 5%, Fin: 5%

    // Target salary in USD by department (min, max)
    const baseSalariesUsd: Record<string, [number, number]> = {
      Engineering: [60000, 180000],
      Product: [60000, 160000],
      Sales: [40000, 120000],
      Marketing: [45000, 110000],
      'Human Resources': [40000, 100000],
      Finance: [45000, 115000]
    };

    const startTimestamp = new Date('2020-01-01').getTime();
    const endTimestamp = new Date('2025-12-31').getTime();

    for (let i = 1; i <= 10000; i++) {
      const empId = crypto.randomUUID();
      const empNo = `EMP-${String(i).padStart(5, '0')}`;

      // Pick country
      const rCountry = random();
      let countryCode = 'US';
      for (let cIdx = 0; cIdx < countryCodes.length; cIdx++) {
        if (rCountry <= countryCumDist[cIdx]) {
          countryCode = countryCodes[cIdx];
          break;
        }
      }
      const countryInfo = countryMap.get(countryCode)!;

      // Pick department
      const rDept = random();
      let deptName = 'Engineering';
      for (let dIdx = 0; dIdx < deptNames.length; dIdx++) {
        if (rDept <= deptCumDist[dIdx]) {
          deptName = deptNames[dIdx];
          break;
        }
      }
      const deptId = deptMap.get(deptName)!;

      // Select names deterministically
      const firstName = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${empNo.toLowerCase()}@acme.com`;

      // Status
      const status = random() < 0.95 ? 'active' : 'inactive';

      // Hire date
      const hireTimestamp = startTimestamp + random() * (endTimestamp - startTimestamp);
      const hireDateObj = new Date(hireTimestamp);
      const hireDateStr = hireDateObj.toISOString().split('T')[0];

      employeeRows.push([
        empId,
        empNo,
        firstName,
        lastName,
        email,
        deptId,
        countryInfo.id,
        status,
        hireDateStr,
        hireDateObj.toISOString(), // created_at
        hireDateObj.toISOString()  // updated_at
      ]);

      // Initial Salary Calculation in USD
      const salRange = baseSalariesUsd[deptName];
      const salaryUsd = salRange[0] + random() * (salRange[1] - salRange[0]);

      // Convert to local currency
      const rateToUsd = rates.find(r => r.from === countryInfo.currency_code)!.rate;
      const amountLocal = Number((salaryUsd / rateToUsd).toFixed(2));
      const grade = getGrade(salaryUsd);

      const salaryId = crypto.randomUUID();
      salaryRows.push([
        salaryId,
        empId,
        amountLocal,
        countryInfo.currency_code,
        countryInfo.currency_code === 'INR' ? 'monthly' : 'annual',
        grade,
        hireDateStr,
        'HIRE',
        'Initial hire compensation',
        hrManagerId,
        hireDateObj.toISOString() // created_at
      ]);

      // Promotional/Annual salary history update for ~20% of employees hired before 2024-12-31
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (random() < 0.20 && (endTimestamp - hireTimestamp) > oneYearMs) {
        // Increase salary by 5% to 15%
        const increaseRate = 0.05 + random() * 0.10;
        const newAmountLocal = Number((amountLocal * (1 + increaseRate)).toFixed(2));
        
        // Effective date exactly 1 year later
        const promoDateObj = new Date(hireTimestamp + oneYearMs);
        const promoDateStr = promoDateObj.toISOString().split('T')[0];

        const isPromotion = random() < 0.20;
        const newGrade = isPromotion 
          ? (grade === 'G1' ? 'G2' : grade === 'G2' ? 'G3' : grade === 'G3' ? 'G4' : 'G5')
          : grade;

        secondarySalaryRows.push([
          crypto.randomUUID(),
          empId,
          newAmountLocal,
          countryInfo.currency_code,
          countryInfo.currency_code === 'INR' ? 'monthly' : 'annual',
          newGrade,
          promoDateStr,
          isPromotion ? 'PROMOTION' : 'PERFORMANCE_REVIEW',
          isPromotion ? 'Promoted to next grade' : 'Annual salary adjustment',
          hrManagerId,
          promoDateObj.toISOString() // created_at
        ]);
      }
    }

    console.log('[seed] Bulk inserting employees (10,000 rows)...');
    await batchInsert(client, 'employees', [
      'id', 'employee_no', 'first_name', 'last_name', 'email', 'department_id', 'country_id', 'status', 'hire_date', 'created_at', 'updated_at'
    ], employeeRows);

    console.log(`[seed] Bulk inserting initial salary records (${salaryRows.length} rows)...`);
    await batchInsert(client, 'salary_records', [
      'id', 'employee_id', 'amount', 'currency_code', 'pay_frequency', 'grade', 'effective_date', 'reason', 'notes', 'changed_by', 'created_at'
    ], salaryRows);

    console.log(`[seed] Bulk inserting historical salary records (${secondarySalaryRows.length} rows)...`);
    if (secondarySalaryRows.length > 0) {
      await batchInsert(client, 'salary_records', [
        'id', 'employee_id', 'amount', 'currency_code', 'pay_frequency', 'grade', 'effective_date', 'reason', 'notes', 'changed_by', 'created_at'
      ], secondarySalaryRows);
    }

    await client.query('COMMIT');
    console.log('[seed] Seed completed successfully!');
    console.log(`[seed] - Seeded 1 HR manager user.`);
    console.log(`[seed] - Seeded ${employeeRows.length} employees.`);
    console.log(`[seed] - Seeded ${salaryRows.length + secondarySalaryRows.length} total salary records.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] Seed failed! Transaction rolled back.', err);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
