# Write Automation Tests — Execution Instructions

**Workflow:** write-automation-tests
**Agent:** Automator (Automation Agent)
**Purpose:** Create Playwright E2E automation tests using the Page Object Model (POM) design pattern.

---

## Step 0: Read the Framework [CHECKPOINT 0]

Before doing anything, scan the existing automation framework to understand what exists.

### 0.1 Scan Directory Structure
Verify the `automation/` directory exists with the expected structure:
```
automation/
├── package.json              # sdet-qa-automation — DO NOT modify
├── playwright.config.js      # Browser projects — DO NOT modify unless asked
├── .env                      # Project credentials (from .env.example)
├── .env.example              # Template for env vars — update if new vars needed
├── config/
│   └── qa-retest-config.json # Gatekeeper config — DO NOT modify
├── pages/                    # Page Object Model classes — YOU WRITE HERE
│   ├── BasePage.js           # Base page with common methods (create if missing)
│   └── [PageName].js         # One file per page (PascalCase)
├── fixtures/                 # Test data and auth setup — YOU WRITE HERE
│   ├── test-data.js          # TestDataFactory using Faker.js (create if missing)
│   └── auth.setup.js         # Auth setup fixture (create if missing)
├── utils/                    # Helper utilities — YOU WRITE HERE
│   └── helpers.js            # General helpers (create if missing)
├── tests/
│   ├── e2e/                  # E2E test specs — YOU WRITE HERE
│   │   └── [feature].spec.js # One file per feature
│   └── visual/               # Visual regression tests — YOU WRITE HERE
├── explorer/                 # Site crawler — DO NOT modify
└── reports/                  # Generated reports (gitignored)
```

### 0.2 Scan Existing Files
1. Read `automation/package.json` for dependencies and scripts
2. Read `automation/playwright.config.js` for browser projects and configuration
3. Read `automation/.env.example` for required environment variables
4. Scan `automation/pages/` for existing page objects
5. Scan `automation/fixtures/` for existing fixtures and test data
6. Scan `automation/utils/` for existing helpers
7. Scan `automation/tests/e2e/` for existing test specs

### 0.3 Initialize Session Memory
Record everything found into session memory. This prevents overwriting or duplicating existing work.

**Announce:** **CHECKPOINT 0 COMPLETE** — Framework scanned, N existing files found.

---

## Step 1: Obtain Test Cases & Choose Mode [CHECKPOINT 1]

### 1.1 Obtain Test Cases (primary input for automation)

**Use this priority order to get test cases:**

1. **If a file path was provided:** Read test cases from the specified path.
2. **If no path provided, check default location:** Look for test cases in `outputs/test-case-agent/` for the target feature.
3. **If no files found:** Ask the user — "Would you like to provide the file path, paste the test cases directly in chat, or provide a Jira ticket number?"
4. **If user pastes test cases in chat:** Use them directly as input.
5. **If user provides a Jira ticket/epic number** (e.g., PROJ-123): Use the Jira MCP tool to fetch the ticket details. Extract test cases and acceptance criteria from the Jira issue.

### 1.2 Choose Automation Mode

Present this choice to the user:

> **Which mode would you like to use?**
>
> **Mode A: Direct Automation** — I will analyze your application source code, map test cases to pages and user flows, and write page objects + test scripts.
> *Best when: You have source code available and test cases ready.*
>
> **Mode B: Codegen Capture** — I will launch Playwright codegen so you can interact with your app in a live browser. I will capture the recorded selectors and actions, then convert them into proper POM page objects + test scripts.
> *Best when: You want to record real interactions and convert them to robust tests.*

### 1.3 Choose Scale Depth

Ask: **Quick, Standard, or Enterprise depth?**

Wait for the user to choose before proceeding.

**Announce:** **CHECKPOINT 1 COMPLETE** — N test cases loaded, Mode [X] selected, [scale] depth.

---

## Mode A: Direct Automation

### Step A1: Analyze Source Code & Map Test Cases [CHECKPOINT A1]

**1. Check if application source code repository is available:**
- Ask the user for the source code path if not already provided
- If the repo is available, read the frontend code to understand:
  - UI components and their selectors (prefer data-testid, role, text)
  - User flows and navigation paths
  - Forms, inputs, and validations
  - Dynamic content and loading states
  - Authentication flow
- If no source code is available, the agent can still work from test cases + app URL

**2. Optional: Run Site Explorer (if app URL is available)**

If the user provides an app URL, offer to run the site-explorer to discover pages:
```bash
cd automation && node explorer/site-explorer.js --url <URL> --email <EMAIL> --password <PASSWORD>
```

