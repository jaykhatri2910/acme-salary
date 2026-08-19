# ACME Salary Management — Architecture

## 1. Overview

ACME Salary Management is a three-tier web application designed for HR managers to manage and analyse employee salary information for a single organisation with approximately 10,000 employees.

The system consists of:

- React SPA frontend
- Node.js + Express REST API backend
- PostgreSQL relational database

Frontend and backend live in a single Git monorepo while remaining independently deployable.

---

# 2. High-Level Architecture

```text id="w8z6qk"
                    ┌─────────────────────────┐
                    │      Browser / User      │
                    │       React SPA          │
                    └────────────┬────────────┘
                                 │
                          HTTPS / REST JSON
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     Node.js API         │
                    │        Express           │
                    │        Render            │
                    └────────────┬────────────┘
                                 │
                            SQL / pg
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       PostgreSQL        │
                    │                         │
                    │ Development: Supabase   │
                    │ Production: Render DB   │
                    └─────────────────────────┘
```

---

# 3. Repository Architecture

The project uses a monorepo.

```text id="i7khq8"
acme-salary/
├── backend/
├── frontend/
├── docs/
└── .agents/
```

## 3.1 Backend

```text id="2g6v5j"
backend/
├── src/
├── migrations/
├── seeds/
├── tests/
├── .env.example
├── package.json
└── tsconfig.json
```

The backend is independently deployable to Render.

## 3.2 Frontend

```text id="q5l4yv"
frontend/
├── src/
├── public/
├── tests/
├── .env.example
├── package.json
├── vite.config.ts
└── tsconfig.json
```

The frontend is independently deployable to Vercel.

## 3.3 Documentation

```text id="x1q7we"
docs/
├── requirements.md
├── architecture.md
├── decisions.md
├── project-plan.md
└── api-contract.md
```

These documents define the project's functional requirements, architecture, engineering decisions, implementation plan, and API integration contract.

---

# 4. Frontend Architecture

## 4.1 Technology Stack

The frontend uses:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI primitives
- TanStack Query
- Zustand
- React Router v6
- Axios
- React Hook Form
- Zod
- Recharts
- Vitest
- React Testing Library

---

# 5. Frontend Responsibilities

The frontend is responsible for:

- HR authentication UI.
- Employee directory.
- Employee search.
- Employee filtering.
- Employee sorting.
- Pagination controls.
- Employee details.
- Current salary display.
- Salary update form.
- Salary history display.
- Analytics dashboard.
- CSV export interaction.
- Loading/error/empty states.
- Accessible UI.
- Client-side form validation.

The frontend must not:

- Access PostgreSQL directly.
- Perform authoritative salary calculations.
- Modify salary history locally.
- Store access tokens in localStorage.
- Implement backend business rules independently.

---

# 6. Frontend State Architecture

The frontend separates server state from client/application state.

## 6.1 TanStack Query

TanStack Query manages server state.

Examples:

```text id="w2y5kc"
employees
employee details
salary
salary history
departments
countries
analytics
```

TanStack Query is responsible for:

- Data fetching.
- Caching.
- Background refresh.
- Pagination.
- Query invalidation.
- Mutations.

## 6.2 Zustand

Zustand manages lightweight client/application state.

Examples:

```text id="8y3z8m"
user
accessToken
authentication state
```

Redux is not required for v1.

---

# 7. Frontend Routing

The application contains the following primary routes:

```text id="f4h4as"
/                → Login

/employees       → Employee Directory

/employees/:id   → Employee Detail

/dashboard       → Analytics Dashboard
```

Protected application routes require authentication.

Unauthenticated users are redirected to the login page.

---

# 8. Authentication Architecture

Authentication uses a short-lived JWT access token and a refresh token.

```text id="3o2p2c"
                    ┌─────────────────┐
                    │     Browser     │
                    └────────┬────────┘
                             │
                      POST /auth/login
                             │
                             ▼
                    ┌─────────────────┐
                    │   Express API   │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
          Access Token             Refresh Token
          Short-lived              HTTP-only Cookie
          Memory only              Secure
```

## 8.1 Access Token

The access token:

- Is a JWT.
- Is short-lived, approximately 15 minutes.
- Is stored only in frontend memory.
- Is sent using the `Authorization: Bearer` header.
- Must not be stored in localStorage.

## 8.2 Refresh Token

The refresh token:

- Is stored in an HTTP-only cookie.
- Is Secure.
- Is stored/revoked server-side.
- Is used to issue a new access token.

## 8.3 Refresh Flow

On application startup:

```text id="8kyw4q"
Application starts
      ↓
POST /auth/refresh
      ↓
Refresh cookie validated
      ↓
New access token
      ↓
Store token in memory
      ↓
Application authenticated
```

