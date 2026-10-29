# Figma integration (Containment Protocol)

Canonical agent/design bridge for UI. **Install** the Figma Cursor plugin (human). Agents **use** the MCP tools; they do not marketplace-install plugins.

Client-only SPA rule still applies: **never** add a Figma SDK, API key, or network fetch to `src/`, the game store, or CI unless a Linear slice explicitly requires it (this integration does not).

## Configuration (chosen for this repo)

| Decision | Choice |
| --- | --- |
| Shipped token source of truth | `src/index.css` (`@theme` + `:root`) |
| Figma role | Mirror tokens + shell/component stubs for visual specs and design→code |
| Component mapping | `docs/figma/component-map.json` (Starter-plan Code Connect substitute) |
| Runtime | No Figma dependency in the app |
| Hosted file | One canonical UI System file — see `docs/figma/file-registry.json` |

## Registry files

| File | Purpose |
| --- | --- |
| [`docs/figma/file-registry.json`](./figma/file-registry.json) | Canonical `fileKey` / URL / page roles |
| [`docs/figma/token-map.json`](./figma/token-map.json) | CSS custom property ↔ Figma variable names |
| [`docs/figma/component-map.json`](./figma/component-map.json) | Figma component ↔ React / CSS paths |

## Auth

1. Enable the **Figma** Cursor plugin / MCP until tools show `ready`.
2. Sign in via Cursor Connect / `mcp_auth` if `needsAuth`.
3. Confirm with Figma `whoami` before mutating files.
4. Always `create_session` with the registry `fileKey` before read/write tools on that file.
5. Load `/figma-use` (and library/design skills when building components) before `use_figma`.

Do not put Figma personal access tokens in committed `.cursor/mcp.json`. Prefer plugin auth.

## Agent workflows

### Design → code (UI slice with a Figma frame)

1. Read `docs/figma/file-registry.json` and `component-map.json`.
2. `create_session` → `get_design_context` / screenshot for the target `node-id`.
3. Implement against **existing** React components, projections (`*View.ts`), and CSS classes in `src/styles/components.css` / `src/index.css`.
4. Treat Figma as layout/hierarchy/spacing intent — not pasteable production markup.
5. Keep domain logic out of UI; wire through projections/store as today.
6. Validate with Vitest for logic and Playwright smoke when the surface is in the e2e harness.

### Code → Figma (token or shell change)

1. Change CSS / components in the repo first when shipping behavior.
2. Update `token-map.json` / `component-map.json` if names or node IDs change.
3. Sync Figma variables/components via `use_figma` against the canonical file (same PR when the visual contract changed, or a follow-up UI-system slice).
4. Do not create a second “UI System” file — extend the registry file.

### New screen exploration

Prefer Magic Patterns or Figma prompts **seeded** from existing CP shell/components. Port results back through this integration doc’s design→code rules. Do not replace Zustand projections with mock arrays.

## When not to use Figma

- Domain / sim / persistence / week-close slices with no UI change
- Inventing a parallel Tailwind design system beside `src/styles/components.css`
- Runtime content loading from Figma
- Treating unpublished Starter-plan components as published Code Connect

## Deferred: published Code Connect

Organization/Enterprise plan required to publish library components and ship `.figma.ts` Code Connect templates. Upgrade path is recorded in `docs/figma/component-map.json` → `codeConnect`. Until then, the JSON component map is authoritative for agents.

## Related

- Plugin keep-list: `docs/agent-cursor-plugins.md`
- Layer boundaries: `docs/dependency-boundaries.md`
- Cursor skill: `.cursor/skills/cp-figma-ui-bridge/SKILL.md`
- Owner issue: [SPE-3484](https://linear.app/spectranoir/issue/SPE-3484)