Read the exploration report to identify pages, forms, and interactive elements.

**CRITICAL:** If login fails, STOP immediately. Do NOT continue until the user provides corrected credentials.

**3. Map test cases to source code:**
- For each test case from Scriptor, identify which pages/components are involved
- Map test case steps to actual UI elements found in source code
- Identify selectors for each interactive element referenced in test cases
- Note any gaps: test cases that reference pages/features not found in code

**4. Check existing automation files:**
- Read any existing page objects in `automation/pages/`
- Read any existing fixtures in `automation/fixtures/`
- Avoid duplicating what already exists

Update session memory: populate `features_identified`, map test cases to pages.
Identify reusable scenarios (common flows, shared setup patterns).

**Announce:** **CHECKPOINT A1 COMPLETE** — Source code analyzed, N features identified, M test cases mapped.

---

### Step A2: Write Foundation Files [CHECKPOINT A2]

Check if these exist and create them if not:

1. **automation/pages/BasePage.js** — Base class with common methods:
   - `goto(path)`, `getUrl()`, `getTitle()`, `waitForNavigation()`
   - `takeScreenshot(name)`, `isVisible(locator)`, `getText(locator)`
   - `clickAndWait(locator)`

2. **automation/fixtures/test-data.js** — TestDataFactory class:
   - `createUser(overrides)`, `createUsers(count, overrides)`
   - `invalidUsers` getter (missing fields, invalid formats, XSS, SQL injection)
   - `credentials` getter (reads from `process.env` — NEVER hardcode)
   - `validateEnv()` — throws if required env vars are missing

3. **automation/fixtures/auth.setup.js** — Auth setup:
   - Reads credentials from `process.env`
   - Throws if env vars not set
   - Stores AUTH_TOKEN for reuse

4. **automation/utils/helpers.js** — General helpers:
   - `waitForApiResponse(page, urlPattern, action)`
   - `uniqueId(prefix)`, `retry(fn, retries, delay)`

Update session memory: list foundation files created.

**Announce:** **CHECKPOINT A2 COMPLETE** — Foundation files ready.

---

### Step A3: Write Page Objects [CHECKPOINT A3]

For each page being tested, create a Page Object in `automation/pages/`:

**Rules:**
- File name: PascalCase (e.g., `LoginPage.js`, `DashboardPage.js`)
- Extend `BasePage`
- Define all locators in constructor
- Locator priority: `data-testid` > `getByRole` > `getByText` > CSS
- One action method per user interaction
- JSDoc comments for each method
- Export with `module.exports`

**Locator priority examples:**
1. `page.getByTestId('...')` — data-testid attributes (most stable)
2. `page.getByRole('...', { name: '...' })` — ARIA roles (accessible)
3. `page.getByText('...')` / `page.getByLabel('...')` — visible text
4. `page.locator('css-selector')` — CSS selectors (last resort)

**Reuse Rules:**
- Before creating a new page object, check if `BasePage` already has the method
- If a method exists in another page object and is generic, move it to `BasePage`
- Common actions (`login`, `logout`, `navigate`, `waitForToast`, `fillForm`) belong in `BasePage` or a shared page object
- Never duplicate the same locator or action across multiple page objects
- If you write it twice, extract it into a shared method

Add reusable page interactions to the scenario repository.
Update session memory: list page objects created.

**Announce:** **CHECKPOINT A3 COMPLETE** — N page objects created.

---

### Step A4: Write Test Specs [CHECKPOINT A4]

Write test files in `automation/tests/e2e/`:

**Rules:**
- File name: `feature-name.spec.js` (kebab-case)
- Import page objects from `../../pages/`
- Import test data from `../../fixtures/test-data`
- Group with `test.describe('Feature Name')`
- Use `beforeEach` for setup, `afterEach` for cleanup
- Test names: `should [expected behavior] when [condition]`
- Each test is independent — runnable in any order
- Use Playwright `expect` with auto-waiting — **NEVER** `page.waitForTimeout()`
- Tag tests with `@smoke`, `@regression`, `@critical` for suite building
- All code uses CommonJS (`require`/`module.exports`)

**Reuse Rules:**
- **NEVER** write inline page interactions in test specs — always call page object methods
- **NEVER** duplicate test data — always import from `fixtures/test-data.js`
- **NEVER** repeat login/auth logic — use auth fixture or `beforeEach` with page object
- If multiple specs share the same setup, extract it to a shared fixture
- If you write the same assertion helper twice, extract it to `utils/helpers.js`

