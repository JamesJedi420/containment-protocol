---
name: cp-figma-ui-bridge
description: >-
  Containment Protocol Figma bridge — load before any Figma MCP work on this
  game UI. Reads the canonical file registry, token map, and component map;
  enforces CSS source-of-truth and no runtime Figma SDK.
---

# CP Figma UI bridge

## Before any Figma tool

1. Read `docs/figma/file-registry.json` — use **only** that `fileKey` for the UI System.
2. Read `docs/figma/token-map.json` and `docs/figma/component-map.json` when mapping tokens or components.
3. Read `docs/figma-integration.md` for workflows and constraints.
4. `create_session` with the registry `fileKey`.
5. Load `/figma-use` before every `use_figma` call. Add `/figma-generate-library` when creating variables/components; `/figma-design-to-code` before `get_design_context` for implementation.

## Hard rules

- **Shipped tokens:** `src/index.css` wins. Figma mirrors; do not ship values that only exist in Figma.
- **Shipped UI:** Prefer existing `src/components/**`, projections, and `src/styles/components.css`.
- **No runtime wiring:** Do not add Figma packages, env keys, or fetches to `src/` or CI for this bridge.
- **Code Connect:** Starter plan uses `component-map.json`. Do not invent published Code Connect unless Org/Enterprise is confirmed.
- **One file:** Do not create a second CP UI System design file.

## Design → code

Map Figma nodes through `component-map.json` → React/CSS paths. Reproduce visual intent; discard prototype scaffolding and mock data.

## Code → Figma

After CSS/component changes that alter the visual contract, update the maps and sync the canonical Figma file in-boundary.
