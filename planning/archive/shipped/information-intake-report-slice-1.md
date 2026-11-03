# SPE-854 — Information intake report slice 1

One-page implementation plan. Linear: child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854). Follows adjacent intake registry wave (SPE-2104–SPE-2123).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2292 — Information intake report schema and verification progression (slice 1)](https://linear.app/spectranoir/issue/SPE-2292) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine       |
| **Branch** | `spe-854-information-intake-report-slice-1`                                                                |
| **Status** | **Ready for PR** (slice 1 complete locally)                                                                |

## Goal

Add a pure deterministic **incoming incident report** model with **verification state progression** so mixed-source intake can retain contradicted or impossible-looking records, accumulate corroboration, and escalate confidence without collapsing into one undifferentiated fact stream.

## Prerequisite (on `main` @ `a9bb990e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake registry wave | SPE-2104–SPE-2123 sibling `*Registry.ts` patterns                        |
| Fuzzy-clue registry  | `src/domain/investigationExposureClueRegistry.ts` (SPE-2159)           |
| Uncertain facts      | `src/domain/uncertainWorldState.ts` — resolution vocabulary reference  |
| Branch continuity    | `src/domain/branchContinuity.ts` — corrected-record semantics (defer)  |

## Gap (pre-slice)

- Registries catalog intake **kinds** but not **report objects** with verification lifecycle.
- No deterministic transition for impossible → corroborated → verified (SPE-854 / impossible-record fold-in).
- No mixed-source comparison helper for conflicting early reports on one topic.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `InformationIntakeReportId` + `InformationIntakeReportRecord` in `src/domain/informationIntakeReport.ts`                            | GameState persistence                         |
| `IntakeSourceClass`, `InformationVerificationStatus`, credibility/plausibility/rumor bands                                         | Weekly `advanceWeek` hook                     |
| `validateInformationIntakeReport(record)`                                                                                          | UI / report copy                              |
| `applyCorroborationEvent` / `applyContradictionEvent` — deterministic transitions + history                                        | Full agency canonical feed                    |
| `deriveInitialVerificationStatus`, `computeIntakeConfidenceScore`                                                                  | SPE-854 parent Done                             |
| `summarizeMixedSourceIntake(reports)` — mixed incomplete/conflicting intake                                                        | Registry wire-up                              |
| Focused tests in `src/test/informationIntakeReport.test.ts`                                                                          | SPE-2092 public signal coverage (sibling)     |

## Record contract (deterministic)

### Core fields

- **initialSourceClass** — formal_alert, public_signal, partner_channel, media_trace, technical_trace, rumor_chain, field_witness, archive_signature, off_channel.
- **verificationStatus** — impossible, contradicted, unverified, partially_corroborated, verified, escalated_confidence.
- **credibility**, **plausibility**, **rumorRisk** — compact bands for routing and confidence derivation.
- **confidenceScore** — 0–1 bounded operational confidence (not truth).
- **corroborationHistory** / **contradictionHistory** — append-only event logs with week + sourceRef.
- **retainedDespiteContradiction** — true when record must stay in intake despite contradiction (default true for impossible/contradicted).

### Transition rules (summary)

- Corroboration never removes a report; first corroboration on `impossible` lifts to `unverified` minimum.
- Weighted corroboration sum drives `partially_corroborated` → `verified` → `escalated_confidence`.
- Contradiction can lower status but does not discard when `retainedDespiteContradiction` is true.
- Repeated application with same `eventId` is idempotent.

## Acceptance

- [x] Fixture: impossible-appearing report + corroboration → `unverified` then `verified` with history.
- [x] Fixture: mixed-source conflicting reports on one topic → summary flags conflict + incomplete.
- [x] Contradicted record retained; later corroboration escalates confidence.
- [x] Validation rejects invalid bands, out-of-range confidence, duplicate corroboration event ids.
- [x] Repeated transition calls are byte-stable for same inputs.
- [x] `npm run lint` + targeted `npm run test:run` green.

## File touch list (expected)

| Area   | Files                                                       |
| ------ | ----------------------------------------------------------- |
| Domain | `src/domain/informationIntakeReport.ts`                     |
| Tests  | `src/test/informationIntakeReport.test.ts`                  |
| Plan   | `planning/information-intake-report-slice-1.md` (this file) |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress** until engine integration slices ship.