**Test structure:**
```javascript
const { test, expect } = require('@playwright/test');
const PageName = require('../../pages/PageName');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup
  });

  test('should [expected behavior] when [condition] @smoke', async ({ page }) => {
    // Arrange: set up page objects and test data
    // Act: perform user actions
    // Assert: verify expected outcomes
  });
});
```

**Assertions:**
- Use Playwright's built-in `expect` with auto-waiting
- Prefer specific assertions: `toBeVisible()`, `toHaveText()`, `toHaveURL()`, `toContainText()`
- Use soft assertions (`expect.soft()`) for non-critical checks

**Waits and Stability:**
- **NEVER** use `page.waitForTimeout()` with hardcoded milliseconds
- Use `page.waitForLoadState('networkidle')` after navigation
- Use `page.waitForResponse()` when waiting for specific API calls
- Rely on Playwright's auto-waiting through `expect` and locator actions

Update session memory: list test specs, total tests, assertions.

**Announce:** **CHECKPOINT A4 COMPLETE** — N test specs with M total tests written.

---

### Step A5: Best Practices Checklist [CHECKPOINT A5]

Before finishing, verify:
- [ ] All locators use data-testid > role > text > CSS priority
- [ ] No hardcoded waits (`page.waitForTimeout`)
- [ ] No hardcoded credentials (all from `process.env`)
- [ ] Each test is independent
- [ ] Page objects extend BasePage
- [ ] Test data uses Faker.js
- [ ] All code uses CommonJS (`require`/`module.exports`)
- [ ] Tests can run with: `npm test` (from automation/)
- [ ] Tests are tagged for regression suites (`@smoke`, `@regression`, `@critical`)
- [ ] Reusable scenarios are documented in session summary
- [ ] No duplicated methods across page objects — common methods live in BasePage
- [ ] No inline page interactions in test specs — all actions go through page object methods
- [ ] No duplicated test data — all imported from fixtures
- [ ] No repeated login/setup logic — extracted to fixtures or beforeEach
- [ ] Shared helpers extracted to utils/helpers.js (no copy-paste across specs)

**Announce:** **CHECKPOINT A5 COMPLETE** — All checks passed.

---

### Step A6: Session Summary [CHECKPOINT A6]

Print final session summary:
```
╔══════════════════════════════════════════╗
║  SESSION COMPLETE — Mode A              ║
╠══════════════════════════════════════════╣
║  Features automated: N                  ║
║  Page objects created: N                ║
║  Test specs created: N                  ║
║  Total tests: N                         ║
║  Total assertions: N                    ║
║  Reusable scenarios: N                  ║
╚══════════════════════════════════════════╝
```

Save session summary to `outputs/automation-agent/session-summary.md`.

**Announce:** **CHECKPOINT A6 COMPLETE** — Session summary saved.

---

## Mode B: Codegen Capture (User Stories + Live Recording)

### Step B1: Gather Inputs [CHECKPOINT B1]

Collect the following from the user:

**1. User stories (required for Mode B):**
- Check `outputs/user-stories-agent/` for existing user stories
- If not found, ask the user to either:
  - Provide the file path to user stories
  - Paste user stories directly in chat
  - Provide a Jira ticket/epic number to fetch via Jira MCP
- Extract acceptance criteria from each user story
- Identify the user flows that need to be recorded

**2. Application URL** (required — codegen needs a live app)

**3. Credentials** (if app has auth):
- Ask for email and password
- Store in `.env` file (NEVER hardcode in scripts)

**4. Identify recording plan from user stories:**
- List which user flows need to be recorded based on the stories
- Present the recording plan to the user:
  > Based on your user stories, I recommend recording these flows:
  > 1. [Flow from story 1]
  > 2. [Flow from story 2]
  > ...
  > We'll record each one and I'll convert them to proper test scripts.

Update session memory.

**Announce:** **CHECKPOINT B1 COMPLETE** — N user stories analyzed, M flows to record, ready to launch codegen.

---

### Step B2: Launch Codegen & Record Flows [CHECKPOINT B2]

Launch the codegen recorder:
```bash
cd automation && npx playwright codegen <APP_URL>
```

Guide the user based on user stories:
> A browser window and the Playwright Inspector will open.
>
> **Flow to record: [Flow name from user story]**
> Based on the user story: "[As a... I want to... So that...]"
> Please perform these interactions:
> 1. [Step derived from acceptance criteria]
> 2. [Next step...]
> 3. [Continue...]
>
> When done with this flow, copy the generated code from the inspector and paste it here.

Wait for the user to paste the recorded code.
Repeat for each flow if multiple stories need recording.

