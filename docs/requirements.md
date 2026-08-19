# ACME Salary Management — Requirements

## Goal

Enable HR managers to view, manage, and analyse employee salary information across a 10,000-person, multi-country organisation in a reliable, auditable, and efficient system.

---

# User Persona

## HR Manager

The primary user of the system is an HR Manager.

The HR Manager:

- Manages compensation data for hundreds to thousands of employees.
- Needs to search, filter, and update salary records quickly.
- Requires reporting and analytics to understand pay distribution.
- Works across multiple countries with different currencies.
- Is non-technical and expects a clean, fast, professional UI.

---

# Functional Scope

| #   | Feature                      | Description                                                   |
| --- | ---------------------------- | ------------------------------------------------------------- |
| 1   | Employee Directory           | Paginated, searchable list of employees                       |
| 2   | Salary Management            | View, create, and update employee salary records              |
| 3   | Salary History               | Immutable audit history of all salary changes                 |
| 4   | Department & Country Filters | Filter employees by department and country                    |
| 5   | Employment Status Filter     | Filter employees by employment status                         |
| 6   | Sorting                      | Sort employee records by supported fields                     |
| 7   | Currency Support             | Store salaries in local currency and display converted values |
| 8   | Analytics Dashboard          | Summary statistics and pay distribution by department/country |
| 9   | Export                       | Export filtered employee/salary data to CSV                   |
| 10  | Authentication               | Secure login for HR managers                                  |

---

# Non-Functional Requirements

## Scale

Support 10,000 employees without full-table scans on every employee-list request.

## Performance

API responses should be below **300 ms at p95 under normal load**.

Analytics queries should meet the project performance target on the seeded 10,000-employee dataset.

## Pagination

All list endpoints must use server-side pagination.

Default page size:

```text
25
```

Maximum page size:

```text
100
```

The v1 implementation uses offset pagination.

## Security

- HTTPS only.
- JWT-based authentication.
- Access tokens are short-lived.
- Refresh tokens are stored in HTTP-only Secure cookies.
- Access tokens must not be stored in localStorage.
- No PII in application logs.
- Protected API endpoints require valid authentication.

## Auditability

Every salary change must be recorded with:

- Timestamp
- Actor
- Previous salary amount
- New salary amount
- Effective date
- Change reason

Salary records are immutable after creation.

## Reliability

The application must be production-ready within the availability characteristics of the selected hosting tier:

- Render
- Vercel
- PostgreSQL

## Maintainability

- TypeScript throughout.
- Meaningful automated test coverage.
- Clear separation between frontend and backend.
- API contract maintained as the source of truth for frontend/backend integration.

## Accessibility

The frontend should comply with **WCAG 2.1 AA**.

---

# Features

## F1 — Employee Directory

The system must provide a paginated employee directory.

### Employee List

The employee list must support:

- Pagination
- Search by employee name
- Search by employee ID / employee number
- Department filtering
- Country filtering
- Employment-status filtering
- Sorting

### Supported Sort Fields

The employee directory supports sorting by:

- Name
- Department
- Country
- Salary

### Pagination

Default:

```text
pageSize = 25
```

Maximum:

```text
pageSize = 100
```

The API must return pagination metadata including:

- Current page
- Page size
- Total records
- Total pages

---

# F2 — Salary Management

HR managers can view and create salary records for employees.

### Current Salary

The employee detail view must show the employee's current salary.

The current salary is determined from the salary history using the following rules:

1. Select the salary record with the latest `effective_date`.
2. When multiple salary records have the same `effective_date`, use `created_at DESC` as the deterministic tie-breaker.
3. If an employee has no salary records, `currentSalary` must be `null`.

### Salary Update

The HR manager can create a new salary record containing:

- Base salary amount
- Currency
- Effective date
- Pay frequency
- Grade
- Band
- Change reason
- Notes

### Validation

The system must reject:

- Salary amounts less than or equal to zero.
- Invalid currency codes.
- Invalid pay-frequency values.
- Future effective dates.

The authenticated HR manager is automatically recorded as the actor making the change.

---

# F3 — Salary History

The system must maintain an immutable chronological history of all salary changes for an employee.

Each history entry must provide enough information to identify:

- Previous salary amount
- New salary amount
- Currency
- Effective date
- Pay frequency
- Grade
- Band
- Change reason
- Notes
- Changed-by user
- Creation timestamp

### Immutability

Salary history is read-only.

There must be no API operation for:

- Updating an existing salary record.
- Deleting an existing salary record.

Every salary change creates a new salary record.

---

# F4 — Analytics Dashboard

The dashboard must provide salary and workforce analytics.

### Overall Statistics

The dashboard must show:

- Total headcount
- Total payroll cost in a base currency such as USD
- Average salary
- Median salary
- Minimum salary
- Maximum salary

### Department Breakdown

The dashboard must provide salary statistics by department, including:

- Headcount
- Total payroll
- Average salary
- Median salary
- Minimum salary
- Maximum salary

### Country Breakdown

The dashboard must provide salary statistics by country, including:

- Headcount
- Total payroll
- Average salary
- Median salary
- Minimum salary
- Maximum salary

### Pay Band Distribution

The dashboard must provide a pay-band distribution view.

### Currency Conversion

Salary amounts are stored in their local currency.

Analytics use the configured base currency, initially USD.

Currency conversion uses static exchange rates stored in the database.

Real-time exchange-rate APIs are not required for v1.

---

# F5 — Authentication

The system must provide secure authentication for HR managers.

### Login

Authentication uses:

- Email
- Password

### Session

The system uses:

- Short-lived JWT access token.
- HTTP-only Secure refresh-token cookie.

