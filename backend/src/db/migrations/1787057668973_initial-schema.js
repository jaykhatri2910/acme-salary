export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'hr_manager',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS countries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      code CHAR(2) UNIQUE NOT NULL,
      currency_code CHAR(3) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_no TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'active',
      hire_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS salary_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      amount NUMERIC(15,2) NOT NULL,
      currency_code CHAR(3) NOT NULL,
      pay_frequency TEXT NOT NULL,
      grade TEXT,
      effective_date DATE NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      from_currency CHAR(3) NOT NULL,
      to_currency CHAR(3) NOT NULL,
      rate NUMERIC(18,6) NOT NULL,
      effective_date DATE NOT NULL,
      PRIMARY KEY (from_currency, to_currency, effective_date)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees (last_name);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department_id);
    CREATE INDEX IF NOT EXISTS idx_employees_country ON employees (country_id);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees (status);
    CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary_records (employee_id, effective_date DESC, created_at DESC);


    -- Triggers for updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = now();
       RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_employees_updated_at
        BEFORE UPDATE ON employees
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Enable Row Level Security (RLS) on all tables (default: deny all for non-owners)
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
    ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    -- Disable RLS
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE countries DISABLE ROW LEVEL SECURITY;
    ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
    ALTER TABLE salary_records DISABLE ROW LEVEL SECURITY;
    ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
    ALTER TABLE exchange_rates DISABLE ROW LEVEL SECURITY;

    DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
    DROP FUNCTION IF EXISTS update_updated_at_column();
    
    DROP INDEX IF EXISTS idx_salary_employee;
    DROP INDEX IF EXISTS idx_employees_status;
    DROP INDEX IF EXISTS idx_employees_country;
    DROP INDEX IF EXISTS idx_employees_department;
    DROP INDEX IF EXISTS idx_employees_last_name;

    DROP TABLE IF EXISTS exchange_rates;
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS salary_records;
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS countries;
    DROP TABLE IF EXISTS departments;
    DROP TABLE IF EXISTS users;
  `);
};
