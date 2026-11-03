# SPE-1051 — Recoverable failure: after-action cause-chain (slice 5)

| Field               | Value                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                                                                                                           |
| **Linear**          | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) — umbrella remains **Backlog** after this slice (other ACs remain); do **not** mark SPE-1051 Done |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                              |
| **Related**         | Slice 1 scar registry; slice 2 state-change success; slice 3 living-but-lost catalog; slice 4 post-loss adaptation unlock. SPE-868 adjacency (do **not** ship full review-metrics surface). SPE-1694 stays **Canceled**.       |
| **Branch**          | `cursor/spe-1051-after-action-cause-chain`                                                                                                                                                                                     |
| **Base `main` SHA** | `18eb4f4d6f0e811db0e437498e31c41fc36ddb9c`                                                                                                                                                                                     |

## Goal

Add a pure deterministic projector that turns caller-owned failure, scar, and/or living-but-lost catalog history into one after-action output naming a cause chain with intermediate breakdowns and at least one hidden dependency — not only the terminal failure result — without GameState, week-close, UI, true-defeat, sealed-site endings, or a full SPE-868 review-metrics surface.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | Slice 1 `campaignScarDegradedState.ts` (`isCampaignScarId`, cascade `site_abandonment_scar` → `strained_logistics_scar`); slice 3 `livingButLostMoraleMemoryCatalog.ts`; slice 4 `postLossAdaptationUnlock.ts` fail-closed pattern; no prior after-action cause-chain module |
| Current behavior  | SPE-1051 slices 1–4 ship scar registry, state-change success, living-but-lost catalog, and adaptation unlock; umbrella AC for after-action cause-chain with hidden dependencies unmet                                                                                        |
| Expected behavior | Caller-owned terminal failure id and/or prior scar ids and/or catalog kinds → immutable `after_action_cause_chain` projection with named intermediate breakdowns and ≥1 hidden dependency; fail-closed omit/empty/unknown/malformed                                          |
| Boundary          | Pure cause-chain projector + validate/project + contract tests + slice doc + Deferred retarget on prior SPE-1051 slice docs + backlog handoff. No GameState, week-close, UI, true-defeat, sealed-site, SPE-868 metrics rewrite, no SCAR_DEFINITIONS rewrite                  |
| Risks             | Expanding into SPE-868 review metrics; inventing narrative UI; treating projector as GameState mutation; marking SPE-1051 Done                                                                                                                                               |
| Validation        | `src/test/afterActionCauseChain.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                                                                                                                                                                    |
| Docs              | This slice doc; retarget Deferred row on slices 1–4; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                                                                                            |

## Boundary

### In scope

- Compact authored cause-chain set in `src/domain/afterActionCauseChain.ts`: primary chain `recoverable_failure_systemic_collapse`
- Caller-owned input: optional `terminalFailureId`, optional `priorScarIds`, optional `priorMoraleMemoryKinds` (at least one configured history source required)
- `validateAfterActionCauseChainInput` + `projectAfterActionCauseChain`
- Success projection: `outcomeKind: 'after_action_cause_chain'`; named intermediate breakdowns; ≥1 `hiddenDependencyIds`; `explainsBeyondTerminalResult: true`
- Reuse `isCampaignScarId` and `isLivingButLostMoraleMemoryKind`
- Fail-closed omit / null / undefined / unknown id / empty history / malformed arrays
- Targeted Vitest contract coverage
- Retarget Deferred row on existing SPE-1051 slice docs (cause-chain → this slice)

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, combat win/loss economy
- True-defeat / agency-dissolution thresholds (SPE-1103 adjacency)
- Sealed-site / confiscated-evidence endings
- Full SPE-868 post-incident review / response metrics surface
- Full SPE-1051 adaptation list beyond slice 4
- Full living-but-lost taxonomy, care burden, recovery paths
- SPE-2261 / SPE-2262 registry semantic changes; SPE-3118 labor boundaries
- Rewrite of slice 1 `SCAR_DEFINITIONS`, slice 3 catalog kinds, or slice 4 unlock table
- Reopening or closing SPE-1694 (stays **Canceled**; not an owner)
- Parent SPE-1052 closure; full SPE-1051 umbrella Done

## Seam

Callers pass terminal failure and/or prior scar / catalog history. `projectAfterActionCauseChain` returns an immutable projection naming one authored chain, intermediate breakdowns, and at least one hidden dependency when configured history is present. Contributing ids are deduped into authored registry/catalog order. The after-action record is additive only — callers keep using scar, catalog, and unlock projectors unchanged. Malformed or omitted inputs fail closed to `undefined`. No randomness; no GameState import.

## Acceptance (slice 5)

- [x] At least one after-action output explains a cause chain with hidden dependencies rather than only recording the end result
- [x] Projection includes intermediate breakdown ids and `explainsBeyondTerminalResult: true`
- [x] Tests cover configured failure/scar/catalog history → cause chain, omit/malformed/unknown/empty fail-closed, determinism, and unchanged prior SPE-1051 projectors
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1051 umbrella remains **Backlog** for deferred ACs; SPE-1694 stays **Canceled**

## Deferred

| Item or mechanic                                                                                                  | Owner or prerequisite                    | Why deferred                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Additional adaptation unlocks (audits, trauma care, emergency authority, backup sites, forbidden countermeasures) | SPE-1051 later slice                     | Slice 4 ships one primary unlock (`stricter_access_rules`) only                         |
| Full living-but-lost taxonomy + care / recovery paths                                                             | SPE-1051 later slice; SPE-1682 adjacency | Compact catalog already shipped in slice 3; taxonomy/recovery stay out                  |
| Full SPE-868 review-metrics / retrospective surface                                                               | SPE-868 adjacency                        | This slice ships cause-chain explanation only; no review-metrics registry               |
| Sealed-site / confiscated-evidence endings                                                                        | SPE-1051 slice 6 — `planning/spe-1051-sealed-site-confiscated-evidence-slice.md` | Survival-with-clarity-loss endings owned by slice 6 (`survival_with_clarity_loss`)      |
| True-defeat / agency-dissolution thresholds                                                                       | SPE-1103 / SPE-1051 later slice          | Slice intentionally omits game-over / true-defeat outcome kinds                         |
| Week-close / GameState wire of scars, catalog, adaptation, or after-action                                        | later SPE-1051 / SPE-1052 child          | Caller-owned projection only                                                            |
| Consume of SPE-2261 pathway outputs into scar / after-action triggers                                             | SPE-2261 shipped; wire stays deferred    | Do not rewrite SPE-2261; callers may pass history independently                         |
| Broader collapse-chain AC beyond slice-1 scar cascade + this cause-chain                                          | SPE-1051 later slice                     | Slice 1 cascade + this after-action exist; additional multi-system chains stay deferred |
| SPE-1694 Post-loss legacy interventions                                                                           | **Canceled** — do not reopen             | Ownership stays on SPE-1051; SPE-1694 is not an owner                                   |

Parent SPE-1052 remains **Backlog**. SPE-1051 remains **Backlog** after merge (slice 5 after-action cause-chain shipped; umbrella ACs incomplete). Do not close SPE-1052 from this slice. Do not mark SPE-1051 Done. Do not reopen SPE-1694.

## Validation

- Targeted Vitest: `src/test/afterActionCauseChain.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
