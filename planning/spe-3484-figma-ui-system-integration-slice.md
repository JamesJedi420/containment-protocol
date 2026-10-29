# SPE-3484 — Figma UI system integration (agent design bridge)

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3484](https://linear.app/spectranoir/issue/SPE-3484/figma-ui-system-integration-agent-design-bridge) |
| **Related** | Plugin keep-list (`docs/agent-cursor-plugins.md`); UI CSS (`src/index.css`) |
| **Branch** | `jamesdyedbq/spe-3484-figma-ui-system-integration-agent-design-bridge` |
| **Base main SHA** | `5b01b9bc51ef0224cb4e6e45453a63dfedb6ed76` |
| **Figma file** | [Containment Protocol — UI System](https://www.figma.com/design/Xb4sEWsOqEOkrB5nnTZWct) (`Xb4sEWsOqEOkrB5nnTZWct`) |

## Goal

Integrate Figma as the visual design bridge without a runtime SDK: canonical file, CSS↔variable map, component registry, agent docs/skill, keep-list promotion.

## Boundary

In:

- Canonical Figma UI System file (tokens + TopBar/StatCard/Panel/Button stubs)
- `docs/figma/*` registry maps + `docs/figma-integration.md`
- `.cursor/skills/cp-figma-ui-bridge/SKILL.md`
- Keep-list + `agent-cursor-plugins.mdc` updates
- Backlog handoff: SPE-3483 → Recently shipped; SPE-3484 In Progress

Out:

- Published Code Connect / `@figma/code-connect` npm package (Starter plan)
- Figma SDK in `src/` or CI
- Full redesign of every feature screen in Figma
- Magic Patterns as a required path

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Published Code Connect + `.figma.ts` templates | SPE-3484 follow-up / new issue when Org plan | Starter cannot publish library Code Connect |
| Pixel capture of live Vite shell via `generate_figma_design` | future UI polish slice | Optional fidelity pass; stubs sufficient for bridge |
| Expand component map to all feature pages | per UI slice | Map grows when screens are designed |

## Validation

- Registry JSON valid; file key matches live Figma file
- Token map covers `@theme` / `:root` color, radius, font tokens from `src/index.css`
- Component map covers TopBar/ShellStatusBar, StatCard, Panel, Button patterns
- `npm run verify:backlog-handoff` after handoff edit
