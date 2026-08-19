# ACME Salary Management — Decisions

This document records key architectural and engineering decisions for ACME Salary Management, including the context, options considered, decision, and rationale.

This is a living document and must be updated when significant architectural or engineering decisions are made during implementation.

---

# D-001 — Use Offset Pagination for v1

**Status:** Accepted
**Date:** 2026-08-18

## Context

The employee directory must support server-side pagination for approximately 10,000 employees.

HR managers need to:

- Navigate directly to arbitrary pages.
- See total record counts.
- Change page size.

Two common pagination strategies are offset pagination and cursor-based pagination.

## Options

| Option                  | Pros                                                         | Cons                                                                                     |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Offset (`LIMIT/OFFSET`) | Simple; supports arbitrary page navigation; easy total count | Performance can degrade at very high offsets; concurrent changes can affect consistency  |
| Cursor-based            | Stable and performant at any depth                           | Cannot easily jump to arbitrary pages; more complex; total count requires separate query |

## Decision

Use offset pagination for v1.

The expected dataset is approximately 10,000 employees, making offset pagination acceptable with appropriate indexes.

The API will expose:

```text
page
pageSize
total
totalPages
```

The default page size is 25 and the maximum is 100.

Cursor-based pagination may be considered in a future version if profiling identifies a performance problem.

---

# D-002 — Store Access Tokens in Memory

**Status:** Accepted
**Date:** 2026-08-18

## Context

The frontend requires authenticated API requests while protecting authentication credentials from unnecessary browser persistence.

## Options

| Option           | Pros                                      | Cons                            |
| ---------------- | ----------------------------------------- | ------------------------------- |
| localStorage     | Survives refresh                          | JavaScript can access the token |
| Memory           | Token is not persisted to browser storage | Lost on page refresh            |
| HTTP-only cookie | Automatically handled by browser          | Requires CSRF considerations    |

## Decision

Use the following authentication model:

- Short-lived JWT access token.
- Access token stored only in frontend memory.
- Refresh token stored in an HTTP-only Secure cookie.
- Access token is never stored in localStorage.

On application startup, the frontend calls:

```text
POST /auth/refresh
```

to restore the authenticated session.

The access-token lifetime is approximately 15 minutes.

---

# D-003 — Salary Records Are Append-Only

**Status:** Accepted
**Date:** 2026-08-18

## Context

Salary information is sensitive and must remain auditable.

The system must preserve the complete history of compensation changes.

## Decision

The `salary_records` table is an append-only ledger.

Every salary change creates a new salary record.

Existing salary records cannot be:

- Updated
- Deleted

The current salary is determined from the salary records using:

1. Highest `effective_date`.
2. `created_at DESC` as the deterministic tie-breaker when effective dates are equal.

The authenticated HR manager is recorded as the actor who created the salary change.

## Rationale

This provides:

- Immutable history.
- Clear auditability.
- Simple historical queries.
- No need for a separate salary-audit table.

---

# D-004 — Store Salary in Local Currency

**Status:** Accepted
**Date:** 2026-08-19

## Context

Employees work across multiple countries and salaries may be denominated in different currencies.

The requirements specify that salary amounts must be stored in local currency and displayed with the currency code.

## Decision

Salary records store:

```text
amount
currency_code
```

The original salary amount is never converted and overwritten.

Analytics may convert salary amounts to the configured base currency, initially USD.

## Rationale

Keeping the original local-currency value preserves the actual compensation record and avoids loss of information caused by conversion.

---

# D-005 — Use Static Exchange Rates for v1

**Status:** Accepted
**Date:** 2026-08-18

## Context

The analytics dashboard requires salary totals in a common currency.

Exchange rates change over time.

## Options

| Option             | Pros                                | Cons                                                     |
| ------------------ | ----------------------------------- | -------------------------------------------------------- |
| Live FX API        | Current rates                       | External dependency, API key, rate limits, failure modes |
| Static rates in DB | Predictable, no external dependency | Rates can become stale                                   |

## Decision

Use static exchange rates stored in the `exchange_rates` table.

Rates may be manually or periodically updated.

No live FX API is required for v1.

## Rationale

HR salary analytics does not require real-time financial-market accuracy.

Avoiding an external FX dependency reduces:

- Operational complexity.
- API failure risk.
- Rate-limit risk.
- External service dependencies.

---

# D-006 — Single `hr_manager` Role for v1

**Status:** Accepted
**Date:** 2026-08-18

## Context

The requirements define HR managers as the users of the system.

No employee self-service, finance, administrator, or other roles are required for v1.

## Decision

Support only:

```text
hr_manager
```

The `users.role` column is retained so additional roles can be introduced later.

