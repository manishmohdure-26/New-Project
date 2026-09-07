# Generate User Stories — Instructions

## Agent: Narrator (User Stories Agent)

Follow these steps in order to extract, write, and organize user stories from project documents.

**IMPORTANT**: Narrator reads from `project-docs/` for source material. Do NOT fabricate requirements that are not grounded in the source documents.

---

## Step 1: Ask for Context

1. **Scan `project-docs/`** and its subdirectories to discover available documents:
   - `project-docs/transcripts/`
   - `project-docs/Existing-MoM/`
   - `project-docs/ba-workflows/`
   - `project-docs/client-documents/`
   - `project-docs/screenshots/`
   - `project-docs/recordings/`
2. **List available documents** in a table:
   | # | File | Location | Type |
   |---|------|----------|------|
3. **Ask the user to select** which documents to include in the analysis.
4. **Determine scope**:
   - **Full** — Generate stories for all features found across all documents.
   - **Feature-specific** — Focus on a single feature or module (use `feature_focus` input).
   - **Incremental** — Generate stories only for new or changed features since the last run.
5. **Ask for project context** if not already available from `project-context.md`:
   - Application type and domain
   - Target users
   - Key business goals

---

## Step 2: Analyze Documents

1. **Read all selected documents** thoroughly.
2. **Identify and extract**:
   - **Features** — Distinct capabilities or functionalities described
   - **User Roles** — All actors and personas mentioned (admin, end user, manager, guest, etc.)
   - **Business Rules** — Conditions, validations, policies that govern behavior
   - **Workflows** — Multi-step processes and user journeys
   - **Compliance Requirements** — Regulatory or policy requirements
   - **UI/UX Requirements** — Screen layouts, navigation, accessibility needs
   - **Integrations** — External systems, APIs, third-party services
   - **Edge Cases** — Boundary conditions, error scenarios, unusual inputs

---

## Step 3: Define Epics

1. **Group related features into epics** using the format: `EPIC-[MODULE]`
   - Example: `EPIC-AUTH`, `EPIC-DASHBOARD`, `EPIC-PAYMENTS`, `EPIC-REPORTS`
2. For each epic, document:
   - **Epic ID**: `EPIC-[MODULE]`
   - **Epic Name**: Descriptive title
   - **Description**: What this epic covers
   - **Source Documents**: Which documents contributed to this epic
3. Present the epic list to the user for confirmation before proceeding to stories.

---

## Step 4: Write User Stories

For each feature within each epic, create a user story with:

### 4.1 Story Header
- **Story ID**: `[EPIC-ID]-US-[NUMBER]` (e.g., `EPIC-AUTH-US-001`)
- **Epic**: Parent epic reference
- **Title**: Short, descriptive title

### 4.2 Story Statement
Use the standard format:
```
As a [role],
I want [feature/capability],
So that [business benefit/value].
```

### 4.3 Acceptance Criteria
Write each criterion in Given/When/Then format:
```
Given [precondition],
When [action],
Then [expected result].
```
Include:
- Happy path scenarios
- Edge cases and boundary conditions
- Error handling scenarios
- Validation rules

### 4.4 Story Metadata
- **Priority**: MoSCoW classification
  - **Must Have** — Essential for MVP/release
  - **Should Have** — Important but not critical
  - **Could Have** — Desirable if time permits
  - **Won't Have** — Out of scope for this release
- **Story Points**: TBD (to be estimated by the development team)
- **Source**: Reference to the specific document(s) and section(s) where this requirement was found
- **Notes**: Additional context, assumptions, or dependencies

---

## Step 5: Identify Gaps

After writing all stories, compile a gaps analysis:

1. **Ambiguous Requirements** — Requirements that are open to interpretation; need clarification from stakeholders.
2. **Assumptions Made** — Assumptions the agent made while writing stories; need validation.
3. **Missing Stories** — Areas where documents hint at functionality but provide insufficient detail to write a complete story.
4. **Conflicts** — Contradictions between different source documents.

Present gaps in a structured table:
| # | Type | Description | Source | Action Needed |
|---|------|-------------|--------|---------------|

---

## Step 6: Organize & Output

### 6.1 Epic Summary Table
| Epic ID | Epic Name | Story Count | Must | Should | Could | Won't |
|---------|-----------|-------------|------|--------|-------|-------|

### 6.2 Stories Grouped by Epic
Organize all stories under their parent epic, in priority order within each epic.

### 6.3 Dependency Map
Identify and document:
- Stories that depend on other stories
- Stories that depend on external systems or teams
- Stories that must be completed before others can start

Present as a dependency table:
| Story ID | Depends On | Type | Notes |
|----------|-----------|------|-------|

### 6.4 Gaps & Assumptions
Include the full gaps analysis from Step 5.

### 6.5 Coverage Matrix
Link each story back to its source document(s):
| Story ID | Story Title | Source Documents |
|----------|-------------|-----------------|

### 6.6 Save Output
- Markdown: `outputs/user-stories-agent/user-stories-{feature-or-date}.md`
- Excel: `outputs/user-stories-agent/user-stories-{feature-or-date}.xlsx` (if conversion available)
