# SPE-854 — Public signal coverage slice 1

One-page implementation plan. Linear: child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854). Follows [SPE-2292](https://linear.app/spectranoir/issue/SPE-2292) information intake report slice.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2092 — Public signal coverage evaluator (slice 1)](https://linear.app/spectranoir/issue/SPE-2092)       |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine       |
| **Branch** | `spe-2092-public-signal-coverage-slice-1`                                                                  |
| **Status** | **Ready for PR**                                                                                         |

## Goal

Add a pure deterministic helper that scores how well a district or case topic is covered by **institutional intake channels** versus **ambient public-signal channels**, including crawler reach gaps and low-interpretability inference blind spots.

## Prerequisite (on `main` @ `5a72e72d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292)                     |
| Intake registry wave | SPE-2104–SPE-2123 sibling `*Registry.ts` patterns                        |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `evaluatePublicSignalCoverage(input)` in `src/domain/publicSignalCoverage.ts` | GameState persistence                         |
| Institutional + public channel flag structs, crawler/inference bands | Weekly `advanceWeek` hook                     |
| `coverageBand`, `confidencePenalty`, `falseNegativeRisk`, sorted `structuredReasons` | UI / report copy                              |
| Focused tests in `src/test/publicSignalCoverage.test.ts`             | SPE-854 parent Done                             |
|                                                                 | SPE-1043 district baseline wiring             |
|                                                                 | SPE-1552 rumor feed consumption               |
|                                                                 | Full intake verification integration          |

## Acceptance

- [x] Blind-spot fixture: high public activity + zero institutional → `blind_spot`, `falseNegativeRisk > 0`
- [x] Institutional-led fixture: institutional only → `institutional_only`, minimal penalty
- [x] Partial fixture: mixed channels → `partial_public`, bounded `confidencePenalty`
- [x] Invalid/sparse input defaults safely without throw
- [x] Repeated evaluation is byte-stable
- [x] `npm run lint` + targeted tests green

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress**.
