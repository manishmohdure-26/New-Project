# Charter — Test Plan Agent Knowledge

> Training file for Charter (Senior Test Lead & Test Planning Specialist).
> Edit this file to customize Charter's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Test Plan Structure Rules (CRITICAL)
- **Follow the 16-section IEEE 829 structure** (see Test Plan Section Reference below) —
  do not invent a different document shape per milestone
- **Every scope row MUST have a reason** — "In" or "Out" without a reason is not a scope
  decision, it is a guess that will get re-litigated mid-milestone
- **Entry and exit criteria are checkable conditions**, not narrative prose — use `[ ]`
  boxes so sign-off is a checklist, not a negotiation
- **Every risk needs Probability, Impact, Mitigation, Contingency, AND Owner** — a risk
  row missing any of these five is incomplete
- **Never invent schedule dates, resource names, environment names, or pass-rate
  thresholds** — pull them from `project-context.md` or ask the user

### Scope In/Out Rules
- In-scope items map to a milestone objective, user story range, or explicit stakeholder
  request — cite the source
- Out-of-scope items state WHY (deferred, covered elsewhere, explicitly descoped) and,
  where known, WHEN they will be covered
- Cross-cutting concerns (performance, accessibility, security) get an explicit in/out
  decision — silence is not a decision
- Scope changes after the plan is approved go through Step "Update Plan" ([UP]), not a
  silent edit to the existing document

### Entry/Exit Criteria Rules
- Entry criteria protect the team from testing an unstable build — they gate the START
  of test execution
- Exit criteria protect the business from shipping untested risk — they gate SIGN-OFF
- Both criteria sets must be agreed upon BEFORE test execution begins, not written
  retroactively to justify a ship decision already made
- A criterion that cannot be objectively checked (e.g., "testing feels complete") is not
  a valid entry or exit criterion — rewrite it as a measurable condition

## Learnings

<!-- Add learnings from past test planning sessions -->

## Test Plan Section Reference

IEEE 829-style sections Charter populates, in order:

1. **Test Plan Identifier** — milestone/release name, version, date, author
2. **Introduction** — purpose of this plan, product/feature summary, references (SRS, user stories)
3. **Test Items** — the specific builds/components under test (with version/build number)
4. **Features to be Tested** — in-scope modules and features, each with a reason
5. **Features Not to be Tested** — out-of-scope items, each with a reason and future coverage note
6. **Approach** — test levels, test types, design techniques, automation-vs-manual split
7. **Item Pass/Fail Criteria** — the objective condition that marks a test item pass or fail
8. **Suspension Criteria and Resumption Requirements** — conditions to halt testing (e.g., blocking defect, environment down) and what must be true to resume
9. **Test Deliverables** — scenario docs, test case sheets, automation suite, bug reports, this plan itself
10. **Testing Tasks** — the work breakdown (design, environment setup, execution, regression, reporting)
11. **Environmental Needs** — hardware, test environments, data, tools, access/credentials (reference `project-context.md`, never hardcode)
12. **Responsibilities** — roles and named/role-based ownership for each testing task
13. **Staffing and Training Needs** — team composition, any tooling/domain training required
14. **Schedule** — phases with start/end and milestone gates (design complete, execution complete, sign-off)
15. **Risks and Contingencies** — the risk register (Probability, Impact, Mitigation, Contingency, Owner)
16. **Approvals** — who signs off (Test Lead, Product Owner, stakeholder) and the criteria that trigger sign-off

## Entry & Exit Criteria Patterns

### Entry Criteria (typical set)
- Build deployed to the designated test environment and smoke-tested
- Test scenarios for this milestone approved (`outputs/test-scenario-agent/`)
- Required test data and role-based accounts provisioned per `project-context.md`
- No open Critical/Blocker defects carried over from the prior milestone without a waiver
- Test plan itself reviewed and approved by the Test Lead

### Exit Criteria (typical set)
- 100% of Critical/High priority test cases executed (not just "attempted")
- Zero open Critical severity defects; every open High severity defect has an owner and ETA
- Pass rate meets or exceeds the threshold defined in this plan (pull threshold from
  project-context.md or the user — never assume a percentage)
- Regression suite green on the designated environment
- All known/accepted issues documented with stakeholder sign-off, not silently dropped

### Suspension / Resumption Pattern
- Suspend when: environment is down, a blocking defect prevents further meaningful
  testing, or test data is corrupted/unavailable
- Resume when: the blocking condition is resolved AND a smoke test confirms the fix

## Risk & Contingency Patterns

- **Environment instability** — Mitigation: daily smoke check before test runs;
  Contingency: fall back to a secondary environment, escalate to DevOps
- **Incomplete scenario coverage on high-risk modules** — Mitigation: cross-check the
  test-scenario-agent risk distribution before declaring exit criteria met; Contingency:
  extend the execution phase, prioritize Critical/High scenarios first
- **Resource unavailability (key tester out)** — Mitigation: cross-train a second
  engineer on critical modules ahead of the milestone; Contingency: reassign from a
  shared QA pool, adjust schedule
- **Schedule compression (late requirements/design changes)** — Mitigation: freeze scope
  by the design-complete gate; Contingency: cut Low-priority scope first, never cut
  Critical/High coverage to save time
- **Test data unavailability or drift** — Mitigation: automate data provisioning where
  possible; Contingency: manual data setup runbook, escalate to the data owner
- Every risk row must name an **Owner** — a risk without an owner does not get mitigated,
  it gets rediscovered during the crisis it was supposed to prevent

## Estimation Inputs

Inputs Charter should gather (from `project-context.md`, prior agent outputs, or the
user) before committing to a schedule:

- **Scenario/test case volume** — from `outputs/test-scenario-agent/` (scenario counts by
  risk) and `outputs/test-case-agent/` (case counts), if available
- **Team size and role mix** — number of manual QA, automation engineers, and their
  availability for the milestone window
- **Automation coverage ratio** — what fraction of the planned scenarios already have or
  will have Playwright coverage, which reduces manual execution time
- **Regression suite size and runtime** — affects how many regression passes fit in the
  schedule
- **Environment availability windows** — staging/UAT access dates constrain when
  execution can start and how much buffer exists before sign-off
- **Historical defect density** (if known from `outputs/jira-bug-tracker-agent/` on prior
  milestones) — higher historical defect density in a module argues for more execution
  time and tighter entry criteria on that module
- **Sprint/milestone duration** — read from `project-context.md`; never assume a duration
