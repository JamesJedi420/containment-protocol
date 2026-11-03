# SPE-3489 — Plugin keep-list: agents may request additional connectors/tools

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3489](https://linear.app/spectranoir/issue/SPE-3489/plugin-keep-list-agents-may-request-additional-connectorstools) |
| **Branch** | `jamesdyedbq/spe-3489-plugin-keep-list-agents-may-request-additional` |
| **Base main SHA** | `34850b79080e358addd2f25fd9a8f6d25f988fc5` |

## Goal

Allow agents to ask the human for additional Cursor connectors/tools when they would enhance capability.

## Boundary

In: keep-list rule, `docs/agent-cursor-plugins.md`, `AGENTS.md`, Drive integration cross-link.

Out: installing Docs/Sheets/Slides by default; runtime SDK wiring.

## Validation

- Docs/rule text review; `npm run verify:backlog-handoff`
