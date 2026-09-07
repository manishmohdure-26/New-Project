# Generate SRS — Checklist

## Agent: Specifier (SRS Agent)

### Document Collection
- [ ] project-docs/ folder scanned for documents
- [ ] User confirmed which documents to include
- [ ] Input restricted to project-docs/ only

### Document Analysis
- [ ] All selected documents read and analyzed
- [ ] Document analysis summary presented
- [ ] Conflicts and gaps identified

### SRS Content — Structure
- [ ] SRS follows IEEE 830 standard structure
- [ ] Introduction section complete (purpose, scope, definitions, references)
- [ ] Overall Description complete (product perspective, user classes, constraints)

### SRS Content — Requirements
- [ ] Functional Requirements use FR-MODULE-NNN format
- [ ] Non-Functional Requirements use NFR-CATEGORY-NNN format
- [ ] Data model and data dictionary included
- [ ] External interfaces documented (UI, API, integrations)

### SRS Content — Use Cases & Traceability
- [ ] Use Cases use UC-NNN format
- [ ] Traceability matrix links requirements to sources
- [ ] Open items and gaps documented

### Output
- [ ] SRS saved as .md to outputs/srs-agent/
- [ ] DOCX generated via scripts/md-to-docx.py
- [ ] Summary metrics presented to user
