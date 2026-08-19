# ACME Salary Management — Project Plan

## Overview

Work is split between a backend developer and a frontend developer.

The sequencing follows this fixed order:

**Requirements → Architecture → API Contract → Backend API → Frontend integration**

The API contract (`docs/api-contract.md`) is produced jointly at the end of Phase 0 and must be agreed before any frontend integration work begins.

The frontend developer may build layout, component shells, and mock-data pages in parallel with backend Phases 1–5, but integration against the real API must not begin until the API contract is finalized.

Each phase produces a working, committed, and tested increment.

**Rule:** No phase starts until the previous phase passes its verification gate.

---

# Phase 0 — Project Setup

**Owner:** Both developers
**Duration:** ~1 day

## Backend Developer

| Task | Detail                                                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| B0-1 | Initialize `acme-salary/backend` with TypeScript + Express skeleton                                                                             |
| B0-2 | Configure `tsconfig.json`, ESLint, Prettier, `.env.example`                                                                                     |
| B0-3 | Set up Pino logger and centralized error-handler middleware                                                                                     |
| B0-4 | Configure Jest + Supertest test runner with a test PostgreSQL DB                                                                                |
| B0-5 | Create GitHub Actions CI: lint → typecheck → test                                                                                               |
| B0-6 | Set up `node-pg-migrate` and create migration runner script                                                                                     |
| B0-7 | Create `GET /health` endpoint                                                                                                                   |
| B0-8 | Connect Render deployment; verify health check is green                                                                                         |
| B0-9 | Create `docs/api-contract.md` containing all endpoints, request/response shapes, validation rules, authentication requirements, and error codes |

## Frontend Developer

| Task | Detail                                                                      |
| ---- | --------------------------------------------------------------------------- |
| F0-1 | Initialize `acme-salary/frontend` with Vite + React 18 + TypeScript         |
| F0-2 | Configure TypeScript, ESLint, Prettier, and Tailwind CSS                    |
| F0-3 | Install and configure shadcn/ui base components                             |
| F0-4 | Set up TanStack Query, React Router v6, Axios, and Zustand                  |
| F0-5 | Set up Vitest + React Testing Library                                       |
| F0-6 | Create GitHub Actions CI: lint → typecheck → test                           |
| F0-7 | Create placeholder page routes: Login, Employees, Dashboard using mock data |
| F0-8 | Connect Vercel deployment; verify placeholder renders                       |

### Important Rule

The frontend developer may build component shells and static layouts during Phases 1–5 using mock data.

Integration against the real API must not begin until `docs/api-contract.md` is finalized and committed.

### Verification Gate

- Both applications build successfully.
- Lint passes.
- TypeScript typecheck passes.
- Tests pass.
- CI is green.
- Backend deployment is live.
- Frontend deployment is live.
- `docs/api-contract.md` is committed.
- API contract is reviewed and agreed by both developers.

---

# Phase 1 — Database Schema & Migrations

**Owner:** Backend developer
**Duration:** ~1 day
**Status:** COMPLETE ✅

| Task  | Detail                                                            |
| ----- | ----------------------------------------------------------------- |
| B1-1  | Migration: create `departments` and `countries` tables            |
| B1-2  | Migration: create `users` table for HR managers                   |
| B1-3  | Migration: create `employees` table with FK references            |
| B1-4  | Migration: create `salary_records` table as append-only ledger    |
| B1-5  | Migration: create `refresh_tokens` table                          |
| B1-6  | Migration: create `exchange_rates` table                          |
| B1-7  | Migration: add all required indexes                               |
| B1-8  | Seed departments, countries, exchange rates, and one test HR user |
| B1-9  | Generate 10,000 synthetic employees with salary records           |
| B1-10 | Verify migrations and seeds against local PostgreSQL              |

### Verification Gate

```text
npm run migrate
npm run seed
```

must succeed.

Verify:

- All tables exist.
- All required indexes exist.
- Foreign keys are correct.
- Seed data is correct.
- 10,000 employees exist.
- Salary records exist.
- Schema matches `architecture.md`.

---

# Phase 2 — Authentication API

**Owner:** Backend developer
**Duration:** ~1–2 days
**Status:** COMPLETE ✅

| Task | Detail                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------- |
| B2-1 | Implement `POST /auth/login` — validate credentials, return access token and set refresh cookie |
| B2-2 | Implement `POST /auth/refresh` — validate refresh-token cookie and issue new access token       |
| B2-3 | Implement `POST /auth/logout` — invalidate refresh token and clear cookie                       |
| B2-4 | Implement JWT authentication middleware — verify Bearer token and attach `req.user`             |
| B2-5 | Integration tests: login success, wrong password, refresh, logout                               |
| B2-6 | Unit tests: JWT validation edge cases and expired token                                         |

