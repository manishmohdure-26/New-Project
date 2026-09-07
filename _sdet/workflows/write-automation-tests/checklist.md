# Write Automation Tests — Quality Gate Checklist

**Workflow:** write-automation-tests
**Agent:** Automator (Automation Agent)
**Purpose:** Verify that automation tests are complete, stable, maintainable, and follow best practices.

---

## Checkpoint 0: Framework Setup

- [ ] `automation/` directory structure verified and complete
- [ ] `package.json` has all required dependencies (`@playwright/test`, `dotenv`)
- [ ] `playwright.config.js` is configured (base URL, browser projects, reporters, timeouts)
- [ ] `.env` file has required variables (BASE_URL, credentials if needed)
- [ ] `npm install` completed successfully (no missing dependencies)
- [ ] Session memory initialized with existing files

## Checkpoint 1: Test Cases, Mode & Scale Selection

- [ ] Test cases obtained (from files, pasted in chat, fetched from Jira via MCP)
- [ ] Mode selected (A: Direct Automation or B: Codegen Capture)
- [ ] Scale selected (quick / standard / enterprise)

## Mode A Checkpoints

### Checkpoint A1: Source Code Analysis & Test Case Mapping

- [ ] Application source code repository checked and available
- [ ] Source code analyzed for UI components, selectors, and user flows
- [ ] Site explorer run (if app URL available) and report reviewed
- [ ] Test cases mapped to source code pages/components
- [ ] Selectors identified for each interactive element in test cases
- [ ] Features identified and listed in session memory
- [ ] Reusable scenarios identified (common flows, shared setup patterns)

### Checkpoint A2: Foundation Files

- [ ] `BasePage.js` exists with common methods (goto, waitForPageLoad, takeScreenshot)
- [ ] `test-data.js` exists with TestDataFactory using Faker.js
- [ ] `auth.setup.js` exists with credential handling from process.env
- [ ] `helpers.js` exists with general utilities
- [ ] No credentials hardcoded — all from `process.env`

### Checkpoint A3: Page Objects

- [ ] Page objects created for all pages under test (one file per page in `automation/pages/`)
- [ ] All page objects extend BasePage
- [ ] Locators use priority order: `data-testid` > `getByRole` > `getByText` > CSS selector
- [ ] All locators defined in constructor (not inline in test methods)
- [ ] Action methods provided for all user interactions
- [ ] JSDoc comments added for all public page object methods
- [ ] No duplicated methods across page objects — common methods in BasePage
- [ ] Generic methods (login, logout, navigate, waitForToast) live in BasePage, not individual pages
- [ ] No duplicated locators across page objects

### Checkpoint A4: Test Specs

- [ ] Test files follow `feature-name.spec.js` naming convention (kebab-case)
- [ ] Test files saved to `automation/tests/e2e/`
- [ ] Tests use `test.describe` blocks to group related tests
- [ ] Tests use `beforeEach` / `afterEach` hooks for setup and cleanup
- [ ] Test names follow `should [expected] when [condition]` pattern
- [ ] Each test is independent (no inter-test dependencies or shared mutable state)
- [ ] Tests tagged with `@smoke`, `@regression`, `@critical`
- [ ] All code uses CommonJS (`require`/`module.exports`)
- [ ] No inline page interactions — all actions through page object methods
- [ ] No duplicated test data — all imported from fixtures
- [ ] No repeated login/auth logic — uses fixture or beforeEach

### Checkpoint A5: Best Practices & Reuse Verification

- [ ] No hardcoded `page.waitForTimeout()` calls anywhere
- [ ] Proper Playwright auto-waiting used (through `expect` and locator actions)
- [ ] `waitForLoadState()` used after explicit navigation
- [ ] `waitForResponse()` used when waiting for specific API calls
- [ ] All async operations properly `await`-ed
- [ ] Test data uses fixtures or factories (not hardcoded in test files)
- [ ] Auth state managed through fixtures or `storageState`
- [ ] Created test data cleaned up in `afterEach` or `afterAll` where needed
- [ ] Reusable scenarios documented in session summary
- [ ] No copy-paste code across specs — shared logic extracted to helpers/fixtures
- [ ] BasePage contains all common methods used by 2+ page objects
- [ ] utils/helpers.js contains all shared assertion/utility functions

## Mode B Checkpoints

### Checkpoint B1: Inputs Gathered

- [ ] User stories obtained (from files, pasted in chat, or fetched from Jira via MCP)
- [ ] Acceptance criteria extracted from each user story
- [ ] User flows identified from stories — recording plan created
- [ ] Application URL obtained
- [ ] Auth credentials configured in `.env` (if required)

### Checkpoint B2: Codegen Recording

- [ ] Playwright codegen launched successfully
- [ ] User guided with steps derived from user stories
- [ ] User recorded interactions and pasted code back
- [ ] All planned flows recorded (or gaps noted)

### Checkpoint B3: Recording Analysis

- [ ] Selectors extracted and mapped to POM equivalents
- [ ] Fragile selectors flagged for upgrade
- [ ] Page transitions identified
- [ ] Forms and interactive elements cataloged
- [ ] Recorded actions cross-referenced with acceptance criteria
- [ ] Uncovered acceptance criteria flagged

### Checkpoint B4: POM & Test Script Generation

- [ ] Foundation files created (BasePage, test-data, auth.setup, helpers) if missing
- [ ] Page objects created from recorded interactions
- [ ] Selectors upgraded (data-testid > role > text > CSS)
- [ ] Test specs map user stories to `test.describe` blocks
- [ ] Test cases map acceptance criteria to individual tests
- [ ] Assertions based on acceptance criteria expected results
- [ ] Negative/edge case tests added from user stories
- [ ] Tests tagged with `@smoke`, `@regression`

### Checkpoint B5: Review & Enhance

- [ ] Selector upgrades presented (before/after)
- [ ] User story → test spec mapping shown
- [ ] Added assertions from acceptance criteria reviewed
- [ ] Negative/edge case tests reviewed
- [ ] Uncovered acceptance criteria flagged
- [ ] Best practices checklist passed (same as A5)

## Session Summary (A6 / B6)

- [ ] Session summary printed with coverage metrics
- [ ] Summary saved to `outputs/automation-agent/session-summary.md`
- [ ] Coverage gaps identified for potential follow-up
- [ ] Bugs discovered during testing noted for Catcher (Bug Reporter)
- [ ] Test data dependencies noted for Feeder (Test Data Agent)
- [ ] Recommended next agent identified (if applicable)

---

**Gate Rule:** All checkpoint items must be checked before automation tests are considered complete. If any test fails, investigate and fix before marking the checkpoint as done. Document any known issues or limitations.
