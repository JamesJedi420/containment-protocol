# Scenario integration (Containment Protocol)

Canonical agent bridge for **Scenario.com** visual production (concept art, environments, characters, props, UI studies). **Install** the Scenario MCP server (human). Agents **use** the tools; they do not marketplace-install plugins.

Client-only SPA rule: **never** add a Scenario SDK, OAuth client, or required Scenario secrets to `src/`, the game store, or CI unless a Linear slice explicitly requires it (this integration does not).

## Configuration (chosen for this repo)

| Decision | Choice |
| --- | --- |
| Shipped code / engineering SoT | Git repo + Linear |
| Scenario role | Visual production assets + reference library |
| Canonical project | Containment Protocol (`proj_iR6KzLRfxuLTmdur1kR8z8da`) |
| MCP URL | `https://mcp.scenario.com/mcp?toolsets=full` — exposes the full catalog as listed tools (~90+; ~64 were catalog-only on the lean URL) |
| Lean URL (fallback) | `https://mcp.scenario.com/mcp` — ~33 core tools; use `scenario_tools_list` / `scenario_tool_execute_read|write|delete` for the rest |
| Cost | Plan + estimate before expensive batches / video / training |
| Runtime | No Scenario dependency in the app |

## Registry

| File | Purpose |
| --- | --- |
| [`docs/scenario/project-registry.json`](./scenario/project-registry.json) | Exact `teamId`, `projectId`, seeded collection ids |

## Auth

1. Add Scenario MCP in Cursor Settings → Tools & MCP using the **full** URL above (or lean URL if preferred).
2. Complete OAuth (`mcp_auth` when `needsAuth`).
3. Read `docs/scenario/project-registry.json` before calls that need `team_id` / `project_id`.
4. Load skill `cp-scenario-bridge` (and optional `npx skills add scenario-labs/skills`).

### Auth blocker (mandatory)

When the **active task needs** Scenario (generate/edit/list project assets, collections, workflows) and MCP auth or account access blocks that capability:

1. **Stop** that path.
2. **Prompt the human** to install/connect Scenario MCP or re-auth.
3. Do **not** silently skip or substitute without telling them.

Do **not** prompt when the slice does not need Scenario (domain/sim, or UI from React/CSS/Figma alone).

## Full tool catalog (~64 catalog + core)

With `?toolsets=full`, Cursor lists the full Scenario catalog directly. With the lean URL, ~64 tools stay catalog-only (`listed: false`) and must run via:

1. `scenario_tools_search` → schema  
2. `scenario_tool_execute_read` / `_write` / `_delete` matching the tool’s lane  

Families include Discovery, Generation, Analysis, Display, Assets, Collections, Models, Workflows, Jobs, Projects, Members, API Keys, Memory, Operations.

## Agent workflows

### Always pass context

OAuth callers: pass `team_id` + `project_id` from the registry (or ask if multiple workspaces appear).

### Generate (costful)

1. `memory_recall` for project visual instructions.  
2. `recommend` / `model_schema_get` before `model_run`.  
3. Confirm plan/cost for batches/video/training.  
4. `asset_display` to show results; file approved assets into the right collection (`07 — Approved` vs `06 — Drafts`).

### Organize

Seeded collections: References, Environments, Characters & Personnel, Props & Equipment, UI & Interfaces, Drafts, Approved (ids in registry).

## When not to use Scenario

- Domain / sim / persistence slices with no visual deliverable  
- Shipping art through the Vite SPA as a CDN  
- Replacing Figma CSS token SoT or Drive story drafts  
- Parallel Recraft-quality asks when the keep-list requires prompting the human for Recraft (Scenario may still be used when the slice explicitly chooses Scenario)

## Related

- Plugin keep-list: `docs/agent-cursor-plugins.md`  
- Cursor skill: `.cursor/skills/cp-scenario-bridge/SKILL.md`  
- Owner issue: [SPE-3494](https://linear.app/spectranoir/issue/SPE-3494)
