# SPE-3459 — Configurable isolated scenario runner

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3459](https://linear.app/spectranoir/issue/SPE-3459/configurable-isolated-scenario-runner) |
| **Parent** | [SPE-77](https://linear.app/spectranoir/issue/SPE-77) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3459-configurable-isolated-scenario-runner` |
| **Base main SHA** | `dfc30932` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `dfc30932`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3459  

## Approved boundary

- Isolated launch/restore/finish/abort over SPE-3397 bindings
- Durable isolation provenance; no campaign commit path
- Optional `GameState.isolatedScenarioRun` hydrate
- Generator-backed custom channel (SPE-561-shaped) via same contract
- No SPE-3398 UI, no SPE-3091 Event Sandbox broaden, no Academy SPE-3286

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Custom scenario editor UI | SPE-3398 | Presentation |
| Event Sandbox mode | SPE-3091 | Distinct child |
| Campaign outcome translation path | — | Explicitly out of scope |
