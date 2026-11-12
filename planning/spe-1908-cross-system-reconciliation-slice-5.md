# SPE-1908 — Psychological-resilience cross-reconciliation surfacing (slice 5)

One-page implementation plan. Linear: [SPE-2440](https://linear.app/spectranoir/issue/SPE-2440) (child under [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908)). Follows shipped slice 4 (`planning/spe-1908-cross-system-reconciliation-slice-4.md`, PR #2749 / [SPE-2439](https://linear.app/spectranoir/issue/SPE-2439)). Deferred from `planning/spe-1615-psychological-resilience-registry-slice-4.md`.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2440 — Psychological-resilience cross-reconciliation surfacing (slice 5)](https://linear.app/spectranoir/issue/SPE-2440) |
| **Status** | **Shipped** — PR #2751 @ `6ee84c4a`                                                                        |
| **Parent** | [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) — surveillance-isolation contradiction check umbrella |
| **Branch** | `jamesdyedbq/spe-1908-cross-system-reconciliation-slice-5`                                                 |
| **Base `main` SHA** | `6aaee42e`                                                                                          |

## Goal

Surface `composeAllCoerciveProtocolIntegratedHealthReconciliations` psychological-resilience tension flags and cross-link labels in coercive protocol mirror and weekly report notes — read-only follow-up once SPE-2436 compose cross-join and SPE-1615 persistence exist.

## Prerequisite (on `main` @ `6aaee42e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-reconciliation compose + resilience cross-join | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2436) |
| Cross-reconciliation surfacing (protocol/bundle/tuning) | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts` (SPE-2429 / SPE-2439) |
| Psychological resilience persistence | `psychologicalResilienceRecords` on `GameState` (SPE-2434) |
| Psychological resilience mirror label vocabulary | `psychologicalResilienceMirrorView.ts` (SPE-2437) |

## Surfacing contract (slice 5)

- **Read-only** — pass `psychologicalResilienceRecords` into compose at read time; no new GameState fields.
- **Safe labels** — resilience record ids + labels only; no projection score or redacted field leakage in surfacing strings.
- **Tension flags** — `psychological_resilience_exposure_elevated`, `psychological_resilience_duty_reliability_degraded`, and `psychological_resilience_treatment_gated` via existing compose when resilience map coexists.
- **Empty maps** — no-op; slice 2/4 surfacing unchanged when resilience absent.
- **Mirror** — coercive protocol mirror passes resilience records into compose summaries for per-record `crossSystemTensionFlagLabels`.
- **Weekly notes** — emit when protocol + bundle maps coexist; include resilience segment and `linkedResilienceCount` when resilience linked.
- **Byte-stable ordering** — tension flags and resilience ids sorted on repeat.
- **No compose changes** — SPE-2436 contracts unchanged.
- **No resilience mirror UI changes** — SPE-2437 unchanged.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts` resilience pass-through + labels | SPE-2436 compose changes |
| `coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts` resilience wiring | SPE-2437 mirror UI changes |
| Coercive protocol mirror resilience-aware compose | `psychologicalResilienceWeeklyOrchestration.ts` |
| `advanceWeek` note wiring for resilience records | Contradiction-check evaluator changes |
| Targeted surfacing + mirror + advanceWeek tests | SPE-1908 parent re-closure |
| Slice doc (this file) + backlog handoff | Unrelated registries |

## Acceptance

- [x] Empty resilience maps no-op without throw; slice 2/4 regression unchanged
- [x] Mirror surfaces psychological-resilience tension flags for abusive surveillance + subject-22 bundle + staged-depletion resilience fixture
- [x] Weekly report note includes resilience cross-link labels and resilience tension flags when maps coexist
- [x] Redacted projection fields do not leak in surfacing labels
- [x] `advanceWeek` integration asserts resilience-aware reconciliation note when fixtures coexist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts`, `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts` |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| Tests  | `src/test/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/test/advanceWeek.coerciveProtocolIntegratedHealthReconciliation.integration.test.ts` |
| Plan   | `planning/spe-1908-cross-system-reconciliation-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1908 parent closure | SPE-1908 | Multi-owner reconciliation AC not met |

## See also

- `planning/spe-1908-cross-system-reconciliation-slice-4.md`
- `planning/spe-1615-psychological-resilience-registry-slice-4.md`
