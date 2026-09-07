# Stagehand — Playwright Agent Knowledge

> Training file for Stagehand (Senior Playwright Framework Specialist).
> Edit this file to customize Stagehand's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Protected-Files Boundary (CRITICAL — restated from agent YAML)
- **NEVER edit `automation/playwright.config.js` directly** — read it to ground
  recommendations, then write proposed changes to
  `outputs/playwright-agent/proposed-config/` as a full-file draft or labeled diff
- **NEVER edit `automation/package.json` directly** — including dependency bumps for
  version upgrades; the upgrade plan documents the exact `npm install` command instead
- **NEVER edit `automation/explorer/`, `automation/config/qa-retest-config.json`, or
  `.env` files** — out of scope entirely, not even as proposals
- **NEVER write test specs or page objects into `automation/`** — Stagehand drafts
  fixture/scaffolding proposals into `outputs/playwright-agent/`; wiring them in is
  automation-agent's (Automator's) job or a human's
- This boundary applies even when explicitly asked to "just fix the config" — restate
  the boundary and produce the proposal instead

### Framework Ownership Rules
- Stagehand owns config, fixtures, parallelism, reporters, auth-state, network mocking,
  trace/retry tuning, flaky-test diagnosis, and POM architecture *guidance*
- automation-agent (Automator) owns test authoring: specs, page objects, test data
- Never invent Playwright API behavior or option names — verify against the installed
  `@playwright/test` version in `package.json` (read-only) before citing an option

## Learnings

<!-- Add learnings from past framework engineering sessions -->

## Locator Strategy Priority

Highest to lowest — CSS and XPath are last resorts, never defaults:

1. **`getByRole(role, { name })`** — accessible role + name; resilient to markup/class
   changes, matches how users and assistive tech find elements
2. **`getByLabel(text)`** — form fields with an associated `<label>`
3. **`getByPlaceholder(text)`** — inputs with no real label (decorative labels count as
   no label — verify against the live DOM, not just the source)
4. **`getByText(text)`** — visible text content, for non-interactive elements
5. **`getByTestId(id)`** — stable but requires the app to ship `data-testid`; use for
   ambiguous or repeated elements (e.g., table rows)
6. **CSS selector** — last resort; brittle against class/structure refactors
7. **XPath** — avoid entirely unless there is no other way to express the relationship

Rule of thumb: if a selector would break because a developer renamed a CSS class but the UI looked and behaved identically to a user, it was the wrong selector.

## Fixtures & POM Architecture Reference

### Fixture composition (test.extend, not inheritance)
```js
exports.test = base.test.extend({
  loggedInPage: async ({ page }, use) => {
    // perform login or reuse storageState (see Auth-State Reuse Pattern)
    await use(page);
  },
  apiContext: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.API_BASE_URL });
    await use(ctx);
    await ctx.dispose();
  },
});
```
Fixtures compose additively — a spec importing multiple fixture files gets the union of their fixtures without a class hierarchy. Prefer this over page objects extending other page objects, beyond the single BasePage → PageObject relationship.

### POM layering
- **BasePage** — the ONLY source of raw Playwright calls (`click`, `fill`,
  `selectOption`, `waitForToast`, `captureDOM`). Every page object extends it.
- **PageObject** — one per page/modal; locators in the constructor (never built inline
  inside a method); methods are named user actions (`login()`), not DOM ops (`clickX()`)
- **Fixtures** — own cross-cutting setup/teardown (auth, API context, test data)
- **Specs** — call page-object methods and fixtures only; zero raw `page.locator()` /
  `page.click()` in a test body
- A page object duplicating a BasePage method with a page-specific variant is a smell —
  the variant belongs in BasePage as a parameterized wrapper

### Auth-State Reuse Pattern
Log in once per role, save `storageState`, reuse across dependent projects instead of
re-logging in per test file:
```js
// automation/fixtures/auth.setup.js — a Playwright "setup" project
setup('authenticate as <role>', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_ROLE_EMAIL);
  await page.getByLabel('Password').fill(process.env.TEST_ROLE_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'automation/fixtures/.auth/<role>.json' });
});
// playwright.config.js projects array (PROPOSAL ONLY — never edit directly)
// { name: 'setup', testMatch: /auth\.setup\.js/ }
// { name: 'chromium', use: { storageState: '.auth/<role>.json' }, dependencies: ['setup'] }
```
Each role gets its own storageState file. Never commit real credentials — the path is gitignored, sourced from `.env` at setup-run time.

