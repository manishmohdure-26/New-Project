# Task: Project State Scan

## Overview
This task scans the project to determine current state and recommends the next action.

## Execution Steps

### Step 1: Check Project Context
- Does `project-context.md` exist at the project root?
  - **If NO** → First recommendation: "Set up project context by creating project-context.md."
  - **If YES** → Read it to understand the project and current phase

### Step 2: Scan Output Folders
Check each agent's output folder for existing files:

| Output Folder | Agent | Phase |
|--------------|-------|-------|
| `outputs/mom-agent/` | Recorder (MOM) | Discovery |
| `outputs/user-stories-agent/` | Narrator (User Stories) | Discovery |
| `outputs/srs-agent/` | Specifier (SRS) | Discovery |
| `outputs/repo-analysis-agent/` | Scanner (Repo Analysis) | Analysis |
| `outputs/test-scenario-agent/` | Strategist (Test Scenarios) | Design |
| `outputs/test-case-agent/` | Scriptor (Test Cases) | Design |
| `outputs/automation-agent/` | Automator (E2E Tests) | Execution |
| `outputs/api-test-agent/` | Requester (API Tests) | Execution |
| `outputs/bug-report-agent/` | Catcher (Bug Reports) | Reporting |
| `outputs/retest-agent/` | Gatekeeper (Retest) | Verification |

For each folder:
- **Empty or missing** → Phase not started
- **Has files** → Phase completed (check file dates for recency)

### Step 3: Determine Current Phase
Based on the scan results, identify:
1. **Completed phases** — which agents have produced output
2. **Current phase** — the earliest incomplete phase in the workflow order
3. **Next recommended agent** — the first agent in the sequence that hasn't produced output

### Step 4: Generate Recommendation
Present to the user:

```markdown
## SDET Project Status

### Project: {name from project-context.md}

### Completed Phases
| Phase | Agent | Status | Last Output |
|-------|-------|--------|-------------|
| Discovery | Recorder (MOM) | Done | 2026-03-05 |
| Discovery | Narrator (User Stories) | Done | 2026-03-05 |
| Analysis | Scanner (Repo Analysis) | Not Started | — |

### Recommended Next Step
**Invoke `/repo-analysis-agent`** — Scanner will analyze your codebase architecture.

### Quick Actions
- `/repo-analysis-agent` — Analyze codebase (recommended next)
- `/test-scenario-agent` — Create test scenarios
- `/automation-agent` — Write E2E tests
```

### Step 5: Handle User Questions
If the user asked a specific question:
- Answer the question using knowledge of all agents and workflows
- Provide relevant agent recommendation
- Example: "I just finished the test cases, what's next?" → Recommend Automator (Automation Agent)

## Workflow Order (for recommendations)
1. Recorder (MOM) → Document meetings
2. Narrator (User Stories) → Extract stories
3. Specifier (SRS) → Generate SRS
4. Scanner (Repo Analysis) → Analyze codebase
5. Strategist (Test Scenarios) → Create test scenarios
6. Scriptor (Test Cases) → Manual test cases
7. Automator (Automation) → E2E tests
8. Requester (API Tests) → API tests
9. Catcher (Bug Reporter) → Bug reports
10. Gatekeeper (Retest) → Verify fixes

**Note:** Not all phases are required. Users can skip Discovery (MOM/Stories/SRS) if they already have requirements. The minimum path is: Test Scenarios → Test Cases → Automation.
