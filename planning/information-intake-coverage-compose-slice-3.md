# SPE-854 — Topic intake coverage composition slice 3

One-page implementation plan. Linear: child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854). Follows [SPE-2292](https://linear.app/spectranoir/issue/SPE-2292), [SPE-2293](https://linear.app/spectranoir/issue/SPE-2293), and [SPE-2092](https://linear.app/spectranoir/issue/SPE-2092).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2294 — Topic intake coverage composition (slice 3)](https://linear.app/spectranoir/issue/SPE-2294)       |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine       |
| **Branch** | `spe-854-topic-intake-coverage-compose-slice-3`                                                            |
| **Status** | **Shipped** (PR #2449 merged @ `c43c779d`)                                                                 |

## Goal

Compose persisted intake reports into public-signal coverage evaluation for a topic — project channel flags from mixed `initialSourceClass` values, summarize verification bands, and delegate to `evaluatePublicSignalCoverage`.

## Prerequisite (on `main` @ `ea649362`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292)                     |
| Intake persistence   | `informationIntakeReports` on GameState (SPE-2293)                     |
| Public signal coverage | `src/domain/publicSignalCoverage.ts` (SPE-2092)                        |
| Fixtures             | `IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE`, `PUBLIC_RUMOR_CONFLICT_FIXTURE`, `FORMAL_ALERT_PARTIAL_FIXTURE` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `projectChannelFlagsFromIntakeReports(reports)` in `publicSignalCoverage.ts` | GameState persistence changes                 |
| `evaluateTopicIntakeCoverage(input)` — filter, summarize, project, evaluate | Weekly `advanceWeek` hook                     |
| Derive crawler/inference bands from intake summary when not overridden | UI / report copy                              |
| Focused tests in `src/test/publicSignalCoverage.test.ts`             | SPE-854 parent Done                           |
| Slice doc (this file)                                              | `runTransfer` changes                         |

## Acceptance

- [x] Mixed-source fixtures project institutional + public channel flags deterministically
- [x] Canal-bridge fixture trio → conflicting verification + partial_public or blind_spot band as appropriate
- [x] Empty topic report map → sparse safe defaults without throw
- [x] Structured reasons merge intake summary tokens with coverage reasons (sorted)
- [x] Repeated evaluation is byte-stable
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publicSignalCoverage.ts`                                  |
| Tests  | `src/test/publicSignalCoverage.test.ts`                               |
| Plan   | `planning/information-intake-coverage-compose-slice-3.md`, `planning/backlog.md` |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress**.
