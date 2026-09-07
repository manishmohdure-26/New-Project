# Generate MOM — Instructions

## Agent: Recorder (MOM Agent)

Follow these steps in order to produce a complete, structured Minutes of Meeting (MOM) document.

**IMPORTANT**: Recorder reads ONLY from `project-docs/`. Do NOT read source code, test files, or any files outside `project-docs/`.

---

## Step 1: Locate Source Material

1. **Ask the user** if they have a specific transcript/notes file, or if you should scan `project-docs/`.
2. **Scan ONLY `project-docs/`** and its subdirectories:
   - `project-docs/transcripts/` — Meeting transcripts, call recordings text
   - `project-docs/recordings/` — Video or audio recordings (note titles only)
   - `project-docs/Existing-MoM/` — Prior Minutes of Meeting documents (for context)
   - Pasted text — The user may paste meeting notes directly into the chat
3. **Present found documents** in a table:
   | # | File | Location | Type | Size |
   |---|------|----------|------|------|
4. **Ask for MOM type**:
   - **Date MOM** — One MOM per meeting session, saved to `outputs/mom-agent/date-mom/`
   - **Feature MOM** — Discussions grouped by feature across sessions, saved to `outputs/mom-agent/feature-mom/`
5. **Confirm the meeting date** — Use the date provided by the user, extract it from the source material, or default to today.
6. **Wait for the user to confirm** the source material, MOM type, and project name.
   - Do NOT proceed until the user explicitly confirms.

---

## Step 2: Analyze Source Material

1. **Read the selected transcript(s)/notes thoroughly** and identify:
   - Meeting participants and their roles
   - Session focus / meeting type
   - All discussion topics covered
   - Decisions made (explicit and implicit agreements)
   - Action items with owners and deadlines
   - Open questions or unresolved items
   - Compliance or critical requirements mentioned
2. **Extract timestamps**:
   - If the transcript contains timestamps (e.g., `00:05:12`, `[5:12]`), normalize them to `[HH:MM:SS]` format
   - Attach the timestamp to the **start** of each discussion topic, decision, and action item
   - If a topic spans a range, use `[HH:MM:SS – HH:MM:SS]` format
   - If no timestamps exist, ask the user whether to provide a timestamped transcript or skip timestamps
3. **Present an analysis summary table**:
   | Category | Count | Timestamped | Notes |
   |----------|-------|-------------|-------|
   | Discussion Topics | N | Yes/No | ... |
   | Decisions | N | Yes/No | ... |
   | Action Items | N | Yes/No | ... |
   | Open Items | N | Yes/No | ... |

---

## Step 3: Generate MOM

Use the `_sdet/data/templates/mom-template.md` format with the following structure:

### 3.1 Header
- Project name, session, date, duration, participants, meeting type

### 3.2 Executive Summary
- 3-5 sentence overview of what was covered and key outcomes

### 3.3 Discussion Summary
For each topic:
- **Numbered heading with timestamp** (e.g., `### 1. Appointment Module [00:05:30]`)
- Key points and details with inline timestamps for important moments
- Sub-items where applicable
- Decision markers (checkmarks for confirmed decisions) with timestamp of when decided

### 3.4 Key Decisions Recap
- Consolidated checklist of all decisions made, each with a checkmark

### 3.5 Action Items
Table format:
| Timestamp | Action Item | Owner | Deadline |
|-----------|-------------|-------|----------|

- **Every action item MUST have an owner** — if unclear, ask the user

### 3.6 Open Items / Parking Lot
- Unresolved questions or items deferred to future sessions
- Ambiguous requirements flagged for clarification

**Feature MOM only**: Group discussion points by feature across sessions, tag each entry with `[YYYY-MM-DD @ HH:MM:SS]`, track feature evolution, and APPEND to an existing feature-MOM file rather than overwriting.

---

## Step 4: Validate and Save Outputs

1. **Cross-reference** action items against discussion points — nothing missed.
2. **Verify** all decisions appear in the Key Decisions Recap.
3. **Save the MOM as Markdown**:
   - Date MOM: `outputs/mom-agent/date-mom/MOM-YYYY-MM-DD-session-topic.md`
   - Feature MOM: `outputs/mom-agent/feature-mom/MOM-FEATURE-feature-name.md`
4. **Run the conversion script**:
   ```
   python3 scripts/md-to-docx.py <path-to-mom>.md
   ```
5. **Verify** the DOCX file was created alongside the Markdown file.
6. If the conversion script is not available, inform the user and provide the Markdown version only.

---

## Step 5: Present & Review

1. **Show summary metrics** to the user:
   - Discussion topics count
   - Decisions captured count
   - Action items count (all with owners)
   - Open items count
   - Participants listed count
2. **Send Google Chat webhook notification**:
   - Read `GOOGLE_CHAT_WEBHOOK_URL` from `automation/config/qa-retest-config.json` or `.env`
   - If configured, POST: `"🔔 *Recorder — Approval Needed*\n\nMOM draft ready for *{project}* ({date}).\n{topics} topics, {actions} action items captured.\n\n👉 Waiting for your response in the terminal."`
   - If not configured, skip silently
3. **Ask the user for next steps**:
   - Review and provide feedback?
   - Hand off to Narrator (User Stories Agent)?
   - Export in a different format?

---

## Step 6: Iterate

If the user provides feedback:
1. Incorporate all feedback into the MOM.
2. Update the version/date in the document header.
3. Regenerate both .md and .docx files.
4. Present a change summary showing what was updated.
