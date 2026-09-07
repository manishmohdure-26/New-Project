# Report Bugs — Instructions

## Agent: Catcher (Bug Reporter)

Follow these steps in order to analyze a failure and produce a structured bug report.

---

## Step 1: Analyze Failure

1. **Read the error message and stack trace** provided in the `error_output` input.
2. **Read relevant source code** if `source_code` input is provided, or locate the file referenced in the stack trace.
3. **Identify the root cause** by tracing the error through the code path:
   - Pinpoint the exact line or function where the failure originates.
   - Determine whether it is a thrown exception, assertion failure, timeout, or unexpected state.
4. **Classify the failure type**:
   - **Code Bug** — Defect in application source code (frontend or backend).
   - **Test Issue** — Problem with the test itself (flaky selector, wrong assertion, stale data).
   - **Environment Issue** — Infrastructure, configuration, or deployment problem.
   - **Requirement Gap** — Missing or ambiguous requirement causing undefined behavior.
5. **Check reproducibility**:
   - If steps are provided, mentally walk through them against the code.
   - Note whether the bug appears deterministic or intermittent.

---

## Step 2: Classify Bug

Assign each of the following attributes with a brief justification:

### Severity
| Level | Label    | Definition |
|-------|----------|------------|
| S1    | Blocker  | System crash, data loss, no workaround, blocks release |
| S2    | Critical | Major feature broken, workaround exists but painful |
| S3    | Major    | Feature partially broken, acceptable workaround exists |
| S4    | Minor    | Cosmetic, typo, edge case with minimal user impact |

### Priority
| Level | Label     | Definition |
|-------|-----------|------------|
| P1    | Immediate | Fix before next deployment |
| P2    | High      | Fix within current sprint |
| P3    | Medium    | Fix within next sprint |
| P4    | Low       | Fix when convenient |

### Type
Assign one: **Functional** | **UI** | **API** | **Performance** | **Security**

### Module
Identify the application module (e.g., Auth, Dashboard, Payments, Reports, User Management).

---

## Step 3: Create Bug Report

### Consolidation Rule (READ FIRST)

**One page = one bug report.** If multiple issues are found on the same page, screen, drawer, form, or modal, DO NOT create separate bug reports for each issue. Instead:

- Write a **single consolidated bug report** for that page.
- List every issue inside an **"Issues Found"** section as numbered items (Issue 1, Issue 2, …).
- Use ONE `BUG-MODULE-NNN` ID for the whole report.
- Use the **highest** severity and priority among the grouped issues as the report-level severity/priority.
- Each issue inside the report still gets its own Steps / Expected / Actual / Technical Analysis / Evidence.

**When to split into separate reports:**
- Issues are on **different pages** within the same module → separate reports.
- Issues are in **different modules** → separate reports.
- When in doubt → consolidate.

### Template

Use the `bug-report-template.md` template if available. If not, structure the report with the following sections:

### 3.1 Title
Write a clear, descriptive title in the format:
```
[MODULE] Brief description of the defect
```
Example: `[Auth] Login fails with valid credentials when MFA is enabled`

### 3.2 Environment
- **Application Version / Branch**: (e.g., `develop`, commit hash)
- **Browser**: (e.g., Chrome 120, Firefox 121)
- **OS**: (e.g., Windows 11, macOS 14)
- **Environment**: (e.g., QA, Staging, Production)
- **Test Framework**: (e.g., Playwright 1.40, Cypress 13)

### 3.3 Severity & Priority
State the assigned severity and priority with one-line justifications.

### 3.4 Steps to Reproduce
Number each step precisely. Include:
- Preconditions
- Exact input values
- Exact navigation path
- Exact button or element interactions

### 3.5 Expected vs Actual Results
| | Description |
|---|---|
| **Expected** | What should happen according to requirements |
| **Actual** | What actually happens, including error messages |

### 3.6 Root Cause Analysis
- Reference specific code files and line numbers.
- Explain the logic flaw or missing condition.
- Include relevant code snippets (keep brief).

### 3.7 Suggested Fix
When possible, recommend a fix:
- Code change with specific file and function.
- Configuration change.
- Data fix.

### 3.8 Test Evidence
Attach or embed:
- Error logs and stack traces.
- Screenshots (if UI bug).
- API request/response payloads (if API bug).
- Test output logs.

---

## Step 4: Output

1. **Assign Bug ID** using the format: `BUG-MODULE-NNN` (e.g., `BUG-AUTH-001`).
   - Increment the number by checking existing reports in `outputs/bug-report-agent/`.
2. **Save the report**:
   - Markdown: `outputs/bug-report-agent/BugReport-{module}-{date}.md`
   - DOCX (if conversion script available): `outputs/bug-report-agent/BugReport-{module}-{date}.docx`
3. **Create summary report** if multiple bugs are being reported in one session:
   - `outputs/bug-report-agent/BugSummary-{date}.md` with a table of all bugs, their IDs, severities, and statuses.
4. **Notify relevant agents** via handoff suggestions:
   - S1/S2 bugs: Suggest handoff to Planner (QA Architect) for strategy impact assessment.
   - Test-related bugs: Suggest handoff to Automator (Automation Agent) for test fixes.

---

## Step 5: Jira Logging — OPT-IN ONLY (DO NOT RUN BY DEFAULT)

**The default bug report workflow ENDS at Step 4.** Do NOT touch Jira unless the user has
explicitly approved it in the current turn.

### Rules
1. After Step 4, present the local report path and ask ONCE:
   > Bug report ready at `outputs/bug-report-agent/<file>`. Want me to log it to Jira? (yes/no)
2. **Do not call any Jira MCP tool, and do not run any `curl` command against `$JIRA_URL`,
   until the user replies with an explicit affirmative** ("yes", "go ahead", "log it", "push it").
3. Silence, ambiguity, or a tangential reply is NOT approval — ask again or stop.
4. Approval for a previous bug does NOT carry over. Each bug needs its own explicit approval.
5. If the user says "no", "not yet", "hold", "wait", or anything non-affirmative → STOP. Keep
   the local report only. Do not retry, do not auto-escalate.

### Only after explicit approval
- Create the Jira issue via the `jira-hopenotes` MCP server (or fall back to `curl` with
  credentials from `automation/.env`).
- Link the bug to the related user story (issue link type: `Causes`).
- Attach screenshots from `outputs/bug-report-agent/screenshots/` to the Jira ticket.
- Update the local bug report with the Jira ticket key.
- Announce: `Bug logged to Jira: HOPE-XXX`.
