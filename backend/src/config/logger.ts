import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Use pretty printing in development for readability; structured JSON in production/test.
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Redact PII fields that should never appear in logs.
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', '*.password_hash'],
    censor: '[REDACTED]',
  },
});
