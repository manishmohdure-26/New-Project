# Generate Test Scenarios — Instructions

## Agent: Strategist (Test Scenario Agent)

Follow these steps in order to produce a complete, risk-prioritized test scenario document.

**IMPORTANT**: Strategist designs scenarios at the STORY level — WHAT to test and WHY. Never write detailed test steps; that is the test-case-agent's job.

---

## Step 1: Gather Source Artifacts

1. **Ask the user** if they have specific artifacts to analyze, or if you should scan `outputs/`.
2. **Scan the standard input locations** (use whatever exists):
   - `outputs/user-stories-agent/` — User stories with acceptance criteria (preferred source)
   - `outputs/srs-agent/` — SRS with functional/non-functional requirements
   - `outputs/repo-analysis-agent/` — Architecture and module structure
   - `project-docs/Userstories/` — Milestone sheets (Excel/CSV)
3. **Read `project-context.md`** at the project root — portal names from `## Portals`, ID conventions from `## Conventions`.
4. **Present found artifacts** in a table:
   | # | File | Location | Type | Contents |
   |---|------|----------|------|----------|
5. **Ask the user for scope**: which milestone, portal(s), or module/feature to cover.
6. **Wait for the user to confirm** sources and scope before proceeding.

---

## Step 2: Identify Features & Modules

1. **Build a module inventory** from the confirmed sources:
   | Portal | Module | Features | Risk Level | Source |
   |--------|--------|----------|------------|--------|
2. **For each module, identify**:
   - Core functionality (what it does)
   - User roles that interact with it
   - Dependencies on other modules (integration candidates)
   - Known risk areas (from repo analysis or user input)
3. **Load the user story list** — stories are the outer loop. Every scenario must cite its source User Story ID (e.g., US-001) and acceptance criterion ID where available (e.g., AC-001.2).
4. **Present the inventory** and confirm module coverage with the user.

---

## Step 3: Apply Risk-Based Prioritization

Assign a risk level to every module and scenario:

| Priority | Criteria | Test Depth |
|----------|----------|------------|
| Critical | Data loss, security breach, auth bypass, payments | Must test first, multiple variations |
| High | Core functionality, user data operations, CRUD lifecycle | Full coverage with edge cases |
| Medium | Secondary features, reporting, settings | Standard positive + negative |
| Low | UI polish, cosmetic, rarely used features | Basic positive only |

Not all scenarios deserve equal depth — high-risk areas get more scenarios; never spend effort on low-risk areas while high-risk areas lack coverage.

---

## Step 4: Write High-Level Scenarios

For EACH user story in scope:

### 4.1 Scenario Categories (cover ALL that apply)
- **Positive** — happy path, valid inputs, standard workflows (at least 1 per story)
- **Negative** — invalid inputs rejected, missing fields, duplicates (if story accepts input)
- **Edge Case** — empty states, max capacity, concurrency, special characters (if limits exist)
- **Security** — injection, unauthorized access, session handling (if authenticated)
- **Permission** — RBAC matrix, horizontal/vertical escalation (if roles involved)
- **Integration** — cross-module data flow (if story touches other modules)

### 4.2 Scenario Rules
- **ID format**: `SC-[MODULE]-[NNN]` (e.g., `SC-AUTH-001`) — follow conventions in `project-context.md`
- **Technique tag**: every scenario derived from a named technique (EP, BVA, DT, ST, UC, PW, EG, EX, CE, SY)
- **Traceability**: every scenario cites its User Story ID; cross-story integration scenarios list ALL parent stories
- **Titles are specific**: "User logs in with valid credentials and lands on dashboard" — never "Test login"
- If a category is skipped for a story, document why

### 4.3 Traceability Matrix
| Scenario ID | Scenario | Category | Technique | Risk | User Story | Module | Portal |
|-------------|----------|----------|-----------|------|------------|--------|--------|

Validate: every row has a non-empty User Story column; every story in scope has at least one scenario.

---

## Step 5: Save Outputs

1. **Save the Markdown document**: `outputs/test-scenario-agent/milestone-{N}/test-scenarios-milestone-{N}.md`
   (or `test-scenarios-[feature-name].md` for feature-scoped runs)
2. **Save per-portal CSVs**: `outputs/test-scenario-agent/milestone-{N}/test-scenarios-[portal].csv`
   - Columns: Scenario ID, User Story, Module, Scenario, Category, Technique, Risk
   - Module grouping via section header rows; quote fields that contain commas
3. **Verify** all files were created.

---

## Step 6: Present & Review

1. **Show summary metrics** to the user:
   - Total scenarios, and counts by risk level, category, and technique
   - User stories covered vs. total (flag any story with zero scenarios as a BLOCKER)
   - Modules and portals covered
2. **Send a Google Chat notification** if waiting for user approval and a webhook is configured (`automation/config/qa-retest-config.json` or `.env` `GOOGLE_CHAT_WEBHOOK_URL`). Skip silently if not configured.
3. **Ask the user for next steps**:
   - Review and provide feedback?
   - Hand off to Scriptor (Test Case Generator) via `generate-test-cases`?

---

## Step 7: Iterate

If the user provides feedback:
1. Incorporate all feedback into the scenario document.
2. Re-run the traceability validation (no orphan scenarios, no uncovered stories).
3. Regenerate both .md and .csv files.
4. Present a change summary showing what was updated.
