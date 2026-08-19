import { Pool } from 'pg';
import { env } from './env';
import { logger } from './logger';

const connectionString =
  env.NODE_ENV === 'test' && env.TEST_DATABASE_URL ? env.TEST_DATABASE_URL : env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected pg pool error');
});

/**
 * Execute a parameterised SQL query using the shared connection pool.
 * Prefer this helper over calling pool.query() directly so that all queries
 * flow through a single point (makes instrumentation and error logging easier
 * to add later).
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  values?: unknown[],
) {
  return pool.query<T>(sql, values);
}