### Authentication Rules

- Access token is short-lived.
- Access token is stored in frontend memory.
- Refresh token is stored in an HTTP-only Secure cookie.
- Access tokens must not be stored in localStorage.
- Only `hr_manager` is supported in v1.

### Verification Gate

All authentication tests pass.

CI is green.

The following flow works:

```text
Login
  ↓
Access Token
  ↓
Protected API
  ↓
Access Token Expiry
  ↓
Refresh
  ↓
New Access Token
  ↓
Logout
```

---

# Phase 3 — Employee API

**Owner:** Backend developer
**Duration:** ~2 days
**Status:** COMPLETE ✅

| Task | Detail                                                                |
| ---- | --------------------------------------------------------------------- |
| B3-1 | Implement `GET /employees` — pagination, search, filters, and sorting |
| B3-2 | Implement `GET /employees/:id` — single employee with current salary  |
| B3-3 | Create Zod schemas for all query parameters                           |
| B3-4 | Enforce maximum `pageSize` of 100                                     |
| B3-5 | Integration tests: pagination, search, filters, sorting, and 404      |
| B3-6 | Manually verify `GET /employees?page=1&pageSize=25`                   |
| B3-7 | Implement `GET /departments`                                          |
| B3-8 | Implement `GET /countries`                                            |

### Employee Query Parameters

```text
page
pageSize
search
department
country
status
sortBy
sortOrder
```

### Supported Sorting

```text
name
department
country
salary
```

### Verification Gate

Verify:

- Pagination works.
- `page`, `pageSize`, `total`, and `totalPages` are correct.
- Search works by employee name and employee number.
- Department filtering works.
- Country filtering works.
- Employment-status filtering works.
- Sorting works.
- Unknown employee returns `404`.
- `pageSize > 100` is rejected.

---

# Phase 4 — Salary API

**Owner:** Backend developer
**Duration:** ~2 days
**Status:** COMPLETE ✅

| Task | Detail                                                                                    |
| ---- | ----------------------------------------------------------------------------------------- |
| B4-1 | Implement `GET /employees/:id/salary` — return current salary                             |
| B4-2 | Implement `POST /employees/:id/salary` — validate and insert new salary record            |
| B4-3 | Implement `GET /employees/:id/salary/history` — paginated salary history                  |
| B4-4 | Add Zod validation for salary fields                                                      |
| B4-5 | Integration tests: create salary, current salary, history ordering, and validation errors |

### Salary Validation

Validate:

- `amount > 0`
- Valid `currencyCode`
- Valid `payFrequency`
- `effectiveDate` is not in the future

### Append-Only Rule

Salary records cannot be:

- Updated
- Deleted

Every salary change creates a new record.

The authenticated user is automatically recorded as `changed_by`.

### Salary History

History responses must expose sufficient information to show:

- Previous salary amount
- New salary amount
- Currency
- Effective date
- Change reason
- Notes
- Changed-by user

### Verification Gate

- Salary creation works.
- Current salary is returned correctly.
- Salary history is ordered correctly.
- Old/new salary information is available.
- Invalid salary data is rejected.
- `changed_by` is derived from the JWT.
- Existing salary records cannot be modified or deleted.

---

# Phase 5 — Analytics API

**Owner:** Backend developer
**Duration:** ~1–2 days
**Status:** COMPLETE ✅

| Task | Detail                                               |
| ---- | ---------------------------------------------------- |
| B5-1 | Implement `GET /analytics/summary`                   |
| B5-2 | Implement currency conversion using `exchange_rates` |
| B5-3 | Implement `GET /analytics/export` as streamed CSV    |
| B5-4 | Integration tests for analytics and CSV export       |
| B5-5 | Performance check using PostgreSQL query plans       |

### Analytics

The summary must provide:

- Total headcount
- Total payroll in USD
- Average salary
- Median salary
- Minimum salary
- Maximum salary
- Department breakdown
- Country breakdown
- Pay-band distribution

All aggregations must run in PostgreSQL.

Node.js must not load the complete salary dataset into memory for aggregation.

### Verification Gate

- Analytics query executes in less than 300 ms on the seeded 10,000-employee database.
- Currency conversion works.
- Department aggregation works.
- Country aggregation works.
- CSV export streams correctly.
- Tests pass.
- Query plans show appropriate index usage.

