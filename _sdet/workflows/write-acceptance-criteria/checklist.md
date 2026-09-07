# Write Acceptance Criteria — Checklist

## Agent: Definer (Acceptance Criteria Agent)

### Mode Selection
- [ ] Mode determined: A (stories exist in Jira) or B (create new stories)

### Input Collection
- [ ] **Mode A:** Story keys collected and fetched from Jira (summary, description, epic link)
- [ ] **Mode B:** Epic key collected and validated against project-context.md
- [ ] **Mode B:** User story details collected (title, role, goal, benefit)
- [ ] Screenshots/screens noted for inline referencing (if provided)

### Research & Context Gathering (Curated Wiki ONLY)
- [ ] project-context.md loaded for portal names, roles, and conventions
- [ ] project-docs/SharedByClient/curated-wiki/ searched for relevant pages (screen requirements, workflows, UI standards, reference docs)
- [ ] All matching wiki pages read fully with source file names noted
- [ ] NO other documents used — no MOMs, transcripts, SRS outputs, client-documents, or user-stories outputs
- [ ] Coverage gaps flagged to the user instead of filled from other sources
- [ ] Research summary presented to user

### User Story Draft (Mode B only — skip for Mode A)
- [ ] User story follows "As a [role], I should be able to [goal], so that [benefit]" format
- [ ] Role is a real persona from the project
- [ ] Goal is specific and actionable
- [ ] Benefit articulates real business value

### Acceptance Criteria Draft
- [ ] AC written in bullet point format (not Given/When/Then, not tables)
- [ ] Every AC bullet is independently testable by QA
- [ ] Happy path covered
- [ ] Key edge cases and validations included
- [ ] Error handling and error messages specified
- [ ] Every criterion traces to a curated wiki page or user-provided Figma/screenshot
- [ ] Wiki source references recorded (local output only, not in Jira)
- [ ] Screen references included inline where relevant

### User Approval
- [ ] Complete draft presented to user for review
- [ ] Google Chat webhook notification sent (if configured)
- [ ] User explicitly approved before writing to Jira

### Jira Integration
- [ ] **Mode A:** Existing stories updated with AC in description (summary preserved)
- [ ] **Mode B:** New Jira stories created under the correct epic
- [ ] Description contains full AC content
- [ ] **Mode B:** Epic link set correctly
- [ ] Jira ticket keys reported to user

### Output
- [ ] AC document saved to outputs/acceptance-criteria-agent/
- [ ] Summary table included with metrics
