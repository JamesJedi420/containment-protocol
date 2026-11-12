# SPE-854 — Information intake report persistence slice 2

One-page implementation plan. Linear: child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854). Follows [SPE-2292](https://linear.app/spectranoir/issue/SPE-2292) (schema) and [SPE-2092](https://linear.app/spectranoir/issue/SPE-2092) (coverage evaluator).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2293 — Information intake report GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2293) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine       |
| **Branch** | `spe-854-information-intake-report-persistence-slice-2`                                                    |
| **Status** | **Shipped** (PR #2447 merged @ `0c5f9c54`)                                                                 |

## Goal

Persist `InformationIntakeReportRecord` on `GameState` with sanitize/hydration and save round-trip tests. SPE-2292 deferred persistence; SPE-2092 coverage composition is slice 3.

## Prerequisite (on `main` @ `3d8c1a7b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292 / PR #2444)          |
| Public signal coverage | `src/domain/publicSignalCoverage.ts` (SPE-2092 / PR #2445)            |
| Fixtures             | `IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE`, `PUBLIC_RUMOR_CONFLICT_FIXTURE`, `FORMAL_ALERT_PARTIAL_FIXTURE` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `informationIntakeReports` on `GameState`                                                                                          | Weekly `advanceWeek` corroboration hook       |
| `sanitizeInformationIntakeReports` + `runTransfer` hydrate wire                                                                     | UI / report copy                              |
| `validateInformationIntakeReport` on hydrate; drop invalid, no throw                                                                | `evaluateTopicIntakeCoverage` + `publicSignalCoverage` compose (slice 3) |
| Default `{}` in `createStartingState`                                                                                              | SPE-854 parent Done                           |
| Sanitize unit tests + save/import round-trip (history byte-stable)                                                                  |                                               |

## Acceptance

- [x] Valid report round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Corroboration/contradiction history preserved byte-stable after round-trip
- [x] `npm run lint` + targeted tests + relevant save/hydration tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeReport.ts`, `src/domain/models.ts`       |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/informationIntakeReportPersistence.test.ts`                 |
| Plan   | `planning/information-intake-report-persistence-slice-2.md`, `planning/backlog.md` |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress**.

## Deferred slice 3

Pure domain: `projectChannelFlagsFromIntakeReports` + `evaluateTopicIntakeCoverage` using `summarizeMixedSourceIntake` + `evaluatePublicSignalCoverage`.
