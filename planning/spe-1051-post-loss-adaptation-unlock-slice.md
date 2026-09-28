# SPE-1051 — Recoverable failure: post-loss adaptation unlock (slice 4)

| Field               | Value                                                                                                                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                             |
| **Linear**          | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) — umbrella remains **Backlog** after this slice (other ACs remain); do **not** mark SPE-1051 Done                                                                                   |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                                                                                                                |
| **Related**         | Slice 1 scar registry (`planning/spe-1051-scar-degraded-registry-slice.md`); slice 2 state-change success (`planning/spe-1051-state-change-success-slice.md`); slice 3 living-but-lost catalog (`planning/spe-1051-living-but-lost-morale-memory-catalog-slice.md`). SPE-1694 stays **Canceled** (not an owner). |
| **Branch**          | `cursor/spe-1051-adaptation-unlock`                                                                                                                                                                                                                                                                              |
| **Base `main` SHA** | `70dcfa9458b9beed16bb14a58799b724b5802543`                                                                                                                                                                                                                                                                       |

## Goal

Add a pure deterministic projector that turns caller-owned prior scar ids and/or living-but-lost catalog effect ids into one named post-loss adaptation unlock because of prior collapse history — without rewriting scar/catalog semantics, GameState persistence, week-close, UI, true-defeat, after-action narrative, or sealed-site endings.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | Slice 1 `campaignScarDegradedState.ts` (`isCampaignScarId`); slice 3 `livingButLostMoraleMemoryCatalog.ts` (`isLivingButLostMoraleMemoryKind`); slice 2 `incidentStateChangeResolution.ts` fail-closed pattern; no prior adaptation-unlock module              |
| Current behavior  | SPE-1051 slices 1–3 ship scar registry, state-change success, and living-but-lost catalog; umbrella AC for post-loss adaptation unlock from prior collapse history unmet; SPE-1694 canceled                                                                    |
| Expected behavior | Caller-owned prior scar ids and/or catalog kinds → immutable `adaptation_unlocked` projection with exactly one named unlock (`stricter_access_rules`); preserves prior collapse history; fail-closed omit/empty/unknown/malformed                              |
| Boundary          | Pure unlock projector + validate/project + contract tests + slice doc + Deferred retarget on slices 1–3 + backlog handoff. No GameState, week-close, UI, true-defeat, SPE-2261/2262 edits, no rewrite of SCAR_DEFINITIONS or catalog kinds, no SPE-1694 reopen |
| Risks             | Expanding into full SPE-1051 adaptation list; treating unlock as mutation of scars/catalog; reopening SPE-1694; marking SPE-1051 Done                                                                                                                          |
| Validation        | `src/test/postLossAdaptationUnlock.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                                                                                                                                                   |
| Docs              | This slice doc; retarget Deferred row on slices 1–3; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                                                                              |

## Boundary

### In scope

- Compact authored unlock set in `src/domain/postLossAdaptationUnlock.ts`: primary unlock `stricter_access_rules`
- Caller-owned input: optional `priorScarIds`, optional `priorMoraleMemoryKinds` (at least one non-empty known history required)
- `validatePostLossAdaptationUnlockInput` + `projectPostLossAdaptationUnlock`
- Success projection: `outcomeKind: 'adaptation_unlocked'`; exactly one named unlock; `preservesPriorCollapseHistory: true`
- Reuse `isCampaignScarId` and `isLivingButLostMoraleMemoryKind`
- Fail-closed omit / null / undefined / unknown id / empty history / malformed arrays
- Targeted Vitest contract coverage
- Retarget Deferred row on existing SPE-1051 slice docs (drop SPE-1694 ownership)

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, combat win/loss economy
- True-defeat / agency-dissolution thresholds (SPE-1103 adjacency)
- Full SPE-1051 adaptation list (better audits, trauma care, emergency authority, backup sites, forbidden countermeasures)
- Full living-but-lost taxonomy, care burden, recovery paths
- Sealed-site / confiscated-evidence endings
- SPE-868 after-action cause-chain narrative surface
- SPE-2261 / SPE-2262 registry semantic changes; SPE-3118 labor boundaries
- Rewrite of slice 1 `SCAR_DEFINITIONS` or slice 3 catalog kind tables
- Reopening or closing SPE-1694 (stays **Canceled**; not an owner)
- Parent SPE-1052 closure; full SPE-1051 umbrella Done

## Seam

Callers pass prior collapse history as known `CampaignScarId` values and/or known `LivingButLostMoraleMemoryKind` values. `projectPostLossAdaptationUnlock` returns an immutable projection naming `stricter_access_rules` when at least one known history id is present. Contributing ids are deduped into authored registry/catalog order. The unlock record is additive only — callers keep using scar and catalog projectors unchanged. Malformed or omitted inputs fail closed to `undefined`. No randomness; no GameState import.

## Acceptance (slice 4)

- [x] At least one post-loss adaptation unlocks because of prior collapse history (`stricter_access_rules` from known scar and/or catalog priors)
- [x] Projection preserves prior collapse history (`preservesPriorCollapseHistory: true`); does not erase or rewrite scar/catalog effects
- [x] Tests cover configured unlock from scar and/or catalog history, omit/malformed/unknown/empty fail-closed, determinism, and unchanged scar/catalog behavior
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1051 umbrella remains **Backlog** for deferred ACs; SPE-1694 stays **Canceled**

## Deferred

| Item or mechanic                                                                                                  | Owner or prerequisite                    | Why deferred                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Additional adaptation unlocks (audits, trauma care, emergency authority, backup sites, forbidden countermeasures) | SPE-1051 later slice                     | Slice ships one primary unlock (`stricter_access_rules`) only                         |
| Full living-but-lost taxonomy + care / recovery paths                                                             | SPE-1051 later slice; SPE-1682 adjacency | Compact catalog already shipped in slice 3; taxonomy/recovery stay out                |
| After-action cause-chain explanation surface                                                                      | SPE-1051 later slice; SPE-868 adjacency  | No after-action narrative output in this slice                                        |
| Sealed-site / confiscated-evidence endings                                                                        | SPE-1051 later slice                     | Survival-with-clarity-loss endings beyond slice-1 `knowledgeClarityLoss` effect field |
| True-defeat / agency-dissolution thresholds                                                                       | SPE-1103 / SPE-1051 later slice          | Slice intentionally omits game-over / true-defeat outcome kinds                       |
| Week-close / GameState wire of scars, catalog, or adaptation unlocks                                              | later SPE-1051 / SPE-1052 child          | Caller-owned projection only                                                          |
| Consume of SPE-2261 pathway outputs into scar / unlock triggers                                                   | SPE-2261 shipped; wire stays deferred    | Do not rewrite SPE-2261; callers may pass history independently                       |
| Broader collapse-chain AC beyond slice-1 scar cascade                                                             | SPE-1051 later slice                     | Slice 1 cascade exists; additional multi-system collapse chains stay deferred         |
| SPE-1694 Post-loss legacy interventions                                                                           | **Canceled** — do not reopen             | Ownership of adaptation unlock stays on SPE-1051; SPE-1694 is not an owner            |

Parent SPE-1052 remains **Backlog**. SPE-1051 remains **Backlog** after merge (slice 4 adaptation unlock shipped; umbrella ACs incomplete). Do not close SPE-1052 from this slice. Do not mark SPE-1051 Done. Do not reopen SPE-1694.

## Validation

- Targeted Vitest: `src/test/postLossAdaptationUnlock.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