### Role

The only supported role in v1 is:

```text
hr_manager
```

### Protected Resources

All employee, salary, analytics, and reference-data endpoints require authentication.

Authentication endpoints remain publicly accessible:

```text
POST /auth/login
POST /auth/refresh
```

Logout requires an authenticated session.

---

# F6 — Export

The system must allow HR managers to export the currently filtered employee and salary dataset.

### Export Format

CSV.

### Export Filtering

The export must support the same relevant employee-directory filters:

- Search
- Department
- Country
- Employment status
- Sorting

### Server-Side Generation

CSV generation must happen on the backend.

The response must be streamed rather than loading the complete export into application memory.

---

# Reference Data

The system must provide reference data required by the frontend.

## Departments

The API must provide available departments for filtering.

## Countries

The API must provide available countries for filtering.

Countries must include a country code suitable for currency and country identification.

---

# Out of Scope

The following features are explicitly excluded from v1.

## Employee Self-Service

Employees cannot log in or manage their own salary information.

## Payroll Processing

The application does not process payroll.

## Payslip Generation

The application does not generate payslips.

## Benefits and Equity

Benefits, stock, equity, and related compensation management are out of scope.

## Performance Reviews

Performance reviews tied to compensation are out of scope.

## Real-Time Currency Exchange

Live exchange-rate APIs are not required.

Static exchange rates are sufficient for v1.

## SSO / SAML / OAuth

Enterprise SSO and external OAuth authentication are out of scope.

Email + password authentication is used for v1.

## Mobile Application

No native mobile application is required.

## Multi-Tenancy

The application supports a single organisation in v1.

## Advanced RBAC

Only the `hr_manager` role is supported in v1.

Additional roles may be introduced in a future version.

## Approval Workflows

Salary approval workflows are not required in v1.

---

# Assumptions

1. The application supports a single organisation.
2. HR managers are the only users in v1.
3. No salary approval workflow is required.
4. Employees are imported from an existing system.
5. The application manages salary information rather than acting as a complete HRIS.
6. PostgreSQL is the system's relational database.
7. Supabase PostgreSQL is used for development/test.
8. Render PostgreSQL is used for production.
9. Exchange rates are loaded from static configuration or manually updated.
10. All timestamps are stored in UTC.
11. Render/Vercel hosting tiers are acceptable for v1, with cold-start latency acknowledged where applicable.
12. The application is designed around approximately 10,000 employees for v1.

---

# Trade-offs

| Decision                 | Rationale                                                                       |
| ------------------------ | ------------------------------------------------------------------------------- |
| Single `hr_manager` role | Simplifies authentication and authorization while leaving room for future roles |
| Static exchange rates    | Avoids external API dependency and rate-limit risk in v1                        |
| Server-side pagination   | Prevents loading 10,000 records into the browser                                |
| Offset pagination        | Allows arbitrary page navigation and total counts                               |
| Immutable salary history | Provides auditability and prevents historical records from being altered        |
| PostgreSQL analytics     | Keeps aggregation close to the data and avoids loading raw records into Node.js |
| Render + Vercel          | Reduces operational complexity                                                  |
| No microservices         | 10,000 employees does not justify distributed infrastructure overhead           |
| Monorepo                 | Keeps frontend and backend together while allowing independent deployment       |

---

# API Contract Requirements

The API contract is maintained in:

```text
docs/api-contract.md
```

The API contract is the source of truth for:

- Endpoint paths
- HTTP methods
- Request parameters
- Request bodies
- Response structures
- Validation rules
- Authentication requirements
- Error formats
- HTTP status codes

Frontend and backend implementations must conform to the agreed API contract.

Any API contract change must be documented before dependent frontend/backend changes are implemented.

---

# Acceptance Criteria

## AC-1 — Authentication and Employee List

An HR manager can log in and see a paginated employee list.

The employee list must meet the defined API performance target under normal load.

## AC-2 — Search and Filtering

An HR manager can search and filter employees without a full page reload.

The list supports:

- Name / employee-number search
- Department
- Country
- Employment status

## AC-3 — Salary Update and Audit

Updating an employee's salary creates a new immutable salary-history record containing the actor's identity.

The previous salary record remains unchanged.

## AC-4 — Salary History

Salary history is viewable per employee in chronological order.

History includes previous and new salary information.

## AC-5 — Analytics

The analytics dashboard shows:

- Overall salary statistics
- Department breakdown
- Country breakdown
- Pay-band distribution

## AC-6 — CSV Export

CSV export downloads the currently filtered employee + salary dataset.

The export is generated server-side.

## AC-7 — Authentication Protection

All protected API endpoints return `401 Unauthorized` when accessed without valid authentication.

The following authentication endpoints remain publicly accessible:

```text
POST /auth/login
POST /auth/refresh
```

## AC-8 — Salary Validation

Invalid salary-update input returns an appropriate validation error with meaningful error details.

At minimum, the API rejects:

- Non-positive salary amounts.
- Invalid currency.
- Invalid pay frequency.
- Future effective dates.

## AC-9 — Scale

The system handles 10,000 employees without degraded performance on employee list pages.

Employee lists must remain server-side paginated.

## AC-10 — Currency

Salary amounts are stored in their local currency and displayed with the corresponding currency code.

Analytics may convert values to the configured base currency using static exchange rates.

---

# V1 API Surface

The requirements are implemented through the following API surface.

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

---

# Requirements Status

**Status:** Approved

This document defines the functional and non-functional scope for ACME Salary Management v1.

Changes to requirements after implementation begins should be documented and reviewed before modifying the affected architecture, API contract, project plan, backend, or frontend behavior.
