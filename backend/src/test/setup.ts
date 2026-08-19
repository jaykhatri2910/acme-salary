/**
 * Jest global test setup.
 *
 * Sets the required environment variables before any module is loaded so
 * that src/config/env.ts can parse them successfully.
 *
 * NOTE: This file is loaded via `setupFiles` in jest.config.ts — it runs
 * before any test framework is initialised, making it the right place to
 * set process.env values.
 */

process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['LOG_LEVEL'] = 'silent';
// Point to the test database. Integration tests that actually hit the DB
// will require this to be a real running PostgreSQL instance.
// For unit/HTTP tests (health check) the pool is never queried, so any
// syntactically valid URL is sufficient.
process.env['DATABASE_URL'] = 'postgres://localhost:5432/acme_salary';
process.env['TEST_DATABASE_URL'] = 'postgres://localhost:5432/acme_salary_test';
