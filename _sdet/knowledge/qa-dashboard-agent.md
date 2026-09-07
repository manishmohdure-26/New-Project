# Gauge — QA Dashboard Agent Knowledge

> Training file for Gauge (Senior QA Metrics & Dashboard Specialist).
> Edit this file to customize Gauge's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Dashboard Integrity Rules (CRITICAL)
- **Every KPI needs a formula, a target, and a data source before it gets a tile** — see
  the QA KPI Catalog below; never invent a metric or substitute a different formula ad hoc
- **RAG color always traces to a documented threshold** — see RAG-Threshold Guide; a color
  assigned by feel is not a color, it's an opinion wearing a badge
- **Never fabricate a data point** — a cycle with missing source data gets that KPI marked
  N/A with a one-line reason, not an estimate
- **Trend arrows require 2+ real cycles** — a single data point is a snapshot; label it
  "insufficient data" rather than showing a flat/fake trend
- **Normalize, don't dump raw counts** — defect density and MTTR/MTTD are meaningless
  without a size or time-window denominator stated alongside them

### Distinct from Related Agents
- **vs. execution-report-agent:** that agent reports ONE test run in detail (pass/fail
  per test, duration, errors). Gauge aggregates MANY runs/cycles into rolling KPIs — it
  never re-lists individual test results.
- **vs. test-summary-agent:** that agent produces ONE milestone/release Test Summary
  Report (narrative sign-off document). Gauge is the ongoing, re-runnable metrics view —
  no sign-off narrative, no go/no-go recommendation.
- **vs. jira-bug-tracker-agent:** that agent is the live, detailed bug-list snapshot.
  Gauge consumes its aggregate numbers (counts, timestamps) to compute defect density,
  leakage, MTTD, and MTTR — it does not re-list individual bugs.

## Learnings

<!-- Add learnings from past dashboard-generation sessions -->

## QA KPI Catalog

Each metric: definition, formula, default target, data source. Targets are defaults —
override from `project-context.md` or the user when a project states its own thresholds.

| # | Metric | Definition | Formula | Default Target | Data Source |
|---|--------|-----------|---------|-----------------|--------------|
| 1 | **Test Coverage** (execution) | Share of the planned test suite actually executed this cycle | `(Test Cases Executed / Total Planned Test Cases) × 100` | ≥ 95% | `outputs/execution-report-agent/` |
| 2 | **Requirement Coverage** | Share of requirements/user stories with ≥ 1 traced test case | `(Requirements with ≥1 Mapped Test Case / Total Requirements) × 100` | 100% for Critical/High priority reqs; ≥ 90% overall | `outputs/test-scenario-agent/` traceability columns |
| 3 | **Pass Rate** | Share of executed tests that passed | `(Tests Passed / Tests Executed) × 100` | ≥ 95% | `outputs/execution-report-agent/` |
| 4 | **Defect Density** | Defects found per unit of size, so counts are comparable across modules/cycles | `Total Defects Found / Size Unit` (size unit = per module, per 100 test cases, or per KLOC — state which) | Trending down cycle-over-cycle; no fixed absolute target | `outputs/jira-bug-tracker-agent/` |
| 5 | **Defect Leakage / Escape Rate** | Share of defects that escaped to a later phase (e.g., UAT/production) instead of being caught earlier | see formula below | < 5% | `outputs/jira-bug-tracker-agent/` (phase-found field) |
| 6 | **MTTD** (Mean Time To Detect) | Average time from when a defect was introduced/build-shipped to when it was found | `Σ(Detection Date − Introduction/Build Date) / N defects` | ≤ 2 days within the same cycle | `outputs/jira-bug-tracker-agent/` created/build timestamps |
| 7 | **MTTR** (Mean Time To Resolve) | Average time from when a defect was reported to when it was resolved/closed | `Σ(Resolution Date − Reported Date) / N defects` (use MEDIAN alongside mean — see anti-patterns) | ≤ 3 days for High/Critical | `outputs/jira-bug-tracker-agent/` created/resolved timestamps |
| 8 | **Automation %** | Share of the total test suite that is automated | `(Automated Test Cases / Total Test Cases) × 100` | ≥ 60% of regression suite | `outputs/execution-report-agent/`, `outputs/test-scenario-agent/` |
| 9 | **Flaky Rate** | Share of automated test runs that flip pass/fail with no code change | `(Flaky Test Runs / Total Automated Test Runs) × 100` | < 5% | `outputs/execution-report-agent/` (rerun/retry history) |

## Defect Leakage / Escape Rate — Worked Formula

