# Generate Test Cases — Execution Instructions

**Workflow:** generate-test-cases
**Agent:** Scriptor (Test Case Generator)
**Purpose:** Analyze user stories and requirements to generate comprehensive, structured test cases.

---

## Step 1: Feature Analysis (from User Stories)

Thoroughly understand the feature from user stories before writing any test cases.

### 1.1 Obtain User Stories

**Use this priority order to get user stories:**

1. **If a file path was provided:** Read user stories from the specified path.
2. **If no path provided, check default location:** Look for user stories in `outputs/user-stories-agent/` for the target feature.
3. **If no files found:** Ask the user — "Would you like to provide the file path, paste the user stories directly in chat, or provide a Jira ticket number?"
4. **If user pastes stories in chat:** Use them directly as input.
5. **If user provides a Jira ticket/epic number** (e.g., PROJ-123): Use the Jira MCP tool to fetch the ticket details. Extract user stories, acceptance criteria, and description from the Jira issue. If the ticket is an Epic, also fetch all child stories linked to it.

**Once user stories are obtained, extract from each story:**
1. **User role** (As a...)
2. **Action** (I want to...)
3. **Goal** (So that...)
4. **All acceptance criteria** — these are the primary source for test scenarios
5. Identify all user interactions and expected behaviors described in the stories.
6. Identify input fields, validation rules, and business rules from acceptance criteria.
7. Identify error scenarios and edge cases implied by the criteria.

### 1.2 Read SRS Document (if available)
1. If `srs_document` path is provided, read the SRS from `outputs/srs-agent/`.
2. Cross-reference functional requirements (FR-xxx) with user stories.
3. Extract detailed validation rules, data constraints, and business logic.
4. Note non-functional requirements that may need test coverage (performance, security).

### 1.3 Read Test Strategy (if available)
1. If `test_strategy` path is provided, read the test strategy from QA Architect.
2. Note the risk level assigned to this feature.
3. Note any specific testing recommendations from the strategy.

### 1.4 Clarify Ambiguities
If any user story has unclear or missing acceptance criteria:
- Flag it with `[ASSUMPTION]` tag
- Ask the user for clarification before proceeding
- Document assumptions made

**Output of this step:** A complete understanding of the feature's expected behavior, validation rules, and user workflows — all derived from user stories and acceptance criteria.

---

## Step 2: Scenario Identification

Systematically identify test scenarios across all categories.

### 2.1 Positive Scenarios (Happy Path)
- Valid inputs that should succeed.
- Complete workflows from start to finish.
- All valid combinations of optional fields.
- Successful CRUD operations with correct data.

### 2.2 Negative Scenarios (Invalid Inputs)
- Missing required fields (one at a time, then all at once).
- Invalid data formats (wrong email format, letters in number fields, etc.).
- Values exceeding maximum length or below minimum.
- Unauthorized actions (wrong role, no permission).
- Duplicate entries where uniqueness is required.

### 2.3 Edge Cases (Boundary Values)
- Minimum and maximum allowed values (exact boundary).
- One above and one below boundaries.
- Empty strings vs. null vs. whitespace-only.
- Special characters in text fields.
- Very long strings at the character limit.
- Zero values, negative numbers (where applicable).

### 2.4 Integration Scenarios
- Cross-feature interactions (e.g., creating a record and verifying it appears in a list).
- End-to-end flows spanning multiple pages or API calls.
- Data consistency across frontend and backend.

### 2.5 Error Handling Scenarios
- Network failure during submission.
- Server returning 500 errors.
- Timeout scenarios.
- Concurrent modification conflicts.

### 2.6 Security Scenarios
- XSS payloads in input fields.
- SQL injection attempts (where applicable).
- Accessing resources without authentication.
- Accessing another user's resources (IDOR).
- CSRF token validation.

### 2.7 CRUD Lifecycle (where applicable)
For each entity that supports CRUD operations:
- **Create:** Valid creation, duplicate prevention, required field validation.
- **Read:** List view with data, empty state, detail view, search/filter.
- **Update:** Valid updates, partial updates, reverting changes, updating non-existent records.
- **Delete:** Successful deletion, confirm/cancel dialog, cascade effects, deleting already-deleted records.
- **Full Lifecycle:** Create -> Read -> Update -> Verify -> Delete -> Verify deletion.

