# ACME Salary Management System

[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-79%2F79%20Passed-emerald)](backend)
[![Frontend Tests](https://img.shields.io/badge/Frontend%20Tests-69%2F69%20Passed-emerald)](frontend)
[![E2E & Accessibility](https://img.shields.io/badge/Playwright%20E2E-4%2F4%20Passed-blue)](frontend/e2e)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](backend/tsconfig.json)

An enterprise-grade HR salary management and workforce analytics platform designed for an organization with **10,000 employees** across multiple global countries and departments.

Built as an AI-orchestrated monorepo following structured software engineering, domain-driven design, and strict security and testability principles.

---

## 🎯 Executive Summary & Product Framing

- **User Persona**: HR Managers & Executive Leadership.
- **Problem**: ACME previously managed 10,000 employee records and multi-currency compensation data across fragmented spreadsheets. This was error-prone, lacked auditability, and made cross-organizational payroll analytics virtually impossible.
- **Solution**: A centralized web platform offering:
  1. **Executive Compensation Analytics**: Real-time aggregate payroll calculations, workforce distribution, pay band equity spreads, and currency-normalized benchmarks in USD.
  2. **High-Performance Employee Directory**: Sub-second search, multi-field filtering, and server-side pagination engineered for 10,000+ records.
  3. **Immutable Salary Audit Trail**: Append-only compensation history tracking every change, effective date, grade, band, and business justification with zero record tampering.
  4. **Multi-Currency Normalization**: Real-time exchange rate conversions (USD, EUR, GBP, CAD, INR, JPY, AUD) allowing global executive comparison.
  5. **Filtered CSV Export Streaming**: On-demand streaming dataset export for deeper compliance and ad-hoc reporting.

---

## 🏗️ Architecture & Tech Stack

```
acme-salary/
├── backend/            # Node.js, Express, TypeScript REST API & PostgreSQL Layer
├── frontend/           # React 19, TypeScript, TanStack Query, Tailwind CSS, Playwright
├── docs/               # Requirements, Architecture, ADRs, Project Plan, API Contracts
└── .agents/            # AI Agent Definitions, Engineering Rules, Multi-Agent Workflows
```

### Backend
- **Runtime & Framework**: Node.js v20+, Express, TypeScript (strict mode)
- **Database**: PostgreSQL 16 with relational schema, parameterized queries, composite indexes, and `node-pg-migrate` migrations
- **Logging & Security**: Structured JSON logging (`pino`), JWT authentication with secure httpOnly cookies, Zod schema validation
- **Testing**: Jest, Supertest (79 integration & unit tests)

### Frontend
- **Framework & State**: React 19, Vite, TypeScript, TanStack Query v5, Zustand
- **UI & Aesthetics**: Custom semantic design system with interactive **Dark Mode & Light Mode**, CSS/SVG data visualizations, accessible custom dropdowns, and responsive layouts
- **Testing & A11y**: Vitest, React Testing Library, Playwright E2E with Axe-core automated WCAG 2.1 AA accessibility auditing

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js `>= 20.0.0`
- PostgreSQL `>= 14` running locally or via Docker

### 1. Database Setup & Seeding
```bash
# Create local database
createdb acme_salary

# Configure backend environment
cd backend
cp .env.example .env

# Run database migrations
npm install
npm run migrate

# Seed database with 10,000 employees and historical salary records
npm run seed
```

### 2. Start the Backend Server
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

### 3. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Default Seed Credentials
- **Email**: `admin@acme.com`
- **Password**: `password123`
- **Role**: `hr_manager`

---

## 🧪 Comprehensive Verification Suite

Run all automated test suites across both backend and frontend:

```bash
# Backend Test Suite (79 tests)
cd backend
npm test
npm run lint
npm run typecheck

# Frontend Unit & Component Tests (69 tests)
cd frontend
npm test
npm run lint
npm run typecheck

# Playwright End-to-End & WCAG Accessibility Tests (4 suites)
npm run test:e2e
```

---

## 📚 Project Documentation & Artifacts

| Document | Description |
|---|---|
| [docs/requirements.md](docs/requirements.md) | One-page requirements specification outlining in-scope capabilities and deliberate trade-offs |
| [docs/architecture.md](docs/architecture.md) | Technical architecture, data models, scalability choices, and security design |
| [docs/decisions.md](docs/decisions.md) | Architectural Decision Records (ADRs) and trade-off rationales |
| [docs/project-plan.md](docs/project-plan.md) | Multi-phase development breakdown from schema design to integration QA |
| [docs/api-contract.md](docs/api-contract.md) | Comprehensive REST API contract with request/response payloads |
| [.agents/](.agents/) | AI Agent rules, prompt workflows, and automated orchestration |

---

## 🛡️ Key Engineering & Product Decisions

1. **Append-Only Compensation Ledger**:
   - Salary records are strictly append-only. `PUT` and `DELETE` endpoints for salary records return `404 Method Not Allowed`. This ensures complete regulatory compliance and non-repudiation.
2. **Server-Side Math & Pagination**:
   - All financial aggregations (sum, mean, 50th percentile median, min, max) and pagination are executed server-side in PostgreSQL to guarantee instant responsiveness on 10,000 records.
3. **Zero External Charting Bloat**:
   - Visual charts are crafted using semantic SVG and CSS layout primitives, eliminating heavy third-party visualization dependencies while remaining accessible and responsive.
4. **Theme System with Zero Flash**:
   - Built-in Dark Mode and Light Mode with HSL semantic design tokens and persistent state synchronized with system color schemes.
