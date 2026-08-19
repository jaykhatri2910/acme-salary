# ACME Salary Management — API Contract

## 1. Overview

This document defines the REST API contract between the ACME Salary Management frontend and backend.

The API is implemented as a Node.js + Express TypeScript REST API backed by PostgreSQL.

The frontend and backend must follow this contract for all integration work.

### Base URL

Development:

```text
http://localhost:3000/api
```

Production:

```text
<RENDER_API_URL>/api
```

The production URL is environment-specific and must not be hardcoded in the frontend.

---

# 2. API Conventions

## 2.1 Content Type

Requests containing JSON bodies must use:

```http
Content-Type: application/json
```

Successful JSON responses use:

```http
Content-Type: application/json
```

CSV export uses:

```http
Content-Type: text/csv
```

---

## 2.2 Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

The access token is short-lived.

The refresh token is stored in an HTTP-only Secure cookie.

The frontend must not store the access token in localStorage.

On application startup, the frontend calls:

```http
POST /auth/refresh
```

to restore the authenticated session.

---

## 2.3 User Role

The only supported role in v1 is:

```text
hr_manager
```

All protected endpoints require an authenticated HR manager.

---

# 3. Standard Error Response

All API errors should use a consistent response structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {}
  }
}
```

### Fields

| Field           | Type   | Description                               |
| --------------- | ------ | ----------------------------------------- |
| `error.code`    | string | Machine-readable error code               |
| `error.message` | string | Human-readable error message              |
| `error.details` | object | Optional validation or contextual details |

---

# 4. Authentication API

## 4.1 POST /auth/login

Authenticate an HR manager.

### Authentication

Public endpoint.

### Request

```json
{
  "email": "hr@acme.com",
  "password": "password"
}
```

### Response

`200 OK`

```json
{
  "user": {
    "id": "uuid",
    "email": "hr@acme.com",
    "role": "hr_manager"
  },
  "accessToken": "jwt-access-token"
}
```

The backend also sets the refresh token as an HTTP-only Secure cookie.

### Errors

`400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email and password are required",
    "details": {}
  }
}
```

`401 Unauthorized`

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {}
  }
}
```

---

# 5. POST /auth/refresh

Issue a new access token using the refresh token stored in the HTTP-only cookie.

### Authentication

Public endpoint.

The refresh token is read from the cookie.

### Request

No request body.

### Response

`200 OK`

```json
{
  "accessToken": "new-jwt-access-token"
}
```

### Errors

`401 Unauthorized`

```json
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Invalid or expired refresh token",
    "details": {}
  }
}
```

---

# 6. POST /auth/logout

Invalidate the current refresh token and clear the refresh cookie.

### Authentication

Protected.

### Request

No request body.

### Response

`204 No Content`

### Errors

`401 Unauthorized`

Returned when the access token is missing or invalid.

---

# 7. Employee API

## 7.1 GET /employees

Return a paginated employee list.

### Authentication

Required.

### Query Parameters

| Parameter    | Type    | Required | Default | Description                             |
| ------------ | ------- | -------: | ------: | --------------------------------------- |
| `page`       | integer |       No |     `1` | Page number                             |
| `pageSize`   | integer |       No |    `25` | Number of records per page              |
| `search`     | string  |       No |       — | Search employee name or employee number |
| `department` | string  |       No |       — | Filter by department                    |
| `country`    | string  |       No |       — | Filter by country                       |
| `status`     | string  |       No |       — | Filter by employment status             |
| `sortBy`     | string  |       No |  `name` | Sort field                              |
| `sortOrder`  | string  |       No |   `asc` | `asc` or `desc`                         |

Maximum:

```text
pageSize = 100
```

Supported `sortBy` values:

```text
name
department
country
salary
```

### Example

```http
GET /employees?page=1&pageSize=25&search=john&department=Engineering&country=US&status=active&sortBy=name&sortOrder=asc
```

### Response

`200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "employeeNo": "EMP-00001",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@acme.com",
      "department": {
        "id": "uuid",
        "name": "Engineering"
      },
      "country": {
        "id": "uuid",
        "name": "United States",
        "code": "US"
      },
      "employmentStatus": "active",
      "currentSalary": {
        "amount": 95000,
        "currencyCode": "USD",
        "payFrequency": "annual"
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 10000,
    "totalPages": 400
  }
}
```

### Pagination

Pagination uses offset pagination.

The response must include:

```text
page
pageSize
total
totalPages
```

---

# 8. GET /employees/:id

Return a single employee and their current salary.

### Authentication

Required.

### Path Parameter

```text
id
```

Employee UUID.

### Response

`200 OK`

```json
{
  "data": {
    "id": "uuid",
    "employeeNo": "EMP-00001",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@acme.com",
    "department": {
      "id": "uuid",
      "name": "Engineering"
    },
    "country": {
      "id": "uuid",
      "name": "United States",
      "code": "US"
    },
    "employmentStatus": "active",
    "currentSalary": {
      "id": "uuid",
      "amount": 95000,
      "currencyCode": "USD",
      "effectiveDate": "2026-08-01",
      "payFrequency": "annual",
      "grade": "G6",
      "band": "Senior"
    }
  }
}
```