If an API request returns `401` because the access token has expired:

```text id="d0glxy"
API request
    ↓
401
    ↓
POST /auth/refresh
    ↓
New access token
    ↓
Retry original request
```

---

# 9. Backend Architecture

## 9.1 Technology Stack

The backend uses:

- Node.js
- Express
- TypeScript
- PostgreSQL
- `pg`
- Zod
- JWT
- Pino
- `node-pg-migrate`
- Jest
- Supertest

---

# 10. Backend Module Structure

The backend follows a modular monolith architecture.

```text id="s9c6kv"
backend/src/
├── config/
├── db/
├── middleware/
├── modules/
│   ├── auth/
│   ├── employees/
│   ├── salary/
│   ├── analytics/
│   └── reference/
├── shared/
├── app.ts
└── server.ts
```

Each module owns its API-related responsibilities.

## 10.1 Auth Module

Responsible for:

- Login.
- Refresh.
- Logout.
- Password verification.
- JWT generation/verification.
- Refresh-token management.

## 10.2 Employee Module

Responsible for:

- Employee list.
- Search.
- Filtering.
- Sorting.
- Pagination.
- Employee detail.

## 10.3 Salary Module

Responsible for:

- Current salary.
- Salary creation.
- Salary history.
- Salary validation.
- Audit actor information.

## 10.4 Analytics Module

Responsible for:

- Salary aggregation.
- Headcount.
- Department statistics.
- Country statistics.
- Pay-band distribution.
- Currency conversion.
- CSV export.

## 10.5 Reference Module

Responsible for:

- Departments.
- Countries.

---

# 11. Database Architecture

PostgreSQL is the system's primary relational database.

Development:

```text id="i3xw72"
Supabase PostgreSQL
```

Production:

```text id="3v8o0x"
Render PostgreSQL
```

The backend connects directly using the PostgreSQL `pg` driver.

The Supabase client SDK is not required.

---

# 12. Database Entities

The database contains the following core entities:

```text id="c9j8x5"
departments
countries
users
employees
salary_records
refresh_tokens
exchange_rates
```

---

# 13. Entity Relationships

```text id="ldx4w9"
departments
     │
     │ 1:N
     ▼
employees
     │
     │ 1:N
     ▼
salary_records
     │
     │ N:1
     ▼
users

countries
     │
     │ 1:N
     ▼
employees

users
     │
     │ 1:N
     ▼
refresh_tokens

exchange_rates
     │
     └── used by analytics currency conversion
```

---

# 14. Salary Record Architecture

Salary records are an append-only ledger.

```text id="3h5l8w"
Employee
   │
   ├── Salary Record 1
   │      2024
   │
   ├── Salary Record 2
   │      2025
   │
   └── Salary Record 3
          2026
```

Existing salary records cannot be modified or deleted.

A salary update inserts a new record.

The current salary is determined using:

1. Highest `effective_date`.
2. `created_at DESC` as the deterministic tie-breaker.

This provides an immutable salary history.

---

# 15. Salary Audit Information

Each salary record captures sufficient information to audit a salary change.

Important fields include:

```text id="m6n3j7"
employee_id
amount
currency_code
effective_date
pay_frequency
grade
band
reason
notes
changed_by
created_at
```

The `changed_by` value is derived from the authenticated user.

The client cannot choose another user as the actor.

---

# 16. Currency Architecture

Salary amounts are stored in their original local currency.

Example:

```text id="8n5e0w"
Employee A
Amount: 8,000,000
Currency: INR

Employee B
Amount: 95,000
Currency: USD
```

The original local salary amount is preserved.

Analytics can convert salary values to a base currency, initially USD.

Conversion uses the static `exchange_rates` table.

No live FX API is required for v1.

---

# 17. Analytics Architecture

Analytics are calculated inside PostgreSQL.

The backend does not load all salary records into Node.js for aggregation.

PostgreSQL performs operations such as:

```text id="x7c5k3"
COUNT
SUM
AVG
MIN
MAX
PERCENTILE_CONT
```

The API returns pre-aggregated results.

---

# 18. Analytics Flow

```text id="r5t9vk"
React Dashboard
       │
       │ GET /analytics/summary
       ▼
Express API
       │
       │ SQL aggregation
       ▼
PostgreSQL
       │
       │ Aggregated results
       ▼
Express API
       │
       │ JSON
       ▼
React Dashboard
```

Analytics may include:

- Total headcount.
- Total payroll.
- Average salary.
- Median salary.
- Minimum salary.
- Maximum salary.
- Department breakdown.
- Country breakdown.
- Pay-band distribution.

---

# 19. CSV Export Architecture

CSV export is generated by the backend.

