# SPE-3397 — Versioned scenario definitions and resolved initialization

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3397](https://linear.app/spectranoir/issue/SPE-3397/versioned-scenario-definitions-and-resolved-initialization) |
| **Parent** | [SPE-1734](https://linear.app/spectranoir/issue/SPE-1734) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3397-versioned-scenario-definitions-and-resolved-initialization` |
| **Base main SHA** | `871810f6` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `871810f6`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3397  

## Approved boundary

- Versioned scenario definition schema + two presets + custom path
- Deterministic resolver with SPE-3396 softlock/grant gates
- Identity-keyed stochastic slots (SPE-3162-compatible; SPE-3162 remains owner)
- Optional `CampaignLedgerState.scenarioDefinition` sanitize/hydrate
- SPE-2898 version-transition assessment (no silent reinterpretation)
- No UI editor (SPE-3398), no isolated runner (SPE-3459)

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Custom scenario editor UI | SPE-3398 | Presentation child |
| Isolated scenario runner | SPE-3459 | Separate blocked child |
| Full SPE-3162 stochastic substrate | SPE-3162 | Adjacent owner; identity-keyed seam only here |