### Errors

`404 Not Found`

```json
{
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "Employee not found",
    "details": {}
  }
}
```

---

# 9. GET /departments

Return available departments for filtering.

### Authentication

Required.

### Response

`200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Engineering"
    },
    {
      "id": "uuid",
      "name": "Human Resources"
    }
  ]
}
```

---

# 10. GET /countries

Return available countries for filtering.

### Authentication

Required.

### Response

`200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "United States",
      "code": "US"
    },
    {
      "id": "uuid",
      "name": "India",
      "code": "IN"
    }
  ]
}
```

---

# 11. Salary API

## 11.1 GET /employees/:id/salary

Return the employee's current salary.

### Authentication

Required.

### Response

`200 OK`

```json
{
  "data": {
    "id": "uuid",
    "employeeId": "uuid",
    "amount": 95000,
    "currencyCode": "USD",
    "effectiveDate": "2026-08-01",
    "payFrequency": "annual",
    "grade": "G6",
    "band": "Senior",
    "reason": "Annual salary review",
    "notes": "Performance adjustment",
    "changedBy": {
      "id": "uuid",
      "email": "hr@acme.com"
    },
    "createdAt": "2026-08-19T10:00:00Z"
  }
}
```

The current salary is the salary record with the latest effective date, using `created_at DESC` as the deterministic tie-breaker when effective dates are equal.

---

# 12. POST /employees/:id/salary

Create a new salary record.

Salary records are append-only. Existing salary records must never be updated or deleted.

### Authentication

Required.

### Request

```json
{
  "amount": 105000,
  "currencyCode": "USD",
  "effectiveDate": "2026-08-01",
  "payFrequency": "annual",
  "grade": "G6",
  "band": "Senior",
  "reason": "Annual salary review",
  "notes": "Performance adjustment"
}
```

### Validation

The backend must validate:

- `amount > 0`
- Valid `currencyCode`
- Valid `payFrequency`
- `effectiveDate` is not in the future

### Response

`201 Created`

```json
{
  "data": {
    "id": "uuid",
    "employeeId": "uuid",
    "amount": 105000,
    "currencyCode": "USD",
    "effectiveDate": "2026-08-01",
    "payFrequency": "annual",
    "grade": "G6",
    "band": "Senior",
    "reason": "Annual salary review",
    "notes": "Performance adjustment",
    "changedBy": {
      "id": "uuid",
      "email": "hr@acme.com"
    },
    "createdAt": "2026-08-19T10:00:00Z"
  }
}
```

The `changedBy` value is taken from the authenticated JWT user and must not be supplied by the client.

### Validation Error

`400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid salary data",
    "details": {
      "amount": "Amount must be greater than zero"
    }
  }
}
```

---

# 13. GET /employees/:id/salary/history

Return the employee's complete salary history.

### Authentication

Required.

### Query Parameters

| Parameter  | Type    | Required | Default |
| ---------- | ------- | -------: | ------: |
| `page`     | integer |       No |     `1` |
| `pageSize` | integer |       No |    `25` |

Maximum:

```text
pageSize = 100
```

### Response

`200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "oldAmount": 95000,
      "newAmount": 105000,
      "currencyCode": "USD",
      "effectiveDate": "2026-08-01",
      "payFrequency": "annual",
      "grade": "G6",
      "band": "Senior",
      "reason": "Annual salary review",
      "notes": "Performance adjustment",
      "changedBy": {
        "id": "uuid",
        "email": "hr@acme.com"
      },
      "createdAt": "2026-08-19T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 5,
    "totalPages": 1
  }
}
```

### Ordering

Salary history is returned in descending `effectiveDate` order, with the newest salary record first.

When two records have the same `effectiveDate`, `createdAt DESC` is used as the deterministic tie-breaker.

### Salary Change Representation

For the first salary record for an employee, there is no previous salary.

In that case:

```json
{
  "oldAmount": null,
  "newAmount": 95000
}
```

For subsequent salary records, `oldAmount` represents the previous salary amount and `newAmount` represents the newly created salary amount.

### Immutability

No endpoint exists for updating or deleting salary history records.

---

# 14. Analytics API

## 14.1 GET /analytics/summary

Return aggregated salary and headcount statistics.

### Authentication

Required.

### Query Parameters

Optional filters:

| Parameter    | Type   | Description          |
| ------------ | ------ | -------------------- |
| `department` | string | Filter by department |
| `country`    | string | Filter by country    |

### Response

`200 OK`

