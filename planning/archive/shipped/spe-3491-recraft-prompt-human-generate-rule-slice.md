# SPE-3491 — Recraft: prompt human to generate needed assets

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3491](https://linear.app/spectranoir/issue/SPE-3491/recraft-prompt-human-to-generate-needed-assets) |
| **Related** | SPE-3486 (Figma subscription prompt pattern) |
| **Branch** | `jamesdyedbq/spe-3491-recraft-prompt-human-to-generate-needed-assets` |
| **Base main SHA** | `40fb3feba01f7ea1222e465ff0f6c66d8b6057e7` |

## Goal

Codify: when the active task needs Recraft-quality art, agents must prompt the human to generate it in Recraft — never wire a Recraft API into the runtime/CI, and never silently substitute.

## Boundary

In:

- `.cursor/rules/agent-cursor-plugins.mdc` (alwaysApply)
- `docs/agent-cursor-plugins.md` (Recraft workflow + Skip/Auth)
- `AGENTS.md` keep-list summary
- Backlog handoff for this slice

Out:

- Recraft SDK/API client in `src/` or CI
- Installing Recraft as a Cursor MCP keep-list plugin
- Prompting when Recraft is not required

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| none | — | — |

## Validation

- Rule text present in alwaysApply mdc + docs + AGENTS
- `npm run verify:backlog-handoff`