## Rationale

A single role keeps v1 authentication and authorization simple while allowing future RBAC expansion.

---

# D-007 — Express over NestJS

**Status:** Accepted
**Date:** 2026-08-18

## Context

The backend is a Node.js TypeScript REST API with a relatively small API surface.

## Options

| Option  | Pros                                                | Cons                                                 |
| ------- | --------------------------------------------------- | ---------------------------------------------------- |
| Express | Simple, lightweight, widely understood, flexible    | Requires more structure to be defined manually       |
| NestJS  | Strong structure, dependency injection, conventions | More abstraction and complexity than required for v1 |

## Decision

Use Express.

The backend will use a clear module structure such as:

```text
src/
├── modules/
├── middleware/
├── db/
├── config/
└── shared/
```

## Rationale

The API surface is limited and does not justify the additional framework abstraction provided by NestJS.

---

# D-008 — Use node-pg-migrate with Raw SQL

**Status:** Accepted
**Date:** 2026-08-18

## Context

Database schema changes must be versioned and reproducible across environments.

## Decision

Use:

```text
node-pg-migrate
```

with explicit SQL migration files.

The backend connects to PostgreSQL using:

```text
pg
```

No ORM is required.

## Rationale

Explicit SQL migrations are:

- Reviewable.
- Predictable.
- Easy to audit.
- Close to the actual PostgreSQL schema.
- Less likely to introduce hidden schema changes.

---

# D-009 — Use shadcn/ui for Frontend Components

**Status:** Accepted
**Date:** 2026-08-18

## Context

The frontend requires accessible, professional UI components.

Options considered included MUI, Ant Design, shadcn/ui, and custom components.

## Decision

Use shadcn/ui with:

- Radix UI primitives.
- Tailwind CSS.

Components are copied into the project and controlled by the application rather than being treated as a large centralized UI dependency.

## Rationale

This provides:

- Accessible primitives.
- Full styling control.
- Consistent visual system.
- Lightweight component usage.

---

# D-010 — Use TanStack Query for Server State

**Status:** Accepted
**Date:** 2026-08-18

## Context

The application is primarily data-driven.

The frontend needs:

- Paginated employee lists.
- Employee details.
- Salary history.
- Analytics.
- Background refresh.
- Mutations and cache invalidation.

## Decision

Use TanStack Query for server state.

Use Zustand only for lightweight client/application state such as:

```text
user
accessToken
authentication state
```

Redux is not required for v1.

## Rationale

Most application data originates from the backend.

TanStack Query provides the required:

- Fetching.
- Caching.
- Pagination.
- Background refresh.
- Mutation handling.
- Query invalidation.

---

# D-011 — Use a Monorepo for v1

**Status:** Accepted
**Date:** 2026-08-18

## Decision

Use a single Git monorepo:

```text
acme-salary/
├── backend/
├── frontend/
├── docs/
└── .agents/
```

The frontend and backend remain independently deployable.

## Rationale

A monorepo makes it easier to maintain:

- Shared documentation.
- API contract.
- Architecture decisions.
- Project planning.
- Coordinated frontend/backend changes.

Independent deployment is preserved through separate application directories and deployment configurations.

---

# D-012 — Supabase PostgreSQL for Development

**Status:** Accepted
**Date:** 2026-08-18

## Decision

Use Supabase PostgreSQL as the development/test database.

The backend connects directly through PostgreSQL using:

```text
pg
```

The Supabase client SDK is not required.

Production uses the configured Render PostgreSQL database.

## Rationale

This provides a convenient hosted PostgreSQL environment during development while keeping the backend database integration standard PostgreSQL.

---

# D-013 — PostgreSQL Performs Analytics Aggregations

**Status:** Accepted
**Date:** 2026-08-19

## Context

The analytics dashboard needs aggregation across employee and salary data.

The seeded dataset contains approximately 10,000 employees.

## Decision

Analytics calculations are performed in PostgreSQL.

The database is responsible for operations such as:

```text
COUNT
SUM
AVG
MIN
MAX
PERCENTILE_CONT
```

Node.js receives already-aggregated results.

## Rationale

Keeping aggregation in PostgreSQL:

- Reduces application memory usage.
- Uses database query optimization.
- Avoids transferring unnecessary raw rows.
- Keeps analytics logic close to the data.

---

# D-014 — API Contract Is the Integration Source of Truth

**Status:** Accepted
**Date:** 2026-08-19

## Context

The frontend and backend are developed independently.

Without a fixed API contract, frontend and backend implementations can diverge.

## Decision

`docs/api-contract.md` is the source of truth for:

