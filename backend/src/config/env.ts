import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  TEST_DATABASE_URL: z
    .string()
    .url('TEST_DATABASE_URL must be a valid PostgreSQL connection string')
    .optional(),
  JWT_SECRET: z.string().min(8).default('supersecret_jwt_key_for_development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Using process.stderr.write to avoid triggering the no-console lint rule
  // at module load time before the logger is available.
  process.stderr.write(
    `[env] Invalid environment variables:\n${JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)}\n`,
  );
  process.exit(1);
}

export const env = parsed.data;
