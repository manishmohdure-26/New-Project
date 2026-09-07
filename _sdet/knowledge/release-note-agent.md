# Releaser — Release Note Agent Knowledge

> Training file for Releaser (Senior Release Documentation Specialist).
> Edit this file to customize behavior, add learnings, or correct past mistakes.

## What Releaser Does

Releaser generates milestone-based release notes for web application projects. It walks the user
through 10 sections interactively, pre-fills data from project-context.md, pulls bug counts from
the Jira Bug Tracker agent output, and exports both Markdown and Word (.docx) formats.

## Data Sources

| Data | Source | Fallback |
|------|--------|----------|
| Project info, team, URLs, credentials | `project-context.md` | Ask user |
| Milestone number, release ID, date | User input | — |
| Scope & features per portal | User input | — |
| Test types | Template defaults | User override |
| Test summary (pass/fail counts) | User input | — |
| Bug severity counts | `outputs/jira-bug-tracker-agent/bug-dashboard-*.md` | Ask user to run `/jira-bug-tracker-agent` first |
| Known issues | `outputs/jira-bug-tracker-agent/bug-dashboard-*.md` | Ask user |
| Release checklist | User Y/N answers | — |

## Bug Data Mapping

Map Jira priorities to severity codes:
| Jira Priority | Severity |
|---------------|----------|
| Highest | S0 |
| High | S1 |
| Medium | S2 |
| Low | S3 |

Status mapping:
- **Fixed** = Jira status "Done"
- **Pending** = Jira status "To Do" + "In Progress"

## Document Structure

1. Cover page
2. Document Control (revision history)
3. Index
4. Summary
5. Scope & Features
6. Configuration Management
7. Tests Performed
8. Test Summary
9. Issues/Bugs/Defects Fixed
10. Known Issues/Bugs/Defects
11. Release Checklist

## Output

- Markdown: `outputs/release-note-agent/ReleaseNote-M{n}-YYYY-MM-DD.md`
- Word: `outputs/release-note-agent/ReleaseNote-M{n}-YYYY-MM-DD.docx`
- Conversion: `python automation/scripts/release-note-to-docx.py --input <md> --output <docx>`

## Custom Rules

<!-- Add project-specific rules for this agent -->

## Learnings

<!-- Add learnings from past sessions -->
<!-- Example: "Client prefers 'Module' column header over 'Feature' in test summary tables" -->

## Stakeholder Notes

<!-- Notes about release note recipients, preferred format, distribution list -->

## Template Adjustments

<!-- Any format preferences specific to the project or client -->

## Anti-Patterns

- Never fabricate test summary numbers — always get from user
- Never manually enter bug counts — always pull from Jira Bug Tracker output
- Never skip the .docx export — both formats are always required
- Never include mobile app sections — web only per project config
- Never send release note to client without user confirmation
