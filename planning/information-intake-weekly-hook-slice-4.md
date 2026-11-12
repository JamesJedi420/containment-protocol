# SPE-854 — Weekly intake corroboration hook slice 4

One-page implementation plan. Linear: child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854). Follows [SPE-2292](https://linear.app/spectranoir/issue/SPE-2292), [SPE-2293](https://linear.app/spectranoir/issue/SPE-2293), and [SPE-2294](https://linear.app/spectranoir/issue/SPE-2294).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2295 — Weekly intake corroboration advanceWeek hook (slice 4)](https://linear.app/spectranoir/issue/SPE-2295) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine       |
| **Branch** | `spe-854-information-intake-weekly-hook-slice-4`                                                           |
| **Status** | **In PR** (branch `spe-854-information-intake-weekly-hook-slice-4`)                                        |

## Goal

Wire persisted `informationIntakeReports` into `advanceWeek` so reports accumulate corroboration/contradiction events each week via deterministic transition helpers.

## Prerequisite (on `main` @ `8c66029e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292)                     |
| Intake persistence   | `informationIntakeReports` on GameState (SPE-2293)                     |
| Topic coverage compose | `evaluateTopicIntakeCoverage` in `publicSignalCoverage.ts` (SPE-2294) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyIntakeCorroborationTick` + authored fixture event stub | New schema, UI, report copy                   |
| Call from `advanceWeek` after case resolution (post-`finalizeEvents`) | SPE-854 parent Done                           |
| `advanceWeek.informationIntake.integration.test.ts`                | `runTransfer` sanitize contract changes       |
| Slice doc (this file) + backlog row on PR open                       | Full narrative corroboration generator        |
|                                                                    | `evaluateTopicIntakeCoverage` API changes     |

## Acceptance

- [x] Seeded `informationIntakeReports` gain deterministic weekly corroboration/contradiction history via `advanceWeek`
- [x] Empty map no-op without throw
- [x] Re-applying same weekly event id is idempotent
- [x] `retainedDespiteContradiction` paths honored on contradiction ticks
- [x] Optional: `evaluateTopicIntakeCoverage` reflects post-week verification band shift
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeWeeklyCorroboration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/advanceWeek.informationIntake.integration.test.ts`          |
| Plan   | `planning/information-intake-weekly-hook-slice-4.md`, `planning/backlog.md` |

## Deferred (recorded for follow-up)

| Item | Suggested owner | Why deferred (slice 4 boundary) |
| ---- | --------------- | --------------------------------- |
| Case/topic-linked corroboration sources (derive events from sim state, not fixture ids) | New SPE-854 child | Slice 4 stub only; hook must not assume case linkage yet |
| Full narrative corroboration generator | New SPE-854 child | Authored fixture events per report id for deterministic tests |
| Intake verification UI / report copy surfaces | SPE-854 or adjacent UX owner | Explicitly out of slice 4 |
| Parent SPE-854 acceptance (mixed-source incident, operational routing) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Slices 1–4 are domain/persistence/hook only |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress**.
