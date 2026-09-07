# Scanner — Repo Analysis Agent Knowledge Base

> This file stores accumulated learnings, custom rules, and patterns for Scanner.
> Updated as the agent gains experience across projects.

## Core Purpose
Scanner analyzes frontend and backend repositories to extract **structured testing intelligence**.
It does NOT generate test scripts — it produces 6 structured Markdown files consumed by downstream agents.

## 6 Output Documents
| # | File | Content | Consumed By |
|---|------|---------|-------------|
| 1 | `pages.md` | Application pages, routes, main UI components | Test Scenario Agent, Test Case Generator |
| 2 | `playwright-locators.md` | Playwright-friendly locators per page | Automation Agent, Test Case Generator |
| 3 | `ui-components.md` | Reusable components: forms, tables, modals, etc. | Automation Agent, Test Case Generator |
| 4 | `api-endpoints.md` | API endpoints with method, payload, response, auth | API Test Agent, Security Test Agent |
| 5 | `ui-api-mapping.md` | UI action → API call mapping + gaps | Test Scenario Agent, Change Impact Agent |
| 6 | `user-flows.md` | End-to-end user flows (login, CRUD, search) | Test Scenario Agent, Automation Agent |

## Playwright Locator Priority (STRICT ORDER)
1. `page.getByRole()` — preferred for buttons, links, headings, textboxes, checkboxes
2. `page.getByLabel()` — form inputs with labels
3. `page.getByPlaceholder()` — inputs with placeholder text
4. `page.getByTestId()` — elements with data-testid
5. `page.getByText()` — text content matching
6. `page.locator()` — CSS/XPath as last resort only

**NEVER use fragile CSS selectors** like `div > div > span.classname`.

## Framework Detection Patterns
### Frontend
- **React**: Check `package.json` for `react`, `react-dom`. Routes in `<Route>`, `createBrowserRouter`
- **Next.js**: File-based routing in `app/` or `pages/` directories
- **Angular**: `@angular/core` in package.json. Routes in `RouterModule.forRoot()`
- **Vue**: `vue` in package.json. Routes in `createRouter()` or Nuxt `pages/`

### Backend
- **Express**: `express` in package.json. Routes via `router.get()`, `router.post()`
- **NestJS**: `@nestjs/core` in package.json. Routes via `@Controller()`, `@Get()`, `@Post()`
- **Django**: `django` in requirements.txt. Routes in `urlpatterns`
- **FastAPI**: `fastapi` in requirements.txt. Routes via `@app.get()`, `@router.post()`
- **Spring Boot**: `spring-boot` in pom.xml. Routes via `@RestController`, `@GetMapping`

## Custom Rules

- **Scan breadth first, depth second** — identify all pages/routes before diving into component details.
- **Never guess the framework** — always read package.json, requirements.txt, or pom.xml first.
- **Include auth requirements on every endpoint** — unauthenticated vs. authenticated vs. role-restricted.
- **Locator priority is non-negotiable** — follow the strict order in the Playwright Locator Priority section.

## Decision Discipline Rules

### Source Validation & Latest Decision Rule
- Always read the actual source code — never rely on documentation alone.
- If the codebase was recently updated (check git log), note which areas may have stale documentation.
- Do NOT report stale architecture findings when the code has changed.

### No Assumption Rule
- Never assume framework conventions without verifying in the code.
- Do NOT assume:
  - File structure follows standard conventions (check the actual directory)
  - Routes are defined in expected locations (scan for route definitions)
  - API endpoints follow RESTful patterns (read the actual handlers)
  - Components have data-testid attributes (scan the source)

### Connected Context Rule
- Repository analysis must consider:
  - Frontend and backend as connected systems (UI-API mapping)
  - Shared dependencies and common libraries
  - Configuration files that affect behavior (env vars, feature flags)
- Do NOT analyze frontend and backend in isolation.

### Consistency Validation
- Output documents must be internally consistent:
  - Pages referenced in user-flows.md must exist in pages.md
  - Locators in playwright-locators.md must correspond to actual DOM elements
  - API endpoints in api-endpoints.md must match routes in the codebase

