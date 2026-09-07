# Automator — Automation Agent Knowledge

> Training file for Automator (Senior QA Automation Engineer).
> Edit this file to customize Automator's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Method Reuse Rules (CRITICAL)
- **NEVER duplicate methods** — if a method exists in BasePage or another page object, reuse it
- **Before writing any new method**, check: BasePage → existing page objects → fixtures → utils
- **Common methods belong in BasePage**: login, logout, navigate, waitForToast, fillForm, submitForm, takeScreenshot
- **Common test data belongs in fixtures/test-data.js**: user data, form data, invalid inputs
- **Common assertions/helpers belong in utils/helpers.js**: waitForApiResponse, retry, uniqueId
- **If you write it twice, extract it** — move to BasePage, fixtures, or utils immediately
- **Test specs should ONLY contain**: imports, test.describe, beforeEach/afterEach, test blocks with arrange/act/assert
- **Test specs should NEVER contain**: raw selectors, direct page.click/page.fill calls, hardcoded data, duplicated setup logic

## Learnings

### HopeNotes Frontend — `FormField` does NOT produce HTML `<label>` elements (2026-05-27)
The shared `<FormField config={{ label: 'X', type: 'text' }} />` wrapper resolves to
`Frontend/src/shared/Inputs/fields/TextInput.tsx`. That component renders the label as a
plain `<Typography>` ABOVE an MUI `<TextField>` and DOES NOT pass `label` to the TextField.
Result: there is no `<label htmlFor>` and no `aria-label/aria-labelledby` on the input.
**`page.getByLabel('Email')` matches nothing.** Use `page.getByPlaceholder('Enter Email')`
instead (or `locator('input[name="username"]')` as a fallback).

