---
trigger: always_on
---

# ACME Salary Management

## Project

ACME Salary Management is an HR salary management system for an organization with 10,000 employees across multiple countries.

The system allows HR managers to manage employee salary information and understand how the organization pays its employees.

---

## Repository Structure

This project uses a single Git monorepo:

acme-salary/

The repository contains:

- backend/ — Node.js backend application
- frontend/ — React frontend application
- docs/ — requirements, architecture, decisions and planning
- .agents/ — AI agent definitions, rules and workflows

There must be only one Git repository at the project root.

Do not create nested Git repositories inside:

- backend/
- frontend/

---

## Architecture

The system consists of:

- React frontend
- Node.js backend
- PostgreSQL relational database

The frontend communicates with the backend through APIs.

The frontend must not connect directly to the PostgreSQL database.

The backend is responsible for:

- authentication
- authorization
- business logic
- database access
- validation
- API responses

---

## Engineering Principles

- Prefer simple production-quality solutions.
- Avoid unnecessary complexity.
- Use TypeScript.
- Follow the approved architecture.
- Write meaningful tests.
- Keep business logic testable.
- Validate all external input.
- Use parameterized database queries.
- Protect sensitive data.
- Never commit secrets.
- Never commit `.env` files.
- Use environment variables for secrets and environment-specific configuration.
- Optimize database queries.
- Use server-side pagination.
- Do not load all 10,000 employees unnecessarily.
- Avoid N+1 database queries.
- Reuse existing project patterns where appropriate.
- Avoid unnecessary dependencies.

---

## Development Phases

Development must follow the approved project plan.

Agents must:

1. Work only on the current assigned phase.
2. Not implement functionality belonging to future phases.
3. Follow the approved requirements and architecture.
4. Keep changes focused and incremental.
5. Update documentation when the implementation changes an architectural or product decision.

The orchestration workflow determines the current phase and assigns work to the appropriate agents.

---

## Agent Responsibilities

### Manager

Responsible for:

- planning
- task breakdown
- coordination
- architecture alignment
- API contract coordination
- delivery decisions

The Manager does not replace specialized implementation agents.

### Backend Developer

Responsible for:

- backend code
- APIs
- business logic
- PostgreSQL integration
- migrations
- backend tests

Backend code belongs inside:

backend/

### Frontend Developer

Responsible for:

- React UI
- frontend state
- API integration
- frontend tests
- accessibility
- responsive behavior

Frontend code belongs inside:

frontend/

### Reviewer

Responsible for independent code review.

The Reviewer must not modify implementation code or fix issues.

### QA

Responsible for independent functional verification.

QA must not modify production implementation code.

---

## Code Review

AI-generated code must never be blindly accepted.

Every implementation must go through:

1. Implementation
2. Automated testing
3. Code review
4. QA verification
5. Final approval

Reviewers must verify:

- correctness
- architecture
- security
- maintainability
- tests
- scope
- performance where relevant

---

## Testing

Every meaningful feature must have appropriate tests.

Tests must be:

- deterministic
- isolated
- repeatable
- understandable
- reasonably fast

Before a phase is considered complete, the relevant project checks must pass.

Backend checks should include where available:

- tests
- lint
- typecheck

Frontend checks should use the commands defined by:

frontend/package.json

---

## Database

PostgreSQL is the relational database.

Database access must happen through the backend.

Database rules:

- Use migrations for schema changes.
- Use appropriate PostgreSQL data types.
- Define foreign keys and constraints.
- Add indexes based on actual query requirements.
- Use parameterized queries.
- Avoid N+1 queries.
- Keep historical salary records append-only.
- Do not expose database credentials to the frontend.

---

## Security

Never commit:

- passwords
- API keys
- JWT secrets
- database credentials
- service-account credentials
- `.env` files
- refresh tokens
- access tokens

Use environment variables for secrets.

Do not log:

- passwords
- password hashes
- access tokens
- refresh tokens
- database credentials
- unnecessary sensitive employee information

Authentication and authorization must be enforced by the backend.

---

## Git

The project uses one Git repository at:

acme-salary/

Agents must not create nested Git repositories.

Agents must not commit unless explicitly instructed by the orchestration workflow.

Commits must be:

- incremental
- focused
- meaningful
- phase-specific

Avoid large unrelated commits.

Do not commit:

- `.env`
- secrets
- generated dependencies
- unnecessary files
- temporary files

---

## AI Development

AI agents must not blindly generate and accept code.

Every implementation must be:

1. Reviewed
2. Tested
3. Validated
4. Documented when necessary

Agents must follow their assigned roles.

The orchestration workflow coordinates:

Manager → Developer → Reviewer → QA

and handles the appropriate fix/review cycle.

---

## Deployment

The project is deployed from the monorepo.

### Backend

GitHub:

acme-salary/

Deployment root:

backend/

Platform:

Render

### Frontend

GitHub:

acme-salary/

Deployment root:

frontend/

Platform:

Vercel

The frontend and backend must remain independently deployable.

---

## Performance

The system is designed for approximately 10,000 employees.

Do not introduce distributed infrastructure simply because the dataset contains 10,000 employees.

Prefer:

- PostgreSQL indexes
- server-side filtering
- server-side pagination
- efficient SQL queries
- appropriate API response sizes
- frontend pagination or virtualization where appropriate

Avoid:

- loading all employees into memory
- unnecessary database queries
- N+1 queries
- unnecessary network requests

---

## Documentation

Important architectural and product decisions should be documented in:

docs/

Relevant documents include:

- requirements.md
- architecture.md
- decisions.md
- project-plan.md

Agent-specific instructions belong in:

.agents/agents/

Project-wide rules belong in:

.agents/rules/

Workflow definitions belong in:

.agents/workflows/

Do not put phase-specific implementation instructions into individual agent definition files.
