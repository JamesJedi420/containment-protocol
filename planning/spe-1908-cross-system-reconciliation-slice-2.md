# SPE-1908 — Coercive protocol ↔ integrated health bundle cross-reconciliation surfacing (slice 2)

One-page implementation plan. Linear: [SPE-2429](https://linear.app/spectranoir/issue/SPE-2429) (child under [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908)). Follows shipped slice 1 (`planning/spe-1908-cross-system-reconciliation-slice-1.md`, PR #2727 / [SPE-2428](https://linear.app/spectranoir/issue/SPE-2428)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2429 — Coercive protocol ↔ integrated health bundle cross-reconciliation surfacing (slice 2)](https://linear.app/spectranoir/issue/SPE-2429) |
| **Status** | **Shipped** — PR #2729 @ `07d73d7b`                                                                        |
| **Parent** | [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) — surveillance-isolation contradiction check umbrella |
| **Branch** | `spe-1908-cross-system-reconciliation-slice-2`                                                           |
| **Base `main` SHA** | `0b3b7b79`                                                                                          |

## Goal

Surface `composeAllCoerciveProtocolIntegratedHealthReconciliations` output as read-only labels in coercive protocol mirror and weekly report notes — follow-up to SPE-2428 compose-only slice.

## Path choice

**Surfacing** (this slice) — SPE-848 has no runtime surveillance-tuning registry anchor yet; surfacing unblocks parent reconciliation visibility first.

## Prerequisite (on `main` @ `0b3b7b79`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-reconciliation compose | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2428) |
| Coercive protocol mirror | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` (SPE-1882 slices 4–10) |
| Surfacing pattern    | `informationIntakeNamingHazardCrossLinkSurfacing.ts` (SPE-2406)        |

## Surfacing contract (slice 2)

- **Read-only** — compose at read time; no new GameState fields.
- **Safe labels** — protocol ids + labels; bundle ids + labels; tension flags as enum labels only.
- **Empty maps** — no-op; no throw.
- **Mirror** — per-record `crossSystemTensionFlagLabels` when subject ref links protocol to bundle; summary counts for linked/tension subjects.
- **Weekly notes** — emit when linked maps coexist after weekly tick (`coercive_protocol.integrated_health_reconciliation` type).
- **No compose changes** — SPE-2428 contracts unchanged.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts`  | SPE-2428 compose changes                      |
| `coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts` | SPE-848 surveillance tuning cross-join |
| Coercive protocol mirror tension-flag surfacing                    | SPE-1615 psychological resilience cross-join  |
| `advanceWeek` + report note type wiring                            | Contradiction-check evaluator changes         |
| Targeted surfacing + mirror + advanceWeek tests                    | Faction ethics links (SPE-1047 / SPE-1131)    |
| Slice doc (this file) + backlog handoff                            | SPE-1908 parent re-closure                    |

## Acceptance

- [x] Empty maps no-op without throw
- [x] Mirror surfaces tension flags for abusive surveillance + subject-22 bundle fixture
- [x] Weekly report note uses safe cross-link labels when fixtures coexist
- [x] `advanceWeek` integration asserts reconciliation note when fixtures coexist
- [x] Slice 1 compose regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts`, `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts`, `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.tsx`, `src/features/report/reportNoteView.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.test.tsx`, `src/test/advanceWeek.coerciveProtocolIntegratedHealthReconciliation.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/spe-1908-cross-system-reconciliation-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-848 surveillance tuning cross-join | SPE-848 | No runtime registry anchor yet |
| SPE-1615 psychological resilience cross-join | SPE-1615 | No runtime registry anchor yet |
| Mirror reads persisted weekly snapshots | SPE-1882 follow-up | Out of surfacing boundary |

## See also

- `planning/spe-1908-cross-system-reconciliation-slice-1.md`
- `planning/naming-hazard-cross-link-surfacing-slice-1.md`
