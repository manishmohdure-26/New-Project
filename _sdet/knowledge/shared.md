# Shared Agent Knowledge

> This file is loaded by ALL agents. Rules here apply across the entire QA team.
> Edit this file anytime to train all agents simultaneously.

## Project-Specific Rules

### CalMHSA Project Overview
CalMHSA EHR is a next-generation behavioral health platform for California's 58 counties, serving 20,000-23,000 providers. It uses FHIR R4 for clinical data, a 3-database architecture (FHIR CDR + Operational DB + Data Warehouse), and Medplum as the FHIR server. The system must comply with HIPAA, 42 CFR Part 2 (SUD), California AB 3521/CMIA, and ONC certification requirements.

### CalMHSA Terminology Glossary
| Term | Meaning |
|------|---------|
| SUD | Substance Use Disorder — data protected under 42 CFR Part 2 |
| PHI | Protected Health Information — 18 identifier types under HIPAA |
| FHIR | Fast Healthcare Interoperability Resources — R4 standard |
| CDR | Clinical Data Repository — DB1 (Medplum-managed FHIR storage) |
| CalAIM | California Advancing & Innovating Medi-Cal reform |
| DHCS | Department of Health Care Services |
| DHCS 8765-A/C | Adult/Youth screening forms for SMHS/SUD eligibility |
| SMHS | Specialty Mental Health Services |
| DMC-ODS | Drug Medi-Cal Organized Delivery System |
| ONC | Office of the National Coordinator for Health IT |
| US Core | FHIR US Core Implementation Guide (required for ONC certification) |
| DS4P | Data Segmentation for Privacy — security labels for SUD/AB 352 records |
| MRN | Medical Record Number |
| NPI | National Provider Identifier |
| HIE | Health Information Exchange (CalMHSA Connex) |
| Sequestration | Hiding sensitive records from standard queries (SUD, AB 352) |

### CalMHSA Portals
| Portal | Primary Users | Key Features |
|--------|--------------|--------------|
| Super Admin Portal | System admins, county admins | Provider management, county config, analytics, privacy settings |
| Provider Portal | Clinicians, supervisors, receptionists | Dashboard, scheduling, client management, notes, assessments, billing |
| Client Portal | Patients | Appointments, messages, documents, medications, telehealth |

### CalMHSA Modules with FHIR Resources
| Module | FHIR Resources | Compliance Notes |
|--------|---------------|-----------------|
| Client Registration & Profile | Patient, RelatedPerson | US Core Patient profile required |
| Progress Notes & Visit Notes | Encounter, DocumentReference | Multi-contributor support |
| Mental Health Assessment | Observation, QuestionnaireResponse | LOINC codes for standard instruments |
| Intake & Consent Management | Consent, ServiceRequest | 42 CFR Part 2 consent for SUD |
| Calendar & Scheduling | Appointment, Slot, Schedule | No double-booking validation |
| Orders (Meds, Labs, Imaging) | MedicationRequest, DiagnosticReport | RxNorm codes, e-prescribing |
| Care Coordination | CarePlan, CareTeam, Goal | Multi-provider team management |
| Service Request & Screening | ServiceRequest, QuestionnaireResponse | DHCS 8765-A/C form validation |
| Diagnoses | Condition | ICD-10-CM codes; SUD = 42 CFR Part 2 |
| Client Record Sequestration | SecurityLabel (meta.security) | DS4P labels, consent-gated access |
| Billing | Claim, Coverage | SMHS, DMC-ODS, DMC State Plan |
| Reports & Dashboards | (DB3 views) | No PHI in aggregated reports |

### Compliance Quick Reference
| Regulation | Abbreviation | Key Test Requirement |
|-----------|-------------|---------------------|
| HIPAA | PHI protection | 18 identifiers never in logs/URLs/errors |
| 42 CFR Part 2 | SUD privacy | Explicit consent before SUD data disclosure |
| California AB 3521 / CMIA | CA privacy | 15-day breach notification; mental health restrictions |
| AB 352 | Record segregation | Gender-affirming, abortion, contraception records isolated |
| ONC (b)(10) | Health info export | Patient can export full record |
| ONC (g)(10) | Standardized API | FHIR R4 US Core-compliant API |
| SMART on FHIR v2.0+ | App authorization | OAuth 2.0 scopes for FHIR access |
| HITRUST / SOC 2 | Security controls | Required for government procurement |

