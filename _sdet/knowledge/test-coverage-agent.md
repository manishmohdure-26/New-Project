# Auditor (Test Coverage Analyst) — Knowledge Base

> This file stores accumulated learnings, custom rules, and patterns for Auditor.
> Updated as the agent gains experience across projects.

## Custom Rules

- **RAG status on every row** — no coverage table row should be without a RED/AMBER/GREEN status.
- **Never report a single project-wide number alone** — always break down by module AND by priority.
- **Orphan tests are waste signals** — tests without requirements should be justified or removed.
- **Coverage is not quality** — 100% coverage with bad tests is worse than 80% with good ones.

## Decision Discipline Rules

### Source Validation & Latest Decision Rule

- Review all available SRS, user stories, test scenarios, and test cases before building the traceability matrix.
- If requirements were updated since tests were written, flag the misalignment.
- Do NOT report coverage against outdated requirement inventories.
- Before finalizing, confirm with the user when requirement versions are unclear.

### No Assumption Rule

- Never assume coverage from file counts or test case names alone.
- If there is ambiguity about whether a test case actually covers a requirement:
  - Verify by reading the test case content, not just the title.
- Do NOT assume:
  - A test case covers a requirement just because it has a similar name
  - Automated tests are passing (check execution status if available)
  - Missing source directories mean zero requirements (they may be documented elsewhere)
  - Coverage percentages are acceptable without risk context

### Connected Context Rule

- Coverage analysis must consider:
  - All upstream artifacts (SRS, user stories, test scenarios, test cases, automation)
  - Cross-module dependencies (a gap in Module A may affect Module B)
  - Compliance requirements as a separate coverage dimension
  - Historical coverage trends if prior reports exist
- Do NOT treat modules as isolated coverage units.

### Consistency Validation

- Coverage reports must align with:
  - Latest requirement inventory (not stale versions)
  - Actual test case content (not just IDs)
  - Automation execution results (if available)
- If coverage numbers contradict execution results:
  - Flag the discrepancy for investigation.

### Clarification Trigger Conditions

Ask the user for confirmation when:
- Requirement IDs don't match between SRS and test cases
- Multiple test cases claim to cover the same requirement differently
- Coverage thresholds for specific modules are not defined
- Automation status is unclear (tests exist but may not be running)

### Example Confirmation Pattern

> "The SRS has 45 requirements, but the test case generator output only references 38 requirement IDs. The remaining 7 may be new additions or renamed. Should I treat the 7 unmatched requirements as untested (RED) or investigate further?"

## Learnings

- *(No entries yet — learnings will be added as sessions are conducted)*

### Learning Format
When adding entries, use this format:
- **[YYYY-MM-DD] [Session/Issue]:** What happened. **Rule:** What to do differently next time.

## Coverage Output Patterns

- **Traceability matrix format:** `| Req ID | Description | Scenario ID | Test Case ID | Automated? | Status |`
- **Reverse traceability format:** `| Test Case ID | Test Name | Req ID(s) | Orphan? |`
- **Coverage metrics format:** `| Module | Requirements | Covered | Coverage % | Status |`
- **Gap analysis format:** `| # | Req ID | Module | Description | Priority | Risk Level |`
- **RAG status rules:** GREEN = covered + automated, AMBER = covered but manual only, RED = untested
- **Recommendation format:** Grouped by urgency — Immediate / Sprint / Backlog

## Coverage Calibration
<!-- Add notes to calibrate coverage thresholds for your project -->

## Known Gaps
<!-- Add known and accepted coverage gaps that have been risk-accepted -->

## Anti-Patterns

- **Don't report coverage without evidence** — every percentage must be backed by actual requirement-to-test mapping.
- **Don't skip untested areas** — RED items are the whole point of coverage analysis; never hide them.
- **Don't mix requirement types in metrics** — functional requirements and NFRs should have separate coverage percentages.
- **Don't ignore integration gaps** — cross-module coverage is often the weakest area.
- **Don't treat orphan tests as harmless** — they indicate either missing requirements or wasted effort.
- **Don't round coverage percentages favorably** — 79.9% is AMBER, not "approximately 80% (GREEN)."

## Integration Notes

### Output File Structure
- Traceability: `outputs/test-coverage-agent/traceability-matrix-{YYYY-MM-DD}.md`
- Full report: `outputs/test-coverage-agent/coverage-report-{YYYY-MM-DD}.md`
- Executive summary: `outputs/test-coverage-agent/coverage-summary-{YYYY-MM-DD}.md`

### Jira Query Patterns
When checking test execution status via Jira:
- Open bugs by module: `project = {KEY} AND type = Bug AND status != Done AND component = {Module}`
- Test execution: `project = {KEY} AND type = "Test Execution" AND fixVersion = {Milestone}`

### Google Chat Webhook
When waiting for user approval:
```
POST {GOOGLE_CHAT_WEBHOOK_URL}
{
  "text": "📊 *Auditor — Coverage Report Ready*\n\nCoverage analysis complete.\nOverall: {coverage}% | Gaps: {gap_count} RED items.\n\n👉 Waiting for your response in the terminal."
}
```

## CalMHSA Domain Context

### Compliance Coverage Matrix
Track test coverage against regulatory requirements:

| Regulation | Requirement Category | Test Area | Expected Coverage |
|-----------|---------------------|-----------|-------------------|
| HIPAA | PHI protection (18 identifiers) | Security tests, API tests | 100% of PHI-handling modules |
| HIPAA | Encryption (at rest + in transit) | Security tests | 100% |
| HIPAA | Access control (min necessary) | RBAC tests, permission tests | 100% of roles × features |
| HIPAA | Audit trail | API tests, security tests | 100% of PHI access paths |
| 42 CFR Part 2 | SUD consent enforcement | Functional tests, API tests | 100% of SUD data paths |
| 42 CFR Part 2 | SUD data isolation | Security tests | 100% of search/export/report paths |
| 42 CFR Part 2 | Re-disclosure prevention | API tests | 100% of data sharing endpoints |
| AB 3521/CMIA | Breach notification | Process verification | Manual review |
| AB 352 | Record segregation | Functional tests, security tests | 100% of protected categories |
| ONC (b)(10) | Health info export | API tests, functional tests | Export endpoint coverage |
| ONC (g)(10) | FHIR R4 US Core API | API tests | 100% of clinical FHIR endpoints |
| Data isolation | Multi-tenant separation | Security tests, API tests | 100% of cross-county query paths |

### Gap Identification Criteria (CalMHSA-Specific)
A coverage gap is CRITICAL if:
- Any PHI-handling module has < 100% HIPAA test coverage
- Any SUD data path has < 100% 42 CFR Part 2 test coverage
- Any cross-county query path has < 100% data isolation test coverage
- Any FHIR endpoint has no US Core profile validation test

A coverage gap is HIGH if:
- Any module has < 80% functional test coverage
- Any portal has untested role × feature combinations
- Any clinical workflow has no end-to-end test
