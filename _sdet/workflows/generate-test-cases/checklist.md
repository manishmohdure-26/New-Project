# Generate Test Cases — Quality Gate Checklist

**Workflow:** generate-test-cases
**Agent:** Scriptor (Test Case Generator)
**Purpose:** Verify that generated test cases are comprehensive, well-structured, and ready for execution or automation.

---

## Feature Analysis (from User Stories)

- [ ] User stories obtained (from files, pasted in chat, OR fetched from Jira via MCP)
- [ ] All acceptance criteria extracted from each user story
- [ ] User roles, actions, and goals identified per story
- [ ] All user interactions identified from acceptance criteria
- [ ] Validation rules and business rules extracted from stories and SRS
- [ ] SRS document reviewed for detailed requirements (if available from SRS Agent)
- [ ] Existing test strategy reviewed (if available from QA Architect)
- [ ] Ambiguities flagged and clarified with user

## Scenario Coverage

- [ ] Positive scenarios covered (2-3 per feature) — happy path with valid inputs
- [ ] Negative scenarios covered (3-4 per feature) — invalid inputs, missing fields, unauthorized actions
- [ ] Edge/boundary cases covered (2-3 per feature) — min/max values, empty strings, special characters
- [ ] CRUD lifecycle covered (where applicable) — Create, Read, Update, Delete, Full Lifecycle
- [ ] Security scenario included (where applicable) — XSS, injection, auth bypass, IDOR
- [ ] Error handling scenario included — network errors, server errors, timeouts
- [ ] Integration scenarios covered — cross-feature interactions, end-to-end flows

## Test Case Quality

- [ ] Test case IDs follow `TC-[MODULE]-[NNN]` format (e.g., TC-LOGIN-001)
- [ ] Every test case has a clear, descriptive title
- [ ] Priorities assigned to all test cases (Critical / High / Medium / Low)
- [ ] Categories assigned to all test cases (Positive / Negative / Edge / Security / CRUD / etc.)
- [ ] Preconditions clearly stated for each test case
- [ ] Steps are specific and actionable (exact data to enter, exact elements to interact with)
- [ ] Expected results are precise and verifiable (specific messages, redirects, data changes)

## Organization

- [ ] Test cases grouped by module/feature
- [ ] Summary table with counts included (by priority and by category)
- [ ] Automatable cases marked with `[AUTOMATE]` tag
- [ ] Assumptions documented with `[ASSUMPTION]` tag

## Output

- [ ] XLSX file generated and saved to `outputs/test-case-agent/TestCases-{feature}-{date}.xlsx`
- [ ] Markdown file generated and saved to `outputs/test-case-agent/TestCases-{feature}-{date}.md`
- [ ] Summary sheet included in XLSX with counts by priority and category
- [ ] Output files are well-formatted and readable

## Handoff

- [ ] Total test case count documented with breakdown
- [ ] Automation-suitable cases listed for Automator (Automation Agent)
- [ ] Test data requirements noted for Feeder (Test Data Agent)
- [ ] Assumptions and ambiguities listed for user clarification
- [ ] Recommended next agent identified

---

**Gate Rule:** All items above must be checked before test cases are considered complete. If any item cannot be completed, document the reason and flag it as an assumption.
