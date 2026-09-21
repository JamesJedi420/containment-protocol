# SPE-2902 — Held, aborted, or delayed actions keyed for save/load

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                                |
| **Linear**          | [SPE-2902](https://linear.app/spectranoir/issue/SPE-2902/held-aborted-or-delayed-actions-keyed-for-saveload)                                                                                                                                                                                                                                                                        |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**                                                                                                                                                                                                                                                                     |
| **Prerequisite**    | [SPE-2900](https://linear.app/spectranoir/issue/SPE-2900/volatile-action-phase-spine-and-no-stakes-bypass) spine; [SPE-2901](https://linear.app/spectranoir/issue/SPE-2901/interruption-mutation-at-after-posture-commit) interrupt rewrite; [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) order consumed, not rescored |
| **Branch**          | `cursor/held-aborted-delayed-keyed-d295`                                                                                                                                                                                                                                                                                                                                            |
| **Base `main` SHA** | `317dea89`                                                                                                                                                                                                                                                                                                                                                                          |

## Goal

One deterministic hold-aim / abort-with-reason / delayed-emission record keyed to the same encounter/procedure instance, hydrating fail-closed across save/load/replay. Hold is explicit. Frozen phase ids stay the same length and order. No-stakes skip and SPE-2901 interrupt rewrite stay compatible. Missing hold authority fails closed. Do not close parent SPE-62 or GitHub #62.

## Boundary

Extend `resolveVolatileActionPhasePipeline` in place. Persist optional `GameState.volatileActionHoldRecords`. Do not invent a second pipeline or sequencer.

Frozen phase order: `posture_commit` → `environmental_read` → `clash_window` → `effect_emission` → `cleanup`. Do not add, remove, or reorder ids.

`hold` is an optional tagged union on the input. Never infer hold from actor array order, phase array order, SPE-54 scores, or interrupt kind. Omit or `{ kind: 'none' }` keeps the SPE-2901 default. Non-`none` requires `instanceId`. Abort requires `reason`.

`posture_commit` always remains `ran`. No-stakes `skipped` on clash/emission stays `skipped`. Interrupt rewrite (`prepended` / `truncated` / `redirected`) wins over hold. Remaining later `'ran'` phases: `hold_aim` rewrites clash+emission to `held`; `abort` rewrites those two to `aborted`; `delayed_emission` rewrites only `effect_emission` to `delayed`.

Stamp appends a correction on the same `instanceId`. Do not silent-overwrite mistaken records. EncounterId on an existing ledger must keep matching.

Fail-closed: object required when hold is present; `kind` must be `none` | `hold_aim` | `abort` | `delayed_emission`; missing/empty/whitespace or prototype-unsafe/integer-index `instanceId` throws; abort without reason throws.

Hydrate: legacy omit / malformed non-records → omitted. Integer-index, prototype-unsafe, key/id mismatch, and malformed siblings drop independently. Valid ledgers insert in code-unit key order. Hydration does not re-run pipeline or stamp. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.

Do not change the SPE-54 kernel. Do not implement SPE-73 odds/outcomes, SPE-2847 orchestration, extra variants, task/test/advanced-action modes, risk-first hazard, or UI.

## Deferred

| Item or mechanic                                       | Owner or prerequisite                                                                                                     | Why deferred                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Additional pipeline variants; task/test/advanced modes | [SPE-2912](https://linear.app/spectranoir/issue/SPE-2912/additional-pipeline-variants-plus-tasktestadvanced-action-modes) | Extra named family + explicit mode tags on the shared grammar |
| Unified outcome bands / single-roll math               | SPE-73                                                                                                                    | Confrontation outcomes stay out                               |
| Encounter round loop / action choice / apply           | SPE-2847                                                                                                                  | Orchestration stays out                                       |
| Risk-first impending-hazard declaration                | later SPE-62 child                                                                                                        | Parent AC not claimed by this child                           |
| Explanation / budget / spatial wiring                  | later SPE-62 child                                                                                                        | Pipeline remains a pure inspectable record                    |
| Multi-stage procedure iteration                        | later SPE-62 child                                                                                                        | One volatile action context only                              |

## Acceptance

- Hold-aim, abort-with-reason, and delayed-emission rewrite remaining later `'ran'` clash/emission as specified; frozen id list unchanged
- Omit hold and `{ kind: 'none' }` match the SPE-2901 default
- Fail-closed missing/invalid hold authority
- No-stakes + hold/abort/delay: clash+emission stay `skipped`
- Interrupt rewrite + delayed: emission keeps prepended/truncated/redirected
- Save/load round-trip; hydrate drops malformed siblings; omitted field does not inherit fallback
- Same `instanceId` second stamp appends a correction; first entry remains
- SPE-2900/SPE-2901 pipeline tests and SPE-54 priority tests stay green
- Parent SPE-62 remains Backlog; do not close GitHub #62

## Validation

- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts src/test/volatileActionHoldRecords.contract.test.ts src/test/volatileActionPriority.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check` on touched files
- `npm run verify:backlog-handoff`