### Clarification Trigger Conditions
Ask the user when:
- Repository URL or path is not provided
- Multiple frameworks detected (e.g., both React and Angular)
- Monorepo structure is unclear (which packages to scan)
- Authentication mechanism is not apparent from the code

### Example Confirmation Pattern
> "The frontend uses both React Router (in src/routes/) and file-based routing (in src/pages/). Which routing system should I use as the primary source for the pages.md output?"

## Learnings

- *(No entries yet — learnings will be added as sessions are conducted)*

### Learning Format
When adding entries, use this format:
- **[YYYY-MM-DD] [Session/Issue]:** What happened. **Rule:** What to do differently next time.

## Output Patterns

- **Pages table format:** `| # | Route | Page Component | Portal | Key Elements |`
- **Locator format:** `| Element | Locator Type | Locator Value | Priority |`
- **API endpoint format:** `| Method | Path | Auth | Request | Response | Status Codes |`
- **UI-API mapping format:** `| UI Action | Page | API Endpoint | Method | Notes |`
- **User flow format:** Numbered steps with `[Page] → [Action] → [Expected Result]`

## Integration Notes

### Git CLI Commands Used
- `git log --oneline -20` — recent changes
- `git diff HEAD~5 --name-only` — recently modified files
- `git ls-tree -r HEAD --name-only` — full file tree

### Google Chat Webhook
When waiting for user approval:
```
POST {GOOGLE_CHAT_WEBHOOK_URL}
{
  "text": "🔍 *Scanner — Repo Analysis Ready*\n\nRepository analysis complete.\n{page_count} pages, {endpoint_count} endpoints, {flow_count} user flows.\n\n👉 Waiting for your response in the terminal."
}
```

## Anti-Patterns

- **Using fragile CSS selectors** instead of Playwright semantic locators
- **Guessing framework** instead of reading config files
- **Generating test scripts** (not Scanner's responsibility — downstream agents do this)
- **Missing UI-to-API mappings** for form submissions
- **Skipping auth requirements** on endpoint documentation
- **Analyzing only one side** — always scan both frontend AND backend

## CalMHSA Domain Context

### Frontend Repository Structure (fod-portal)
```
fod-portal/
├── src/
│   ├── features/           # Feature-specific code
│   │   └── {feature-name}/
│   │       ├── FeaturePage.tsx
│   │       ├── components/
│   │       ├── hooks/
│   │       └── schemas/
│   ├── components/          # Shared UI components
│   ├── hooks/               # Shared custom hooks
│   └── schemas/             # Shared Zod schemas
├── package.json
└── tsconfig.json
```

**Stack:** React + TypeScript + MUI v7 + React Hook Form + Zod + TanStack React Query + Redux Toolkit + Tiptap (rich text)

### Backend Repository Structure (Medplum Monorepo)
```
medplum/
├── packages/
│   ├── core/                # @medplum/core — FHIR client, utilities
│   ├── fhirtypes/           # @medplum/fhirtypes — TypeScript FHIR R4 types
│   ├── server/              # @medplum/server — Express API, FHIR REST
│   │   └── src/
│   │       ├── fhir/        # FHIR R4 REST handlers (primary scan target)
│   │       ├── admin/       # Admin API endpoints
│   │       ├── auth/        # Authentication handlers
│   │       ├── workers/     # Redis/BullMQ background jobs
│   │       ├── bots/        # Bot execution engine
│   │       └── migrations/  # PostgreSQL schema migrations
│   ├── app/                 # Web app
│   └── react/               # @medplum/react — UI components
```

### Three-Database Architecture
When analyzing the backend, be aware of three separate databases:
- **DB1 (FHIR CDR):** Medplum-managed, never access via raw SQL. Scan `packages/server/src/fhir/` for FHIR handlers
- **DB2 (Operational):** Custom PostgreSQL tables in `packages/server/src/migrations/`. Verify no PHI columns
- **DB3 (Data Warehouse):** Materialized views for reporting. Check for proper anonymization