```text id="g7m2pz"
React
  │
  │ GET /analytics/export
  ▼
Express
  │
  │ Filtered SQL query
  ▼
PostgreSQL
  │
  │ Rows
  ▼
CSV Stream
  │
  ▼
Browser Download
```

The backend streams the CSV response rather than loading the entire export into application memory.

The export supports relevant employee-directory filters.

---

# 20. API Architecture

The backend exposes a REST JSON API.

## Authentication

```text id="9zj3kf"
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

## Employees

```text id="f2n7gy"
GET /employees
GET /employees/:id
GET /departments
GET /countries
```

## Salary

```text id="z5h4tb"
GET  /employees/:id/salary
POST /employees/:id/salary
GET  /employees/:id/salary/history
```

## Analytics

```text id="1r2k7j"
GET /analytics/summary
GET /analytics/export
```

## Health

```text id="b8q2mn"
GET /health
```

The complete request/response contract is defined in:

```text id="s0x5hj"
docs/api-contract.md
```

---

# 21. API Security

All employee, salary, analytics, and reference-data endpoints require authentication.

Protected requests use:

```http id="b6w0nv"
Authorization: Bearer <access_token>
```

The API must return:

```text id="f0f1kx"
401 Unauthorized
```

when a protected endpoint is accessed without valid authentication.

Authentication endpoints remain publicly accessible where required.

---

# 22. Validation

Request validation is performed using Zod.

Validation is required for:

- Authentication input.
- Employee query parameters.
- Pagination parameters.
- Sorting parameters.
- Salary updates.
- Salary fields.

Backend validation is authoritative.

Frontend validation mirrors backend validation for user experience but does not replace backend validation.

---

# 23. Error Handling

The backend uses centralized error handling.

API errors follow a consistent structure:

```json id="8h2vyd"
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {}
  }
}
```

Expected HTTP status codes include:

```text id="z9w0vb"
200
201
204
400
401
404
422
500
```

Unexpected errors are handled centrally and logged without exposing sensitive information.

---

# 24. Logging

Pino is used for backend logging.

Logs must not contain sensitive personal information or salary information unnecessarily.

In particular, application logs must not expose:

- Passwords.
- JWT access tokens.
- Refresh tokens.
- Sensitive authentication credentials.
- Unnecessary employee PII.

---

# 25. Database Migrations

Database schema changes are managed with:

```text id="e5k2cv"
node-pg-migrate
```

Migrations use explicit SQL.

The migration workflow is:

```text id="h4n7jt"
Create migration
      ↓
Run locally
      ↓
Run tests
      ↓
Commit migration
      ↓
Apply to deployment environment
```

Schema changes must not be made manually in production without a corresponding migration.

---

# 26. Performance Architecture

The system is designed for approximately 10,000 employees.

## Employee List

Employee lists use:

- Server-side pagination.
- Appropriate database indexes.
- Offset pagination.
- Search/filter query optimization.

## Analytics

Analytics use:

- PostgreSQL aggregation.
- Appropriate indexes.
- Query-plan inspection.

## Export

CSV export uses streaming to avoid loading the complete dataset into Node.js memory.

---

# 27. Performance Targets

The system targets:

```text id="i7a0h5"
API p95 < 300 ms
```

under normal load.

The analytics query must meet the project verification target on the seeded 10,000-employee database.

The employee list must remain performant at deep pagination levels, including page 100.

---

# 28. Accessibility Architecture

The frontend targets WCAG 2.1 AA.

Accessibility applies to:

- Forms.
- Buttons.
- Tables.
- Navigation.
- Dialogs.
- Filters.
- Pagination.
- Error messages.
- Loading states.
- Charts where applicable.

Accessibility testing is performed during the QA phase using automated tooling such as axe-core.

---

# 29. Testing Architecture

## Backend

Backend testing uses:

- Jest.
- Supertest.
- PostgreSQL test database.

Testing includes:

- Authentication.
- Authorization.
- Employee APIs.
- Salary APIs.
- Salary validation.
- Salary history.
- Analytics.
- CSV export.
- Error responses.

## Frontend

Frontend testing uses:

- Vitest.
- React Testing Library.

Testing includes:

- Login.
- Authentication state.
- Protected routes.
- Employee list.
- Search/filter/sorting.
- Pagination.
- Salary form.
- Salary history.
- Analytics rendering.

## End-to-End

Playwright is used for end-to-end workflows.

Primary workflows include:

```text id="r4s8xy"
Login
  ↓
Search employee
  ↓
Update salary
  ↓
View salary history
```

and:

```text id="q7n4hx"
Login
  ↓
View analytics
  ↓
Export CSV
```

---

# 30. Deployment Architecture

## Frontend

```text id="p4k9c3"
React SPA
   ↓
