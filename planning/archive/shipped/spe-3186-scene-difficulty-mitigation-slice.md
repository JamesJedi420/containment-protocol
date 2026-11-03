# SPE-3186 — Scene difficulty and mitigation resolver

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3186](https://linear.app/spectranoir/issue/SPE-3186/scene-difficulty-and-mitigation-resolver) |
| **Parent** | none (approved parent with zero children; implement in-boundary) |
| **Branch** | `jamesdyedbq/spe-3186-scene-difficulty-and-mitigation-resolver` |
| **Base main SHA** | `9c3806b8` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `9c3806b8`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3186  

## Approved boundary

- Pure domain `sceneDifficultyMitigationResolver.ts` — drivers, mitigations, provenance/confidence, difficulty bands, no-stakes bypass, consumer projection
- Does not replace SPE-62 / SPE-2217 / SPE-1489 / SPE-1910 / SPE-3044 / SPE-1366 / SPE-3107
- No GameState, UI, combat runner, or ICRPG terminology

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live wire into SPE-62 phase pipeline | SPE-62 | Consumer owns integration |
| Area-pressure packet authoring | SPE-1489 | Driver source remains SPE-1489 |
| Global difficulty profiles | SPE-3044 | Distinct run-tuning owner |
