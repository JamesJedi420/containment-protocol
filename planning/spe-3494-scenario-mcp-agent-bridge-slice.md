# SPE-3494 — Scenario MCP agent bridge (full toolset + registry)

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3494](https://linear.app/spectranoir/issue/SPE-3494/scenario-mcp-agent-bridge-full-toolset-registry) |
| **Branch** | `jamesdyedbq/spe-3494-scenario-mcp-agent-bridge-full-toolset-registry` |
| **Base main SHA** | `3b50ccc693d44bb78bb8ddb06db3bf7475dbfce9` |
| **Scenario project** | `proj_iR6KzLRfxuLTmdur1kR8z8da` |

## Goal

Integrate Scenario MCP with full tool catalog (`?toolsets=full`, ~64 formerly catalog-only tools listed) plus repo registry/skill/keep-list; no runtime SDK.

## Boundary

In: docs, registry, skill, keep-list, seeded collections, user MCP URL note.

Out: Scenario in `src/`/CI; mandatory generation runs; Recraft policy change.

## Validation

- Scenario: collections_list shows 7 seeded collections
- `npm run verify:backlog-handoff`
