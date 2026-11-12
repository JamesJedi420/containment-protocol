# SPE-110 — Construction progress hauling input

| Field             | Value                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                                                              |
| **Issue**         | [SPE-110](https://linear.app/spectranoir/issue/SPE-110/construction-progress-and-interference-state)                              |
| **Parent**        | Facility program via [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) coordination (SPE-110 remains top-level Backlog→IP) |
| **Branch**        | `jamesdyedbq/spe-110-construction-progress-and-interference`                                                                      |
| **Base main SHA** | `53a2f71e3ee70b45f378cc8084b60cc1fe35e7d3`                                                                                         |

## Delegated approval

**Date:** 2026-11-10  
**main SHA:** `53a2f71e3ee70b45f378cc8084b60cc1fe35e7d3`  
**Decision:** `delegated_approve` SPE-110

**Queue state:** no open PRs; local tip equals `origin/main`; SPE-2142 Done on Linear but stale in handoff; SPE-3338 remains In Progress tooling/readiness (blocked).

**Candidates compared:** SPE-3338 (blocked on workstream labels + SPE-3276 feed), SPE-792 (umbrella-scale remaining body; children Done), SPE-1058 (large remaining ACs), SPE-3385 (blocked by SPE-2794), SPE-3439 (needs SPE-1434/SPE-2995).

**Priority / dependency / feasibility / scope / readiness:** named active-queue item with SPE-395 Done; clear remaining hauling-node AC; existing `constructionProgress` + `facilityHaulingLabor` seam; coherent single coding slice.

**Duplication check:** not in `recentlyShipped`; inventory-only logistics bonus does not satisfy hauling-node AC.

**Contradiction review:** SPE-1562 owns construction complication events (defer); SPE-1027/SPE-2935 own hauling labor stamps (consume read-only); no STOP conflict with SPE-3043.

**Eligibility:** Backlog→claim; not umbrella; acceptance fits one slice; no open blockers; slice doc created here.

## Goal

Make authoritative facility hauling labor materially affect construction progress so SPE-110’s remote extraction/hauling-node acceptance is satisfied without a second logistics ledger.

## Boundary

### In scope

- `evaluateConstructionHaulingBonus` in `src/domain/constructionProgress.ts` reading `GameState.facilityHaulingLabor` via `parseFacilityHaulingLabor`
- Week-close delta in `advanceConstructionProgress` includes inventory bonus + hauling bonus
- Targeted tests in `src/test/sim.construction.progress.test.ts`
- This slice doc + backlog handoff refresh

### Out of scope

- New GameState fields / SCHEMA_REGISTRY
- Mutating or consuming hauling stamps during construction
- Expanding the haul cargo/labor catalog
- SPE-1562 construction complication events
- Closing SPE-1052 / SPE-792 / SPE-3338 / SPE-1058
- Per-worker road-hauling simulation

## Pre-coding summary

| Item | Finding |
| --- | --- |
| Relevant files | `constructionProgress.ts`, `advanceWeek.ts` (`advanceConstructionProgress`), `facilityHaulingLabor.ts`, `sim.construction.progress.test.ts` |
| Current | Inventory stock ≥3 → +1 logistics; hauling labor unused by construction |
| Expected | Stamped `handlers_available` for authored haul cargo → +1 hauling bonus; interference still zeroes total delta |
| Risks | Duplicating stockpile authority; inventing haul catalog entries; closing parent early |
| Validation | Focused construction progress tests; lint; `verify:backlog-handoff` |

## Acceptance

- [x] Hauling labor present yields a positive construction progress bonus independent of inventory stock
- [x] Hauling labor absent yields 0 hauling bonus
- [x] Week-close delta uses `1 + inventoryBonus + haulingBonus` when interference is inactive
- [x] Interference still forces delta 0 regardless of inventory/hauling bonuses
- [x] Incomplete-site readiness burden and inventory logistics behavior remain intact
- [x] Targeted tests cover hauling present/absent, combined delta, interference override, determinism, mitigation resume

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Dedicated construction progress/stall OperationEvents | SPE-1562 | Explicitly deferred from SPE-110 |
| Per-worker haul simulation / DF rates | none | Out of SPE-110 boundary |
| Consume/stamp mutation during construction tick | SPE-1027 | Read-only consume of present labor only |

## Validation

- `npx vitest run src/test/sim.construction.progress.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
