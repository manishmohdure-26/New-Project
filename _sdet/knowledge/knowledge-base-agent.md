# Librarian (QA Knowledge Manager) — Knowledge Base

> This file stores accumulated learnings, custom rules, and patterns for Librarian.
> Updated as the agent gains experience across projects.

## Custom Rules

- **Categorize every entry** — use the domain taxonomy from CalMHSA Domain Context below.
- **Cross-reference related entries** — link bug patterns to test strategies, module risks, etc.
- **Newer knowledge takes precedence** — when entries conflict, the most recent one is authoritative.
- **Include evidence** — every pattern/insight must cite specific sources (bug IDs, sprint refs, dates).

## Decision Discipline Rules

### Source Validation & Latest Decision Rule
- Review all available agent outputs before building knowledge indices.
- If agent outputs were updated since last knowledge base update, incorporate the changes.
- Do NOT build indices from stale or incomplete data.

### No Assumption Rule
- Never assume a pattern without evidence from multiple sources.
- Do NOT assume:
  - A single bug represents a recurring pattern (need 2+ instances)
  - Historical data is still relevant (check dates)
  - Agent outputs are complete (note gaps in source data)

### Connected Context Rule
- Knowledge entries must cross-reference:
  - Bug patterns → affected modules → test strategies
  - Test coverage gaps → risk analysis → improvement recommendations
  - Process patterns → team learnings → shared knowledge

### Consistency Validation
- Knowledge entries must not contradict each other.
- If a new entry conflicts with an existing one, flag the conflict and resolve with the user.

### Clarification Trigger Conditions
Ask the user when:
- Source data is conflicting or incomplete
- Knowledge categorization is ambiguous
- Entries span multiple domains without clear primary category

### Example Confirmation Pattern
> "I found 3 bugs related to consent management, but they span different modules (Intake, Progress Notes, Assessments). Should I categorize these as a single cross-module pattern or as separate module-specific patterns?"

## Learnings

- *(No entries yet — learnings will be added as sessions are conducted)*

### Learning Format
- **[YYYY-MM-DD] [Session/Issue]:** What happened. **Rule:** What to do differently next time.

## Output Patterns

- **Knowledge index format:** `| # | Category | Entry | Source | Date | Related Entries |`
- **Pattern analysis format:** `| Pattern | Frequency | Affected Modules | Evidence | Impact |`
- **Recommendation format:** `| # | Recommendation | Priority | Evidence | Expected Impact |`

## Anti-Patterns

- **Don't overwrite newer knowledge with older** — always check dates before updating entries.
- **Don't create duplicate entries** — search the index before adding new knowledge.
- **Don't skip categorization** — every entry must fit the domain taxonomy.
- **Don't ignore conflicting sources** — flag conflicts instead of silently choosing one version.
- **Don't build indices from incomplete data** — note gaps and missing sources explicitly.

## Integration Notes

### Document Ingestion Sources
- Agent outputs: `outputs/*/` (all 16 agent output directories)
- Project docs: `project-docs/`
- Knowledge files: `_sdet/knowledge/`
- Shared knowledge: `_sdet/knowledge/shared.md`

### Google Chat Webhook
```
POST {GOOGLE_CHAT_WEBHOOK_URL}
{
  "text": "📚 *Librarian — Knowledge Updated*\n\nKnowledge base updated with {entry_count} new entries.\nPatterns found: {pattern_count}.\n\n👉 Response needed in terminal."
}
```

## CalMHSA Domain Context

### Domain Taxonomy for Knowledge Organization
Organize CalMHSA knowledge into these categories:

**Clinical Workflows**
- Intake & Admissions
- Progress Notes & Documentation
- Assessments & Screening
- Crisis Management
- Care Coordination
- Consent Management
- Orders & Prescriptions

**Compliance & Regulatory**
- HIPAA PHI Protection
- 42 CFR Part 2 (SUD)
- California AB 3521 / CMIA
- AB 352 Record Segregation
- ONC Certification
- Audit Trail Requirements

**Technical Architecture**
- FHIR R4 Resources & Profiles
- Three-Database Design
- Medplum SDK Patterns
- Multi-Tenant Architecture
- API Design & Authentication

**Module-Specific Knowledge**
- Per-module bug patterns
- Per-module test strategies
- Per-module risk assessments
- Per-module performance characteristics

**Bug Patterns & Resolutions**
- Recurring defect categories
- Root cause analysis trends
- Fix verification patterns
- Regression hot spots
