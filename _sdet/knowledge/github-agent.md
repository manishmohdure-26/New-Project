# Octo — GitHub Agent Knowledge

> Training file for Octo (Senior GitHub Actions Specialist).
> Edit this file to customize Octo's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Workflow Safety Rules (CRITICAL)
- **Never write into `.github/workflows/`** — always write generated YAML to
  `outputs/github-agent/`; a human reviews and places the file
- **Never write a secret value** into generated YAML — only `${{ secrets.NAME }}`
  references, with names sourced from `project-context.md` or the user
- **Pin every third-party action** to a version tag (`@v4`) or SHA — never
  `@master`/`@main`; a moving tag is a supply-chain risk inside the pipeline
- **Never invent npm scripts** — read the real ones from `automation/CLAUDE.md`

### Efficiency Rules
- Every workflow on `push`/`pull_request` gets a `concurrency` group with
  `cancel-in-progress: true` so a superseded push stops racing to completion
- Add `paths-ignore` for docs-only changes (`**.md`, `docs/**`) to skip full runs
- Every matrix axis (browser, OS, Node version, shard) maps to a real support
  requirement — never added for coverage's own sake

## Learnings

<!-- Add learnings from past workflow generation sessions -->

## Workflow YAML Anatomy Reference

```yaml
name: CI
on:
  push: { branches: [main, develop], paths-ignore: ["**.md", "docs/**"] }
  pull_request: { branches: [main] }
  schedule: [{ cron: "0 3 * * *" }]  # nightly — always quote cron strings
  workflow_dispatch:                 # manual "Run workflow" button
    inputs:
      environment: { type: choice, options: [staging, production] }

concurrency:                         # cancel superseded runs on the same ref
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:                         # least-privilege GITHUB_TOKEN — set explicitly
  contents: read
  id-token: write                    # required for OIDC federation
  checks: write                      # required to publish check-run results

jobs:
  test:
    name: e2e-tests                  # this name is what branch protection references
    runs-on: ubuntu-latest
    needs: [lint]                    # job dependency — DAG ordering
    strategy:
      matrix: { browser: [chromium, firefox, webkit] }
      fail-fast: false               # other matrix legs finish even if one fails
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
```

Key fields: `on` (triggers) · `needs` (DAG ordering) · `jobs.<id>.if` (conditional
execution) · `strategy.matrix` (parallel variants) · `permissions` (always set
explicitly, never rely on the repo default).

## Caching Pattern (actions/cache)

Pair a content-hash `key` with ordered `restore-keys` so a miss still gets a
useful partial hit instead of a cold install:

```yaml
- name: Cache npm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('automation/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-

- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('automation/package-lock.json') }}

- name: Install browsers (only on cache miss)
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps
```

A key without a lockfile hash never invalidates — a stale cache silently masks
dependency drift.

## Artifact & Test-Report Upload Pattern

Publish evidence even on failure — a red run with no artifact is undebuggable:

```yaml
- run: npm run test:e2e
  working-directory: automation

- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: always()                    # capture on both pass and fail
  with:
    name: playwright-report-${{ matrix.browser }}
    path: automation/playwright-report/
    retention-days: 14

- name: Upload traces on failure
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-traces-${{ matrix.browser }}
    path: automation/test-results/
    retention-days: 30
```

Name artifacts per matrix leg so parallel legs don't overwrite each other's upload.

## Secrets & OIDC Note

Reference secrets only as `${{ secrets.NAME }}` — values are set once in
**Settings > Secrets and variables > Actions**, never in workflow YAML. For cloud
deploy steps, prefer OIDC federation over long-lived credentials:

```yaml
permissions:
  id-token: write                 # required to request the OIDC token
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
      aws-region: us-east-1
```

OIDC removes the need to rotate long-lived cloud access keys — the cloud-side
trust policy restricts which repo/branch/environment can assume the role. Never
fabricate a secret NAME the project doesn't have; collect names from
`project-context.md` or the user and list missing ones in `setup-guide.md`.

## Matrix Build Example

```yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chromium, firefox, webkit]
    shard: [1/2, 2/2]
steps:
  - run: npx playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}
    working-directory: automation
```

Produces 6 parallel jobs (3 browsers x 2 shards). Only add axes tied to a real
requirement — an unused OS/browser target doubles CI minutes for zero benefit.

## Reusable Workflow Pattern

When setup steps repeat across jobs or files, extract a reusable workflow instead
of copy-pasting steps into every caller:

```yaml
# .github/workflows/_setup-and-test.yml — called by other workflows
on:
  workflow_call:
    inputs:
      browser: { required: true, type: string }
    secrets:
      API_BASE_URL: { required: true }
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
        working-directory: automation
      - run: npx playwright test --project=${{ inputs.browser }}
        working-directory: automation
        env: { API_BASE_URL: ${{ secrets.API_BASE_URL }} }

# caller workflow
jobs:
  chromium:
    uses: ./.github/workflows/_setup-and-test.yml
    with: { browser: chromium }
    secrets: inherit
```

Use a reusable workflow when whole jobs repeat across files; use a composite
action when only a few steps within one job repeat.
