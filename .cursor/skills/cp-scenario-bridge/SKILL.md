---
name: cp-scenario-bridge
description: >-
  Containment Protocol Scenario.com MCP bridge — load before Scenario MCP work.
  Reads project registry; enforces team/project ids, full toolset URL, cost
  gates, and auth-blocker prompting; no runtime Scenario SDK.
---

# CP Scenario bridge

## When to use Scenario

**Use** for visual production: concept art, environments, characters, props, UI studies, reference organization in the Containment Protocol Scenario project.

**Skip** for domain/sim-only engineering, Figma CSS token SoT work, or Drive story/social drafts unless the slice also needs Scenario visuals.

## Before any Scenario tool

1. Read `docs/scenario/project-registry.json` — use those `teamId` / `projectId` / collection ids.
2. Read `docs/scenario-integration.md`.
3. Prefer MCP URL `https://mcp.scenario.com/mcp?toolsets=full` so ~64 formerly catalog-only tools are listed directly.
4. On lean URL: `scenario_tools_search` then `scenario_tool_execute_read|write|delete` for `listed: false` tools.
5. `memory_recall` when starting substantial creative work in this project.

## Hard rules

- **SoT:** Git + Linear for shipped code. Scenario for visual assets.
- **Ids:** Never invent `team_id` / `project_id` / asset or collection ids.
- **Cost:** No expensive batches, video, or training without plan + estimate and human/slice approval.
- **Display:** Use `asset_display` to show assets (not raw CDN paste).
- **Collections:** Drafts → `06 — Drafts`; approved → `07 — Approved`; put refs/envs/characters/props/UI in the matching seeded collection.
- **No runtime wiring:** Do not add Scenario packages or OAuth to `src/` or CI.
- **Auth blocker:** If Scenario is required and MCP auth fails — **stop and prompt the human**.

## Typical generate loop

`recommend` → `model_schema_get` → `model_run` → `jobs_wait` / `job_get` → `asset_display` → optional `collection_add_assets`.