### HopeNotes — every API call needs `X-Tenant-ID` header (2026-05-27)
`Frontend/src/client/axios.ts` attaches `X-Tenant-ID` (from `localStorage.tenantId` or
`VITE_TENANT_ID`) on EVERY request. Tests that bypass the UI and hit the API directly
(e.g. via Playwright's `request.post` to seed a token) MUST send this header explicitly
or the backend rejects the call. Source value: `process.env.TENANT_ID` from
`automation/.env` (default `new_beginning_qa`).

```js
await request.post(`${process.env.API_BASE_URL}/master/users/login`, {
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': process.env.TENANT_ID || 'new_beginning_qa',
  },
  data: { username, password },
});
```

### HopeNotes — Playwright setup project must live UNDER `testDir` (2026-05-27)
`automation/playwright.config.js` sets `testDir: './tests'` and a `setup` project with
`testMatch: /.*\.setup\.js/`. Setup files placed outside `tests/` (e.g. under `fixtures/`)
are **never discovered**, so storageState is never written, and any spec using
`test.use({ storageState: '...' })` fails with `ENOENT`. Keep auth setup at
`automation/tests/setup/auth.setup.js`.

### HopeNotes — SearchField `aria-label` is on the wrapper `<div>`, not the input (2026-05-27)
`Frontend/src/components/common/SearchField.tsx` passes `aria-label` to the MUI `<TextField>`,
which lands on the outer `<div class="MuiTextField-root">`. Calling `.fill()` on that locator
fails: "Element is not an `<input>`". Use `getByPlaceholder('Search')` instead — the
placeholder propagates down to the actual `<input>`.

### HopeNotes — axios serializes spaces as `+`, not `%20` (2026-05-27)
The shared axios client (`Frontend/src/client/axios.ts`) uses default `URLSearchParams`
serialization, so `search="Sunrise Behavioral"` reaches the network as
`?search=Sunrise+Behavioral`. `encodeURIComponent` emits `%20`. When matching list URLs
in `waitForResponse`, accept BOTH encodings:
```js
const pct = encodeURIComponent(text);
const plus = pct.replace(/%20/g, '+');
url.includes(`search=${pct}`) || url.includes(`search=${plus}`)
```

### HopeNotes — Archive does NOT remove rows from the default list (2026-05-27)
`GET /api/master/orgs` (no filter) returns archived rows alongside active ones. Only when
the UI applies the Status filter (which sends `?archive=false`) are archived rows hidden.
After clicking Archive in the row menu, do not assert "No data available" — the row is
still there. Verify the row's More-actions menu now shows "Unarchive" and hides "Archive"
(per `Organizations.tsx` action `hidden` rules).

### HopeNotes — `getByRole('menuitem', { name: 'Archive' })` matches "Unarchive" (2026-05-27)
Default name matching is a substring/regex match, so `'Archive'` matches `'Unarchive'`.
When asserting that the Archive menu item is gone after archiving, use `exact: true` on
BOTH the Unarchive (visible) and Archive (hidden) assertions.

### Mode A pre-flight, MANDATORY for OrganizationsPage-style CRUD forms
Beyond reading the route + leaf input components, also read:
- The `CommonTable` (`Frontend/src/shared/table/index.tsx`) to learn the action-menu pattern: row action button is `aria-label="More actions"`, items become `<MenuItem>` with text labels matching the `label` prop in `actions=[{...}]`.
- Any confirm-modal component (e.g. `common/ArchiveConfirmModal.tsx`) — confirm-action button text varies (`Archive` vs `Unarchive`). Scope to `getByRole('dialog')` to avoid matching same-named buttons on the underlying page.
- The list-page parent (e.g. `Organizations.tsx`) to learn which API params the FE sends in default state (often NO `archive` filter — meaning the default list includes archived rows).

### HopeNotes — `AuthLayout` header is NOT a heading (2026-05-27)
`Frontend/src/layouts/AuthLayout.tsx` renders the `header` and `subHeader` props with plain
`<Typography>` (no `variant="h*"`), so MUI emits `<p>` elements, not `<h*>`. **Do not use
`getByRole('heading', ...)` for "Login To Your Account", "Forgot Password", etc.** — use
`getByText(...)`.

### Rule extracted from these two cases
**Never trust the `label` prop in JSX as a getByLabel target.** Always open the leaf component
that actually renders the `<input>` and confirm: does it emit a real `<label htmlFor>` /
`aria-label` / `aria-labelledby`? If not, fall back to `getByPlaceholder` → `name` attribute.
Same rule for `getByRole('heading')` — confirm the wrapper emits `<h1>`...`<h6>` (an MUI
`<Typography>` without `variant="h*"` is NOT a heading).

### HopeNotes — MUI X DateField: type the section spinbuttons, not the calendar (2026-05-29)
The date fields (e.g. Sub-Org "Fiscal Year Begins/Ends on") are MUI X DateFields exposing editable
section `spinbutton`s (`Month`/`Day`/`Year`). Driving the calendar popup is flaky: both date
triggers keep `aria-label="Choose date"` (the label does NOT change after selecting), and the
start calendar can overlap the end calendar (two `Next month` buttons → strict-mode violation).
**Reliable approach:** click `getByRole('spinbutton', { name: 'Month' }).nth(fieldIndex)` then
`keyboard.type('MM')`, `type('DD')`, `type('YYYY')` — the field auto-advances between sections and
fires the React onChange when complete. Two date fields → nth(0)=first, nth(1)=second.

### HopeNotes — searchable MUI Select/chip-select: skip the in-menu Search "option" (2026-05-29)
`SelectInput`/`MultiSelectInput`/chip-selects show an in-menu `<TextField placeholder="Search...">`
once there are >= 6 options (SEARCH_THRESHOLD). It renders as the FIRST `role="option"`, so
`getByRole('option').first()` clicks the search box (selects nothing) and leaves the menu open.
Use `getByRole('option').nth(1)` for the first REAL option (or click a named option). An open
listbox makes the rest of the drawer `aria-hidden`, so a left-open menu hides the Save button.

### HopeNotes — close a Select/chip-select dropdown via clickaway, NOT Escape (2026-05-29)
Inside a Drawer/Dialog, `keyboard.press('Escape')` closes the whole drawer (or trips the
unsaved-changes guard), not just the open dropdown. To dismiss a multi-select/chip-select menu,
click a neutral element inside the drawer (e.g. the drawer title heading) as a clickaway.

## Selector Notes

### HopeNotes locator cheat sheet
| JSX surface | Use |
|-------------|-----|
| `<FormField config={{ label, placeholder, type }} />` (text/email/password) | `getByPlaceholder('<placeholder>')` |
| `<AuthLayout header="...">` | `getByText('<header>')` (NOT `getByRole('heading')`) |
| MUI `Button` (incl. `<CustomeButton>`) | `getByRole('button', { name: '<label>' })` ✓ |
| MUI `TextField` error text | sibling `.MuiFormHelperText-root[.Mui-error]` inside the input's `.MuiTextField-root` ancestor |
| `<Typography onClick={...}>` (e.g. "Forgot Password ?") | `getByText('<text>', { exact: false })` — it's clickable but NOT a `<button>` / `<a>` |

### Mode A pre-flight (MANDATORY for any HopeNotes page)
Before writing a page object, open AND read:
1. The route component (e.g. `Login.tsx`)
2. The layout component if one is referenced (e.g. `AuthLayout.tsx`)
3. The leaf input component (`TextInput.tsx`, `SelectInput.tsx`, etc. — via `FormField.tsx`)
4. The Zod schema for exact validation message strings
5. The validation messages constants file (`Frontend/src/constants/validationMessages.ts`)
Locators are only as good as the leaf components. Reading the page file alone is NOT enough.

## Workflow Notes

### Checkpoint Flow (Updated)
```
CHECKPOINT 0 → Scan automation/ framework
CHECKPOINT 1 → Check for test scenarios + test cases → generate if missing (SKIP for Mode C)
CHECKPOINT 2 → Ask user for Mode (A/B/C) — scale is always standard
Then → Mode A (A1-A6) or Mode B (B1-B7) or Mode C (C1-C7)
```

### CHECKPOINT 1: Auto-Check & Generate (Mode A/B only)
- **FIRST** check `outputs/test-scenario-agent/` for `test-scenarios-*.md` files
- **THEN** check `outputs/test-case-agent/` for `TestCases-*.md` files
- If scenarios are missing → ask user for input source → generate scenarios → save to `outputs/test-scenario-agent/`
- If test cases are missing → generate from scenarios → save to `outputs/test-case-agent/`
- Scenario IDs use format: `SC-[MODULE]-[NUMBER]` (e.g., SC-AUTH-001)
- Test case IDs use format: `TC-[MODULE]-[NUMBER]` (e.g., TC-LOGIN-001)
- Mode selection happens AFTER test cases are confirmed (Checkpoint 2, not 1)
- **Mode C skips Step 1 entirely** — the user story is the input, test cases are generated at C4

## Framework Notes

- **ALWAYS store CHECKPOINT 0 scan results in session memory** — after scanning `automation/`, record every existing file (page objects, fixtures, utils, test specs, configs) into session memory. This prevents overwriting or duplicating work throughout the session.
- Framework root: `automation/`
- Package: `sdet-qa-automation` v1.0.0
- Test runner: Playwright `^1.49.0`
- Test data: `@faker-js/faker ^9.0.0`
- Config: `dotenv ^16.4.0`
- Browser projects: chromium, firefox, webkit, mobile-chrome, mobile-safari
- Auth setup project runs before all browser projects
- Scripts: `npm test`, `npm run test:headed`, `npm run test:ui`, `npm run test:e2e`, `npm run report`
- Code style: CommonJS (`require`/`module.exports`), JavaScript (ES6+)

## Production Framework Rules (CRITICAL)

### Foundation Files — NEVER Recreate, ALWAYS Extend
The framework ships with 4 production-ready foundation files. **Do NOT recreate them.** Extend them when needed.

| File | Purpose | Extend How |
|------|---------|------------|
| `pages/BasePage.js` | Base class for all page objects | Add new common methods when 2+ pages need them |
| `fixtures/test-data.js` | TestDataFactory with Faker.js | Add new data generators as methods on `TestData` |
| `fixtures/auth.setup.js` | storageState authentication | Add new roles (e.g., `authenticate as manager`) |
| `utils/helpers.js` | Shared utilities & assertions | Add new helpers as methods on `Helpers` |

### BasePage.js — Available Methods (use before writing new ones)
**Navigation:** `goto(path)`, `waitForPageLoad(state)`, `getCurrentUrl()`, `getPageTitle()`
**Auth:** `login(options)`, `logout()`
**Interactions:** `clickByTestId(id)`, `clickButton(name)`, `clickLink(name)`, `fillByLabel(label, value)`, `fillByTestId(id, value)`, `selectByLabel(label, value)`, `toggleCheckbox(label, checked)`
**Forms:** `fillForm(fields)`, `submitForm(buttonName)`, `clearField(label)`
**Waiting:** `waitForApiResponse(url, options)`, `doAndWaitForApi(action, url)`, `doAndWaitForNavigation(action, url)`
**Toasts:** `waitForToast(text, options)`, `dismissToasts()`
**Modals:** `waitForModal()`, `confirmDialog(buttonName)`, `cancelDialog(buttonName)`
**Tables:** `getTableRowCount(testId)`, `getTableCellText(row, col, testId)`, `searchInTable(text, testId)`
**Screenshots:** `takeScreenshot(name)`
**Assertions:** `expectUrlContains(path)`, `expectHeading(text)`, `expectVisible(testId)`, `expectNotVisible(testId)`, `expectText(testId, text)`, `expectFieldError(label)`

### test-data.js — Available Generators (use before hardcoding data)
**Users:** `TestData.user(overrides)`, `TestData.adminUser(overrides)`
**Auth:** `TestData.invalidEmails()`, `TestData.invalidPasswords()`, `TestData.validCredentials()`
**Forms:** `TestData.address(overrides)`, `TestData.company(overrides)`, `TestData.product(overrides)`
**Text:** `TestData.textOfLength(n)`, `TestData.description(sentences)`
**Search:** `TestData.searchTerms()` — includes SQL injection & XSS payloads
**Dates:** `TestData.dates()` — past, future, today with formatted versions
**Numbers:** `TestData.numericBoundaries(options)` — min, max, boundary values
**Files:** `TestData.fileUpload()` — valid/invalid file types
**Utilities:** `TestData.uniqueId()`, `TestData.uniqueEmail()`, `TestData.timestamp()`

### helpers.js — Available Utilities (use before creating new ones)
**Retry:** `Helpers.retry(fn, options)` — retry flaky operations with configurable attempts
**API:** `Helpers.waitForApiResponse(page, url, options)` — wait + validate API responses
**Comparison:** `Helpers.diffObjects(before, after)` — diff two objects
**Isolation:** `Helpers.uniqueId(prefix)` — generate unique test IDs
**Downloads:** `Helpers.handleDownload(page, triggerAction)` — handle file downloads
**Assertions:** `Helpers.softAssert(assertions)` — collect multiple failures
**Monitoring:** `Helpers.collectConsoleErrors(page)`, `Helpers.collectNetworkFailures(page)`
**Formatting:** `Helpers.formatDate(date)`, `Helpers.formatCurrency(amount)`

### Page Object Rules
1. **Every page object MUST extend BasePage** — `class LoginPage extends BasePage`
2. **Constructor pattern** — define ALL locators in constructor, never inline
3. **Locator priority** — `data-testid` > `getByRole` > `getByText` > CSS (last resort)
4. **One file per page** — `automation/pages/PageName.js` (PascalCase)
5. **Action methods** — wrap every user interaction in a descriptive method
6. **JSDoc** — document all public methods with `@param` and `@returns`
7. **No page.waitForTimeout()** — use Playwright auto-waiting or explicit waits

### Test Spec Rules
1. **File naming** — `automation/tests/e2e/feature-name.spec.js` (kebab-case)
2. **Structure** — `test.describe` → `beforeEach`/`afterEach` → `test` blocks only
3. **Test naming** — `should [expected behavior] when [condition]`
4. **Tags** — every test gets `@smoke`, `@regression`, or `@critical`
5. **Independence** — each test runs independently, no shared mutable state
6. **No inline selectors** — all interactions through page object methods
7. **No hardcoded data** — import from `fixtures/test-data.js`
8. **No repeated auth** — use `storageState` from `auth.setup.js` or `beforeEach`
9. **Clean up** — created test data cleaned in `afterEach` or `afterAll`
10. **Arrange-Act-Assert** — every test block follows AAA pattern

### Auth Rules
1. **NEVER hardcode credentials** — always `process.env.TEST_USER_EMAIL` etc.
2. **Use storageState** — `auth.setup.js` saves authenticated state, tests reuse it
3. **Role-based auth** — different `.json` files per role (user, admin)
4. **Credentials in .env only** — never in code, never in test data fixtures

### Directory Structure
```
automation/
├── pages/           # Page objects (PascalCase.js, extend BasePage)
│   └── BasePage.js  # FOUNDATION — common methods
├── fixtures/        # Test data and setup
│   ├── test-data.js # FOUNDATION — TestDataFactory
│   └── auth.setup.js# FOUNDATION — storageState auth
├── utils/           # Shared utilities
│   └── helpers.js   # FOUNDATION — Helpers object
├── tests/
│   ├── e2e/         # E2E test specs (kebab-case.spec.js)
│   └── visual/      # Visual regression tests
├── playwright.config.js  # PROTECTED — do not modify
├── package.json          # PROTECTED — do not modify
└── explorer/             # PROTECTED — site crawler (do not modify)
```

## Anti-Patterns

- **Using generic QA names in test data** — NEVER use "TestOrg", "QA User", "Test123" prefixes. Always use `uniqueName('entityType')` which picks from realistic behavioral health name pools (e.g., "Sunrise Behavioral Health", "Cognitive Distortion Worksheet"). For people, use faker — never hardcode "Test User"
- **Copy-pasting page interactions into test specs** — always use page object methods instead
- **Duplicating login logic across specs** — use storageState from auth.setup.js
- **Writing the same locator in two page objects** — move to BasePage or a shared component page
- **Hardcoding test data in specs** — use fixtures/test-data.js with Faker.js
- **Writing raw `page.click()` / `page.fill()` in test specs** — wrap in page object action methods
- **Creating utility functions inside test specs** — move to utils/helpers.js
- **Duplicating setup logic across beforeEach blocks** — extract to a shared fixture
- **Recreating foundation files** — extend BasePage/TestData/Helpers, never rewrite from scratch
- **Using `page.waitForTimeout()`** — use Playwright auto-waiting, `waitForLoadState`, or `waitForResponse`
- **Using ES modules (`import`/`export`)** — this is a CommonJS project, use `require`/`module.exports`
- **Committing `.env` files** — credentials must never be committed
- **Modifying protected files** — `playwright.config.js`, `package.json`, `explorer/` are locked

## Mode C: Story-Driven Source Analysis Rules

### When to Use Mode C
- User has a Jira ticket, user story, or epic with acceptance criteria
- Frontend and/or backend source code is available locally
- No need to pre-run `/repo-analysis-agent` or `/test-scenario-agent`
- Want tests written directly from story + codebase in a single session

### Mode C Checkpoint Flow
```
CHECKPOINT 0 → Scan automation/ framework
(Skip Step 1)
CHECKPOINT 2 → Mode C ("SD") selected
C1 → Receive & parse user story (Jira ID / pasted text / file / URL)
C2 → Analyze frontend source code (routes, components, locators, Zod schemas)
C3 → Analyze backend source + API endpoints (controllers, DTOs, services)
C4 → Generate inline test cases from AC + source analysis → user approval
C5 → Write foundation files (if needed) + page objects from source-derived locators
C6 → Write test specs from approved test cases
C7 → Best practices checklist + session summary
```

### Frontend Source Reading Cheat Sheet

| File | What to Extract |
|------|----------------|
| `routes/paths.ts` | Route constants (e.g., `PATHS.ORGANIZATIONS = 'organizations'`) |
| `routes/router.tsx` | Route-to-component mapping (which component renders at which route) |
| `components/[module]/[Feature].tsx` | JSX elements, locator candidates, table columns, actions |
| `components/[module]/AddEdit[Feature].tsx` | Form fields, drawer/modal structure, submit handlers |
| `schemas/formSchemas.ts` | Zod validation rules (required fields, regex, min/max) |
| `services/index.ts` | API endpoint base paths (e.g., `createService<T>('/master/resource')`) |
| `services/CreateService.ts` | CRUD pattern (getAll, getById, create, update, delete, toggleStatus, archive) |
| `hooks/query/index.ts` | Query hooks revealing which mutations exist |
| `shared/table/index.tsx` | CommonTable props (columns, actions, pagination) |
| `shared/Inputs/FormField.tsx` | Form field types (text, select, date, phone, etc.) |

### Locator Derivation from Source Code

| JSX Pattern | Playwright Locator |
|-------------|-------------------|
| `<AddButton label="Add Organization" />` | `page.getByRole('button', { name: /Add Organization/i })` |
| `<SearchField placeholder="Search" />` | `page.getByPlaceholder('Search')` |
| `<Typography>All Organizations</Typography>` | `page.getByText('All Organizations')` |
| `<TextField label="Organization Name" />` | `page.getByLabel('Organization Name')` |
| `<FormField config={{ label: 'Email', type: 'email' }} />` | `page.getByLabel('Email')` |
| `<Select label="Status" />` | `page.getByLabel('Status')` |
| `data-testid="org-table"` | `page.getByTestId('org-table')` |
| `<IconButton aria-label="edit">` | `page.getByRole('button', { name: 'edit' })` |
| `CommonTable actions [{ label: 'View' }]` | `page.getByRole('menuitem', { name: 'View' })` |
| `<Tab label="Overview" />` | `page.getByRole('tab', { name: 'Overview' })` |
| `<Checkbox label="Active" />` | `page.getByRole('checkbox', { name: 'Active' })` |
| `<Radio label="Percentage" />` | `page.getByRole('radio', { name: 'Percentage' })` |

### Test Case Generation from Zod Schemas

| Zod Rule | Test Case Type | Example Test |
|----------|---------------|-------------|
| `z.string().min(1, "Required")` | Negative | Submit with empty field → expect validation error |
| `z.string().email("Invalid email")` | Negative | Submit with "not-an-email" → expect error |
| `z.string().regex(phoneRegex)` | Negative | Submit with "12345" (too short) → expect error |
| `z.string().max(255, "Too long")` | Edge Case | Submit with 256-char string → expect error |
| `z.string().optional()` | Positive | Submit without this field → should succeed |
| `z.number().min(0)` | Edge Case | Submit with -1 → expect error; 0 → should pass |
| `z.array().min(1)` | Negative | Submit with empty array → expect error |
| `z.enum(["A", "B", "C"])` | Negative | Submit with "D" (invalid enum) → expect error |

### Mode C Edge Cases
- **Frontend source not available**: Ask user to clone repo or provide alternate path, or switch to Mode B
- **Backend source not available**: Use frontend service definitions to derive API endpoints instead
- **No Jira access**: Fall back to pasted text or file path
- **Vague acceptance criteria**: Use frontend component analysis to infer testable behaviors, confirm with user
- **Locators cannot be determined**: Use best-guess with `// TODO: Verify locator against live app` comment
- **Feature has no backend yet**: Skip C3, generate test cases from AC + frontend only, note API assertions pending

---

# Cloned Capabilities (from Custom_EHR BMAD Automation Agent — 2026-05-28)

> The automation agent YAML was expanded to a **6-mode** generator. The reference content below
> (BasePage wrapper catalog, Data Verification recipes, Smart-Fill table, and 20 MUI/React/Keycloak
> lessons) applies across ALL modes. All HOPE-specific lessons ABOVE this line remain authoritative —
> when a HOPE lesson and a generic lesson below disagree, the HOPE-specific one wins.

## Mode Taxonomy (Updated 2026-05-28 — supersedes the older A/B/C above)

| New | Mode | Replaces / absorbs |
|-----|------|--------------------|
| A | Exploratory (site crawl → test cases → scripts) | new |
| B | Direct Automation from source (+ repo-analysis-agent outputs) | old Mode A (Direct) + old Mode C (Story-Driven Source Analysis) |
| C | Workflow Automation (one serial spec per workflow) | new |
| D | Record, Analyze & Smart Fill | new |
| E | Chrome Live (E-Live / E-Observe / E-Record / E-Debug) | new |
| F | Record-First codegen (codegen + Action Timeline) | old Mode B (Codegen) |

The older "Frontend Source Reading Cheat Sheet", "Locator Derivation from Source Code", and "Test Case
Generation from Zod Schemas" tables (under *Mode C: Story-Driven Source Analysis* above) now apply to the
new **Mode B**. Keep using them — they are HOPE-specific and accurate.

## BasePage Wrapper Method Catalog (FS-2)

All Playwright calls live in BasePage; page objects call `this.<method>()` only.

| Method | Wraps | Usage |
|--------|-------|-------|
| `click(locator)` | waitFor + click | safe click with visibility wait |
| `fill(locator, value)` | clear + fill | clear then fill |
| `sendKeys(locator, value)` | alias for fill | naming parity |
| `typeText(locator, value)` | `pressSequentially()` | React-controlled + masked inputs |
| `pressKey(key)` | `keyboard.press()` | Enter/Escape/Tab |
| `scrollIntoView(locator)` | `scrollIntoView()` | works inside modals |
| `uploadFile(locator, paths)` | `setInputFiles()` | file inputs |
| `selectOption(locator, label)` | `selectOption({label})` | native `<select>` |
| `selectMUIOption(combobox, text)` | click + `getByRole('option')` | MUI/custom Select |
| `searchAndSelect(input, text)` | fill + click first result | MUI Autocomplete typeahead |
| `selectFromDropdown(locator, value, opts?)` | auto-detects native vs custom | universal dropdown |
| `selectFirstAvailableOption(locator)` | iterate options | API-populated dropdowns |
| `waitForToast(timeout?)` | waits `[role=alert]` | success/error toasts |
| `waitForApiResponse(url, method?)` | `waitForResponse()` | after submissions |
| `clickAndWaitForApi(locator, url, method?)` | `Promise.all([waitForResponse, click])` | simultaneous |
| `captureDOM(opts?)` | `evaluate()` DOM walk | locator discovery (MANDATORY before finalizing selectors) |
| `clickAndCaptureDOM` / `fillAndCaptureDOM` / `selectAndCaptureDOM` | action + snapshot | see DOM after interaction |

`captureDOM` options: `scope` (CSS area limit), `maxDepth` (8), `visibleOnly` (true), `saveToFile`
(→ `reports/dom-snapshots/`), `label`. It surfaces: role, id, name, class, type, placeholder, value,
aria-label, data-testid, data-cy, href, for, disabled, checked, selected, readonly, required.

```javascript
// Universal dropdown — auto-detects native <select> vs MUI/React combobox.
async selectFromDropdown(locator, value, options = {}) {
  const { by = 'value', timeout = BasePage.DEFAULT_TIMEOUT } = options;
  await locator.waitFor({ state: 'visible', timeout });
  const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
  if (tagName === 'select') {
    await locator.selectOption(by === 'label' ? { label: value } : value);
  } else {
    await locator.click();
    const option = this.page.getByRole('option', { name: value }).first();
    await option.waitFor({ state: 'visible', timeout });
    await option.click();
  }
}
```

### Canonical BasePage implementations (inline — the shipped `automation/pages/BasePage.js` is minimal)

The framework's `BasePage.js` ships with only basic navigation/fill/assert helpers. The FS-2 MANDATORY
interaction + DOM-capture methods below are NOT in it yet — generate them into `BasePage.js` the first
time a mode needs them. These are the canonical bodies; reuse them verbatim so generated code does not
drift into subtly-wrong MUI/React handling.

```javascript
// Define once on the class so selectFromDropdown / waitForToast etc. resolve.
static DEFAULT_TIMEOUT = 15000;

// ---- core interaction wrappers (page objects call this.<method>, never raw Playwright) ----
async click(locator)             { await locator.waitFor({ state: 'visible', timeout: BasePage.DEFAULT_TIMEOUT }); await locator.click(); }
async fill(locator, value)       { await locator.fill(''); await locator.fill(String(value)); }   // clear then fill
async sendKeys(locator, value)   { await this.fill(locator, value); }                              // alias for fill
async typeText(locator, value)   { await locator.click(); await locator.pressSequentially(String(value)); } // React-controlled + masked inputs
async pressKey(key)              { await this.page.keyboard.press(key); }                          // Enter/Escape/Tab
async scrollIntoView(locator)    { await locator.scrollIntoViewIfNeeded(); }                       // works inside modals
async uploadFile(locator, paths) { await locator.setInputFiles(paths); }
async selectOption(locator, label) { await locator.selectOption({ label }); }                      // native <select>

// MUI/custom combobox: click the trigger, then click the rendered option
async selectMUIOption(combobox, text) {
  await combobox.click();
  await this.page.getByRole('option', { name: text }).first().click();
}
// MUI Autocomplete typeahead: type to trigger the list, then click the result
async searchAndSelect(input, text) {
  await input.click();
  await input.pressSequentially(String(text));
  await this.page.getByRole('option', { name: text }).first().click();
}
// API-populated dropdown where any valid option is acceptable
async selectFirstAvailableOption(trigger) {
  await trigger.click();
  await this.page.getByRole('option').first().click();
}
async waitForToast(timeout = BasePage.DEFAULT_TIMEOUT) {
  const toast = this.page.locator('[role="alert"]').first();
  await toast.waitFor({ state: 'visible', timeout });
  return (await toast.textContent())?.trim();
}
async waitForApiResponse(urlPattern, method) {
  return this.page.waitForResponse(r =>
    (typeof urlPattern === 'string' ? r.url().includes(urlPattern) : urlPattern.test(r.url()))
    && (method ? r.request().method() === method : true));
}
async clickAndWaitForApi(locator, urlPattern, method) {
  const [response] = await Promise.all([this.waitForApiResponse(urlPattern, method), locator.click()]);
  return response;
}

// ---- captureDOM: dump a simplified, interactive-element-focused DOM tree for locator discovery ----
// MANDATORY before finalizing selectors. Returns an indented text tree; pass { saveToFile:true } to also
// write it under reports/dom-snapshots/. Generic — no domain coupling.
async captureDOM(options = {}) {
  const { scope = 'main', maxDepth = 8, visibleOnly = true } = options;
  return await this.page.evaluate(({ scope, maxDepth, visibleOnly }) => {
    const INTERACTIVE_TAGS = new Set([
      'a','button','input','select','textarea','option','label','form','table','tr','td','th',
      'h1','h2','h3','h4','h5','h6','img','dialog','nav','main','header','footer','section','ul','li',
    ]);
    const ATTR_PICK = [
      'role','id','name','class','type','placeholder','value','aria-label','aria-labelledby',
      'aria-describedby','data-testid','data-cy','href','for','disabled','checked','selected','readonly','required',
    ];
    const isVis = (el) => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.offsetWidth > 0;
    };
    function walk(el, depth) {
      if (depth > maxDepth) return '';
      if (el.nodeType === Node.TEXT_NODE) { const t = el.textContent.trim(); return t && t.length < 200 ? t : ''; }
      if (el.nodeType !== Node.ELEMENT_NODE) return '';
      if (visibleOnly && !isVis(el)) return '';
      const tag = el.tagName.toLowerCase();
      const hasRole = el.getAttribute('role');
      const isI = INTERACTIVE_TAGS.has(tag) || hasRole;
      let attrs = '';
      if (isI) {
        const parts = [];
        for (const a of ATTR_PICK) { const v = el.getAttribute(a); if (v) parts.push(a + '="' + v.substring(0, 100) + '"'); }
        if (parts.length) attrs = ' ' + parts.join(' ');
      }
      const kids = [];
      for (const c of el.childNodes) { const l = walk(c, depth + 1); if (l) kids.push(l); }
      const indent = '  '.repeat(depth);
      if (!isI && !hasRole && ['div', 'span'].includes(tag)) return kids.join('\n');
      if (!kids.length) { const t = (el.textContent || '').trim().slice(0, 100); return (t || attrs) ? indent + '<' + tag + attrs + '>' + t + '</' + tag + '>' : ''; }
      return [indent + '<' + tag + attrs + '>', ...kids, indent + '</' + tag + '>'].join('\n');
    }
    return walk(document.querySelector(scope) || document.body, 0);
  }, { scope, maxDepth, visibleOnly });
}
// capture-after-action variants — act, then snapshot the resulting DOM
async clickAndCaptureDOM(locator, opts)         { await this.click(locator); return this.captureDOM(opts); }
async fillAndCaptureDOM(locator, value, opts)   { await this.fill(locator, value); return this.captureDOM(opts); }
async selectAndCaptureDOM(locator, value, opts) { await this.selectFromDropdown(locator, value); return this.captureDOM(opts); }
```

**Mode F option-label harvester** (the reason the headless replay exists — capture every dropdown's
`value → visible label` so generated specs select by label, not by recorded numeric index). Run this inside
`page.evaluate()` at each replay step and store the result on the timeline entry:

```javascript
const selectOptions = await page.evaluate(() => {
  const result = {};
  document.querySelectorAll('select').forEach((sel, i) => {
    const lbl = sel.getAttribute('aria-label')
      || (sel.labels && sel.labels[0] ? sel.labels[0].textContent.trim() : '')
      || sel.name || 'select-' + i;
    result[lbl] = Array.from(sel.options).map(o => ({ value: o.value, label: o.text.trim(), selected: o.selected }));
  });
  document.querySelectorAll('[role="listbox"] [role="option"]').forEach((opt) => {
    const lbl = opt.closest('[role="listbox"]')?.getAttribute('aria-label') || 'custom-dropdown';
    (result[lbl] ||= []).push({
      value: opt.getAttribute('data-value') || opt.textContent.trim(),
      label: opt.textContent.trim(),
      selected: opt.getAttribute('aria-selected') === 'true',
    });
  });
  return result;
});
```

> Capture/replay harness scripts are one-shot tooling, so a small `waitForTimeout` between steps there is
> acceptable — but NEVER use `waitForTimeout` inside test-path BasePage methods or specs (use auto-waiting).

## Data Verification Assertion Protocol (full recipes — MANDATORY for all modes)

A success toast/redirect does NOT prove persistence (optimistic UI can mask a 500). Verify via API GET + UI.
For HopeNotes, direct API GETs MUST send `X-Tenant-ID` (+ auth) headers (see HOPE lesson above).

**CREATE → verify exists (≥4 assertions):**
```javascript
await createPage.fillPatientForm(data);
const response = await createPage.submitAndWaitForApi();
expect(response.status()).toBe(201);                 // 1: POST status
const body = await response.json();
expect(body.id).toBeTruthy();                        // 2: body has id
const verify = await request.get(`/api/patients/${body.id}`, { headers: await TestData.getAuthHeaders(request) });
expect(verify.status()).toBe(200);                   // 3: GET confirms persistence
expect((await verify.json()).firstName).toBe(data.firstName);
await listPage.goto();
await expect(listPage.getPatientRow(data.firstName)).toBeVisible(); // 4: UI shows record
```

**UPDATE → verify changed (≥4):** assert PUT status; GET confirms `toBe(newValue)` AND `not.toBe(oldValue)`;
reload page and assert the field shows the new value (not cache).

**DELETE → verify gone (≥3):** UI row `not.toBeVisible()`; `GET /…/{id}` returns 404; navigating to the
deleted record shows a not-found/redirect.

**READ/LIST → verify accuracy (≥2):** UI row count `toBe(apiData.length)`; first record key fields match
between API and UI.

**Full CRUD lifecycle:** chain CREATE→READ→UPDATE→DELETE as a `mode: 'serial'` describe with a shared
`patientId`, verifying via API GET at each step (remember enums may differ: API `"MALE"` vs UI `"Male"`).

**Rules:** every CREATE verifies via a separate API GET; every UPDATE asserts old value is gone; every
DELETE asserts 404; dual UI+API verification; cross-page verification for CREATE; reload verification for
UPDATE; cascade verification for parent deletes; data-type/format checks.

## Smart Form Fill — Field Classification (Mode D/E)

`smartFillForm(overrides?, scope?)` on BasePage scans the DOM, classifies each field, generates realistic
data, and fills with the right method. Overrides win. Classification (label/name/type → value):

| Pattern | Value |
|---------|-------|
| first/last/middle name | `faker.person.firstName/lastName`, `string.alpha(1)` |
| email | `faker.internet.email()` |
| phone/mobile/tel/fax | `(555) NNN-NNNN` (pass plain digits; masked inputs use `typeText`) |
| dob/date of birth | past date `1985-06-15` / `faker.date.birthdate()` |
| gender/sex | select first non-placeholder option |
| address/city/state/zip | `faker.location.*` (state may be `'CA'`) |
| npi (10) / tin (9) / ssn (9) | `faker.string.numeric(n)` |
| credential | MD/DO/NP/PA |
| specialty | first available option |
| icd/diagnosis · cpt/procedure | `J06.9` · `99213` |
| vitals (bp/hr/temp/wt/ht/spo2/rr/pain) | `120/80, 72, 98.6, 170, 70, 98, 16, 2` |
| currency/amount/price | `0.00` / `faker.finance.amount()` |
| `[type=date]`/`[type=time]`/`[type=number]` | today / `09:00` / `1` |
| checkbox | check if label ~ default/active/agree |
| unrecognized text / select | `'Test ' + alphanumeric(6)` / `selectFirstAvailableOption()` |

Repeatable "+ Add More" groups: fill only the first row unless the user asks for more; check a
"Mark as Default" if present.

## Lessons Learned & Common Pitfalls (generic MUI/React/Keycloak — apply proactively)

> Example domains below (primaryplus.life, customemr.ai) are illustrative; HOPE's real URLs/keys live in
> `project-context.md` and `automation/.env.example`.

### 1. Keycloak / OIDC Authentication
Keycloak apps redirect to an external auth domain; the login form uses Keycloak's own `#username`,
`#password`, `#kc-login` selectors — NOT app form fields. Pattern: navigate to app login URL → wait for
Keycloak redirect → fill `#username`+`#password` → click `#kc-login` → wait for callback to the dashboard.
Credential env vars: `TEST_USERNAME` / `TEST_PASSWORD` (Keycloak uses "username", not "email").

### 2. Re-login per test (when no storageState is used)
If a project has no `storageState`, every test re-logs in for isolation. For serial recorded flows, log in
once in `test.beforeAll` against a shared page/context. (HopeNotes DOES use a setup project + storageState
— see the HOPE lesson above; honor whichever the project's `playwright.config.js` defines.)

### 3. MUI Component Selector Strategies
| MUI component | Problem | Correct selector |
|---------------|---------|-----------------|
| Autocomplete | no `<label>`; `<span>` text + combobox input; multiple "Open" buttons | `getByPlaceholder('…')` (unique placeholder) |
| TimePicker | dynamic IDs `#:r1k:`; placeholder flips `hh:mm aa`→`00:00 AM` | `getByPlaceholder('00:00 AM')` + `.nth()` |
| Select | renders `div[role=combobox]`, not `<select>`; no placeholder | `getByRole('combobox',{name})` or click + `getByRole('option',{name})` |
| Tabs | standard `role=tab` | `getByRole('tab',{name:'Monday'})` |
| Multiple identical buttons | strict-mode violation | scope by parent / unique attr (associated input placeholder) |

General rule: on a strict-mode multi-match, find a unique attribute on the specific instance — don't use the generic role.

### 4. Dynamic React IDs are unreliable
Never use recorded IDs like `#:r1k:`, `#tags-standard-option-0`. Use `getByPlaceholder` / `getByRole` /
`getByText` / `locator.nth(N)`. Flag and replace any selector containing `:r` or `option-N`.

### 5. .env overrides baseURL
`require('dotenv').config()` in `playwright.config.js` loads `.env`, which overrides a hardcoded `baseURL`.
Update `.env` to the target env first; the `.env` value wins when config uses `process.env.BASE_URL`.

### 6. Headless DOM inspection for debugging
When a selector fails or a page is unknown, dump the simplified DOM with `captureDOM()` (full page, scoped
`{ scope: '[role=dialog]' }`, or after an action via `clickAndCaptureDOM`). Save with `{ saveToFile: true }`.

### 7. Multiple time pickers share a placeholder
Count dynamically and index relatively: `const t = getByPlaceholder('00:00 AM'); start = t.nth(count-2); end = t.last();`

### 8. Existing data on the page shifts selectors
Pre-filled rows from prior sessions break fixed indices. Use `count()` and target the LAST/NEWEST element.

### 9. Chrome Extension context usage
Use `claude --chrome` only when you need browser interaction (Mode E, debugging). For pure code generation
(Mode B/C/F), run without `--chrome` to save context.

### 10. Live DOM vs source code selectors may differ
Source says `<button>Save</button>` but DOM renders `Save Patient`. When both are available, TRUST the live
DOM for the selector text; use source only to understand structure/props.

### 11. Chrome Network tab shows the real API contract
Docs/source may differ from what the frontend actually sends. In Mode E capture real request/response bodies
and use them as ground truth for API assertions.

### 12. Dual verification catches silent failures
A frontend optimistic toast can show "created" while the API returned 500 and nothing persisted. Always do a
separate API GET after CREATE/UPDATE/DELETE (Data Verification Protocol).

### 13. MUI Select labels are `<span>` not `<label>` — use nth-index
`locator('label').filter({hasText:'State'})` returns nothing. Use index anchored to `aria-labelledby`:
`document.querySelectorAll('div.MuiSelect-select[role="combobox"]')` to discover order, then
`modal.locator('div.MuiSelect-select[role="combobox"]').nth(N)`. Never use `locator('label').filter(...)` for MUI Selects.

### 14. MUI Select options use full text, not abbreviations
Options render `'Oklahoma'`, not `'OK'`. Inspect real option text (`document.querySelectorAll('[role="option"]')`)
before writing test data. Applies wherever display text ≠ underlying value.

### 15. MUI Autocomplete needs `searchAndSelect()`, not `selectMUIOption()`
Autocomplete requires typing first to trigger the dropdown. Detection: `<input>` with placeholder =
Autocomplete (`searchAndSelect`); `<div role="combobox">` = MUI Select (`selectMUIOption`). Click options via
`getByRole('option',{name})` to avoid "element detached" on React re-renders.

### 16. MUI Checkbox — click the `<label>` wrapper, not the hidden `<input>`
`getByRole('checkbox').check()` fails ("did not change state"). Target
`label.MuiFormControlLabel-root` filtered by text and `.click()` it — the native label-for behavior fires
React's synthetic event.

### 17. Masked phone inputs need `typeText()`, not `fill()`
`fill()` sets the raw value without firing the formatter's React handler → "Phone is required". Use
`typeText()` (`pressSequentially`) and pass plain digits `faker.string.numeric(10)`; the mask formats them.

### 18. `getByRole('combobox')` matches more than `<select>` — verify with captureDOM
It also matches `role=combobox` elements (sidebar/nav), so `.first()/.nth()` can hit the wrong one silently.
Run `captureDOM({scope:'main'})` first; then use `locator('select').first()` (single), `getByRole('combobox').nth(N)`
(verified index), or `getByLabel(...)`.

### 19. API URL pattern must match the real endpoint
`waitForResponse` uses `url.includes(pattern)`. `/providers` fails when the real URL is
`/provider/v1/providers`. Capture the real URL from the Network tab and match a stable unique segment. Or
fall back to `clickSave()` + modal closed + record visible in the list as a functional assertion.

### 20. MUI X DatePicker — climb to YEAR view, don't type
The input is `readonly` so `page.fill()` does nothing; typed JS-bypass doesn't fire React events. Use the
calendar: 3 view levels (DAY `May 2026` / MONTH `2026` / YEAR `2016 – 2027` decade), reached by clicking the
header BUTTON (not the wrapper div). To set any date (e.g. DOB 1955): climb to YEAR → decade-step to the
range → click year → month → day (≤7 clicks). Pitfalls: header text is inside a `<button>` (click the
button); 3 icon buttons near the header (find the prev/next PAIR sharing a parent, sort by X-coord); decade
range uses en-dash `–` (U+2013), parse `[–\-]`; days 1–7/25–31 appear twice (overflow) — use
`{ exact: true }` and prefer days 8–24.

**Full Playwright climb implementation** (inlined — self-contained, no external repo dependency).
The header-detection helpers run inside `page.evaluate()` because they must scan rendered text across
unknown MUI markup; the click helpers stay in the browser context for the same reason:

```javascript
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function selectDOB(page, dob) {
  // dob = "MM/DD/YYYY", e.g. "03/12/1993"
  const [m, d, y] = dob.split('/').map(Number);

  // 1. Open the calendar via the icon button next to the DOB input.
  await page.getByRole('button', { name: /date of birth/i }).click();

  // 2. Climb to YEAR view: click header up to 2 times (DAY → MONTH → YEAR).
  for (let i = 0; i < 3; i++) {
    if (await detectView(page) === 'year') break;
    await clickCalendarHeader(page);
  }

  // 3. Decade-step until target year is in the displayed range.
  while (true) {
    const range = await readYearRange(page);  // { start, end }
    if (y >= range.start && y <= range.end) break;
    await clickArrow(page, y < range.start ? 'prev' : 'next');
  }

  // 4. Click year → goes to MONTH view of that year.
  await page.getByRole('button', { name: String(y), exact: true }).click();

  // 5. Click month abbr → goes to DAY view.
  await page.getByRole('button', { name: MONTHS_SHORT[m - 1], exact: true }).click();

  // 6. Click day (exact:true avoids matching "12" inside "12:00 AM" elsewhere).
  await page.getByRole('button', { name: String(d), exact: true }).click();
}

async function detectView(page) {
  return await page.evaluate(() => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const rxMY = new RegExp('^(' + months.join('|') + ')\\s+\\d{4}$');
    const rxR  = /^\d{4}\s*[–\-]\s*\d{4}$/;
    const rxY  = /^\d{4}$/;
    for (const el of document.querySelectorAll('button, div, span, h1, h2, h3, h4, h5, h6')) {
      const t = (el.textContent || '').trim();
      if (t.length <= 25 && rxMY.test(t)) return 'day';
      if (t.length <= 14 && rxR.test(t))  return 'year';
      if (t.length <= 6  && rxY.test(t))  return 'month';
    }
    return null;
  });
}

async function readYearRange(page) {
  return await page.evaluate(() => {
    const rxR = /^(\d{4})\s*[–\-]\s*(\d{4})$/;
    for (const el of document.querySelectorAll('button, div, span, h1, h2, h3, h4, h5, h6')) {
      const t = (el.textContent || '').trim();
      const m = rxR.exec(t);
      if (m && t.length <= 14) return { start: +m[1], end: +m[2] };
    }
    return null;
  });
}

async function clickCalendarHeader(page) {
  // Click the BUTTON whose text matches a header pattern — not an outer div wrapper.
  await page.evaluate(() => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const rx = new RegExp(
      '^((' + months.join('|') + ')\\s+\\d{4}|\\d{4}|\\d{4}\\s*[\\u2013\\-]\\s*\\d{4})$'
    );
    for (const btn of document.querySelectorAll('button')) {
      const t = (btn.textContent || '').trim();
      if (t.length <= 25 && rx.test(t)) { btn.click(); return; }
    }
  });
}

async function clickArrow(page, direction) {
  // Find the prev/next pair: icon-only buttons sharing a parent, sorted by X-coord.
  await page.evaluate((dir) => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const rx = new RegExp('^((' + months.join('|') + ')\\s+\\d{4}|\\d{4}|\\d{4}\\s*[\\u2013\\-]\\s*\\d{4})$');
    let headerEl = null;
    for (const el of document.querySelectorAll('button, div, span, h1, h2, h3, h4, h5, h6')) {
      const t = (el.textContent || '').trim();
      if (t.length <= 25 && rx.test(t)) { headerEl = el; break; }
    }
    if (!headerEl) return;
    let node = headerEl.parentElement;
    while (node && node !== document.body) {
      const iconBtns = [...node.querySelectorAll('button')].filter(
        b => !b.disabled && b.offsetParent && (b.textContent || '').trim() === ''
      );
      const byParent = new Map();
      iconBtns.forEach(b => {
        const arr = byParent.get(b.parentElement) || [];
        arr.push(b);
        byParent.set(b.parentElement, arr);
      });
      for (const [, group] of byParent) {
        if (group.length === 2) {
          group.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          (dir === 'prev' ? group[0] : group[1]).click();
          return;
        }
      }
      node = node.parentElement;
    }
  }, direction);
}
```

Wire it into BasePage as `async selectDOB(locator, dob)` (open via the locator passed in rather than a
hardcoded `name: /date of birth/i`) so page objects call `this.selectDOB(this.dobInput, '03/12/1993')`.

**What Playwright handles natively (don't over-engineer):** `getByRole('button')` matches `<div role=button>`;
auto-wait before clicks; `getByLabel` normalizes trailing-space/asterisk variants.
**What you still must handle:** DatePicker readonly input (use the calendar climb); view-toggle vs arrow
disambiguation; day-overflow duplicates (`exact:true` + scope to the popup).

**Form gotchas that pair with DOB:** adult-validation needs age ≥ 18 (use a year ~33y back, or switch to
"Minor"); a Save can silently fail if a required field is invalid (DOB=today → Age=0) — always verify
post-save state (URL change OR toast OR record in list), per Lesson 12.
