# Generate SRS — Instructions

## Agent: Specifier (SRS Agent)

Follow these steps in order to produce a complete IEEE 830 Software Requirements Specification.

**IMPORTANT**: Specifier reads ONLY from `project-docs/`. Do NOT read source code, test files, or any files outside `project-docs/`.

---

## Step 1: Collect Documents

1. **Ask the user** if they have specific documents to analyze, or if you should scan `project-docs/`.
2. **Scan ONLY `project-docs/`** and its subdirectories:
   - `project-docs/transcripts/` — Meeting transcripts, call recordings
   - `project-docs/Existing-MoM/` — Minutes of Meeting documents
   - `project-docs/ba-workflows/` — Business analyst workflow documents
   - `project-docs/client-documents/` — Client-provided specifications, contracts
   - `project-docs/screenshots/` — UI screenshots and mockups
   - `project-docs/recordings/` — Video or audio recordings (note titles only)
3. **Present found documents** in a table:
   | # | File | Location | Type | Size |
   |---|------|----------|------|------|
4. **Wait for the user to confirm** that all relevant documents have been provided.
   - User may add more documents or exclude specific ones.
   - Do NOT proceed until the user explicitly confirms.

---

## Step 2: Analyze Documents

1. **Read and categorize each document**:
   - Meeting transcript, requirement document, workflow diagram, UI mockup, contract, etc.
2. **Extract the following from each document**:
   - Business objectives and goals
   - Stakeholders and user roles
   - Features and functional requirements
   - Constraints and limitations
   - External system integrations
   - Data entities and relationships
   - UI/UX requirements and flows
   - Non-functional requirements (performance, security, scalability, availability)
   - Assumptions and dependencies
3. **Cross-reference across documents** for:
   - Consistency — Do documents agree on the same feature behavior?
   - Conflicts — Do any documents contradict each other?
   - Gaps — Are there features mentioned but not fully specified?
4. **Present an analysis summary table**:
   | Category | Count | Sources | Conflicts | Gaps |
   |----------|-------|---------|-----------|------|
   | Functional Requirements | N | doc1, doc2 | None | 2 gaps |
   | ... | ... | ... | ... | ... |

---

## Step 3: Generate SRS

Produce a full IEEE 830 document with the following structure:

### 3.1 Introduction
- **Purpose** — Why this SRS exists, intended audience
- **Scope** — Product name, what it does and does not cover
- **Definitions, Acronyms, Abbreviations** — Glossary of terms
- **References** — List all source documents analyzed
- **Overview** — How the SRS is organized

### 3.2 Overall Description
- **Product Perspective** — System context, how it fits into the larger ecosystem
- **Product Functions** — High-level summary of major functions
- **User Classes and Characteristics** — Roles, permissions, personas
- **Operating Environment** — Platforms, browsers, infrastructure
- **Design and Implementation Constraints** — Technology stack, regulatory, budget
- **Assumptions and Dependencies**

### 3.3 Functional Requirements
For each requirement:
- **ID**: `FR-MODULE-NNN` (e.g., `FR-AUTH-001`)
- **Title**: Clear, concise name
- **Description**: Detailed behavior
- **Input/Output**: What goes in, what comes out
- **Business Rules**: Conditions and validations
- **Priority**: MoSCoW (Must/Should/Could/Won't)
- **Source**: Which document(s) this came from

Group requirements by module (e.g., Authentication, Dashboard, Reports).

### 3.4 Non-Functional Requirements
For each requirement:
- **ID**: `NFR-CATEGORY-NNN` (e.g., `NFR-PERF-001`, `NFR-SEC-002`)
- **Category**: Performance, Security, Scalability, Usability, Reliability, Compliance
- **Description**: Measurable criteria
- **Acceptance Criteria**: How to verify
- **Source**: Which document(s)

### 3.5 Data Requirements
- Data model (entities and relationships)
- Data dictionary (field definitions, types, constraints)
- Data migration requirements (if applicable)
- Data retention and archival policies

### 3.6 External Interfaces
- **User Interfaces** — Screen descriptions, navigation flows
- **API Interfaces** — Endpoints, request/response formats, authentication
- **Hardware Interfaces** — Device requirements (if applicable)
- **Software Interfaces** — Third-party integrations, external systems

### 3.7 Use Cases
For each use case:
- **ID**: `UC-NNN` (e.g., `UC-001`)
- **Title**: Descriptive name
- **Actor(s)**: Who initiates
- **Preconditions**: What must be true before
- **Main Flow**: Step-by-step happy path
- **Alternative Flows**: Variations
- **Exception Flows**: Error handling
- **Postconditions**: What is true after
- **Related Requirements**: Links to FR-IDs

### 3.8 Traceability Matrix
Create a matrix linking:
- Requirements (FR/NFR IDs) to source documents
- Requirements to use cases
- Requirements to modules

### 3.9 Open Items
- Unresolved questions
- Identified gaps requiring clarification
- Assumptions that need validation

### 3.10 Appendix
- Raw data tables
- Additional diagrams
- Document version history

---

## Step 4: Generate DOCX

1. **Save the SRS as Markdown**: `outputs/srs-agent/SRS-{project}-{date}.md`
2. **Run the conversion script**:
   ```
   python3 scripts/md-to-docx.py outputs/srs-agent/SRS-{project}-{date}.md
   ```
3. **Verify** the DOCX file was created: `outputs/srs-agent/SRS-{project}-{date}.docx`
4. If the conversion script is not available, inform the user and provide the Markdown version only.

---

## Step 5: Present & Review

1. **Show summary metrics** to the user:
   - Total functional requirements count
   - Total non-functional requirements count
   - Total use cases count
   - Modules covered
   - Open items / gaps count
   - Source documents analyzed count
2. **Ask the user for next steps**:
   - Review and provide feedback?
   - Hand off to another agent (Planner, Scriptor)?
   - Export in a different format?

---

## Step 6: Iterate

If the user provides feedback:
1. Incorporate all feedback into the SRS.
2. Update the version number in the document header.
3. Regenerate both .md and .docx files.
4. Present a change summary showing what was updated.
