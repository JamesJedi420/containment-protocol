# SPE-3487 — Google Drive agent bridge (workspace + registry)

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3487](https://linear.app/spectranoir/issue/SPE-3487/google-drive-agent-bridge-workspace-registry) |
| **Related** | Figma bridge SPE-3484 / SPE-3486 (auth-blocker pattern) |
| **Branch** | `jamesdyedbq/spe-3487-google-drive-agent-bridge-workspace-registry` |
| **Base main SHA** | `67b2a8f5a0e3a65e79ee4c8d8d9d7577676b9604` |
| **Drive root** | [Agent Workspace](https://drive.google.com/drive/folders/1f9a6-gMTDC4U4CVYAGhz35XHEV5Go7Bt) |

## Goal

Agent-owned Google Drive workspace + repo registry/skill/keep-list; no Drive SDK in the game runtime.

## Boundary

In:

- Drive folder tree + README + Templates smoke Doc
- `docs/google-drive-integration.md`, `docs/google-drive/*`
- `.cursor/skills/cp-google-drive-bridge/SKILL.md` (+ gitignore allowlist)
- Keep-list / `AGENTS.md` / alwaysApply rule
- Backlog handoff

Out:

- Drive in `src/` or CI
- Migrating all historical Social Asset Docs into new folders
- Auto-mirroring Linear/planning backlog

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Relocate historical Social Asset Docs into agent `Social Assets` | optional later | Search covers discovery; migration not required for bridge |

## Validation

- Drive MCP: list root folders; create/read Templates smoke Doc
- `npm run verify:backlog-handoff`