- Endpoint paths.
- HTTP methods.
- Request parameters.
- Request bodies.
- Response structures.
- Validation rules.
- Authentication requirements.
- Error formats.
- HTTP status codes.

Frontend and backend developers must follow the agreed contract.

## Rationale

This prevents undocumented assumptions and reduces integration problems.

Any contract change must be documented before dependent implementation changes are made.

---

# D-015 — No Microservices for v1

**Status:** Accepted
**Date:** 2026-08-19

## Context

The application targets approximately 10,000 employees and consists of a relatively small set of business capabilities.

## Decision

Use a single Node.js backend service for v1.

Do not introduce separate microservices for:

- Authentication.
- Employee management.
- Salary management.
- Analytics.
- Export.

## Rationale

The scale and scope do not justify distributed-service complexity.

A modular monolithic backend provides sufficient separation while keeping deployment, debugging, testing, and operations simple.

Microservices may be reconsidered if future scale or organizational requirements justify them.

---

# D-016 — Server-Side CSV Export

**Status:** Accepted
**Date:** 2026-08-19

## Context

HR managers need to export filtered employee and salary data.

The requirements specify server-side generation and streaming.

## Decision

CSV export is generated by the backend.

The endpoint:

```text
GET /analytics/export
```

returns a streamed CSV response.

The export uses the same relevant filters as the employee directory.

## Rationale

Server-side streaming:

- Avoids loading the entire dataset into the browser.
- Keeps export logic centralized.
- Supports larger exports more reliably.
- Preserves the server-side filtering model.

---

# D-017 — No Employee Self-Service in v1

**Status:** Accepted
**Date:** 2026-08-19

## Context

The application is designed for HR managers to manage salary information.

Employees are not users of the system in v1.

## Decision

Employees cannot:

- Log in.
- View their own profile.
- View their salary.
- Modify salary information.

## Rationale

Employee self-service is explicitly outside the v1 scope.

Removing it keeps the authentication, authorization, and frontend scope focused on the HR management workflow.

---

# D-018 — UTC for Stored Timestamps

**Status:** Accepted
**Date:** 2026-08-19

## Context

The organisation operates across multiple countries and time zones.

## Decision

All timestamps stored by the backend/database use UTC.

Examples include:

- Salary record creation time.
- Refresh-token timestamps.
- Audit timestamps.

The frontend may convert timestamps to the user's local display timezone where appropriate.

## Rationale

UTC avoids timezone ambiguity and provides a consistent reference for audit records across countries.

---

# Decision Change Process

These decisions are considered the current architectural and engineering baseline.

If implementation reveals a reason to change a decision:

1. Identify the problem.
2. Document the context.
3. Document the alternatives considered.
4. Record the proposed decision.
5. Explain the rationale.
6. Update the relevant documentation.
7. Review the affected API, architecture, and project plan.
8. Implement only after the decision is accepted.

Do not silently change an accepted architectural decision inside implementation code.

---

# Decision Status Summary

| ID    | Decision                            | Status   |
| ----- | ----------------------------------- | -------- |
| D-001 | Offset pagination                   | Accepted |
| D-002 | Access token in memory              | Accepted |
| D-003 | Append-only salary records          | Accepted |
| D-004 | Local currency salary storage       | Accepted |
| D-005 | Static exchange rates               | Accepted |
| D-006 | Single `hr_manager` role            | Accepted |
| D-007 | Express                             | Accepted |
| D-008 | node-pg-migrate + raw SQL           | Accepted |
| D-009 | shadcn/ui                           | Accepted |
| D-010 | TanStack Query + Zustand            | Accepted |
| D-011 | Monorepo                            | Accepted |
| D-012 | Supabase PostgreSQL for development | Accepted |
| D-013 | PostgreSQL analytics aggregation    | Accepted |
| D-014 | API contract as source of truth     | Accepted |
| D-015 | Modular monolith / no microservices | Accepted |
| D-016 | Server-side streamed CSV export     | Accepted |
| D-017 | No employee self-service            | Accepted |
| D-018 | UTC timestamps                      | Accepted |

---

# Current Decision Baseline

The current architecture can be summarized as:

```text
React SPA
    │
    │ HTTPS / REST JSON
    ▼
Node.js + Express API
    │
    │ pg / SQL
    ▼
PostgreSQL
```

With:

```text
Frontend
├── React
├── TypeScript
├── Tailwind
├── shadcn/ui
├── TanStack Query
├── Zustand
└── Axios

Backend
├── Node.js
├── Express
├── TypeScript
├── Zod
├── JWT
├── Pino
├── Jest + Supertest
├── node-pg-migrate
└── pg

Database
└── PostgreSQL
```

The application remains a single organisation, single backend service, and single HR-manager role for v1.
