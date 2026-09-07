# Agent System Rules (`_sdet/`)

Scope: loaded when working under `_sdet/`. Root `CLAUDE.md` still applies.

## Editing rules (imperative)
- Treat `_sdet/agents/<name>.yaml` as the source of truth for each agent. Edit YAML first, then sync dependents.
- When you change an agent YAML, update the matching `_sdet/knowledge/<name>.md` if behavior/knowledge changed.
- When you add or rename an agent, update `_sdet/agents/agent-manifest.yaml`, `_sdet/skills/skill-manifest.yaml`, and the `.claude/skills/<agent>/SKILL.md` + `.claude/commands/<agent>.md` wrappers.
- Keep agents independent — NO inter-agent handoffs or cross-agent calls.
- Read project-specific values (portals, Jira key, credentials, repo paths) from root `project-context.md` — never hardcode them into agent YAML or knowledge files.
- Keep this template project-agnostic: no client names, no real URLs, no real credentials anywhere in `_sdet/`.
- Do not reformat YAML files here — indentation and key order are intentional (the auto-format hook already skips `_sdet/`).
- Workflows live in `_sdet/workflows/<name>/` as a package: `workflow.yaml` + `instructions.md` + `checklist.md`. Keep all three in sync.

## Layout
- `agents/` 12 YAML agent definitions · `knowledge/` 13 MD files (one per agent + shared.md)
- `workflows/` workflow packages · `teams/` party-mode configs · `tasks/` task files
- `config/sdet-config.yaml` system config · `data/` templates, checklists, project-context template
