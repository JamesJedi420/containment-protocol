# SPE-1051 — Recoverable failure: state-change success resolution (slice 2)

| Field               | Value                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                         |
| **Linear**          | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) — umbrella remains **Backlog** after this slice |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella)  |
| **Related**         | Slice 1 scar registry (`planning/spe-1051-scar-degraded-registry-slice.md`); SPE-2261 fail-closed projector pattern; SPE-868 after-action (do not duplicate)                 |
| **Branch**          | `cursor/spe-1051-state-change-success-1e4d`                                                                                                                                  |
| **Base `main` SHA** | `fb9af17de76d419fb36157915771142c71dd4c61`                                                                                                                                   |

## Goal

Add a pure deterministic projector so a caller-configured incident can resolve through environmental, political, ritual, logistical, institutional, containment, evacuation, evidence, or stabilization state change — including success without entity elimination — without inventing combat win/loss, true-defeat, UI, week-close, or GameState fields.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | Slice 1 `campaignScarDegradedState.ts`; SPE-2261 `institutionalCollapsePathways.ts` fail-closed pattern; no prior `incidentStateChangeResolution` module; no SPE-1414 domain aftermath helper to reuse |
| Current behavior  | SPE-1051 slice 1 ships scar registry; umbrella AC for state-change success resolution unmet                                                                                                            |
| Expected behavior | Caller-owned configured kind → immutable `state_change_success` projection with `entityEliminated: false`                                                                                              |
| Boundary          | Pure projector + validate/project + contract tests + slice doc + slice-1 Deferred retarget + backlog handoff. No GameState, week-close, UI, true-defeat, SPE-2261/2262 edits                           |
| Risks             | Inventing combat win/loss; expanding into living-but-lost / sealed-site / after-action cause chains; rewriting scar registry                                                                           |
| Validation        | `src/test/incidentStateChangeResolution.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                                                                                      |
| Docs              | This slice doc; update slice-1 Deferred row; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                              |

## Boundary

### In scope

- `IncidentStateChangeKind` union of nine authored kinds in `src/domain/incidentStateChangeResolution.ts`
- Caller-owned input: required `stateChangeKind`; optional `incidentId`, `requireEntityElimination`, `operatingConditionDelta`
- `validateIncidentStateChangeResolutionInput` + `projectIncidentStateChangeResolution`
- Success projection: `resolutionKind: 'state_change_success'`, `entityEliminated: false`, `successWithoutEntityElimination: true`
- Fail-closed omit / null / undefined / unknown kind / empty incidentId / non-finite delta / `requireEntityElimination: true`
- Targeted Vitest contract coverage

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, combat win/loss economy
- True-defeat / agency-dissolution thresholds (SPE-1103 adjacency)
- Living-but-lost staff catalog, post-loss adaptation unlocks, sealed-site / confiscated-evidence endings
- SPE-868 after-action cause-chain narrative surface (do not duplicate)
- SPE-2261 / SPE-2262 registry semantic changes; SPE-3118 labor boundaries
- Rewrite of slice 1 scar registry into a second system
- Parent SPE-1052 closure; full SPE-1051 umbrella Done

## Seam

Callers pass a configured `stateChangeKind` (and optional incident id / condition delta). `projectIncidentStateChangeResolution` returns an immutable success projection that records the state-change kind and always sets `entityEliminated: false`. `requireEntityElimination: true` is contradictory and fails closed. Malformed or omitted inputs fail closed to `undefined`. No randomness; no GameState import.

## Acceptance (slice 2)

- [x] At least one incident resolves through state-change success rather than entity elimination when configured
- [x] Tests cover configured success path, omit/malformed fail-closed, determinism, and success without entity elimination
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1051 umbrella remains **Backlog** for deferred ACs

## Deferred

| Item or mechanic                                                             | Owner or prerequisite                                                                                                         | Why deferred                                                                                                                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Survivor living-but-lost / morale-memory catalog beyond trauma scar modifier | SPE-1051 slice 3 — `planning/spe-1051-living-but-lost-morale-memory-catalog-slice.md` (shipped); full taxonomy still deferred | Compact catalog (`guilt` / `distrust` / `refusal` / `protective_custody`) shipped beside `morale_memory_drag`; full living-but-lost taxonomy stays deferred |
| Post-loss adaptation unlocks from scar history                               | SPE-1051 — `planning/spe-1051-post-loss-adaptation-unlock-slice.md` (SPE-1694 stays Canceled; not an owner)                   | Registry projects scars; unlock economy owned by SPE-1051 adaptation-unlock slice                                                                           |
| After-action cause-chain explanation surface                                 | SPE-1051 slice 5 — `planning/spe-1051-after-action-cause-chain-slice.md` (SPE-868 adjacency: no full review-metrics)           | Slice 2 ships state-change success only; cause-chain owned by slice 5                                                                                       |
| Sealed-site / confiscated-evidence endings                                   | SPE-1051 later slice                                                                                                          | Survival-with-clarity-loss endings beyond slice-1 `knowledgeClarityLoss` effect field                                                                       |
| True-defeat / agency-dissolution thresholds                                  | SPE-1103 / SPE-1051 later slice                                                                                               | Slice intentionally omits game-over / true-defeat outcome kinds                                                                                             |
| Week-close / GameState wire of campaign scars or state-change resolutions    | later SPE-1051 / SPE-1052 child                                                                                               | Caller-owned projection only                                                                                                                                |
| Consume of SPE-2261 pathway outputs into scar triggers                       | SPE-2261 shipped; wire stays deferred                                                                                         | Do not rewrite SPE-2261; callers may pass pressures independently                                                                                           |
| Broader collapse-chain AC beyond slice-1 scar cascade                        | SPE-1051 later slice                                                                                                          | Slice 1 cascade exists; additional multi-system collapse chains stay deferred                                                                               |

Parent SPE-1052 remains **Backlog**. SPE-1051 remains **Backlog** (slice 2 state-change projector shipped; umbrella ACs incomplete). Do not close SPE-1052 from this slice. Do not mark SPE-1051 Done.

## Validation

- Targeted Vitest: `src/test/incidentStateChangeResolution.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
