# Weaver — Traceability Agent Knowledge

> Training file for Weaver (Senior Traceability & RTM Specialist).
> Edit this file to customize Weaver's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Matrix Integrity Rules (CRITICAL)
- **Every link must be backed by an explicit ID citation** in the source artifact
  (e.g., a scenario's "User Story" column literally contains `US-001`) — never infer a
  link from module name, file proximity, or topic similarity
- **Forward and backward traceability are BOTH required** — a matrix that only proves
  "every requirement has a test" but never checks "every test traces to a requirement"
  will miss orphaned, wasted, or stale test effort
- **"Covered" requires an unbroken ID chain to a Test Case** — a requirement with a
  linked user story but no scenario, or a scenario with no test case, is "Partial", not
  "Covered"
- **Never silently drop an ID that fails convention matching** — flag it as a
  convention violation row instead; a malformed ID is often the first sign of a broken
  link elsewhere in the chain
- **Rebuild or update the RTM every time an upstream agent produces new output** — a
  stale RTM is worse than no RTM, because it creates false confidence in coverage

## Learnings

<!-- Add learnings from past traceability sessions -->

## RTM Column Definitions

The forward-traceability matrix (one row per requirement-to-leaf thread) uses these
columns:

| Column | Meaning | Populated From |
|--------|---------|-----------------|
| **REQ ID** | The requirement or functional/non-functional requirement identifier | `outputs/requirements-agent/` or `outputs/srs-agent/` |
| **Requirement** | One-line summary of what the requirement states | Same source as REQ ID |
| **US ID** | The user story that implements the requirement | `outputs/user-stories-agent/` — cross-referenced via the story's stated requirement link, or via `outputs/acceptance-criteria-agent/` |
| **SC ID(s)** | Scenario(s) derived from that user story | `outputs/test-scenario-agent/` — read from each scenario's "User Story" column |
| **TC ID(s)** | Test case(s) expanded from those scenarios | `outputs/test-case-agent/` — read from each case's parent Scenario ID tag (e.g., `[SC-AUTH-001]` prefix in DESCRIPTION) |
| **Exec Status** | Aggregate pass/fail/not-run count across the linked test cases | `outputs/test-case-agent/` STATUS column, or `outputs/retest-agent/` execution results if present |
| **BUG ID(s)** | Defect(s) logged against any of the linked test cases | `outputs/bug-report-agent/` or `outputs/jira-bug-tracker-agent/` — matched via the defect's cited Test Case ID |
| **Coverage** | Covered / Partial / Gap — see Coverage-Gap Detection Checklist | Derived by Weaver from the chain above |

## Forward vs. Backward Traceability

**Forward traceability** answers: *"For this requirement, what proves it was tested?"*
Trace REQ -> US -> SC -> TC -> (execution result / BUG). This is the direction that
proves **coverage** — it is what an auditor or release manager asks for before sign-off.
A forward gap means a requirement shipped without a demonstrable test.

**Backward traceability** answers: *"For this test case, why does it exist?"*
Trace TC -> SC -> US -> REQ. This is the direction that proves **relevance** — it is
what catches wasted or stale test effort: cases nobody can justify against a current
requirement, scenarios written for a feature that was later descoped, and defects that
were logged without ever being tied back to a test case or requirement.

A complete RTM always runs both directions. A team that only checks forward
traceability will believe its coverage is complete while quietly accumulating orphaned
test debt that nobody prunes because nobody can see it.

## Coverage-Gap Detection Checklist

Run this checklist during Step 5 (Coverage-Gap Report) for every requirement/story:

- [ ] Does the requirement have at least one linked User Story? (If not: **GAP** —
      no story written)
- [ ] Does the User Story have at least one linked Scenario? (If not: **GAP** — no
      scenario written)
- [ ] Does the Scenario have at least one linked Test Case? (If not: **GAP** — scenario
      never expanded into an executable case)
- [ ] Has the Test Case been executed at least once (Exec Status is not blank/"Not
      Run")? (If not: **GAP** — written but never executed)
- [ ] If the requirement is Critical/High risk, does it have test cases spanning
      Positive AND Negative categories at minimum? (If not: **GAP** — thin coverage on
      a high-risk requirement)
- [ ] If the requirement is authenticated/RBAC-relevant, does it have a Security or
      Permission category test case? (If not: **GAP** — auth surface untested)
- [ ] Does every defect logged against this thread cite a specific Test Case ID? (If
      not: **GAP** — defect isn't traceable to what caught it)

## Orphan Detection Checklist

- [ ] Test Case with no parent Scenario ID citation -> **orphan test case**
- [ ] Scenario with no parent User Story ID citation -> **orphan scenario**
- [ ] User Story with no parent Requirement ID citation (when a requirements source
      exists for the project) -> **orphan story**
- [ ] Defect with no cited Test Case ID or Requirement ID -> **untraceable defect**
- [ ] Any ID that does not match the project's recognized prefix/format -> **convention
      violation** (report separately from true orphans — it may be a typo, not a
      missing link)

## ID-Naming Conventions

Read the project's actual convention from `project-context.md` and prior agent
outputs first — this table is the default/reference set, not a fixed rule to impose
over a project's existing IDs:

| Entity | Format | Example | Typical Source |
|--------|--------|---------|-----------------|
| Requirement (general) | `REQ-MODULE-NNN` | `REQ-AUTH-001` | `outputs/requirements-agent/` (if that agent is used on this project) |
| Requirement — functional | `FR-MODULE-NNN` | `FR-AUTH-001` | `outputs/srs-agent/` (IEEE 830 convention, see `_sdet/knowledge/shared.md`) |
| Requirement — non-functional | `NFR-CATEGORY-NNN` | `NFR-PERF-001` | `outputs/srs-agent/` |
| User Story | `EPIC-ID-US-NNN` or `US-NNN` | `EPIC-AUTH-US-001` | `outputs/user-stories-agent/` |
| Acceptance Criterion | `AC-USID.N` | `AC-001.2` | `outputs/acceptance-criteria-agent/` |
| Scenario | `SC-MODULE-NNN` | `SC-AUTH-001` | `outputs/test-scenario-agent/` |
| Test Case | `TC-MODULE-NNN` | `TC-AUTH-001` | `outputs/test-case-agent/` |
| Defect/Bug | `BUG-MODULE-NNN` | `BUG-AUTH-003` | `outputs/bug-report-agent/`, `outputs/jira-bug-tracker-agent/` |

Both `REQ-` (a dedicated requirements-agent, if the project has one) and `FR-`/`NFR-`
(the SRS-agent convention already in use across this system) are valid requirement
prefixes — Weaver treats whichever one the project's actual outputs use as
authoritative and does not force a rename.

## Impact-Analysis Procedure

When a requirement, user story, or scenario changes mid-milestone, run this procedure
(Step 6) instead of asking someone to re-read the whole suite:

1. **Locate the changed ID** in the ID inventory (Step 2). If it is not yet in the
   inventory, rebuild the inventory first — impact analysis on stale data is unreliable.
2. **Traverse downstream** from the changed ID through the forward-traceability chain
   built in Step 3: collect every Scenario ID, then every Test Case ID reachable from
   those scenarios.
3. **Traverse the defect history** for the same thread: any BUG ID previously logged
   against one of the collected Test Case IDs is a **regression risk** — the fix must be
   re-verified, not just the new behavior.
4. **Group by portal/module** so the re-test list is directly actionable per team/owner.
5. **Report**: total test cases impacted, portals/modules affected, and prior defects to
   re-verify. This becomes the recommended regression scope — hand it to whoever owns
   execution (manual QA or `/automation-agent` for the automated subset).
6. If the changed ID has **no downstream links at all**, report that explicitly — it
   means either the change is net-new (nothing to re-test yet) or the item was already
   an orphan/gap before the change (surface it as a pre-existing coverage gap, not a
   clean impact result).

Impact analysis never expands scope by inference (e.g., "this module usually breaks
together with that one") — only ID-linked artifacts are included. If a broader
regression sweep is warranted, that is a judgment call for the Test Lead
(`test-plan-agent` / Charter), not something Weaver invents on its own.