---

# Phase 6 — Frontend Authentication

**Owner:** Frontend developer
**Starts after:** Phase 2 and API contract finalization
**Duration:** ~1 day

From this phase onward, frontend integration uses the real backend API.

Any API mismatch must be treated as an API contract amendment rather than being silently handled by the frontend.

| Task | Detail                                                                          |
| ---- | ------------------------------------------------------------------------------- |
| F6-1 | Build Login page using React Hook Form + Zod                                    |
| F6-2 | Implement Axios instance with Authorization interceptor                         |
| F6-3 | Implement 401 interceptor: call `POST /auth/refresh` and retry original request |
| F6-4 | Implement Zustand auth store: `{ user, accessToken, login, logout }`            |
| F6-5 | Implement protected route wrapper                                               |
| F6-6 | Implement silent refresh on application load                                    |
| F6-7 | Component tests for login, auth store, and protected routes                     |

### Verification Gate

- Login works against real backend.
- Access token is stored only in memory.
- Refresh token remains HTTP-only.
- Silent refresh works.
- Protected routes redirect unauthenticated users.
- Logout works.

---

# Phase 7 — Employee List & Detail Pages

**Owner:** Frontend developer
**Starts after:** Phase 3
**Duration:** ~2 days

| Task  | Detail                                                    |
| ----- | --------------------------------------------------------- |
| F7-1  | Build Employee List page with shadcn DataTable            |
| F7-2  | Implement debounced search synced to URL query parameters |
| F7-3  | Implement Department filter                               |
| F7-4  | Implement Country filter                                  |
| F7-5  | Implement Employment Status filter                        |
| F7-6  | Implement sortable table columns                          |
| F7-7  | Create `useEmployees()` TanStack Query hook               |
| F7-8  | Build pagination controls                                 |
| F7-9  | Build Employee Detail page                                |
| F7-10 | Display employee information and current salary           |
| F7-11 | Component tests                                           |

### `useEmployees()` Parameters

```text
page
pageSize
search
department
country
status
sortBy
sortOrder
```

### Verification Gate

- Employee list loads real data.
- Search works.
- Filters work.
- Sorting works.
- Pagination works.
- Page size works.
- URL reflects list state.
- Employee detail loads correctly.
- Current salary is displayed.

---

# Phase 8 — Salary History & Update

**Owner:** Frontend developer
**Starts after:** Phase 4
**Duration:** ~2 days

| Task | Detail                                                                 |
| ---- | ---------------------------------------------------------------------- |
| F8-1 | Build Salary History section                                           |
| F8-2 | Display previous and new salary values                                 |
| F8-3 | Build Salary Update form                                               |
| F8-4 | Add amount, currency, effective date, pay frequency, reason, and notes |
| F8-5 | Add Zod frontend validation                                            |
| F8-6 | Implement `useUpdateSalary` mutation                                   |
| F8-7 | Invalidate employee and salary-history queries after successful update |
| F8-8 | Display success/error toast notifications                              |
| F8-9 | Component tests                                                        |

### Verification Gate

- Salary update creates a new history record.
- Previous salary remains immutable.
- New salary appears as current salary.
- History displays old/new values.
- Invalid input is rejected.
- Success and error states are displayed.
- History ordering is correct.

---

# Phase 9 — Analytics Dashboard

**Owner:** Frontend developer
**Starts after:** Phase 5
**Duration:** ~1–2 days

| Task | Detail                                          |
| ---- | ----------------------------------------------- |
| F9-1 | Build Analytics Dashboard                       |
| F9-2 | Build summary statistics cards                  |
| F9-3 | Build department breakdown chart using Recharts |
| F9-4 | Build country breakdown table                   |
| F9-5 | Build pay-band distribution chart               |
| F9-6 | Implement CSV export button                     |
| F9-7 | Create `useAnalytics()` TanStack Query hook     |
| F9-8 | Component tests                                 |

### Verification Gate

- Dashboard displays real aggregated data.
- Department breakdown is correct.
- Country breakdown is correct.
- Pay-band distribution is displayed.
- CSV export downloads a valid file.
- Dashboard loads within 2 seconds.

---

# Phase 10 — Integration Testing & QA

**Owner:** Both developers
**Duration:** ~1–2 days

| Task | Detail                                                                 |
| ---- | ---------------------------------------------------------------------- |
| QA-1 | Playwright E2E: login → search employee → update salary → view history |
| QA-2 | Playwright E2E: login → analytics → export CSV                         |
| QA-3 | Test API error responses: 400, 401, 404, 422                           |
| QA-4 | Test pagination boundaries: first page, last page, empty results       |
| QA-5 | Run axe-core accessibility audit                                       |
| QA-6 | Verify employee list performance at page 100                           |
| QA-7 | Verify all protected endpoints return 401 without valid authentication |

