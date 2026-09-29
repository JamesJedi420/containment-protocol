# SPE-1051 — Recoverable failure, campaign scars, and after-action collapse (slice 1)

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) — umbrella remains **Backlog** after slice 1   |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-2261 / SPE-2262 pure registries (do not rewrite); SPE-868 after-action review; SPE-1103 extinction / true-defeat                                                        |
| **Branch**          | `cursor/spe-1051-scar-degraded-registry-f2fb`                                                                                                                               |
| **Base `main` SHA** | `e9ed0f9fe76b4aba770dba643c0b093ca10e333e`                                                                                                                                  |

## Goal

Add a pure deterministic campaign scar / degraded-state registry so configured failure thresholds above an immediate-loss floor produce named scar/modifier records and one cascade, without ending the simulation or wiring week-close / UI / true-defeat economy.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | No prior `campaignScarDegradedState` module; SPE-2261 `institutionalCollapsePathways.ts` and SPE-2262 `facilityExpansionBurden.ts` own adjacent pure-registry patterns |
| Current behavior  | SPE-1051 umbrella ACs unmet; institutional pathways and expansion burden do not project campaign scars                                                                 |
| Expected behavior | Caller-owned failure pressures → named scar/modifier records; critical site abandonment cascades into strained logistics; scars persist under personnel turnover       |
| Boundary          | Pure registry + validate/project + contract tests + slice doc + backlog handoff. No GameState, week-close, UI, true-defeat, or SPE-2261/2262 edits                     |
| Risks             | Scope sprawl into full SPE-1051 umbrella; silent game-over; true-defeat thresholds leaking into slice 1; rewriting SPE-2261/2262                                       |
| Validation        | `src/test/campaignScarDegradedState.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                                                          |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                           |

## Boundary

### In scope

- `CampaignScarId` + named modifier records in `src/domain/campaignScarDegradedState.ts`
- Failure-pressure inputs: `breachSeverity`, `siteDamage`, `staffLoss`, `exposureSpill`, `confidenceLoss`, `personnelTurnoverCount`, `priorScarIds`
- Threshold bands (`stable` / `degraded` / `critical`) with `degraded_survivable` outcome (no game-over)
- Cascade: `site_abandonment_scar` at critical activates `strained_logistics_scar` at least at degraded
- Scar persistence across personnel-turnover via `priorScarIds`
- `validateCampaignScarDegradedInput` + `projectCampaignScarDegradedState`
- Targeted Vitest contract coverage

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, after-action narrative rendering
- True-defeat / agency-dissolution thresholds (SPE-1103 adjacency)
- State-change success resolution, living-but-lost staff catalog, post-loss adaptation unlocks, sealed-site / confiscated-evidence endings
- SPE-2261 / SPE-2262 registry semantic changes
- SPE-3118 or prior specialist-labor Done boundaries
- Parent SPE-1052 closure
- Full SPE-1051 umbrella Done

## Seam

Callers pass optional non-negative finite failure-pressure fields plus optional `priorScarIds`. `projectCampaignScarDegradedState` maps present triggers onto authored scar thresholds and returns an immutable projection. Breach severity folds into site abandonment (max with site damage). Critical site abandonment chains into strained logistics. `personnelTurnoverCount` never clears scars; `priorScarIds` re-emit carried scars. Malformed inputs fail closed to `undefined`. Empty object yields an idle projection. Values at or above `CAMPAIGN_SCAR_IMMEDIATE_LOSS_BOUND` still project `degraded_survivable` (slice 1 never returns game-over).

## Acceptance (slice 1)

- [x] Threshold above the immediate-loss floor produces a degraded but survivable campaign state with named scar/modifier effects (not game over)
- [x] At least one cascade shows two linked contributing scars (`site_abandonment_scar` critical → `strained_logistics_scar` degraded)
- [x] Tests cover omit/malformed fail-closed
- [x] Scar persistence under personnel-turnover input via `priorScarIds`
- [x] Deterministic / byte-stable immutable projections
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1051 umbrella remains **Backlog** for deferred ACs

## Deferred

| Item or mechanic                                                             | Owner or prerequisite                                                                                                         | Why deferred                                                                                                                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State-change success resolution (not entity elimination)                     | SPE-1051 slice 2 — `planning/spe-1051-state-change-success-slice.md`                                                          | Slice 1 owns scar registry only; slice 2 owns pure `projectIncidentStateChangeResolution`                                                                   |
| Survivor living-but-lost / morale-memory catalog beyond trauma scar modifier | SPE-1051 slice 3 — `planning/spe-1051-living-but-lost-morale-memory-catalog-slice.md` (shipped); full taxonomy still deferred | Compact catalog (`guilt` / `distrust` / `refusal` / `protective_custody`) shipped beside `morale_memory_drag`; full living-but-lost taxonomy stays deferred |
| Post-loss adaptation unlocks from scar history                               | SPE-1051 — `planning/spe-1051-post-loss-adaptation-unlock-slice.md` (SPE-1694 stays Canceled; not an owner)                   | Registry projects scars; unlock economy owned by SPE-1051 adaptation-unlock slice                                                                           |
| After-action cause-chain explanation surface                                 | SPE-1051 slice 5 — `planning/spe-1051-after-action-cause-chain-slice.md` (SPE-868 adjacency: no full review-metrics)           | Slice 1 owns scar registry only; cause-chain owned by slice 5                                                                                               |
| Sealed-site / confiscated-evidence endings                                   | SPE-1051 slice 6 — `planning/spe-1051-sealed-site-confiscated-evidence-slice.md`                              | Survival-with-clarity-loss endings owned by slice 6 (`survival_with_clarity_loss`)                                                                          |
| True-defeat / agency-dissolution thresholds                                  | SPE-1103 / SPE-1051 later slice                                                                                               | Slice 1 intentionally omits game-over / true-defeat outcome kinds                                                                                           |
| Week-close / GameState wire of campaign scars                                | later SPE-1051 / SPE-1052 child                                                                                               | Caller-owned projection only                                                                                                                                |
| Consume of SPE-2261 pathway outputs into scar triggers                       | SPE-2261 shipped; wire stays deferred                                                                                         | Do not rewrite SPE-2261; callers may pass pressures independently                                                                                           |

Parent SPE-1052 remains **Backlog**. SPE-1051 remains **Backlog** (slice 1 registry shipped; umbrella ACs incomplete). Do not close SPE-1052 from this slice.

## Validation

- Targeted Vitest: `src/test/campaignScarDegradedState.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
