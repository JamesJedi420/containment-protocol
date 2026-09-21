# SPE-2916 — Inspectable volatile-action pipeline explanation

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Linear**          | [SPE-2916](https://linear.app/spectranoir/issue/SPE-2916/inspectable-volatile-action-pipeline-explanation-phase-skip-interrupt)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Prerequisite**    | [SPE-2900](https://linear.app/spectranoir/issue/SPE-2900/volatile-action-phase-spine-and-no-stakes-bypass) spine; [SPE-2901](https://linear.app/spectranoir/issue/SPE-2901/interruption-mutation-at-after-posture-commit) interrupt rewrite; [SPE-2902](https://linear.app/spectranoir/issue/SPE-2902/held-aborted-or-delayed-actions-keyed-for-saveload) hold as input; [SPE-2912](https://linear.app/spectranoir/issue/SPE-2912/additional-pipeline-variants-plus-tasktestadvanced-action-modes) variants + modes; [SPE-2915](https://linear.app/spectranoir/issue/SPE-2915/risk-first-impending-hazard-declaration-and-consequence-reduction) hazard declaration + ladder; [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) order consumed, not rescored |
| **Branch**          | `cursor/spe-62-inspectable-explanation-7e9a`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Base `main` SHA** | `96b3613b`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Goal

One inspectable explanation record on `resolveVolatileActionPhasePipeline` so callers can see why a phase, skip, interrupt, hold, or hazard-ladder step occurred. Explanation is derived from already-resolved SPE-2900–SPE-2915 fields only. Frozen phase ids stay the same length and order. No second sequencer. Do not close parent SPE-62 or GitHub #62.

This child owns the parent AC: players can inspect or infer why an effect occurred before, during, or after traversal/exposure.

## Boundary

Extend `resolveVolatileActionPhasePipeline` in place. Prefer a named `explanation` field on `VolatileActionPhasePipelineResult`. Do not invent a second sequencer, UI, store, schema, or persisted explanation ledger. This child does not own hydrate.

Frozen shared phase order: `posture_commit` → `environmental_read` → `clash_window` → `effect_emission` → `cleanup`. Do not add, remove, or reorder inspectable ids. Do not silently fork phase ids.

`explanation` is always emitted. There is no authored explanation input and no omit path; callers inspect resolved statuses without a second ledger. Reason codes are stable strings derived from `phases[].status`, `bypassed`, `interrupt`, `hold`, `hazardDeclaration`, and `consequenceReduction`. Never infer explanation from SPE-54 scores, actor array order, phase array order, variant, or mode. Do not leak hidden combat scores.

No-stakes skip still explains `clash_window` and `effect_emission` as skipped because stakes none. Known edge: `environmental_read` may `ran` while the `expose` ladder step is `skipped` (`ladder_skipped_stakes_none`) because no-stakes does not enter volatile hazard resolution. Interrupt rewrite and hold still lose to no-stakes skip. Hazard does not change phase statuses.

Optional hidden-combat attach may include `explanation` without changing outcome math and without starting to pass hazard.

Do not change the SPE-54 kernel, SPE-2915 hazard grammar, or SPE-2902 hold persistence. Equal SPE-54 scores keep fallback then actor id. Do not implement SPE-73 odds/outcomes, SPE-2847 orchestration, SPE-2217 field action economy, budget/spatial mutations, or multi-stage procedure iteration.

## Deferred

| Item or mechanic                             | Owner or prerequisite                                                                                | Why deferred                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Budget / spatial wiring                      | later SPE-62 child                                                                                   | Pipeline remains a pure inspectable record; no budget or spatial mutations |
| Multi-stage procedure iteration              | later SPE-62 child                                                                                   | One volatile action context only                                           |
| Unified outcome bands / single-roll math     | [SPE-73](https://linear.app/spectranoir/issue/SPE-73/local-confrontation-resolution-with-odds-bands) | Confrontation outcomes stay out                                            |
| Encounter round loop / action choice / apply | [SPE-2847](https://linear.app/spectranoir/issue/SPE-2847/deterministic-tactical-encounter-runner)    | Orchestration stays out                                                    |
| Field action economy registry                | [SPE-2217](https://linear.app/spectranoir/issue/SPE-2217/field-action-economy-registry-slice-1)      | Sibling child; keep out of this slice                                      |

## Acceptance

- Explanation is always present on pipeline output; omit/none interrupt/hold/hazard still emit the same derived record
- No-stakes skip reason: clash + emission skipped because stakes none; bypass explained without entering clash/emission; expose ladder step skipped while `environmental_read` ran; declaration bypassed; every ladder step skipped
- Interrupt reasons match already-resolved later-phase statuses (prepended / truncated / redirected); `posture_commit` stays ran; no-stakes skipped still wins over interrupt rewrite
- Hold reasons match already-resolved statuses (held / aborted / delayed); no-stakes skip and interrupt rewrite still win
- Hazard-ladder reasons match `hazardDeclaration` + `consequenceReduction` step statuses; do not change phase statuses because a hazard exists
- Variant/mode tags unchanged across both SPE-2912 variants and all three modes
- No authored explanation input; therefore no extra explanation-authority fail-closed path
- SPE-54 `volatileActionPriority` tests stay green
- Parent SPE-62 remains Backlog; do not close GitHub #62

## Validation

- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts src/test/volatileActionHoldRecords.contract.test.ts src/test/volatileActionPriority.test.ts src/test/hiddenCombatResolver.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check` on touched files
- `npm run verify:backlog-handoff`
