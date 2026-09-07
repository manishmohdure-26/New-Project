# Report Bugs — Checklist

## Agent: Catcher (Bug Reporter)

### Failure Analysis
- [ ] Error message and stack trace analyzed
- [ ] Relevant source code reviewed
- [ ] Root cause identified or narrowed down
- [ ] Bug classified (code bug / test issue / environment / requirement gap)

### Classification
- [ ] Severity assigned (S1-S4) with justification
- [ ] Priority assigned (P1-P4) with justification

### Consolidation (One Page = One Report)
- [ ] Checked if multiple issues are on the SAME page/screen/drawer/form
- [ ] If yes → wrote ONE consolidated bug report with all issues under "Issues Found"
- [ ] Did NOT create separate BUG-MODULE-NNN files for issues on the same page
- [ ] Report-level severity/priority = highest among grouped issues

### Bug Report Content
- [ ] Title is clear and descriptive
- [ ] Steps to reproduce are specific and reproducible (per issue if consolidated)
- [ ] Expected vs actual results clearly documented (per issue if consolidated)
- [ ] Environment details complete (browser, OS, version)
- [ ] Root cause analysis includes code references
- [ ] Suggested fix provided (when possible)
- [ ] Test evidence included (logs, screenshots, API responses)

### Output
- [ ] Bug ID follows BUG-MODULE-NNN format
- [ ] Output saved to outputs/bug-report-agent/

### Jira Logging (OPT-IN — DO NOT DEFAULT TO YES)
- [ ] Local bug report presented to user before ANY Jira action
- [ ] Asked user: "Want me to log it to Jira? (yes/no)"
- [ ] Received EXPLICIT affirmative in the current turn before calling any Jira MCP tool or curl
- [ ] If user said no / was silent / was ambiguous → stopped, did NOT touch Jira

### Jira Pre-Flight Checklist (verify ALL before API call)
- [ ] Summary uses `Feature Name || Description` format (NOT `[MODULE]` brackets)
- [ ] Description is ADF JSON with `strong`+`em` headings (NOT `heading` nodes or plain text)
- [ ] Expected Result bullets have green text color `#006644`
- [ ] Actual Result bullets have red text color `#ff5630`
- [ ] Sections separated by `rule` nodes
- [ ] Issue Link type is `Causes` (NOT `Blocks`)
- [ ] Environment field is set (QA / Staging / Production) — NOT null
- [ ] Sprint assigned to current active sprint
- [ ] Priority mapped correctly (P1→Highest, P2→High, P3→Medium, P4→Low)
- [ ] Screenshot file exists and will be attached after issue creation

### Jira Post-Creation
- [ ] Jira issue created successfully
- [ ] Screenshot attached to Jira issue
- [ ] User story linked with `Causes` link type
- [ ] Local bug report updated with Jira key (e.g., HOPE-XXX)