### Verification Gate

- All E2E tests pass.
- No critical accessibility violations.
- Employee list performance budget is met.
- Authentication security checks pass.
- Salary audit behavior is verified.
- CSV export works end-to-end.

---

# Phase 11 — Deployment & Documentation

**Owner:** Both developers
**Duration:** ~0.5 day

| Task | Detail                                                          |
| ---- | --------------------------------------------------------------- |
| D-1  | Configure production environment variables on Render and Vercel |
| D-2  | Run migrations against production database                      |
| D-3  | Smoke test production deployment                                |
| D-4  | Update backend README                                           |
| D-5  | Update frontend README                                          |
| D-6  | Document environment variables                                  |
| D-7  | Document local development setup                                |
| D-8  | Document testing commands                                       |
| D-9  | Tag v1.0.0 release                                              |

### Verification Gate

All acceptance criteria from `requirements.md` must pass in production:

```text
AC-1
AC-2
AC-3
AC-4
AC-5
AC-6
AC-7
AC-8
AC-9
AC-10
```

---

# API Endpoint Summary

The implementation must use the following endpoint paths consistently.

## Authentication

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

## Employees

```text
GET /employees
GET /employees/:id
GET /departments
GET /countries
```

## Salary

```text
GET  /employees/:id/salary
POST /employees/:id/salary
GET  /employees/:id/salary/history
```

## Analytics

```text
GET /analytics/summary
GET /analytics/export
```

## Health

```text
GET /health
```

The API contract in `docs/api-contract.md` is the source of truth for request and response formats.

---

# API Contract Change Rule

After `docs/api-contract.md` is approved:

1. Do not silently change an API response.
2. Do not silently rename fields.
3. Do not silently change query parameters.
4. Do not silently change validation behavior.
5. Do not create undocumented endpoints for frontend integration.

If a change is necessary:

```text
Identify change
      ↓
Update api-contract.md
      ↓
Review change
      ↓
Commit contract
      ↓
Update backend
      ↓
Update frontend
      ↓
Run tests
```

---

# Verification Gates

Every phase must pass its verification gate before the next dependent phase is considered complete.

The minimum progression is:

```text
Phase 0
Project Setup
    ↓
Phase 1
Database
    ↓
Phase 2
Authentication API
    ↓
Phase 3
Employee API
    ↓
Phase 4
Salary API
    ↓
Phase 5
Analytics API
    ↓
Phase 6
Frontend Authentication
    ↓
Phase 7
Employee Pages
    ↓
Phase 8
Salary Pages
    ↓
Phase 9
Analytics Dashboard
    ↓
Phase 10
Integration & QA
    ↓
Phase 11
Deployment
```

Frontend component/layout work may happen in parallel using mock data, but real API integration follows the dependency gates above.

---

# Summary Timeline

| Phase                       | Owner    | Duration |
| --------------------------- | -------- | -------: |
| 0 — Project Setup           | Both     |    1 day |
| 1 — Database Schema         | Backend  |    1 day |
| 2 — Authentication API      | Backend  | 1–2 days |
| 3 — Employee API            | Backend  |   2 days |
| 4 — Salary API              | Backend  |   2 days |
| 5 — Analytics API           | Backend  | 1–2 days |
| 6 — Frontend Authentication | Frontend |    1 day |
| 7 — Employee Pages          | Frontend |   2 days |
| 8 — Salary Pages            | Frontend |   2 days |
| 9 — Analytics Dashboard     | Frontend | 1–2 days |
| 10 — Integration & QA       | Both     | 1–2 days |
| 11 — Deployment             | Both     |  0.5 day |

**Estimated total: ~17–20 days**

Backend Phases 2–5 and frontend preparation can run in parallel where dependencies allow. Real frontend API integration begins only after the relevant backend phase and API contract are finalized.

---

# Current Project Status

Before starting the next implementation phase, the documentation baseline should be:

- `requirements.md` — Approved
- `architecture.md` — Approved
- `decisions.md` — Approved
- `docs/api-contract.md` — Approved
- `project-plan.md` — This updated version

Once these documents are committed, the project is ready to proceed to the implementation verification stage.

**Next step:** inspect the existing backend implementation against `docs/api-contract.md` and identify what is already complete versus what still needs to be implemented.
