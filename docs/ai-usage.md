# AI Usage in ACME Salary Management

## 1. Overview
AI-assisted development was intentionally leveraged throughout this project to accelerate implementation, debugging, and routine tasks. However, as the developer, I retained full ownership of the system architecture, product decisions, security, code correctness, and final code review. AI served as a collaborative tool to execute the technical vision rather than replacing engineering judgment.

## 2. AI Tools Used
During the development of the ACME Salary Management system, the following AI tools/capabilities were used:
* **AI Coding Assistant (Antigravity/LLM)**: Used primarily for code implementation, debugging specific frontend and backend errors, updating unit test mock data, and writing configuration files.

## 3. AI-Assisted Development Workflow
The development process followed a structured cycle to ensure quality and control:
**Understand → Plan → AI Assistance → Review → Implement → Test → Refine**

1. **Understand & Plan**: Analyzed requirements and defined the architecture and API contracts first (e.g., deciding on offset pagination, append-only salary tables).
2. **AI Assistance**: Delegated specific, scoped tasks to the AI (e.g., "fix the search input losing focus" or "add a configuration for SPA routing").
3. **Review & Implement**: Manually reviewed the AI's proposed code changes before applying them to the codebase.
4. **Test & Refine**: Ran local builds, automated tests (Vitest), and manual UI verification. If the AI's solution was incomplete or incorrect, I guided it to refine the approach.

## 4. Areas Where AI Assisted
AI contributed to the project in the following specific areas:
* **Frontend Implementation**: Resolving React state and rendering bugs.
* **Debugging**: Identifying the root causes of deployment and routing issues.
* **Unit Tests**: Updating TypeScript interfaces and mock data to satisfy compiler constraints.
* **Configuration**: Generating deployment configuration files for Vercel.

## 5. Validation and Quality Control
AI-generated output was never blindly accepted. All suggestions were validated through:
* **Manual Code Review**: Ensuring the code aligned with the established architectural decisions (e.g., no microservices, proper shadcn/ui usage).
* **Automated Testing**: Running `vitest` locally to ensure no regressions were introduced.
* **Build Verification**: Running `npm run build` and `tsc -b` to guarantee type safety and successful production bundling.
* **Manual UI Testing**: Verifying behavior in the browser to ensure UX issues were properly resolved (e.g., verifying the search input retained focus).

## 6. Examples of AI Assistance
Here are concrete examples from the repository history demonstrating how AI was used:

* **Example 1: Fixing SPA Routing on Vercel**
  * **Problem**: Direct navigation to routes like `/employees?page=1` resulted in a 404 error on Vercel deployments.
  * **AI Assistance**: The AI correctly identified this as a Single Page Application routing issue and generated the necessary `vercel.json` rewrite rules.
  * **Review & Verification**: I reviewed the configuration to ensure it only mapped to `index.html` and verified the fix live on the Vercel deployment.

* **Example 2: Fixing React Input Focus Loss**
  * **Problem**: The search input on the Employees page would lose browser focus immediately after the debounced API call returned data.
  * **AI Assistance**: The AI analyzed `Employees.tsx` and identified that a dynamic `key={search}` prop on the `<Input />` component was causing React to unmount and remount the DOM node.
  * **Review & Verification**: I reviewed the removal of the `key` prop, ensuring the input remained properly controlled via `value={searchInput}`, and tested the search experience locally.

* **Example 3: Resolving TypeScript Build Errors in Tests**
  * **Problem**: Adding exchange rates to the analytics summary caused a `TS2741` build failure in `AnalyticsSummaryCards.test.tsx` due to missing properties in the mock data.
  * **AI Assistance**: The AI parsed the TypeScript compiler error and injected the missing `currentExchangeRates: []` property into the test mocks.
  * **Review & Verification**: I ran the local `vitest` suite and `npm run build` to confirm the compiler errors were resolved and the tests still passed correctly.

## 7. Human Decision-Making
While AI accelerated the coding process, it was not the final decision-maker. All core engineering decisions were explicitly defined by the developer, including:
* **Architecture**: Choosing a modular monolithic Node.js Express backend over NestJS or microservices.
* **Data Model**: Enforcing an append-only ledger for salary records rather than allowing mutable updates.
* **Security**: Deciding to keep JWT access tokens strictly in frontend memory while using HTTP-only Secure cookies for refresh tokens.
* **UX/Product**: Determining that employee self-service was out of scope for v1 and focusing strictly on the HR Manager role.

## 8. Key Principle
AI was utilized as a powerful accelerator to improve development speed, rapidly debug complex rendering and routing issues, and reduce boilerplate. However, full engineering ownership, correctness, maintainability, and testability remained strictly the responsibility of the human developer.