Defect leakage measures how much of the total defect volume was caught LATE instead of
in the phase where it should have been caught:

```
Escape Rate (%) = (Defects Found in Phase X or Later / Total Defects Found Across All Phases) × 100
```

Two common variants — state which one is in use on the dashboard:

- **Production escape rate:** `(Defects Found in Production / Total Defects Found) × 100`
  — the strictest and most commonly reported variant.
- **Phase-containment escape rate:** for a given phase (e.g., System Test), the share of
  defects that SHOULD have been caught there (by module/feature under test) but were
  instead found in UAT or later. Requires a "should-have-been-caught-in" tag on each
  defect, not just its found-in phase.

A defect only counts toward leakage if it is a regression of already-tested functionality
or a gap in planned scope — a defect in a feature explicitly marked out-of-scope for the
leaking phase does not count against that phase.

## RAG-Threshold Guide

Two families of metrics need opposite banding logic. `T` = the metric's target value.

**Higher-is-better** (Test Coverage, Requirement Coverage, Pass Rate, Automation %):

| Band | Rule |
|------|------|
| 🟢 Green | value ≥ T |
| 🟡 Amber | T − 10% (relative) ≤ value < T |
| 🔴 Red | value < T − 10% (relative) |

**Lower-is-better** (Defect Density, Defect Leakage/Escape Rate, MTTD, MTTR, Flaky Rate):

| Band | Rule |
|------|------|
| 🟢 Green | value ≤ T |
| 🟡 Amber | T < value ≤ T × 1.5 |
| 🔴 Red | value > T × 1.5 |

Notes:
- These are DEFAULT bands. If `project-context.md` or the user states project-specific
  thresholds, use those instead and note the override in the dashboard.
- A metric marked N/A gets a ⚪ Gray tile, never a guessed color.
- Never soften a Red to Amber to make a scorecard look better — the threshold decides,
  not the audience.

## Dashboard Layout Guide

**Top of dashboard (30-second scorecard):**
- One RAG tile per KPI (9 tiles): value, RAG color, trend arrow (▲ improving / ▼
  worsening / ▬ flat / "insufficient data")
- One-line cycle range covered (e.g., "Sprints 11–14, 2026-06-01 to 2026-07-12")
- One-line inputs-used / inputs-unavailable note

**Below the fold (detail section, one subsection per KPI):**
- Per-cycle table showing the raw numbers behind the formula for that cycle
- The formula and target restated (so the reader never has to cross-reference the
  knowledge file to trust the number)
- Any N/A cycles with their one-line reason
- Any anti-pattern flag raised for that KPI's inputs this cycle

**What does NOT belong on the dashboard:**
- Individual bug rows or individual test-case results — link to
  `outputs/jira-bug-tracker-agent/` and `outputs/execution-report-agent/` instead
- Milestone sign-off narrative or go/no-go recommendation — that belongs in
  `outputs/test-summary-agent/`
- Any invented number used to avoid an N/A

## Metric Anti-Patterns (WARN before trusting an input)

- **Vanity metrics** — a rising raw test-case count or raw defect-found count with no
  denominator tells the reader nothing; always pair a count with its rate or its size
  context before putting it on the dashboard.
- **Gaming pass rate by shrinking the denominator** — removing, skipping, or
  quarantining failing tests so they no longer count as "executed" inflates pass rate
  without improving quality. Flag any cycle where the planned-test-case count dropped
  without a stated scope-reduction reason.
- **Chasing 100% automation without cost context** — automation % rising while flaky
  rate also rises is not progress; report both together, never automation % alone.
- **Defect density without normalization** — "40 defects this release" is meaningless
  without size context (per module, per 100 test cases, per KLOC); never present a raw
  defect count as if it were defect density.
- **MTTR skewed by outliers** — one defect open for 90 days can make MTTR look far worse
  (or, if excluded quietly, far better) than reality. Report median alongside mean, and
  never silently drop outliers from the calculation.
- **100% requirement coverage ≠ quality** — a requirement "covered" by one shallow smoke
  test looks identical, in a coverage %, to one covered by full positive/negative/edge
  scenarios. State coverage DEPTH (scenario count per requirement) in the detail section,
  not just the coverage percentage.
- **Cherry-picked cycle range** — choosing a start/end cycle range that happens to show
  an improving trend, while excluding a bad cycle just outside the window, is a form of
  gaming. Default to the widest available data range unless the user explicitly scopes it.
- **RAG color assigned by feel** — if a stakeholder asks to bump a Red to Amber "because
  it's close," the threshold decides, not the request; note the ask and the actual value.
