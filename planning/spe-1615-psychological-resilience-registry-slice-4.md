# SPE-2436 — Psychological resilience cross-join in compose (slice 4)

One-page implementation plan. Linear: [SPE-2436](https://linear.app/spectranoir/issue/SPE-2436) (child under [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615)). Follows shipped slice 3 (`planning/spe-1615-psychological-resilience-registry-slice-3.md`, PR #2741 / [SPE-2435](https://linear.app/spectranoir/issue/SPE-2435)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2436 — Psychological resilience cross-join in compose (slice 4)](https://linear.app/spectranoir/issue/SPE-2436) |
| **Parent** | [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615) — Psychological resilience depletion             |
| **Branch** | `jamesdyedbq/spe-1615-psychological-resilience-registry-slice-4`                                           |
| **Status** | In Progress                                                                                                |
| **Base `main` SHA** | `38d6a540`                                                                                          |

## Goal

Extend `composeCoerciveProtocolIntegratedHealthReconciliation` with optional `psychologicalResilienceRecords` map — cross-join hydrated resilience entries by `operatorRef` against protocol/bundle `agent:` operator links; project `projectPsychologicalResilienceReview` tension flags.

## Prerequisite (on `main` @ `38d6a540`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Resilience registry  | `src/domain/psychologicalResilienceRegistry.ts` (SPE-1615 slice 1)     |
| Persistence          | `psychologicalResilienceRecords` on `GameState` (SPE-2434 / PR #2739) |
| Weekly orchestration | `src/domain/psychologicalResilienceWeeklyOrchestration.ts` (SPE-2435) |
| Compose host         | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2430 pattern) |

## Cross-reconciliation contract (slice 4)

- **Match** — `psychologicalResilienceRecord.operatorRef` ↔ `agent:` refs on protocol optional refs (`subjectFitValidationRef`, `procedureRef`, etc.) or bundle link wired refs when protocol–bundle links exist.
- **Hydrated truth only** — compose over validated resilience entries; skip invalid drops without re-surfacing.
- **Projections** — `projectPsychologicalResilienceReview` exposes exposure/depletion/duty/treatment-gating signals.
- **Tension flags** — `psychological_resilience_exposure_elevated`, `psychological_resilience_duty_reliability_degraded`, `psychological_resilience_treatment_gated` from linked projections.
- **Backward compatible** — optional fifth `psychologicalResilienceRecords` map arg; slice 1–3 compose without resilience unchanged.
- **Empty maps** — zeroed resilience fields without throw.
- **Operator ref mismatch** — no-op without throw.
- **Byte-stable ordering** — resilience ids, projections, tension flags sorted on repeat.
- **Redaction** — merge per-record `redactedFields` / `unknownFields`; no hidden truth beyond registry projections.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Compose cross-join + resilience tension flags                      | Planning mirror UI                            |
| Targeted compose tests                                             | `advanceWeek` orchestration changes           |
| Slice doc (this file) + backlog handoff                            | SPE-130 fatigue-channel conflation            |
|                                                                    | New persistence fields on protocol/bundle     |
|                                                                    | Full SPE-1615 parent Done                     |

## Acceptance

- [x] Compose cross-joins staged-depletion fixture when protocol carries matching `agent:` operator link
- [x] Treatment breakdown fixture surfaces `psychological_resilience_treatment_gated` without flipping compose-owned bundle fields
- [x] Operator ref mismatch no-ops without throw; empty / missing resilience maps no-op
- [x] Slice 1–3 compose + surveillance-tuning regression unchanged
- [x] Registry projection regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts`   |
| Tests  | `src/test/coerciveProtocolIntegratedHealthCrossReconciliation.test.ts` |
| Plan   | `planning/spe-1615-psychological-resilience-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Planning mirror UI over resilience records | SPE-1615 slice 5+ | Mirror follows compose cross-join |
| Surfacing / weekly notes for resilience tension flags | SPE-1908 follow-up | Out of compose-only boundary |
| Full SPE-1615 parent Done | SPE-1615 | Mirror slice may remain |

## See also

- `planning/spe-1908-cross-system-reconciliation-slice-3.md` — surveillance-tuning cross-join pattern
- `planning/spe-1615-psychological-resilience-registry-slice-3.md` — weekly orchestration (shipped)