**Announce:** **CHECKPOINT B2 COMPLETE** — N flow recordings received.

---

### Step B3: Analyze Recorded Code [CHECKPOINT B3]

Parse the codegen output to extract:
1. **Selectors used** — map each to data-testid/role/text equivalents
2. **User actions** — clicks, fills, navigations, assertions
3. **Page transitions** — identify distinct pages visited
4. **Forms identified** — fields, submit buttons, validation triggers
5. **API calls triggered** — network requests during the flow

Build a selector map:
```
SELECTOR MAP:
  [codegen selector] → [recommended POM selector] → [page object]
```

**Cross-reference with user stories:**
- Map recorded actions to acceptance criteria
- Identify which acceptance criteria were covered by the recording
- Flag any acceptance criteria NOT covered by the recording

Identify which selectors should be upgraded:
- Replace fragile CSS/XPath with data-testid or getByRole
- Flag any selectors that are likely to break on UI changes

Update session memory with identified pages and flows.

**Announce:** **CHECKPOINT B3 COMPLETE** — N selectors mapped, M pages identified, X/Y acceptance criteria covered.

---

### Step B4: Generate POM & Test Scripts [CHECKPOINT B4]

Convert the recorded interactions into proper framework code:

**1. Foundation files** — Create BasePage.js, test-data.js, auth.setup.js, helpers.js if they don't exist (same as Mode A, Step A2)

**2. Page Objects** — Create one per page visited during recording:
- Extract selectors from the codegen output
- Upgrade to robust selectors (data-testid > role > text > CSS)
- Create action methods for each user interaction
- Extend BasePage

**3. Test Specs** — Convert each recorded flow into proper tests:
- Map each user story to a `test.describe` block
- Map acceptance criteria to individual test cases
- Import page objects
- Use `beforeEach`/`afterEach` hooks
- Add proper assertions based on acceptance criteria expected results
- Add negative/edge case tests derived from user stories
- Tag with `@smoke`, `@regression` as appropriate

**4. Fixtures** — Generate test data for any form fills recorded

Update session memory: list files created.

**Announce:** **CHECKPOINT B4 COMPLETE** — N page objects + M test specs generated from recording.

---

### Step B5: Review & Enhance [CHECKPOINT B5]

Present the generated code to the user for review:
- Show selector upgrades (before/after)
- Show how user stories map to test specs
- Show added assertions from acceptance criteria
- Show negative/edge case tests generated beyond the recording
- Flag any acceptance criteria not covered
- Ask if any flows need re-recording

After approval, run the best practices checklist (same as A5).

**Announce:** **CHECKPOINT B5 COMPLETE** — Code reviewed and approved.

---

### Step B6: Session Summary [CHECKPOINT B6]

Print final session summary with user stories covered, features, test counts,
acceptance criteria mapping, coverage, and scenario repository stats.
Save session summary to `outputs/automation-agent/session-summary.md`.

**Announce:** **CHECKPOINT B6 COMPLETE** — Session summary saved.

---

## Regression Suite Builder

After tests are written (in any mode), offer to build regression suites.

### How It Works
1. Scan all existing test specs in `automation/tests/e2e/`
2. Read test tags: `@smoke`, `@regression`, `@critical`, `@feature-name`
3. Build suite configurations:

**Smoke Suite** — Critical path tests only (~5 min):
```bash
npx playwright test --grep @smoke
```

**Regression Suite** — All regression-tagged tests (~30 min):
```bash
npx playwright test --grep @regression
```

**Critical Suite** — Must-pass tests for release gate (~10 min):
```bash
npx playwright test --grep @critical
```

**Feature Suite** — Tests for a specific feature:
```bash
npx playwright test --grep @feature-name
```

### Suite Manifest
Save a suite manifest to `outputs/automation-agent/regression-suites.md` with counts and estimated durations.

---

## Scale-Aware Behavior

Adjust depth based on the active scale profile:

- **Quick:** Critical path only. 3-5 test specs. Happy path + login. Chromium only. `@smoke` suite only. Skip scenario repository. Announce start and end only.
- **Standard:** All user flows. Full POM coverage. Error paths included. Chromium + Firefox. `@smoke` + `@regression` suites. Build scenario repository. Announce each checkpoint.
- **Enterprise:** All flows + visual regression + accessibility + cross-browser matrix (Chromium, Firefox, WebKit). Include performance assertions. `@smoke` + `@regression` + `@critical` + per-feature suites. Full scenario repository. Mandatory adversarial review. Full detail with coverage metrics at each checkpoint.