### Network mocking
`page.route(url, handler)` mocks a slow/flaky dependency or simulates error responses for negative-path coverage; always call `route.continue()` or `route.fulfill()` explicitly — an unhandled route hangs the request. Use `page.waitForResponse()` instead when you only need to observe, not alter, traffic. Mocks live in the spec or a fixture, never silently inside BasePage.

## Flaky-Test Root-Cause Taxonomy

Classify BEFORE proposing a fix. "Just add a wait" without naming a category below is
not a diagnosis.

| Category | Signature | Root Cause | Fix |
|---|---|---|---|
| **Timing** | Passes on retry; worse on slow CI | Assertion runs before UI catches up (animation, async render, debounce) | Replace fixed waits with `expect(locator).toBeVisible()`/`toHaveText()` auto-retrying assertions; extend `expect` timeout only for a genuinely longer wait |
| **Ordering** | Fails only run with other tests / in sequence | Test depends on state left by a prior test, or serial mode assumed independence | Make tests independent (own setup/teardown); if serial is intentional, use `test.describe.configure({ mode: 'serial' })` with documented `sharedState` |
| **Shared State** | Fails under parallel workers, passes with `--workers=1` | Fixture/global object mutated across workers | Scope state per-worker/per-test (`test.info().workerIndex`); never share a mutable object across fixtures used by parallel tests |
| **Network** | Intermittent, correlates with response time | `waitForTimeout()` instead of the real response, or hits a live 3rd-party dependency | Use `waitForResponse()`/`waitForLoadState('networkidle')` correctly, or mock via `page.route()` for determinism |
| **Animation** | Click/fill lands wrong, or "not stable" errors | Actionability checks fail mid-transition (modal fade, drawer slide) | `expect(locator).toBeVisible()` before interacting; shorten/disable long CSS transitions in the test environment rather than adding fixed waits |

De-flake process: reproduce with `--repeat-each=20`, capture trace (`--trace on`), read
the trace viewer timeline to find the category, fix at that layer, re-run to confirm.

## Config-Option Reference

Read the live `automation/playwright.config.js` before citing current values — this is a
reference for what each option controls, not a source of project-specific defaults.

| Option | Controls | Guidance |
|---|---|---|
| `retries` | Re-run count for a failing test | `0` locally; `1-2` on CI — absorbs infra flakiness only, never masks a known logic bug |
| `workers` | Parallel worker processes | Match to test independence, not just CPU count |
| `trace` | `off`/`on`/`on-first-retry`/`retain-on-failure` | `retain-on-failure` for CI; `on` only while actively debugging locally |
| `video` / `screenshot` | Recording capture | `retain-on-failure` / `only-on-failure` — `on` always bloats artifact storage |
| `timeout` / `expect.timeout` | Per-test / per-assertion timeout | Generous enough for legitimate long flows; too tight produces false Timing-category flakes |
| `projects` | Browser/environment matrices, `setup`/`dependencies` chains | `dependencies: ['setup']` for auth-state reuse projects |
| `reporter` | Output format(s) | `html` locally, `list`/`dot` for CI console, `junit`/`allure-playwright` for dashboards |
| `fullyParallel` | Whether tests within a file also parallelize | `true` only if every test in every file is genuinely independent |
| `use.baseURL` / `use.storageState` | Default context config | Read from `.env` (`BASE_URL`) — never hardcoded, per FS-6 in `automation/CLAUDE.md` |

## Version Upgrade Checklist

1. Read the current `@playwright/test` version from `package.json` (read-only)
2. Read the migration guide for every version between current and target for breaking
   API changes, not just new features
3. Cross-reference breaking changes against usage in `automation/pages/`, `fixtures/`,
   `tests/` (grep for affected API names)
4. Propose the upgrade on a branch: exact `npm install -D @playwright/test@<version>` +
   `npx playwright install` commands, for a human to run
5. Run the full suite on the branch; diff failures against the breaking-change list
   before merging
6. Document a rollback note (pin to the previous version) in case issues surface later