Vercel
```

## Backend

```text id="x5j3az"
Node.js + Express
   ↓
Render
```

## Database

Development:

```text id="7w3q6k"
Supabase PostgreSQL
```

Production:

```text id="2x7b9m"
Render PostgreSQL
```

---

# 31. Environment Configuration

Environment-specific configuration must be stored using environment variables.

The repository must contain:

```text id="7j3p8d"
.env.example
```

but must not commit actual secrets.

Examples of configuration include:

```text id="z4m7hy"
DATABASE_URL
JWT_SECRET
JWT_ACCESS_TOKEN_TTL
REFRESH_TOKEN_TTL
FRONTEND_URL
API_BASE_URL
NODE_ENV
```

Exact environment variables are documented in the respective application README files.

---

# 32. Deployment Separation

Frontend and backend are independently deployable.

```text id="e9x2wc"
Git Monorepo
     │
     ├───────────────┐
     │               │
     ▼               ▼
 frontend/        backend/
     │               │
     ▼               ▼
  Vercel           Render
                       │
                       ▼
                 PostgreSQL
```

A frontend deployment does not require rebuilding the backend.

A backend deployment does not require rebuilding the frontend.

---

# 33. Architectural Boundaries

The following boundaries must be maintained.

### Frontend → Backend

Communication occurs only through the documented REST API.

### Backend → Database

Communication occurs through PostgreSQL using `pg`.

### Frontend → Database

Not allowed.

### Frontend → Supabase

Not required.

### Backend → Supabase Client SDK

Not required.

The backend communicates with PostgreSQL directly.

---

# 34. Monolithic Backend Strategy

The backend is a modular monolith.

It is one deployable Node.js service but internally separated into modules.

```text id="j8h2sd"
                    Node.js API
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
      Auth          Employees         Salary
                                        │
                                        ▼
                                    Analytics
```

This structure provides logical separation without introducing microservice infrastructure.

---

# 35. Scalability Strategy

The v1 architecture is intentionally designed for the current scale.

Approximately:

```text id="f3q7vb"
10,000 employees
```

is not large enough to justify microservices or distributed infrastructure.

Future scaling options include:

- Database query optimization.
- Additional indexes.
- Read replicas.
- Caching.
- Background jobs.
- Cursor pagination.
- Separate analytics processing.
- Service decomposition.

These are not required for v1.

---

# 36. Architectural Constraints

The following constraints are intentional for v1:

- Single organisation.
- Single `hr_manager` role.
- Single backend service.
- PostgreSQL database.
- Static exchange rates.
- No employee self-service.
- No payroll processing.
- No mobile application.
- No SSO.
- No microservices.
- No live FX API.

---

# 37. Source-of-Truth Documentation

The project documentation is divided into four primary areas:

```text id="q8m4dn"
requirements.md
    ↓
What the system must do

architecture.md
    ↓
How the system is structured

decisions.md
    ↓
Why architectural choices were made

project-plan.md
    ↓
How implementation is sequenced

api-contract.md
    ↓
How frontend and backend communicate
```

These documents should remain synchronized.

A change to one document may require updates to the others.

---

# 38. Architecture Decision Summary

The final v1 architecture is:

```text id="k2r7vf"
┌──────────────────────────────────────────────┐
│                  FRONTEND                    │
│                                              │
│ React + TypeScript + Vite                    │
│ Tailwind + shadcn/ui                         │
│ TanStack Query + Zustand                     │
│ React Router + Axios                         │
│ React Hook Form + Zod                        │
└──────────────────────┬───────────────────────┘
                       │
                 HTTPS / REST
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                   BACKEND                    │
│                                              │
│ Node.js + Express + TypeScript               │
│ Zod + JWT + Pino                             │
│ Jest + Supertest                             │
│ node-pg-migrate + pg                         │
│                                              │
│ Modular Monolith                             │
│ ├── Auth                                     │
│ ├── Employees                                │
│ ├── Salary                                   │
│ ├── Analytics                                │
│ └── Reference                                │
└──────────────────────┬───────────────────────┘
                       │
                    SQL / pg
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  POSTGRESQL                  │
│                                              │
│ departments                                  │
│ countries                                    │
│ users                                        │
│ employees                                    │
│ salary_records                               │
│ refresh_tokens                               │
│ exchange_rates                               │
│                                              │
│ Development → Supabase                       │
│ Production  → Render                         │
└──────────────────────────────────────────────┘
```

---

# 39. Architecture Status

**Status: Approved**

This architecture is the v1 technical baseline for ACME Salary Management.

Any significant architectural change during implementation must be recorded in `decisions.md` before implementation proceeds.

The architecture must remain consistent with:

- `requirements.md`
- `decisions.md`
- `project-plan.md`
- `docs/api-contract.md`
