# SPE-2912 — Additional pipeline variants plus task/test/advanced-action modes

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Linear**          | [SPE-2912](https://linear.app/spectranoir/issue/SPE-2912/additional-pipeline-variants-plus-tasktestadvanced-action-modes)                                                                                                                                                                                                                                                                                                                                                                                       |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Prerequisite**    | [SPE-2900](https://linear.app/spectranoir/issue/SPE-2900/volatile-action-phase-spine-and-no-stakes-bypass) spine; [SPE-2901](https://linear.app/spectranoir/issue/SPE-2901/interruption-mutation-at-after-posture-commit) interrupt rewrite; [SPE-2902](https://linear.app/spectranoir/issue/SPE-2902/held-aborted-or-delayed-actions-keyed-for-saveload) hold as input; [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) order consumed, not rescored |
| **Branch**          | `cursor/spe-62-pipeline-variants-modes-1b67`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Base `main` SHA** | `a440804c`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Goal

One extra bounded pipeline variant plus explicit task / test / advanced-action mode tags on the SPE-2900 grammar. Both declared variants run the same frozen phase ids. Mode is required input. Mode does not change SPE-54 scores. No-stakes skip, interrupt rewrite, and hold composition stay identical. Fail-closed unknown variant or mode. Do not close parent SPE-62 or GitHub #62.

## Boundary

Extend `resolveVolatileActionPhasePipeline` in place. Do not invent a second pipeline or sequencer.

Declared variant list (no new phase ids):

- `volatile_action_v1`
- `volatile_action_procedure_v1` — extra named family that still runs `VOLATILE_ACTION_V1_PHASE_IDS`

Frozen shared phase order: `posture_commit` → `environmental_read` → `clash_window` → `effect_emission` → `cleanup`. Do not add, remove, or reorder inspectable ids. Do not silently fork phase ids.

`mode` is required `'task' | 'test' | 'advanced_action'`. Never infer variant or mode from actor array order, phase array order, or SPE-54 scores. Result echoes the accepted `variantId` and `mode`.

No-stakes skip, SPE-2901 interrupt rewrite, and SPE-2902 hold apply identically on both variants and all three modes. No named exceptions. SPE-2902 hold stays **input**; do not change hold/abort persistence.

Fail-closed: unknown variant; missing/unknown mode. Match existing throw-string style.

Hidden-combat optional attach names `mode: 'advanced_action'` at the call site. Do not add UI, store, or schema.

Do not change the SPE-54 kernel. Do not implement SPE-73 odds/outcomes, SPE-2847 orchestration, SPE-2217 field action economy registry, or risk-first hazard.

## Deferred

| Item or mechanic                             | Owner or prerequisite                                                                                | Why deferred                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Risk-first impending-hazard declaration      | later SPE-62 child                                                                                   | Parent AC not claimed by this child        |
| Unified outcome bands / single-roll math     | [SPE-73](https://linear.app/spectranoir/issue/SPE-73/local-confrontation-resolution-with-odds-bands) | Confrontation outcomes stay out            |
| Encounter round loop / action choice / apply | [SPE-2847](https://linear.app/spectranoir/issue/SPE-2847/deterministic-tactical-encounter-runner)    | Orchestration stays out                    |
| Field action economy registry                | [SPE-2217](https://linear.app/spectranoir/issue/SPE-2217/field-action-economy-registry-slice-1)      | Sibling child; keep out of this slice      |
| Explanation / budget / spatial wiring        | later SPE-62 child                                                                                   | Pipeline remains a pure inspectable record |
| Multi-stage procedure iteration              | later SPE-62 child                                                                                   | One volatile action context only           |

## Acceptance

- `volatile_action_procedure_v1` keeps the same inspectable phase ids as `volatile_action_v1`
- Task / test / advanced_action mode does not change SPE-54 scores
- No-stakes skip and SPE-2901/SPE-2902 composition stay identical across both variants and all three modes
- Fail-closed unknown variant and unknown/missing mode
- Mode and variant are never inferred from array order
- SPE-54 `volatileActionPriority` tests stay green
- Parent SPE-62 remains Backlog; do not close GitHub #62

## Validation

- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts src/test/volatileActionHoldRecords.contract.test.ts src/test/volatileActionPriority.test.ts src/test/hiddenCombatResolver.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check` on touched files
- `npm run verify:backlog-handoff`
