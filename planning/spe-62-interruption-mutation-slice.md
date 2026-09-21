# SPE-2901 — Interruption mutation at after_posture_commit

| Field               | Value                                                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **In Progress**                                                                                                                                                                                                                                          |
| **Linear**          | [SPE-2901](https://linear.app/spectranoir/issue/SPE-2901/interruption-mutation-at-after-posture-commit)                                                                                                                                                  |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**                                                                                                                                          |
| **Prerequisite**    | [SPE-2900](https://linear.app/spectranoir/issue/SPE-2900/volatile-action-phase-spine-and-no-stakes-bypass) spine; [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) order consumed, not rescored |
| **Branch**          | `cursor/interrupt-after-posture-commit-ce72`                                                                                                                                                                                                             |
| **Base `main` SHA** | `a427246b`                                                                                                                                                                                                                                               |

## Goal

One authored, deterministic interrupt at the recorded `after_posture_commit` reaction window may prepend, truncate, or redirect later phase statuses on the SPE-2900 `volatile_action_v1` spine. Interrupt is explicit. Frozen phase ids stay the same length and order. Rewrite later statuses only. No-stakes skip stays compatible. Missing interrupt authority fails closed. Do not close parent SPE-62 or GitHub #62.

## Boundary

Extend `resolveVolatileActionPhasePipeline` in place. Do not invent a second pipeline.

Frozen phase order: `posture_commit` → `environmental_read` → `clash_window` → `effect_emission` → `cleanup`. Do not add, remove, or reorder ids. Do not prepend new phase ids. Do not truncate the array. Redirect is a status rewrite, not a new variant.

`interrupt` is an optional tagged union on the input. Never infer interrupt from actor array order, phase array order, or SPE-54 scores. Omit or `{ kind: 'none' }` keeps the SPE-2900 default. `{ kind: 'prepend' | 'truncate' | 'redirect', windowId: 'after_posture_commit' }` rewrites later phases that would have been `ran`. `posture_commit` always remains `ran`. Later phases already `skipped` (no-stakes clash/emission) stay `skipped`.

Fail-closed: object required when interrupt is present; `windowId` must be `after_posture_commit`; `kind` must be `none` | `prepend` | `truncate` | `redirect`; unknown/empty/whitespace ids throw.

Do not mutate SPE-54 scores or factors. Keep the reaction-window record. Result `interrupt` reports what was applied.

Do not change the SPE-54 kernel. Do not implement SPE-73 odds/outcomes, SPE-2847 orchestration, held/aborted/delayed persistence, extra variants, task/test/advanced-action modes, risk-first hazard, GameState, schema, UI, or store.

## Deferred

| Item or mechanic                                       | Owner or prerequisite | Why deferred                               |
| ------------------------------------------------------ | --------------------- | ------------------------------------------ |
| Held, aborted, or delayed actions keyed for save/load  | later SPE-62 child    | Persistence is out of this mutation        |
| Additional pipeline variants; task/test/advanced modes | later SPE-62 child    | `volatile_action_v1` only                  |
| Unified outcome bands / single-roll math               | SPE-73                | Confrontation outcomes stay out            |
| Encounter round loop / action choice / apply           | SPE-2847              | Orchestration stays out                    |
| Risk-first impending-hazard declaration                | later SPE-62 child    | Parent AC not claimed by this child        |
| Explanation / budget / spatial wiring                  | later SPE-62 child    | Pipeline remains a pure inspectable record |
| Multi-stage procedure iteration                        | later SPE-62 child    | One volatile action context only           |

## Acceptance

- Prepend, truncate, and redirect (stakes present): `posture_commit` `ran`; later phases receive the matching rewrite status; frozen id list length and order unchanged
- Omit interrupt and `{ kind: 'none' }` match the SPE-2900 default
- Fail-closed missing/invalid interrupt authority
- No-stakes + rewrite: clash+emission stay `skipped`; `environmental_read`/`cleanup` follow interrupt; `bypassed: true`
- `side_phase` actor order unchanged vs SPE-54
- SPE-2900 pipeline tests and SPE-54 priority tests stay green
- Parent SPE-62 remains Backlog; do not close GitHub #62

## Validation

- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts src/test/volatileActionPriority.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check` on touched files
- `npm run verify:backlog-handoff`
