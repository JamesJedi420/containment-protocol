# SPE-1051 — Recoverable failure: living-but-lost / morale-memory catalog (slice 3)

| Field               | Value                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                              |
| **Linear**          | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) — umbrella remains **Backlog** after this slice      |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella)       |
| **Related**         | Slice 1 scar registry (`planning/spe-1051-scar-degraded-registry-slice.md`); slice 2 state-change success (`planning/spe-1051-state-change-success-slice.md`); SPE-1682 adjacency |
| **Branch**          | `cursor/spe-1051-living-but-lost-catalog-d49d`                                                                                                                                    |
| **Base `main` SHA** | `64ef38f93e25772b7dc96a303972ae342802a925`                                                                                                                                        |

## Goal

Add a pure deterministic living-but-lost / morale-memory catalog so a configured survivor or staff group retains named persistent effects after loss — beyond the slice-1 single `survivor_trauma_scar` / `morale_memory_drag` modifier — without inventing the full SPE-1051 taxonomy, GameState persistence, week-close, UI, true-defeat, or recovery economies.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | Slice 1 `campaignScarDegradedState.ts` (`survivor_trauma_scar` / `morale_memory_drag` ceiling); slice 2 `incidentStateChangeResolution.ts` fail-closed projector; no prior living-but-lost catalog module        |
| Current behavior  | SPE-1051 slices 1–2 ship scar registry + state-change success; umbrella AC for persistent morale / memory / living-but-lost after loss unmet beyond the one trauma-scar modifier                                 |
| Expected behavior | Caller-owned group + catalog kind(s) → immutable `persistent_after_loss` projection with named effects that survive personnel turnover                                                                           |
| Boundary          | Pure catalog + validate/project + contract tests + slice doc + Deferred retarget on slices 1–2 + backlog handoff. No GameState, week-close, UI, true-defeat, SPE-2261/2262 edits, no rewrite of SCAR_DEFINITIONS |
| Risks             | Treating slice-1 `morale_memory_drag` as this deliverable; expanding into full living-but-lost taxonomy / recovery paths; parallel scar registry                                                                 |
| Validation        | `src/test/livingButLostMoraleMemoryCatalog.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                                                                                             |
| Docs              | This slice doc; retarget Deferred row on slices 1–2; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                                |

## Boundary

### In scope

- Compact authored kinds in `src/domain/livingButLostMoraleMemoryCatalog.ts`: `guilt`, `distrust`, `refusal`, `protective_custody`
- Caller-owned input: required `retainedByGroupId` / `retainedByGroupKind`; optional `effectKind`, `priorEffectKinds`, `personnelTurnoverCount`, `relatedScarId`
- `validateLivingButLostMoraleMemoryInput` + `projectLivingButLostMoraleMemory`
- Success projection: `outcomeKind: 'persistent_after_loss'`; at least one named effect retained by a survivor or staff group
- Persistence across personnel turnover via `priorEffectKinds` (turnover count never clears effects)
- Optional `relatedScarId` validated with `isCampaignScarId` (typically `survivor_trauma_scar` beside `morale_memory_drag`)
- Fail-closed omit / null / undefined / unknown kind / empty group id / malformed priors / unknown scar id
- Targeted Vitest contract coverage
- Retarget Deferred row on existing SPE-1051 slice docs

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, combat win/loss economy
- True-defeat / agency-dissolution thresholds (SPE-1103 adjacency)
- Full living-but-lost taxonomy (institutionalization, fugue, paranoia, chanting fixation, dissociation, identity erosion, patron devotion, anomaly obsession, care burden, recovery paths)
- Post-loss adaptation unlocks (SPE-1051 later slice; SPE-1694 stays Canceled), sealed-site / confiscated-evidence endings
- SPE-868 after-action cause-chain narrative surface
- SPE-2261 / SPE-2262 registry semantic changes; SPE-3118 labor boundaries
- Rewrite of slice 1 `SCAR_DEFINITIONS` / `morale_memory_drag` into a second scar system
- Parent SPE-1052 closure; full SPE-1051 umbrella Done

## Seam

Callers pass a retained survivor/staff group plus either a configured `effectKind` or non-empty `priorEffectKinds`. `projectLivingButLostMoraleMemory` returns an immutable projection listing catalog effects in authored order. `personnelTurnoverCount` never clears effects; `priorEffectKinds` re-emit carried kinds. Optional `relatedScarId` must pass `isCampaignScarId` when present (reuse scar-id helpers; do not require GameState). Malformed or omitted inputs fail closed to `undefined`. No randomness; no GameState import.

## Acceptance (slice 3)

- [x] At least one survivor or staff group retains a persistent morale, memory, or living-but-lost effect after loss (catalog beyond the single trauma-scar modifier)
- [x] Catalog includes more than one authored kind sitting beside `morale_memory_drag` (`guilt`, `distrust`, `refusal`, `protective_custody`)
- [x] Tests cover configured success path, omit/malformed fail-closed, determinism, and persistence across personnel turnover
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1051 umbrella remains **Backlog** for deferred ACs

## Deferred

| Item or mechanic                                                       | Owner or prerequisite                                                                                       | Why deferred                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Full living-but-lost taxonomy + care / recovery paths                  | SPE-1051 later slice; SPE-1682 adjacency                                                                    | Compact catalog only; institutionalization/fugue/paranoia/etc. and recovery economies stay out |
| Post-loss adaptation unlocks from scar / catalog history               | SPE-1051 — `planning/spe-1051-post-loss-adaptation-unlock-slice.md` (SPE-1694 stays Canceled; not an owner) | Catalog projects effects; unlock economy owned by SPE-1051 adaptation-unlock slice             |
| After-action cause-chain explanation surface                           | SPE-1051 slice 5 — `planning/spe-1051-after-action-cause-chain-slice.md` (SPE-868 adjacency: no full review-metrics) | Slice 3 ships catalog only; cause-chain owned by slice 5                                       |
| Sealed-site / confiscated-evidence endings                             | SPE-1051 later slice                                                                                        | Survival-with-clarity-loss endings beyond slice-1 `knowledgeClarityLoss` effect field          |
| True-defeat / agency-dissolution thresholds                            | SPE-1103 / SPE-1051 later slice                                                                             | Slice intentionally omits game-over / true-defeat outcome kinds                                |
| Week-close / GameState wire of campaign scars or morale-memory catalog | later SPE-1051 / SPE-1052 child                                                                             | Caller-owned projection only                                                                   |
| Consume of SPE-2261 pathway outputs into scar / morale triggers        | SPE-2261 shipped; wire stays deferred                                                                       | Do not rewrite SPE-2261; callers may pass pressures independently                              |
| Broader collapse-chain AC beyond slice-1 scar cascade                  | SPE-1051 later slice                                                                                        | Slice 1 cascade exists; additional multi-system collapse chains stay deferred                  |

Parent SPE-1052 remains **Backlog**. SPE-1051 remains **Backlog** (slice 3 living-but-lost / morale-memory catalog shipped; umbrella ACs incomplete). Do not close SPE-1052 from this slice. Do not mark SPE-1051 Done.

## Validation

- Targeted Vitest: `src/test/livingButLostMoraleMemoryCatalog.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
