# Analyze Repository — Instructions

## Agent: Scanner (Repo Analysis Agent)

Follow these steps in order to produce structured testing intelligence from the frontend and/or backend repositories.

**IMPORTANT**: Scanner produces structured Markdown documents ONLY. Do NOT generate test scripts — downstream agents (Strategist, Scriptor, Automator, Requester) consume Scanner's outputs to generate tests.

---

## Step 1: Load Repository Paths

1. **Read `project-context.md`** and locate the **Tech Stack** section:
   - Frontend repo path
   - Backend repo path
2. **Confirm the scope** with the user:
   - Frontend only, backend only, or both (default: both)
   - Optional focus area (e.g., a specific module, feature, or portal)
3. **Verify each path exists** on disk before proceeding:
   - If a path is missing or invalid, ask the user for the correct path.
   - If `project-context.md` has no Tech Stack paths, ask the user to provide them.
4. **Wait for the user to confirm** scope and paths.
   - Do NOT proceed until the user explicitly confirms.

---

## Step 2: Detect Framework & Technology Stack

1. **Never guess** — read configuration files to detect the stack:
   - Frontend: `package.json` (react, @angular/core, vue, next, nuxt) + routing, state management, UI library, API client, form library
   - Backend: `package.json` / `requirements.txt` / `pom.xml` / `build.gradle` (express, nestjs, django, fastapi, spring-boot) + ORM, auth library, validation, database
2. **Present a Technology Stack Summary table**:
   | Layer | Technology | Version | Notes |
   |-------|-----------|---------|-------|
3. Announce: **CHECKPOINT 1 COMPLETE** — Framework detected: [framework] v[version].

---

## Step 3: Scan Architecture & Components

Honor the confirmed scope — skip frontend tasks if backend-only, and vice versa. If a focus area was given, analyze it in depth first, then summarize the rest.

### 3.1 Pages & Routes (frontend)
- Detect all pages/routes from the router config or file-based routing.
- For each page: name, route, main UI components, auth required?, layout wrapper, lazy-loaded?
- Save to `outputs/repo-analysis-agent/pages.md`

### 3.2 Playwright Locators (frontend)
- Extract locators for all interactive elements (buttons, inputs, links, dropdowns, tables, modals, search, pagination).
- **Strict priority:** getByRole > getByLabel > getByPlaceholder > getByTestId > getByText > locator (CSS last resort).
- Save to `outputs/repo-analysis-agent/playwright-locators.md`

### 3.3 UI Components (frontend)
- Inventory reusable components: forms, tables, filters, dropdowns, modals, navigation, cards, alerts.
- For each: name, file location, props, pages used on, reusable?
- Save to `outputs/repo-analysis-agent/ui-components.md`

### 3.4 API Endpoints & Data Models (backend)
- Extract every endpoint: path, HTTP method, request payload, response structure, auth requirements, controller/handler.
- Document data models/schemas and middleware/auth guards.
- Save to `outputs/repo-analysis-agent/api-endpoints.md`

### 3.5 UI-to-API Mapping (full-stack only)
- Trace button clicks, form submissions, page loads, and search/pagination actions to backend endpoints.
- Flag **gaps** (frontend calls with no endpoint), **orphans** (endpoints with no consumer), and **auth mismatches**.
- Save to `outputs/repo-analysis-agent/ui-api-mapping.md`

### 3.6 User Flows
- Trace end-to-end flows: login/logout, CRUD, search/filter, password reset, domain-specific workflows.
- For each: preconditions, step-by-step actions, pages involved, API calls per step, expected outcome.
- Save to `outputs/repo-analysis-agent/user-flows.md`

Announce a **CHECKPOINT [task] COMPLETE** message with item counts after each task.

---

## Step 4: Assess Testability

1. **Locator quality**:
   - Count elements with `data-testid` attributes vs. those requiring fragile CSS selectors.
   - Report coverage per page: how many interactive elements have semantic locators (role, label, placeholder, testid)?
2. **Flag risk areas**:
   - Components with no stable locators (recommend adding `data-testid`)
   - Dynamic content, iframes, canvas, or third-party widgets that complicate automation
   - Endpoints missing auth documentation or validation
3. **Include the testability assessment** as a section in the relevant output files, citing file paths for every finding.

---

## Step 5: Present & Review

1. **Show the final summary** to the user:
   - Framework and repo type
   - Pages/routes, locators, components, endpoints, UI-API mappings, user flows (counts)
   - Testability highlights and risk areas
   - All 6 output file paths under `outputs/repo-analysis-agent/`
2. **Send Google Chat webhook notification** (approval wait):
   - Read `GOOGLE_CHAT_WEBHOOK_URL` from `automation/config/qa-retest-config.json` or `.env`
   - If configured, POST: `"🔔 *Scanner — Approval Needed*\n\nRepository analysis complete for *{project}*.\n{N} pages, {N} endpoints, {N} user flows mapped.\n\n👉 Waiting for your response in the terminal."`
   - If not configured, skip silently
3. **Ask the user for next steps**:
   - Review and provide feedback?
   - Hand off to Strategist (Test Scenario Agent)?
   - Deep-dive into a specific module?

---

## Step 6: Iterate

If the user provides feedback:
1. Re-scan the affected areas and incorporate all feedback.
2. Regenerate only the impacted output files.
3. Present a change summary showing what was updated.
