# SPE-2900 — Volatile action phase spine and no-stakes bypass

| Field               | Value                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                       |
| **Linear**          | [SPE-2900](https://linear.app/spectranoir/issue/SPE-2900/volatile-action-phase-spine-and-no-stakes-bypass)                 |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**            |
| **Prerequisite**    | [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) — do not rescore |
| **Branch**          | `cursor/spe-62-phase-kernel-5a45-c187`                                                                                     |
| **Base `main` SHA** | `b304db3c`                                                                                                                 |
| **Implementation**  | [PR #3674](https://github.com/JamesJedi420/containment-protocol/pull/3674)                                                 |

## Goal

One volatile context resolves through a compact explicit ordered phase list. SPE-54 already
owns actor and side priority. This child consumes that order, records phase ids, attaches one
inspectable interruption/reaction window, and applies a deterministic no-stakes bypass.

## Boundary

Ship `resolveVolatileActionPhasePipeline` for variant `volatile_action_v1` only.

Frozen phase order: `posture_commit` → `environmental_read` → `clash_window` →
`effect_emission` → `cleanup`.

Call `resolveVolatileActionPriority` once. Do not rescore factors or invent a second sequencer.
The reaction window `after_posture_commit` records SPE-54 actor order after `posture_commit`
and does not prepend, truncate, or redirect later phases.

`stakes` is explicit `'none' | 'present'`. No-stakes skips only `clash_window` and
`effect_emission`, still records commit/read/window/cleanup, and sets `bypassed: true`.
Never infer no-stakes from score or array order.

Fail-closed missing or invalid `encounterId`, variant, `actionPriority`, encounterId mismatch,
or unknown stakes. Throw; do not invent a default pipeline.

Optional hidden-combat attach is recomputable evidence only. Do not feed the spine into
power/difficulty math.

Do not change the SPE-54 kernel. Do not implement SPE-73 odds/outcomes, SPE-2847
orchestration, GameState persistence, schema, UI, holds, delays, cancels, SPE-1027, or
SPE-2897. Do not close SPE-62 or GitHub #62.

## Deferred

| Item or mechanic                                      | Owner or prerequisite                                                                                                     | Why deferred                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Held, aborted, or delayed actions keyed for save/load | [SPE-2902](https://linear.app/spectranoir/issue/SPE-2902/held-aborted-or-delayed-actions-keyed-for-saveload)              | Persistence is out of this spine; SPE-2902 owns the keyed ledger  |
| Interruption mutation (prepend/truncate/redirect)     | [SPE-2901](https://linear.app/spectranoir/issue/SPE-2901/interruption-mutation-at-after-posture-commit)                   | Slice 1 records the window only; SPE-2901 owns the status rewrite |
| Multi-stage procedure iteration                       | later SPE-62 child                                                                                                        | One volatile action context only                                  |
| Unified outcome bands / single-roll math              | SPE-73                                                                                                                    | Confrontation outcomes stay out                                   |
| Encounter round loop / action choice / apply          | SPE-2847                                                                                                                  | Orchestration stays out                                           |
| Risk-first impending-hazard declaration               | later SPE-62 child                                                                                                        | Parent AC not claimed by this child                               |
| Additional pipeline variants                          | [SPE-2912](https://linear.app/spectranoir/issue/SPE-2912/additional-pipeline-variants-plus-tasktestadvanced-action-modes) | Extra named family + explicit task/test/advanced_action mode tags |

## Acceptance

- Identical input → byte-stable phase list and reaction window
- `stakes: 'present'` runs all five phase ids in order; window sits after `posture_commit`
- `stakes: 'none'` skips only clash + emission; `bypassed: true`
- Missing authority fail-closed
- `side_phase` actor walk follows SPE-54 block order, not insertion order
- `volatileActionPriority` tests stay green
- Hidden-combat optional attach does not change outcome math
- Parent SPE-62 remains Backlog

## Validation

- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts src/test/volatileActionPriority.test.ts src/test/hiddenCombatResolver.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:backlog-handoff`