## Universal Rules (ALL agents MUST follow)

### Code & Framework Standards
- **Language:** JavaScript (ES6+), CommonJS (`require`/`module.exports`) — NEVER use `import`/`export`
- **Framework:** Playwright with Page Object Model (POM)
- **Locator priority:** `data-testid` > `getByRole` > `getByText` > CSS selector (last resort)
- **NEVER** hardcode credentials — always use `process.env` via `.env`
- **NEVER** use `page.waitForTimeout()` — use Playwright auto-waiting, `waitForLoadState`, or `waitForResponse`
- **NEVER** commit `.env` files — credentials must stay out of version control

### Naming Conventions
| Entity | Format | Example |
|--------|--------|---------|
| Test Case IDs | TC-MODULE-NNN | TC-AUTH-001 |
| Bug IDs | BUG-MODULE-NNN | BUG-CART-003 |
| Requirement IDs (functional) | FR-MODULE-NNN | FR-AUTH-001 |
| Requirement IDs (non-functional) | NFR-CATEGORY-NNN | NFR-PERF-001 |
| User Story IDs | EPIC-ID-US-NNN | EPIC-AUTH-US-001 |
| Use Case IDs | UC-NNN | UC-001 |
| Test spec files | feature-name.spec.js | login.spec.js |
| Page object files | PageName.js | LoginPage.js |

### Protected Files (DO NOT MODIFY)
- `automation/playwright.config.js` — browser projects pre-configured
- `automation/package.json` — dependencies pre-configured
- `automation/explorer/` — site crawler is pre-built (entire directory)
- `automation/config/qa-retest-config.json` — Gatekeeper config
- `.env` files — never commit

### Output Locations
| Agent | Output Directory |
|-------|-----------------|
| MOM Agent | `outputs/mom-agent/` |
| User Stories Agent | `outputs/user-stories-agent/` |
| SRS Agent | `outputs/srs-agent/` |
| Knowledge Search Agent | `outputs/knowledge-search-agent/` |
| Acceptance Criteria Agent | `outputs/acceptance-criteria-agent/` |
| Repo Analysis Agent | `outputs/repo-analysis-agent/` |
| Test Scenario Agent | `outputs/test-scenario-agent/` |
| Test Case Generator | `outputs/test-case-agent/` |
| Automation Agent | `outputs/automation-agent/` |
| API Test Agent | `outputs/api-test-agent/` |
| Bug Reporter | `outputs/bug-report-agent/` |
| Retest Agent | `outputs/retest-agent/` |
| Jira Bug Tracker | `outputs/jira-bug-tracker-agent/` |

### Google Chat Approval Notifications (ALL agents)
When an agent is **waiting for user approval or confirmation** and the user may not be at the terminal,
send a Google Chat webhook notification to alert them.

**When to send:**
- Config or settings confirmation needed
- Presenting a list of items for user to review and approve
- Draft output ready for user review (e.g., bug report, SRS, test cases)
- Asking user to choose between options (e.g., portal names, milestone)
- Any point where the agent is blocked until the user responds

**How to send:**
1. Read `GOOGLE_CHAT_WEBHOOK_URL` from `automation/config/qa-retest-config.json` or `.env`
2. If webhook URL is configured, send a notification:
   ```
   POST {GOOGLE_CHAT_WEBHOOK_URL}
   {
     "text": "🔔 *{Agent Name} — Approval Needed*\n\n{Brief description of what needs approval}\n\n👉 Waiting for your response in the terminal."
   }
   ```
3. If webhook URL is NOT configured, skip silently — do not block the workflow

