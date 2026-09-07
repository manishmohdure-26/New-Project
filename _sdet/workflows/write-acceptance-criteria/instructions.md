# Write Acceptance Criteria — Instructions

## Agent: Definer (Acceptance Criteria Agent)

Follow these steps in order to research the curated wiki, write acceptance criteria, and create user stories in Jira.

**IMPORTANT**: Definer reads ONLY from `project-docs/SharedByClient/curated-wiki/` for research. Do NOT read MOMs, meeting transcripts, SRS outputs, client-documents, or any other project document for AC content. Do NOT fabricate criteria that are not grounded in the curated wiki (or user-provided Figma/screenshots).

---

## Step 1: Collect Inputs

1. **Ask the user for the epic key** (e.g., PROJ-123).
   - Read the project key from `project-context.md` (## Jira / Project Management) to validate format.
2. **Ask for user story details** for each story to create:
   - **Title** — Short descriptive name for the story
   - **User Role** — Who is this story for? (e.g., admin, provider, patient)
   - **Goal** — What does the user want to accomplish?
   - **Benefit** — Why does this matter to the business?
3. **Ask for screenshots/screens** (optional):
   - File paths to screenshots in `project-docs/screenshots/` or elsewhere
   - Screen names or wireframe references
   - Note these for inline referencing in AC
4. **Determine scope**:
   - How many stories to create under this epic?
   - Should they be processed one-by-one (with review after each) or all at once?

---

## Step 2: Research & Context Gathering (Curated Wiki ONLY)

Before writing any acceptance criteria, research the curated wiki — the ONLY document source:

### 2.1 Load Project Context
- Read `project-context.md` for portal names, user roles, conventions, and project settings
- Identify which portal(s) the epic relates to
- (Configuration only — AC content must come from the curated wiki)

### 2.2 Search the Curated Wiki
Use Glob to list files and Grep to search for keywords related to the epic/feature across
`project-docs/SharedByClient/curated-wiki/`:
- Screen requirements pages for the relevant portal/feature
- Clinical workflow documents
- UI standards and design guidelines
- FHIR specs and reference docs
- Terminology and definitions reference

**Do NOT search or read** `project-docs/transcripts/`, `project-docs/Existing-MoM/`,
`project-docs/client-documents/`, `outputs/mom-agent/`, `outputs/srs-agent/`,
`outputs/user-stories-agent/`, or any other document source.

### 2.3 Read Matching Wiki Pages Fully
- Extract field names, validations, workflows, business rules, and screen behavior
- Note the exact wiki file each finding comes from (for citations)

### 2.4 Present Research Summary
Present a table of findings to the user before proceeding to drafting:

| Wiki Page | Key Findings |
|-----------|--------------|
| {file name} | {summary of relevant content} |
| {file name} | {summary of relevant content} |

**Coverage gaps:** List anything the story needs that the curated wiki does not cover —
ask the user for direction rather than pulling from another source.

---

## Step 3: Draft User Story

For each story, write in the standard format:

```
**User Story: [Title]**

As a [role],
I want [goal/capability],
So that [business benefit/value].
```

Rules:
- The role must be a real persona from the project (from project-context.md or documents)
- The goal must be specific and actionable — not vague
- The benefit must articulate real business value
- If the user provided story details, use them as the basis — enrich with research context

---

## Step 4: Draft Acceptance Criteria

Write AC in **bullet point format only**. Never use Given/When/Then. Never use tables.

### 4.1 Acceptance Criteria Section
Write clear, testable bullets:
- Start each bullet with "User can...", "System validates...", "System displays...", "[Element] shows...", or similar action-oriented phrasing
- Cover the happy path (primary success scenario)
- Cover key edge cases (empty input, invalid data, permission denied)
- Cover validation rules (field formats, required fields, length limits)
- Cover error handling (error messages, fallback behavior)
- Reference specific UI elements by name when known from the curated wiki or user-provided screenshots
- Every criterion must trace to a curated wiki page (or a user-provided Figma/screenshot) —
  never to MOMs, transcripts, SRS, or any other document

### 4.2 Wiki Source References Section (local output only)
For every relevant finding from the research phase:
- Use format: `- [curated-wiki/{file-name}] — [What this page specifies]`
- Flag any contradictions between wiki pages

### 4.3 Screen References Section (if screenshots provided)
- Use format: `- [screen-name.png]: [Description of what this screen shows and its relevance]`
- Reference screens inline in the AC bullets where they illustrate a specific criterion

---

## Step 5: Present for User Confirmation

1. **Present the complete draft** — all stories with their AC, formatted as above.
2. **Show summary metrics**:
   - Number of stories drafted
   - Number of AC bullets per story
   - Number of curated wiki source references
   - Number of screen references
3. **Send Google Chat webhook notification**:
   - Read `GOOGLE_CHAT_WEBHOOK_URL` from `automation/config/qa-retest-config.json` or `.env`
   - If configured, POST: `"🔔 *Definer — Approval Needed*\n\nAC draft ready for epic *{EPIC_KEY}*.\n{count} story/stories prepared.\n\n👉 Waiting for your response in the terminal."`
   - If not configured, skip silently
4. **Wait for user response**:
   - Approve — proceed to Jira creation
   - Edit — revise based on feedback and re-present
   - Add more — collect additional stories and repeat Steps 3-5

---

## Step 6: Create Stories & Write AC to Jira

After user approval:

1. **Read project key** from `project-context.md` (## Jira / Project Management)
2. **For each story, create a Jira issue** using Jira MCP:
   - Issue Type: Story
   - Summary: Story title
   - Description: The acceptance criteria content (wiki source references stay local-only)
   - Epic Link: The specified epic key
   - Labels: Portal name if applicable
3. **If Jira MCP is unavailable**, fall back to curl:
   - Read JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN from `.env`
   - POST to `{JIRA_URL}/rest/api/2/issue` with the story fields
4. **Report the result** to the user with Jira ticket keys
5. **If neither method works**, save locally and inform the user

---

## Step 7: Save Local Output

Save the complete document to `outputs/acceptance-criteria-agent/AC-{epic-key}-{date}.md`:
- Include all stories, AC, curated wiki source references, and screen references
- Include the Jira ticket keys for each story created
- Include a summary table with metrics

---

## Iteration

If the user wants to add more stories to the same epic later:
1. Read the existing AC file from `outputs/acceptance-criteria-agent/`
2. Add new stories to the document
3. Increment the story count in the summary
4. Repeat Steps 3-7 for the new stories only
