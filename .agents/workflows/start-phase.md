---
description: Workspace workflow to automate the software development phase process across the Manager, Developer, Reviewer, and QA agents.
---

# Start Phase Workflow

## Purpose

This workflow orchestrates the complete software development lifecycle for one phase of the ACME Salary Management project.

The project is a single monorepo:

acme-salary/

with:

- backend/ — backend application
- frontend/ — frontend application
- docs/ — project documentation
- .agents/ — agent definitions, rules, and workflows

The workflow coordinates:

Manager → Developer → Automated Verification → Reviewer → QA → Final Approval → Commit

Do not manually modify agent definition files for individual phases.

---

# Step 1 — Determine Phase

Accept the phase or task supplied by the user.

Examples:

- Phase 3
- Employee Management API
- Employee Management UI

Read:

- docs/requirements.md
- docs/architecture.md
- docs/decisions.md
- docs/project-plan.md
- .agents/rules/project-rules.md

Inspect the current repository state.

Determine:

- current Git branch
- uncommitted changes
- existing implementation
- current phase status
- relevant existing tests

Do not overwrite or discard existing user changes.

---

# Step 2 — Manager Planning

Delegate planning to:

.agents/agents/manager.md

Provide the Manager with:

- requested phase/task
- current repository state
- relevant requirements
- relevant architecture
- relevant project decisions

The Manager must produce a concise phase plan containing:

## Phase

Phase name and objective.

## Scope

What is included.

## Out of Scope

What must not be implemented.

## Backend

One of:

- REQUIRED
- NOT REQUIRED

If required, list backend tasks.

## Frontend

One of:

- REQUIRED
- NOT REQUIRED

If required, list frontend tasks.

## Database

One of:

- REQUIRED
- NOT REQUIRED

If required, list database changes.

## API Contract

List required API changes or confirm that no API changes are required.

## Acceptance Criteria

List measurable acceptance criteria.

## Testing Requirements

List required tests.

## Documentation

List documentation that must be updated.

Do not allow the Manager to introduce functionality belonging to later phases.

---

# Step 3 — Developer Delegation

Use the Manager's plan to determine which developers are required.

## Backend

If Backend is REQUIRED:

Delegate the backend tasks to:

.agents/agents/backend.md

The Backend Developer may modify only:

backend/

and relevant root documentation when explicitly required.

The Backend Developer must:

- implement assigned functionality
- follow the approved architecture
- write meaningful tests
- avoid future-phase functionality
- run relevant verification
- not commit changes

---

## Frontend

If Frontend is REQUIRED:

Delegate the frontend tasks to:

.agents/agents/frontend.md

The Frontend Developer may modify only:

frontend/

and relevant root documentation when explicitly required.

The Frontend Developer must:

- implement assigned functionality
- follow the approved architecture
- integrate with approved backend APIs
- write meaningful tests
- handle loading, empty, and error states
- avoid future-phase functionality
- not commit changes

---

## Parallel Development

If backend and frontend work are independent, they may be developed in parallel.

If frontend work depends on a backend API contract, complete or stabilize the API contract before frontend implementation.

Do not create duplicate or conflicting API contracts.

---

# Step 4 — Automated Verification

After development is complete, inspect:

- backend/package.json
- frontend/package.json

Run only the verification commands supported by each application.

## Backend

When backend exists and is part of the current phase, run the appropriate:

- test command
- lint command
- typecheck command

For the current backend implementation these are expected to be:

```bash
cd backend
npm test
npm run lint
npm run typecheck
```