**Examples:**
- Scriptor: "5 feature sheets ready for review. Please confirm to generate XLSX."
- Catcher: "Bug report BUG-AUTH-001 ready. Please confirm to log to Jira."
- Recorder: "MOM draft ready for your review."
- Gatekeeper: "12 tickets found in Ready for Testing. Please confirm to start retesting."

### Input Sources (consistent across agents)
When an agent needs input from a previous phase, follow this priority:
1. **Check files first** — look in the relevant `outputs/` directory
2. **Ask user** — to provide file path or paste content in chat
3. **Jira MCP** — if user provides a Jira ticket/epic number, fetch via Jira MCP tool

### Git Rules
- **NEVER push to `main`** — main is frozen
- **ALL work goes to `development` branch**
- **NEVER auto-push after commits** — only push when the user explicitly asks to push
- Use: `git push origin development` (only when user requests)

## Governance Protocol (v3.3 — ALL agents MUST follow)

Full config: `_sdet/config/governance.yaml`. Runtime data: `outputs/_system/`.

### On activation (before Step 1 of any workflow)

1. Create `outputs/_system/flags/` if needed. Write your agent id (e.g. `bug-report-agent`) to `outputs/_system/flags/.active-agent`. Reset `outputs/_system/flags/.tool-count-<your-id>` to `0`.
2. Read your memory file `outputs/_system/memory/<your-id>.md` and `outputs/_system/memory/shared.md` (skip silently if they don't exist yet).
3. If any lesson's **Rule** applies to the current task, follow it and log a `lesson_applied` event.
4. Append a `run_start` event to today's run log: `outputs/_system/logs/<YYYY-MM-DD>-<your-id>.jsonl`.

### Decision gate (before EACH major workflow step)

Evaluate and append ONE `decision` event covering:

- **memory** — does a recorded lesson apply here?
- **inputs** — do required inputs exist (see `decision_gate.requires` in governance.yaml)? If missing: STOP, recommend the prerequisite agent/command, never fabricate inputs.
- **route** — which workflow route/menu item applies, in one line.

Event shape: `{"ts":"<ISO8601>","agent":"<id>","event":"decision","detail":"memory: none apply; inputs: outputs/test-scenario-agent/ present; route: GT generate-tests"}`

### Memory (failures → lessons)

- When a failure is RESOLVED (broken locator fixed, wrong assumption corrected, user correction received), append a lesson to your memory file using the `lesson_format` in governance.yaml (L-<agent>-<NNN>, Failure/Fix/Rule/Occurrences/Promoted).
- If an equivalent lesson exists, increment its **Occurrences** instead of duplicating.
- Cross-agent lessons (environment quirks, project-wide conventions) go to `outputs/_system/memory/shared.md`.
- NEVER edit `_sdet/knowledge/*` from a run. When a lesson reaches Occurrences ≥ 3, suggest the user run `_sdet/tasks/promote-lessons.md`.

### Cost caps (per run)

Tool calls: warn at 150, HARD STOP at 250 (enforced by hook). Playwright script runs: max 5. Jira API calls: max 10. Retries per failing step: max 2. On any breach: halt, report consumed budget and remaining work, ask the user.

### Boundaries

- Write only inside your YAML's `writes_to` paths plus `outputs/_system/` (enforced by the agent-guard hook).
- Jira writes (POST/PUT/DELETE) are blocked unless `outputs/_system/flags/.jira-approved` exists. Create that flag ONLY after explicit user approval in the current turn. It expires after 60 minutes.

### On run end (always, even after failure)

1. Append a `run_end` event with a one-line outcome summary.
2. Delete `outputs/_system/flags/.active-agent` and, if present, `outputs/_system/flags/.jira-approved`.

## Learnings

<!-- Add cross-agent learnings from past sessions -->
<!-- Example: "The login API returns 403 (not 401) for expired tokens" -->

## Anti-Patterns

- **Hardcoding credentials in any file** — always use `process.env`
- **Using ES modules** — this is a CommonJS project
- **Ignoring previous agent outputs** — always check `outputs/` before asking user for inputs
- **Modifying protected files** — playwright.config.js, package.json, explorer/ are locked
- **Pushing to main branch** — all work goes to sdet-agents-dev
