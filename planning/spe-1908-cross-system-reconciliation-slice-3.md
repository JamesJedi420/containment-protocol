# SPE-1908 — Coercive protocol ↔ integrated health bundle cross-reconciliation surveillance-tuning cross-join (slice 3)

One-page implementation plan. Linear: [SPE-2430](https://linear.app/spectranoir/issue/SPE-2430) (child under [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908)). Follows shipped slice 2 (`planning/spe-1908-cross-system-reconciliation-slice-2.md`, PR #2729 / [SPE-2429](https://linear.app/spectranoir/issue/SPE-2429)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2430 — Surveillance-tuning cross-join in compose (slice 3)](https://linear.app/spectranoir/issue/SPE-2430) |
| **Status** | Ready for PR                                                                                               |
| **Parent** | [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) — surveillance-isolation contradiction check umbrella |
| **Branch** | `spe-1908-cross-system-reconciliation-slice-3`                                                           |
| **Base `main` SHA** | `fdf4cdfc`                                                                                          |

## Goal

Extend `composeCoerciveProtocolIntegratedHealthReconciliation` with surveillance-tuning registry projections once a runtime [SPE-848](https://linear.app/spectranoir/issue/SPE-848) anchor exists — third wire-up slice for broader SPE-1908 cross-system reconciliation.

## Prerequisite (shipped in same PR)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-reconciliation compose | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2428) |
| Cross-reconciliation surfacing | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts` (SPE-2429) |
| Surveillance tuning registry anchor | `src/domain/surveillanceCapacityInterventionTuningRegistry.ts` (SPE-848 slice 1) |

## Cross-reconciliation contract (slice 3)

- **Match** — `surveillanceInterventionTuningRecord.subjectRef` ↔ protocol/bundle subject ref when protocol–bundle links exist.
- **Hydrated truth only** — compose over validated tuning entries; skip invalid drops without re-surfacing.
- **Projections** — `projectSurveillanceInterventionTuningReview` exposes monitoring-vs-contact separation and sustained-under-collateral-strain signals.
- **Tension flags** — when `surveillance_isolation_burden` in protocol risk review and tuning projection shows `monitoringExceedsContact` or `sustainedUnderCollateralStrain`.
- **Backward compatible** — optional fourth `surveillanceTuningRecords` map arg; slice 1–2 compose without tuning unchanged.
- **Empty maps** — zeroed tuning fields without throw.
- **Byte-stable ordering** — tuning ids, projections, tension flags sorted on repeat.
- **Redaction** — merge per-record `redactedFields` / `unknownFields`; no hidden truth beyond registry projections.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `surveillanceCapacityInterventionTuningRegistry.ts` anchor           | GameState persistence for tuning records      |
| Compose cross-join + tuning tension flags                          | Contradiction-check evaluator changes           |
| Targeted registry + compose tests                                  | Surfacing changes (generic tension label helper covers new flags) |
| Slice doc (this file) + backlog handoff                            | SPE-1615 psychological resilience cross-join  |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |
|                                                                    | SPE-1908 parent re-closure                    |

## Acceptance

- [x] SPE-848 registry anchor validates subject-22 fixture and projects monitoring/contact separation
- [x] Compose cross-joins tuning record with abusive surveillance + subject-22 bundle fixture
- [x] New tuning tension flags appear when protocol has surveillance-isolation burden
- [x] Empty / missing tuning maps no-op without throw; slice 1–2 regression unchanged
- [x] Slice 2 surfacing regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/surveillanceCapacityInterventionTuningRegistry.ts`, `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` |
| Tests  | `src/test/surveillanceCapacityInterventionTuningRegistry.test.ts`, `src/test/coerciveProtocolIntegratedHealthCrossReconciliation.test.ts` |
| Plan   | `planning/spe-1908-cross-system-reconciliation-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-848 GameState persistence + advanceWeek hook | SPE-848 | Registry anchor only in slice 3 |
| SPE-1615 psychological resilience cross-join | SPE-1615 | No runtime registry anchor yet |
| Surveillance-tuning surfacing in mirror / weekly notes | SPE-2430 follow-up | Out of compose-only boundary |
| SPE-1908 parent closure | SPE-1908 | Multi-owner reconciliation AC not met |

## See also

- `planning/spe-1908-cross-system-reconciliation-slice-1.md`
- `planning/spe-1908-cross-system-reconciliation-slice-2.md`