```json
{
  "data": {
    "headcount": 10000,
    "totalPayrollUsd": 850000000,
    "averageSalaryUsd": 85000,
    "medianSalaryUsd": 82000,
    "minSalaryUsd": 30000,
    "maxSalaryUsd": 250000,

    "byDepartment": [
      {
        "department": "Engineering",
        "headcount": 2500,
        "totalPayrollUsd": 250000000,
        "averageSalaryUsd": 100000,
        "medianSalaryUsd": 97000,
        "minSalaryUsd": 50000,
        "maxSalaryUsd": 250000
      }
    ],

    "byCountry": [
      {
        "country": "United States",
        "countryCode": "US",
        "headcount": 4000,
        "totalPayrollUsd": 400000000,
        "averageSalaryUsd": 100000,
        "medianSalaryUsd": 95000,
        "minSalaryUsd": 40000,
        "maxSalaryUsd": 250000
      }
    ],

    "payBandDistribution": [
      {
        "band": "Junior",
        "headcount": 2500
      },
      {
        "band": "Mid",
        "headcount": 4000
      },
      {
        "band": "Senior",
        "headcount": 3000
      },
      {
        "band": "Lead",
        "headcount": 500
      }
    ]
  }
}
```

All salary aggregations must be calculated by PostgreSQL.

Currency conversion to USD uses the static `exchange_rates` table.

---

# 15. GET /analytics/export

Export the currently filtered employee and current salary dataset as CSV.

### Authentication

Required.

### Query Parameters

The same employee filtering parameters are supported:

| Parameter    | Type   |
| ------------ | ------ |
| `search`     | string |
| `department` | string |
| `country`    | string |
| `status`     | string |
| `sortBy`     | string |
| `sortOrder`  | string |

### Response

`200 OK`

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="salary-export.csv"
```

Example CSV:

```csv
employee_no,employee_name,department,country,status,salary,currency_code,pay_frequency,effective_date
EMP-00001,John Doe,Engineering,United States,active,95000,USD,annual,2026-08-01
```

The response must be streamed by the backend.

The export represents the currently applied filters.

---

# 16. Health API

## 16.1 GET /health

Return the health status of the API.

### Authentication

Public endpoint.

### Request

No request body.

### Response

`200 OK`

```json
{
  "status": "ok"
}
```

### Purpose

This endpoint is used by deployment infrastructure and monitoring to verify that the API process is running.

---

# 17. HTTP Status Codes

The API uses the following status codes:

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| `200`  | Successful request                       |
| `201`  | Resource created                         |
| `204`  | Successful request with no response body |
| `400`  | Invalid request / validation error       |
| `401`  | Missing or invalid authentication        |
| `404`  | Resource not found                       |
| `422`  | Unprocessable request where applicable   |
| `500`  | Unexpected server error                  |

---

# 18. Authentication Header

Every protected request must include:

```http
Authorization: Bearer <accessToken>
```

Example:

```http
GET /employees?page=1&pageSize=25
Authorization: Bearer eyJ...
```

---

# 19. Frontend Integration Rules

The frontend must consume the API exactly as defined in this document.

The frontend must not:

- Query PostgreSQL directly.
- Implement authoritative salary aggregation locally.
- Store access tokens in localStorage.
- Modify salary history locally.
- Assume undocumented API fields.
- Create alternative request/response formats.

Server state is managed using TanStack Query.

Authentication/client session state is managed using Zustand.

Frontend validation may mirror backend validation for user experience, but backend validation remains authoritative.

---

# 20. API Contract Change Process

Any change to a request, response, validation rule, endpoint, query parameter, or error format must be treated as an API contract amendment.

The developer making the change must update this document before frontend/backend integration is changed.

Both frontend and backend implementations must remain consistent with the latest committed contract.

The change should also be reflected in the relevant project documentation when it affects architecture, decisions, requirements, or implementation sequencing.

---

# 21. Endpoint Summary

| Method | Endpoint                        | Auth | Purpose                   |
| ------ | ------------------------------- | ---- | ------------------------- |
| POST   | `/auth/login`                   | No   | Login                     |
| POST   | `/auth/refresh`                 | No   | Refresh access token      |
| POST   | `/auth/logout`                  | Yes  | Logout                    |
| GET    | `/employees`                    | Yes  | Paginated employee list   |
| GET    | `/employees/:id`                | Yes  | Employee detail           |
| GET    | `/departments`                  | Yes  | Department reference data |
| GET    | `/countries`                    | Yes  | Country reference data    |
| GET    | `/employees/:id/salary`         | Yes  | Current salary            |
| POST   | `/employees/:id/salary`         | Yes  | Create salary record      |
| GET    | `/employees/:id/salary/history` | Yes  | Salary history            |
| GET    | `/analytics/summary`            | Yes  | Salary analytics          |
| GET    | `/analytics/export`             | Yes  | CSV export                |
| GET    | `/health`                       | No   | API health check          |

---

# 22. Contract Status

**Status: Approved**

This API contract is the source of truth for frontend/backend integration.

Before implementation changes are made, both frontend and backend developers must follow the endpoint paths, request formats, response formats, validation rules, authentication requirements, and error conventions defined in this document.

Any future contract changes must follow the API Contract Change Process described above.
