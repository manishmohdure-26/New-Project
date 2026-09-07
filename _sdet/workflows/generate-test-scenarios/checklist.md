# Generate Test Scenarios — Checklist

## Agent: Strategist (Test Scenario Agent)

### Source Artifacts
- [ ] outputs/ scanned for SRS, user stories, acceptance criteria, repo analysis
- [ ] project-context.md loaded (portals, ID conventions)
- [ ] User confirmed source artifacts and scope

### Module Inventory
- [ ] Module inventory built with portal, features, and risk level per module
- [ ] User story list loaded — stories drive the scenario loop
- [ ] Cross-module dependencies identified for integration scenarios

### Scenario Quality — Coverage
- [ ] Every requirement/user story traced to at least one scenario
- [ ] Every story has at least one Positive scenario
- [ ] Negative and Edge coverage present where the story warrants it (skips documented)
- [ ] Security and Permission scenarios included for all authenticated features

### Scenario Quality — Conventions
- [ ] Scenario IDs follow SC-MODULE-NNN format per project-context.md conventions
- [ ] Every scenario has a risk priority (Critical/High/Medium/Low)
- [ ] Every scenario tagged with a test design technique (EP/BVA/DT/ST/UC/PW/EG/EX/CE/SY)
- [ ] No scenario contains detailed test steps (WHAT, not HOW)

### Traceability
- [ ] Traceability matrix links every scenario to its User Story ID
- [ ] Cross-story integration scenarios list ALL parent stories
- [ ] No orphan scenarios (empty User Story column) remain

### Output
- [ ] Markdown saved to outputs/test-scenario-agent/milestone-{N}/
- [ ] Per-portal CSVs generated with correct columns
- [ ] Summary metrics presented to user
- [ ] Handoff to generate-test-cases (Scriptor) suggested
