# ACME Salary Management — Backend

Node.js + Express + TypeScript REST API for the ACME Salary Management system.
Serves 10,000 employees across multiple countries via a paginated, authenticated API backed by PostgreSQL.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 20.x |
| npm | 10.x |
| PostgreSQL | 15.x |

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd acme-salary-backend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set the values for your local environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port the server listens on | `3000` |
| `LOG_LEVEL` | Pino log level (`trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal`) | `info` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/acme_salary` |
| `TEST_DATABASE_URL` | Separate PostgreSQL DB for Jest tests | `postgres://user:pass@localhost:5432/acme_salary_test` |

### 3. Create databases

```sql
CREATE DATABASE acme_salary;
CREATE DATABASE acme_salary_test;
```

### 4. Run migrations

```bash
npm run migrate
```

For the test database:

```bash
DATABASE_URL=$TEST_DATABASE_URL npm run migrate
```

---

## Running locally

```bash
npm run dev
```

The server starts on `http://localhost:3000` (or the `PORT` you configured).

Verify it is running:

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"2026-08-18T12:00:00.000Z"}
```

---

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled server from `dist/` |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format source files with Prettier |
| `npm run typecheck` | Type-check without emitting files |
| `npm test` | Run Jest tests |
| `npm run test:coverage` | Run Jest with coverage report |
| `npm run migrate` | Apply pending migrations |
| `npm run migrate:down` | Roll back the last migration |
| `npm run migrate:create -- <name>` | Create a new migration file |

---

## Project structure

```
acme-salary-backend/
├── src/
│   ├── app.ts                  # Express app assembly
│   ├── server.ts               # HTTP server entry point
│   ├── config/
│   │   ├── env.ts              # Env var parsing + validation (Zod)
│   │   ├── db.ts               # PostgreSQL pool (pg)
│   │   └── logger.ts           # Pino logger instance
│   ├── middleware/
│   │   ├── errorHandler.ts     # Centralised error handler
│   │   └── notFound.ts         # 404 handler
│   ├── modules/
│   │   └── health/
│   │       ├── health.router.ts
│   │       └── __tests__/
│   │           └── health.test.ts
│   ├── routes/
│   │   └── index.ts            # Root API router
│   ├── db/
│   │   ├── migrations/         # SQL migration files (node-pg-migrate)
│   │   └── seeds/              # Development seed scripts
│   ├── utils/
│   │   └── pagination.ts       # Pagination helpers
│   └── test/
│       └── setup.ts            # Jest env setup
├── docs/                       # Architecture, requirements, decisions
├── .env.example                # Environment variable template
├── database.json               # node-pg-migrate configuration
├── jest.config.ts
├── tsconfig.json
├── tsconfig.build.json
├── .eslintrc.json
└── .prettierrc
```

---

## API

Base URL: `http://localhost:3000/api/v1`

### Health check

```
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-08-18T12:00:00.000Z"
}
```

All API responses follow the envelope:

```json
// Success (list)
{ "data": [...], "meta": { "page": 1, "pageSize": 25, "total": 10000 } }

// Success (single)
{ "data": { ... } }

// Error
{ "error": "Human-readable message", "details": { ... } }
```

---

## Testing

Tests run against a separate test database (`TEST_DATABASE_URL`).

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run a specific test file
npm test -- src/modules/health/__tests__/health.test.ts
```

Coverage threshold: **80%** on lines and functions.

---

## Deployment (Render)

1. Set all environment variables in the Render dashboard.
2. Build command: `npm install && npm run build && npm run migrate`
3. Start command: `npm start`
4. Health check path: `/health`

See `docs/architecture.md` for full deployment architecture.
