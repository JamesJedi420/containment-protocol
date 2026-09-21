# SPE-2915 — Risk-first impending-hazard declaration and consequence-reduction ladders

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Linear**          | [SPE-2915](https://linear.app/spectranoir/issue/SPE-2915/risk-first-impending-hazard-declaration-and-consequence-reduction)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Prerequisite**    | [SPE-2900](https://linear.app/spectranoir/issue/SPE-2900/volatile-action-phase-spine-and-no-stakes-bypass) spine; [SPE-2901](https://linear.app/spectranoir/issue/SPE-2901/interruption-mutation-at-after-posture-commit) interrupt rewrite; [SPE-2902](https://linear.app/spectranoir/issue/SPE-2902/held-aborted-or-delayed-actions-keyed-for-saveload) hold as input; [SPE-2912](https://linear.app/spectranoir/issue/SPE-2912/additional-pipeline-variants-plus-tasktestadvanced-action-modes) variants + modes; [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) order consumed, not rescored |
| **Branch**          | `cursor/spe-2915-risk-first-hazard-01ae`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Base `main` SHA** | `e0cde737`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Goal

One explicit pre-commitment impending-hazard declaration on the existing SPE-2900 grammar, plus a consequence-reduction ladder that runs through the same ordered phases. Hazard is authored. Frozen phase ids stay the same length and order. No-stakes skip, interrupt rewrite, hold, and SPE-2912 variant/mode tags stay compatible. Missing/unknown hazard authority fails closed. Do not close parent SPE-62 or GitHub #62.

This child owns the SPE-1736 duplicate / threat-first fold-in already scoped on SPE-62. Do not reopen SPE-1736.

## Boundary

Extend `resolveVolatileActionPhasePipeline` in place. Do not invent a second pipeline, sequencer, or persisted hazard ledger.

Frozen shared phase order: `posture_commit` → `environmental_read` → `clash_window` → `effect_emission` → `cleanup`. Do not add, remove, or reorder inspectable ids. Do not silently fork phase ids.

`hazard` is an optional tagged union on the input. Never infer hazard from SPE-54 scores, actor array order, phase array order, variant, or mode. Omit or `{ kind: 'none' }` keeps the SPE-2912 default. `{ kind: 'impending' }` requires `hazardId` and `declaredAtPhaseId: 'posture_commit'` (pre-commit window only).

When impending is accepted and stakes are present, declaration records on `posture_commit` (`status: 'declared'`). The ladder walks existing later phases only: `expose` @ `environmental_read`, `mitigate` @ `clash_window`, `apply` @ `effect_emission`. Ladder step status is the already-resolved phase status. Do not change phase statuses because a hazard exists.

No-stakes skip still bypasses clash + emission. No-stakes does not enter volatile hazard resolution: declaration is `bypassed` and every ladder step is `skipped`. SPE-2901 interrupt rewrite and SPE-2902 hold must not revive skipped clash/emission.

Fail-closed: object required when hazard is present; `kind` must be `none` | `impending`; missing/empty/whitespace or prototype-unsafe/integer-index `hazardId` throws; declaration window other than `posture_commit` throws.

Do not change the SPE-54 kernel. Equal SPE-54 scores keep fallback then actor id. Do not implement SPE-73 odds/outcomes, SPE-2847 orchestration, SPE-2217 field action economy registry, simultaneous-hazard prioritization, bargain-style added threats, a stricter severe-mode threshold, UI, store, schema, or SPE-2902 hold persistence.

## Deferred

| Item or mechanic                              | Owner or prerequisite                                                                                                    | Why deferred                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Simultaneous-hazard prioritization / bargains | rest of [SPE-1736](https://linear.app/spectranoir/issue/SPE-1736/threat-first-action-resolution-engine) (keep Duplicate) | One authored hazard only in this child     |
| Unified outcome bands / single-roll math      | [SPE-73](https://linear.app/spectranoir/issue/SPE-73/local-confrontation-resolution-with-odds-bands)                     | Confrontation outcomes stay out            |
| Encounter round loop / action choice / apply  | [SPE-2847](https://linear.app/spectranoir/issue/SPE-2847/deterministic-tactical-encounter-runner)                        | Orchestration stays out                    |
| Field action economy registry                 | [SPE-2217](https://linear.app/spectranoir/issue/SPE-2217/field-action-economy-registry-slice-1)                          | Sibling child; keep out of this slice      |
| Explanation / budget / spatial wiring         | later SPE-62 child                                                                                                       | Pipeline remains a pure inspectable record |
| Multi-stage procedure iteration               | later SPE-62 child                                                                                                       | One volatile action context only           |

## Acceptance

- Explicit impending hazard present vs omit / `{ kind: 'none' }` is inspectable; omit and none are byte-stable equals
- Hazard declares before commitment (`posture_commit`); never after emission
- Consequence-reduction ladder timing follows the ordered phases; step status uses existing phase statuses only
- No-stakes still bypasses clash + emission and does not enter volatile hazard resolution
- Interrupt/hold do not revive skipped clash/emission
- Variant/mode tags unchanged across both SPE-2912 variants and all three modes
- Fail-closed unknown/missing hazard authority
- Hazard is never inferred from SPE-54 scores, array order, variant, or mode
- SPE-54 `volatileActionPriority` tests stay green
- Parent SPE-62 remains Backlog; do not close GitHub #62

## Validation

- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts src/test/volatileActionHoldRecords.contract.test.ts src/test/volatileActionPriority.test.ts src/test/hiddenCombatResolver.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check` on touched files
- `npm run verify:backlog-handoff`