---

## Step 3: Test Case Writing

Write each test case using the standard format.

### 3.1 Naming Convention
- Format: `TC-[MODULE]-[NUMBER]`
- Examples: `TC-LOGIN-001`, `TC-CART-015`, `TC-USER-003`
- Numbers are sequential within each module, starting at 001.

### 3.2 Test Case Format
```
TC-[MODULE]-[NUMBER]
Title: [Clear, descriptive title that explains what is being tested]
Priority: [Critical / High / Medium / Low]
Category: [Positive / Negative / Edge Case / Security / CRUD / Integration / Error Handling]
Preconditions:
  - [What must be true before this test can run]
  - [Required data, user state, environment conditions]
Steps:
  1. [Specific action with exact data to enter]
  2. [Next action — be explicit about what to click, type, or verify]
  3. [Continue until the test is complete]
Expected Result:
  - [Exactly what should happen after executing the steps]
  - [Include specific messages, redirects, data changes, or visual states]
```

### 3.3 Priority Assignment
- **Critical:** Auth flows, payment processing, data loss prevention, security-sensitive operations.
- **High:** Core CRUD operations, primary user workflows, data validation.
- **Medium:** Secondary features, UI/UX validations, filtering/sorting.
- **Low:** Cosmetic checks, tooltips, static content, rarely used features.

---

## Step 4: Review and Organize

### 4.1 Group by Module
Organize all test cases by module/feature area. Each module should have its own section.

### 4.2 Create Summary Table
Generate a summary table at the top of the document:

| Module | Total | Critical | High | Medium | Low | Positive | Negative | Edge | Security | CRUD |
|--------|-------|----------|------|--------|-----|----------|----------|------|----------|------|
| Login  | 11    | 3        | 4    | 2      | 2   | 3        | 4        | 2    | 2        | 0    |
| **Total** | **XX** | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **X** |

### 4.3 Mark Automation-Suitable Cases
Flag test cases that are good candidates for automation with `[AUTOMATE]` tag:
- Repetitive tests (login, CRUD operations).
- Tests with deterministic expected results.
- Regression-prone areas.

### 4.4 Flag Unclear Requirements
Document any assumptions or ambiguities with `[ASSUMPTION]` tag. List all assumptions in a dedicated section at the end.

---

## Step 5: Output

Save all outputs to `outputs/test-case-agent/`.

### 5.1 XLSX Output (Primary)
Generate an Excel file using the `xlsx` npm package (SheetJS):
- **File name:** `TestCases-{feature}-{date}.xlsx`
- **One sheet per module/feature.**
- **Columns:** TC ID, Title, Priority, Category, Preconditions, Steps, Expected Result, Actual Result, Status.
- **Include a "Summary" sheet** with counts by priority and category.

### 5.2 Markdown Output (Secondary)
Generate a Markdown file for quick terminal readability:
- **File name:** `TestCases-{feature}-{date}.md`
- Use markdown tables for the summary.
- Use structured format for each test case.
- Include all tags ([AUTOMATE], [ASSUMPTION]).

### Handoff Notes

Include at the end of the output:
- Total test cases generated with breakdown by priority and category.
- List of cases marked `[AUTOMATE]` for Automator (Automation Agent).
- Any test data requirements for Feeder (Test Data Agent).
- Assumptions and ambiguities that need clarification.

---

## Scale-Aware Behavior

Adjust depth based on the active scale profile:

- **Quick:** 3-5 test cases per feature. Happy path + top negative scenarios only. Skip edge cases and CRUD lifecycle. Markdown output only.
- **Standard:** 8-12 test cases per feature. Full scenario coverage including CRUD lifecycle. Both XLSX and Markdown outputs. Complete summary table.
- **Enterprise:** 15-25 test cases per feature. Include security, performance, accessibility, and compliance scenarios. Full CRUD lifecycle with negative CRUD and security CRUD. Detailed traceability to requirements. Both XLSX and Markdown outputs with comprehensive summary and coverage matrix.
