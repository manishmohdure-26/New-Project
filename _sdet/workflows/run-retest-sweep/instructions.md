# Run Retest Sweep — Instructions

## Agent: Gatekeeper (Retest Agent)

Follow these phases in strict order. Do NOT skip or reorder phases.

---

## Phase 0: Prerequisites

Before starting the retest sweep, verify that **all** prerequisites are met:

1. **Jira MCP configured** — The Jira MCP server is connected and authenticated. Test by fetching a known ticket.
2. **Git MCP configured** — The Git MCP server is connected and can access both FE and BE repositories.
3. **Config file filled** — `automation/config/qa-retest-config.json` exists and contains real values (no placeholders).
4. **QA environment accessible** — The QA environment URL is reachable and the login page loads.
5. **Google Chat webhook configured** — The webhook URL in the config is valid and ready to receive notifications.
6. **Playwright installed** — Playwright browser automation is available for browser-based retesting.

If any prerequisite is NOT met, **STOP** and inform the user which prerequisite is missing.

---

## Phase 1: Load & Validate Config

1. Read `qa-retest-config.json` (or the path provided via `config_path` input).
2. Verify all required fields are present and contain real values:
   - Jira project key, JQL filter, ticket statuses
   - QA environment URL, login credentials reference
   - FE and BE repository paths and branch names
   - Google Chat webhook URL
   - Screenshot output directory
3. **Present the configuration to the user** in a summary table.
4. **Wait for user confirmation** before proceeding.

---

## Phase 2: Fetch Tickets

1. Execute a JQL query to fetch all bugs in **"Ready for Testing"** status (or the status configured in the config file).
2. List all fetched tickets in a table:
   | # | Ticket ID | Title | Assignee | Fix Version |
   |---|-----------|-------|----------|-------------|
3. **Wait for user confirmation** of the ticket list before proceeding.
   - User may exclude specific tickets from the retest batch.

---

## Phase 3: Verify Deployment

For each ticket in the confirmed list:

1. **Check FE repository** — Look for the fix commit on the configured branch.
2. **Check BE repository** — Look for the fix commit on the configured branch.
3. **Mark deployment status**:
   - **Deployed** — Fix commit found on the target branch for both FE and BE (as applicable).
   - **Not Deployed** — Fix commit NOT found on the target branch.
   - **Unknown** — Cannot determine (e.g., commit hash not in ticket, branch not accessible).
4. **Send Google Chat alert** for any ticket marked as Not Deployed or Unknown.
5. **Skip undeployed tickets** — Remove them from the retest batch and note them in the report.

---

## Phase 4: Analyze & Retest

For each deployed ticket:

### 4.1 Analyze the Fix
- Read the fix diff (commit changes) from the repository.
- Identify impacted areas: which screens, APIs, or components are affected.

### 4.2 Login to QA Environment
- Open the QA environment URL in the browser.
- Perform login using configured credentials.
- **If login FAILS, STOP the entire retest sweep immediately.** Report the login failure and do not continue.

### 4.3 Retest the Fix
- Navigate to the affected screen or endpoint.
- Follow the original reproduction steps from the bug ticket.
- Verify that the bug is fixed (expected behavior now occurs).
- **Capture a screenshot** of the result.

### 4.4 Regression Check
- Perform a quick regression check on the impacted areas:
  - Verify adjacent functionality still works.
  - Check that no new visual or functional issues were introduced.

### 4.5 Record Result
For each ticket, record one of:
- **PASS** — Bug is fixed, no regression detected.
- **FAIL** — Bug is NOT fixed, same or similar failure persists.
- **REGRESSION** — Bug may be fixed, but a new issue was introduced in the impacted area.

---

## Phase 5: Update Jira

For each retested ticket:

### PASS
1. Add a Jira comment with:
   - Verification details (what was tested, environment, date).
   - Screenshot attachment.
   - "Verified as fixed" statement.
2. Transition the ticket to **DONE** status.

### FAIL
1. Add a Jira comment with:
   - Retest details (steps followed, what still fails).
   - Screenshot attachment.
   - "Bug not fixed" statement with evidence.
2. Transition the ticket to **REOPEN** status.

### REGRESSION
1. Add a Jira comment with:
   - Original bug verification result.
   - New regression issue description.
   - Screenshot attachment.
2. Transition the ticket to **REOPEN** status.
3. Flag the new regression issue for the team.

---

## Phase 6: Report & Notify

1. **Save detailed report** to `outputs/retest-agent/retest-report-{date}.md` with:
   - Summary statistics (total tickets, PASS, FAIL, REGRESSION, skipped).
   - Detailed results per ticket.
   - Screenshots referenced.
   - Deployment verification results.
2. **Save Excel report** to `outputs/retest-agent/RetestReport-{date}.xlsx` (if conversion available).
3. **Send Google Chat summary** via webhook:
   - Total retested, passed, failed, regression count.
   - List of failed/reopened tickets.
4. **Present results to user** with a summary table and recommendations.
