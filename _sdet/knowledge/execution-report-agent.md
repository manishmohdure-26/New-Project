# Reporter — Execution Report Agent Knowledge

> Training file for Reporter (Senior Test Execution Reporting Specialist).
> Edit this file to customize Reporter's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Traceability Rules (CRITICAL)
- **Every count in the report MUST trace back to a parsed record** — if you cannot point
  to the artifact line/node that produced a number, do not report the number
- **Never estimate pass/fail/skip counts** from a partial read of a large artifact — parse
  the whole file, or state explicitly that only a subset was parsed and why
- **Flaky is a claim, not a guess** — only classify a test as flaky when the pass-on-retry
  heuristic or cross-run inconsistency (see below) actually applies; otherwise report it
  as a plain failure and say flaky status could not be evaluated
- **Malformed or missing artifacts are a blocker to report**, not a gap to fill by asking
  the user "how many tests do you think passed?"

### Failure Presentation Rules
- Never present failures as a flat list of stack traces — always group by root symptom
  category first (see Failure Grouping / Triage Method)
- When 2+ tests share the same representative error, call out the likely single root cause
  explicitly rather than listing each as an independent finding
- Duration outliers (>3x median) get flagged even when the test passed — a slow passing
  test today is a timeout candidate next run

## Learnings

<!-- Add learnings from past execution reporting sessions -->

## Run Artifact Format Reference

### Playwright JSON Reporter Structure
Produced by `playwright test --reporter=json`. Key nodes: `suites[].specs[].tests[].results[]`,
each result `{ status: "passed"|"failed"|"timedOut"|"skipped", duration: ms, retry: N,
error: { message } }`, plus a top-level `stats: { expected, unexpected, skipped, duration }`.
- **Retry chains:** a `results[]` array with length > 1 means Playwright retried the test.
  If it ends `passed` but has an earlier `failed`/`timedOut` entry, that is the primary
  flaky signal (see Flaky Detection Heuristic).
- **`stats`** gives a fast top-line total, but always cross-check against a full walk of
  `suites[]` — `stats` can undercount nested/sharded runs when reporters are merged.

### JUnit XML Schema Basics
Produced by most CI runners and Playwright's `--reporter=junit`. Structure:
`<testsuites tests= failures= skipped= time=>` wraps one or more `<testsuite name= tests= failures= time=>`,
each containing `<testcase name= classname= time=>` entries. A `<testcase>` with a child
`<failure message= type=>` or `<error>` = fail (`<error>` = unexpected exception vs.
`<failure>` = assertion — keep them distinct in symptom grouping); a child `<skipped/>` =
skip; no children = pass.
- `time` is in **seconds** — convert to ms when normalizing alongside Playwright JSON.
- JUnit XML has **no retry information**: a merged/re-run file only shows the final
  attempt, so flaky detection must fall back to cross-run comparison for this format.

## Core Execution Metrics

Given `total`, `passed`, `failed`, `skipped`, `flaky` (flaky counted separately from
failed once identified — a test that eventually passed on retry is NOT counted in the
final `failed` total, but is tracked in `flaky`):

- **Pass rate** = `passed / total * 100`
- **Fail rate** = `failed / total * 100`
- **Skip rate** = `skipped / total * 100`
- **Flaky rate** = `flaky / total * 100` (flaky is informational — a flaky test that
  passed on retry still counts toward `passed`, but must ALSO be surfaced in the flaky
  section; do not let a flaky pass hide instability)
- **Total run duration** = sum of all `durationMs` across the top-level run (or the
  reporter's own wall-clock `stats.duration` / `<testsuites time>` if parallel workers
  make a naive sum misleading — state which one is being reported)
- **Average test duration** = `total duration / total tests`
- **Median test duration** — used as the baseline for the >3x outlier flag in Step 4

## Failure Grouping / Triage Method

Classify each failed test's error message/type into one category, in this priority order
(first match wins):

| Category | Match signals | Typical root cause |
|----------|---------------|---------------------|
| **Timeout** | `TimeoutError`, "exceeded timeout", "waiting for locator", `timedOut` status | Slow environment, missing wait condition, real perf regression |
| **Element Not Found / Locator** | "locator not found", "strict mode violation", "resolved to 0 elements" | DOM/UI change broke selector, page not fully loaded |
| **Assertion Mismatch** | `AssertionError`, `expect(received).toBe/toEqual` | Real functional regression, or test expectation out of date |
| **Network / API Error** | HTTP status codes in message, `ECONNREFUSED`, `fetch failed`, 4xx/5xx | Backend down, API contract change, test environment issue |
| **Environment / Setup Failure** | "browser launch failed", "beforeAll hook", auth/login failure in setup, missing env var | Bad environment, config drift, credentials expired |
| **Unknown / Uncategorized** | Does not match any signal above | Needs manual triage — never force-fit into another category |

When 2+ failed tests land in the same category with a near-identical representative error
string (e.g., same locator, same endpoint), report it as one probable root cause affecting
N tests, not N independent failures — this is the single highest-value output of a triage
pass.

## Flaky Detection Heuristic

A test is **flaky (retry-based)** when, within a single run, its result sequence contains
both a failure and a pass:
```
results: [ {status: "failed", retry: 0}, {status: "passed", retry: 1} ]  → FLAKY (pass on retry)
```
This requires an artifact that preserves per-attempt results (Playwright JSON with
retries enabled). A merged/final-only JUnit XML cannot show this — do not claim
retry-based flaky status from JUnit XML alone.

A test is **flaky (cross-run)** when it has no retry data in the current artifact, but its
same `testName` + `suite` combination shows inconsistent status (pass in one run, fail in
another) across the last 2-3 reports in `outputs/execution-report-agent/`:
```
run-2026-07-10: "checkout > applies discount code" → passed
run-2026-07-14: "checkout > applies discount code" → failed
run-2026-07-17: "checkout > applies discount code" → passed   → FLAKY (cross-run, 1/3 fail rate)
```
If neither signal is available (no retries in this run, no prior reports to compare),
report the test as a plain failure and state explicitly: "flaky status could not be
evaluated — no retry data and no prior run history."

## Trend Analysis Approach

Run-over-run deltas compare the current normalized record set against the most recent
prior `execution-report.md`'s underlying data (re-derive counts from that report's tables
rather than re-parsing an old artifact that may no longer exist):

- **Pass rate delta** = `current pass rate - previous pass rate` (in percentage points,
  report both the delta and direction, e.g. "+3.2pp" or "-6.1pp")
- **New failures** = tests failing this run that were passing (or absent) last run
- **Resolved failures** = tests failing last run that are passing this run
- **Persistent failures** = tests failing in both runs — highest triage priority, these
  are known unfixed issues, not new regressions
- **Duration delta** = `current total duration - previous total duration`, plus whether
  the slowest-test list changed composition (new tests entering the top 10 is itself a
  signal worth flagging)

If this is the first report for a project (no prior report found in
`outputs/execution-report-agent/`), label the run explicitly as the **baseline** and skip
delta computation rather than comparing against nothing.
