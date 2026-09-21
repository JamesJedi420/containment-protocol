# SPE-2930 — Budget / spatial wiring of the volatile-action pipeline

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Linear**          | [SPE-2930](https://linear.app/spectranoir/issue/SPE-2930/budget-spatial-wiring-of-the-volatile-action-pipeline-readiness-action)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Prerequisite**    | [SPE-2900](https://linear.app/spectranoir/issue/SPE-2900/volatile-action-phase-spine-and-no-stakes-bypass) spine; [SPE-2901](https://linear.app/spectranoir/issue/SPE-2901/interruption-mutation-at-after-posture-commit) interrupt rewrite; [SPE-2902](https://linear.app/spectranoir/issue/SPE-2902/held-aborted-or-delayed-actions-keyed-for-saveload) hold as input; [SPE-2912](https://linear.app/spectranoir/issue/SPE-2912/additional-pipeline-variants-plus-tasktestadvanced-action-modes) variants + modes; [SPE-2915](https://linear.app/spectranoir/issue/SPE-2915/risk-first-impending-hazard-declaration-and-consequence-reduction) hazard declaration + ladder; [SPE-2916](https://linear.app/spectranoir/issue/SPE-2916/inspectable-volatile-action-pipeline-explanation-phase-skip-interrupt) always-emitted explanation; [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) order consumed, not rescored |
| **Branch**          | `cursor/spe-62-budget-spatial-wiring-71e4`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Base `main` SHA** | `71e4efad`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Goal

Connect `resolveVolatileActionPhasePipeline` to existing readiness, action-budget, spatial, and condition systems as inspectable phase wiring. Wiring is authored. Frozen phase ids stay the same length and order. SPE-2916 explanation stays always emitted and gains stable wiring reason codes. No second sequencer. Do not close parent SPE-62 or GitHub #62.

This child owns the remaining parent AC: connect the pipeline to existing readiness, action-budget, spatial, and condition systems. Explanation already shipped by SPE-2916.

## Boundary

Extend `resolveVolatileActionPhasePipeline` in place. Prefer existing domain helpers over new abstractions. Do not invent a second sequencer, a parallel action economy, a proximity registry, or a persisted wiring ledger. Pipeline stays GameState-free. This child does not own hydrate.

Frozen shared phase order: `posture_commit` → `environmental_read` → `clash_window` → `effect_emission` → `cleanup`. Do not add, remove, or reorder inspectable ids. Do not silently fork phase ids.

`wiring` is an optional tagged union on the input. Never infer wiring from SPE-54 scores, actor array order, phase array order, variant, or mode. Omit or `{ kind: 'none' }` keeps the SPE-2916 default. `{ kind: 'present' }` requires tagged snapshots for readiness, action-budget, spatial, and condition.

Readiness consumes an inspectable band record. SPE-54 already scores readiness as a priority factor; this child records how `unavailable` constrains `clash_window` and does not rescore SPE-54.

Action-budget is one bounded inspectable constraint. Remaining `0` without `freeTrigger` empties `after_posture_commit` reaction-window actor ids and skips remaining `'ran'` `clash_window`. Fold SPE-2206 only as that response-budget + free-trigger exemption — not a separate registry and not SPE-40.

Spatial consumes authored `spatialFlags` plus optional `visibilityState` as `environmental_read` facts. `visibilityState: 'obstructed'` skips remaining `'ran'` `environmental_read`. Do not dump knowledge copy from `src/domain/explanations.ts` or `src/domain/visibility.ts`. SPE-2188 proximity stays a trigger-condition input if already present; do not create a proximity registry.

Condition reuses existing flag / progress-clock / predicate kinds as an authored `passes` snapshot. `passes: false` skips remaining `'ran'` `effect_emission`. Do not duplicate GameState evaluators.

No-stakes skip still owns clash + emission. Interrupt rewrite and hold still win over wiring when those statuses already apply. Wiring never revives a skipped clash/emission.

Fail-closed: object required when wiring is present; `kind` must be `none` | `present`; missing nested snapshots, empty/unsafe ids, unknown readiness band, non-integer remaining, unknown visibility, or unknown condition kind throw. Match existing throw-string style.

SPE-2916 `explanation` is still always emitted. Wiring reasons are stable string codes derived from already-resolved wiring records. No second authored ledger.

Optional hidden-combat attach may include wiring without changing outcome math and without starting to pass hazard.

Do not change the SPE-54 kernel, SPE-2915 hazard grammar, SPE-2902 hold persistence, or the SPE-2916 always-emitted explanation contract. Equal SPE-54 scores keep fallback then actor id. Do not implement SPE-73 odds/outcomes, SPE-2847 orchestration, SPE-2217 field action economy, SPE-40 mission tradeoffs, or multi-stage procedure iteration.

## Deferred

| Item or mechanic                              | Owner or prerequisite                                                                                   | Why deferred                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Multi-stage procedure iteration               | later SPE-62 child                                                                                      | One volatile action context only                                |
| Unified outcome bands / single-roll math      | [SPE-73](https://linear.app/spectranoir/issue/SPE-73/local-confrontation-resolution-with-odds-bands)    | Confrontation outcomes stay out                                 |
| Encounter round loop / action choice / apply  | [SPE-2847](https://linear.app/spectranoir/issue/SPE-2847/deterministic-tactical-encounter-runner)       | Orchestration stays out                                         |
| Field action economy registry                 | [SPE-2217](https://linear.app/spectranoir/issue/SPE-2217/field-action-economy-registry-slice-1)         | Sibling child; keep out of this slice                           |
| SPE-40 remaining mission-tradeoff AC          | [SPE-40](https://linear.app/spectranoir/issue/SPE-40/operational-action-budget-and-mission-tradeoffs)   | Retries / abandonment / mission tradeoffs stay on SPE-40        |
| Simultaneous-hazard prioritization / bargains | rest of [SPE-1736](https://linear.app/spectranoir/issue/SPE-1736/threat-first-action-resolution-engine) | Hazard grammar already owned by SPE-2915; keep Duplicate closed |

## Acceptance

- Explicit wiring present vs omit / `{ kind: 'none' }` is inspectable; omit and none are byte-stable equals
- At least one existing readiness record, one action-budget constraint, one spatial fact, and one condition predicate are visible on pipeline output and explain or constrain a phase/skip without a second sequencer
- Wiring does not revive no-stakes skipped clash/emission; interrupt rewrite and hold still win over wiring when those statuses already apply
- SPE-2916 explanation is still always present; wiring reasons are stable string codes, not free-form prose
- Variant/mode tags unchanged across both SPE-2912 variants and all three modes
- Fail-closed unknown/missing wiring authority
- Wiring is never inferred from SPE-54 scores, array order, variant, or mode
- SPE-54 `volatileActionPriority` tests stay green
- Parent SPE-62 remains Backlog; do not close GitHub #62

## Validation

- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts src/test/volatileActionHoldRecords.contract.test.ts src/test/volatileActionPriority.test.ts src/test/hiddenCombatResolver.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check` on touched files
- `npm run verify:backlog-handoff`
