# Catcher — Bug Reporter Knowledge

> Training file for Catcher (Senior QA Bug Hunter).
> Edit this file to customize Catcher's behavior, add learnings, or correct past mistakes.

## Custom Rules

- Jira Summary MUST use `Feature Name || Description` format — never `[MODULE]` brackets
- Jira description MUST be ADF JSON — never plain text or markdown
- Issue link type MUST be `Causes` — never `Blocks` or `Relates`
- Environment field MUST be set — never leave null
- Sprint MUST be assigned — never skip sprint assignment
- Labels MUST be empty — never add labels to bugs
- After creating the issue, MUST do 3 post-creation steps: attach screenshot, link user story, verify all fields
- Always run the pre-flight checklist before any Jira API call

## Learnings

### HOPE-1633 Incident (2026-04-14) — Jira formatting was wrong

**What happened:** Agent filed HOPE-1633 but skipped ADF formatting rules:
- **Title:** Used `[SubOrg] Contract rows not clickable...` instead of `Sub-Organizations || Contract rows not clickable...`
- **Description:** Used `heading` h2 nodes instead of `paragraph` with `strong` + `em` marks. No green/red text colors on Expected/Actual results. No `rule` separators between sections.
- **Link type:** Used `Blocks` instead of `Causes` to link to user story HOPE-93
- **Environment:** Left as `null` instead of `QA`

**Additional failures (user had to fix manually):**
- **Screenshots:** Agent did NOT attach the screenshot to Jira — user had to upload manually
- **User story link:** Agent did NOT create the issue link — user had to link HOPE-93 manually
- **Sprint:** Agent did NOT assign the current sprint
- **Labels:** Agent incorrectly ADDED labels — user had to remove them manually

**Root cause:** Agent treated issue creation as the final step and skipped all post-creation actions (attach, link, verify). ADF template rules were buried in Step 5 and agent defaulted to simpler formatting.

**Fix:** Added 9 Jira-specific critical_actions including: pre-flight checklist (7 items), post-creation mandatory steps (attach + link + verify), no-labels rule, sprint assignment rule.

### Key rule: Build ADF payload BEFORE calling Jira API
1. Build the full ADF JSON in a variable or temp file
2. Verify it has: `strong`+`em` on headings, `textColor #006644` on expected bullets, `textColor #ff5630` on actual bullets, `rule` separators
3. Only then pass to MCP or curl

## Severity Calibration

<!-- Add notes to calibrate severity/priority for your project -->

## Known Issues

<!-- Add known issues that should not be re-reported -->

## Anti-Patterns

- **DO NOT** use `heading` nodes for section titles in ADF — use `paragraph` with `strong` + `em` marks
- **DO NOT** use `[MODULE]` bracket format for Jira Summary — use `Feature Name || Description`
- **DO NOT** use `Blocks` link type for user story links — always use `Causes`
- **DO NOT** leave Environment field null — always set it
- **DO NOT** skip the pre-flight checklist before Jira API calls
- **DO NOT** add any labels to Jira bugs — portal/module/type go in description body only
- **DO NOT** skip sprint assignment — always query and assign active sprint
- **DO NOT** treat issue creation as the final step — you MUST attach screenshot + link user story + verify after creation
- **DO NOT** silently skip post-creation steps if they fail — retry or explicitly report the failure
