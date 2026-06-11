# SPE-1908 — Surveillance-tuning cross-reconciliation surfacing (slice 4)

One-page implementation plan. Linear: [SPE-2439](https://linear.app/spectranoir/issue/SPE-2439) (child under [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908)). Follows shipped slice 3 (`planning/spe-1908-cross-system-reconciliation-slice-3.md`, PR #2731 / [SPE-2430](https://linear.app/spectranoir/issue/SPE-2430)) and sibling slice 2 (`planning/spe-1908-cross-system-reconciliation-slice-2.md`, PR #2729 / [SPE-2429](https://linear.app/spectranoir/issue/SPE-2429)). Deferred from `planning/spe-848-surveillance-tuning-registry-slice-4.md`.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2439 — Surveillance-tuning cross-reconciliation surfacing (slice 4)](https://linear.app/spectranoir/issue/SPE-2439) |
| **Parent** | [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) — surveillance-isolation contradiction check umbrella |
| **Branch** | `jamesdyedbq/spe-1908-cross-system-reconciliation-slice-4`                                                 |
| **Base `main` SHA** | `e2becf77`                                                                                          |

## Goal

Surface `composeAllCoerciveProtocolIntegratedHealthReconciliations` surveillance-tuning tension flags and cross-link labels in coercive protocol mirror and weekly report notes — read-only follow-up once SPE-2430 compose cross-join and SPE-848 persistence exist.

## Prerequisite (on `main` @ `e2becf77`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-reconciliation compose + tuning cross-join | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2430) |
| Cross-reconciliation surfacing (protocol/bundle) | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts` (SPE-2429) |
| Surveillance tuning persistence | `surveillanceInterventionTuningRecords` on `GameState` (SPE-2431) |
| Surveillance tuning mirror label vocabulary | `surveillanceInterventionTuningMirrorView.ts` (SPE-2438) |

## Surfacing contract (slice 4)

- **Read-only** — pass `surveillanceInterventionTuningRecords` into compose at read time; no new GameState fields.
- **Safe labels** — tuning record ids + labels only; no projection score or redacted field leakage in surfacing strings.
- **Tension flags** — `surveillance_tuning_monitoring_exceeds_contact` and `surveillance_tuning_sustained_under_collateral_strain` via existing compose when tuning map coexists.
- **Empty maps** — no-op; slice 2 surfacing unchanged when tuning absent.
- **Mirror** — coercive protocol mirror passes tuning records into compose summaries for per-record `crossSystemTensionFlagLabels`.
- **Weekly notes** — emit when protocol + bundle maps coexist; include tuning segment and `linkedTuningCount` when tuning linked.
- **Byte-stable ordering** — tension flags and tuning ids sorted on repeat.
- **No compose changes** — SPE-2430 contracts unchanged.
- **No tuning mirror UI changes** — SPE-2438 unchanged.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts` tuning pass-through + labels | SPE-2430 compose changes |
| `coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts` tuning wiring | SPE-2438 mirror UI changes |
| Coercive protocol mirror tuning-aware compose | `surveillanceInterventionTuningWeeklyOrchestration.ts` |
| `advanceWeek` note wiring for tuning records | SPE-1615 psychological resilience surfacing |
| Targeted surfacing + mirror + advanceWeek tests | Contradiction-check evaluator changes |
| Slice doc (this file) + backlog handoff | SPE-1908 parent re-closure |

## Acceptance

- [x] Empty tuning maps no-op without throw; slice 2 regression unchanged
- [x] Mirror surfaces surveillance-tuning tension flags for abusive surveillance + subject-22 bundle + tuning fixture
- [x] Weekly report note includes tuning cross-link labels and tuning tension flags when maps coexist
- [x] Redacted projection fields do not leak in surfacing labels
- [x] `advanceWeek` integration asserts tuning-aware reconciliation note when fixtures coexist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts`, `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts` |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| Tests  | `src/test/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/test/advanceWeek.coerciveProtocolIntegratedHealthReconciliation.integration.test.ts` |
| Plan   | `planning/spe-1908-cross-system-reconciliation-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1615 psychological resilience surfacing | SPE-1615 | Out of surveillance-tuning-only boundary |
| SPE-1908 parent closure | SPE-1908 | Multi-owner reconciliation AC not met |

## See also

- `planning/spe-1908-cross-system-reconciliation-slice-2.md`
- `planning/spe-1908-cross-system-reconciliation-slice-3.md`
- `planning/spe-848-surveillance-tuning-registry-slice-4.md`
