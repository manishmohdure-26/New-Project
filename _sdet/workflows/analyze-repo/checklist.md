# Analyze Repository — Checklist

## Agent: Scanner (Repo Analysis Agent)

### Repository Setup
- [ ] Repo paths loaded from project-context.md Tech Stack section
- [ ] Repo paths verified to exist on disk
- [ ] User confirmed scope (frontend/backend/both) and focus area

### Framework Detection
- [ ] Framework detected by reading config files (no guessing)
- [ ] Technology Stack Summary table presented

### Architecture Scan
- [ ] Both repos scanned (or confirmed scope honored)
- [ ] Architecture layers documented (pages, components, routes, models, middleware)
- [ ] All pages/routes detected with auth requirements
- [ ] API endpoints inventoried with method, payload, response, auth
- [ ] UI-to-API mappings traced (full-stack only) with gaps and orphans flagged
- [ ] User flows documented with preconditions and API calls per step

### Locators & Testability
- [ ] Locators follow priority: getByRole > getByLabel > getByPlaceholder > getByTestId > getByText > locator
- [ ] No fragile CSS selectors (nested div chains) used
- [ ] Testability assessment included (data-testid coverage, risk areas)
- [ ] All findings cite file paths for traceability

### Output
- [ ] All 6 output files saved to outputs/repo-analysis-agent/
- [ ] Final summary with counts presented to user
- [ ] Google Chat webhook notification sent (if configured)
- [ ] Handoff to test-scenario-agent suggested
