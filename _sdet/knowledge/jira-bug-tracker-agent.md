# Tracker — Jira Bug Dashboard Agent Knowledge

## What Tracker Does
Tracker fetches all Bug issues from Jira using the **Jira MCP server**, groups them by status and priority, and generates a Markdown dashboard report. It is a read-only agent — it never writes to Jira.

## How It Works

### Data Source
- **Jira MCP server** — mandatory for ALL Jira operations (per project rules)
- NEVER use REST API calls, curl, or `automation/api/jira-bug-tracker.js` as primary method
- If Jira MCP is unavailable, inform the user and STOP — do not attempt workarounds

### Configuration
- Reads project key from `project-context.md` → **Jira / Project Management** section
- Current project key: **HOPE**
- No `.env` config needed — MCP handles authentication

### JQL Query
```
issuetype = Bug AND project = HOPE ORDER BY priority ASC, created DESC
```

### Pagination
- Fetch ALL bugs — handle pagination if MCP returns partial results
- Never assume all bugs fit in a single response

### Bug Workflow Statuses (from project-context.md)
```
Open → In Progress → Ready for Testing → Done
```

### Data Grouping
- **Remaining Bugs** (not Done), grouped by status:
  - **Open / To Do**: Bugs identified but not started
  - **In Progress**: Bugs being actively worked on
  - **Ready for Testing**: Bugs fixed, awaiting QA verification
- **Completed Bugs**: Status = "Done", grouped by Priority
- Each category further broken down by Priority: Highest, High, Medium, Low

### Dashboard Output Format
- Header (project, date, total count)
- Summary matrix (priority x status: Open, In Progress, Ready for Testing)
- Separate section per priority level with bug list table
- Completed bugs with priority summary + full list + resolution times
- Trends & Insights section

### Trends Calculated
- Bugs created in the last 7 days
- Bugs resolved in the last 7 days
- Oldest open bug (by creation date)
- Top assignee with most open bugs
- Most affected priority level

## Output
- Report: `outputs/jira-bug-tracker-agent/bug-dashboard-{YYYY-MM-DD}.md`
- Console: Summary with key metrics presented to user

## Error Handling
| Error | Behavior |
|-------|----------|
| Jira MCP unavailable | Inform user, STOP — no workarounds |
| MCP authentication failure | Report error, suggest checking MCP config |
| Invalid project key | Report error with project key used |
| 0 bugs found | Generate report with "No bugs found" sections |
| Partial data (missing fields) | Use fallback values: "Unassigned", "Medium", "Unknown" |

## Jira Fields Extracted
| Field | Purpose |
|-------|---------|
| Issue Key | Bug identifier (e.g., HOPE-123) |
| Summary | Bug title/description |
| Status | Workflow state (Open, In Progress, Ready for Testing, Done) |
| Priority | Severity level (Highest, High, Medium, Low) |
| Assignee | Person responsible |
| Created | When bug was filed |
| Updated | Last modification date |
| Resolution Date | When bug was marked Done |

## Legacy Script
The file `automation/api/jira-bug-tracker.js` is a standalone Node.js script that uses REST API directly. It exists as a CLI fallback but should NOT be used by the agent — Jira MCP is mandatory per project rules.
