# SPE-1882 — Coercive protocol mirror welfare-debt cross-link surfacing (slice 12)

One-page implementation plan. Linear: SPE-1882 slice 12 child (create on merge). Follows shipped slice 11 (`planning/coercive-contained-person-protocol-model-slice-11.md`, PR #2798).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1882 slice 12 — Mirror welfare-debt cross-link surfacing (create on merge)                             |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–11 shipped)           |
| **Branch** | `spe-1882-coercive-protocol-slice-12`                                                                      |
| **Base `main` SHA** | `049ff7e4`                                                                                          |

## Goal

Surface inverse welfare-debt ledger cross-links on `getCoerciveContainedPersonProtocolMirrorView` by reusing `welfareDebtAccountingCrossLinks.ts` compose contracts — agent-routing visibility for SPE-1888 ↔ SPE-1882 linkage without duplicating welfare-debt math or faction ethics matrix scope.

## Prerequisite (on `main` @ `049ff7e4`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Welfare-debt cross-link compose | `src/domain/welfareDebtAccountingCrossLinks.ts` (SPE-1888 slice 7–9) |
| Mirror snapshot read | `coerciveContainedPersonProtocolMirrorView.ts` (slice 11 / PR #2798)   |
| Welfare-debt mirror cross-links | `welfareDebtAccountingMirrorView.ts` (inverse direction model)   |

## Mirror contract

- **Read-only** — mirror calls inverse compose at build time only; no GameState mutation.
- **Reuse forward compose** — `composeWelfareDebtCrossLinksForCoerciveProtocolRecord` delegates per-debt `composeWelfareDebtAccountingCrossLinksForRecord` with a single-protocol map; match kinds (`procedure_ref` / `subject_ref`) stay byte-stable with welfare-debt mirror.
- **Label format** — `welfare-debt:${debtRef}` mirrors welfare-debt mirror `coercive-protocol:${id}` prefix pattern.
- **Summary** — `welfareDebtLinkedRecordCount` counts records with ≥1 linked debt; `weeklySnapshotCount` stat card on mirror page (slice 11 deferred row).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Inverse compose + label format in `welfareDebtAccountingCrossLinks.ts` | Welfare-debt accounting math                |
| Mirror view per-record `welfareDebtCrossLinkLabels` + summary count | Faction ethics links (SPE-1047)               |
| Mirror page welfare-debt cross-link display + weekly snapshot stat  | Accountability matrix engine (SPE-1131)     |
| Targeted cross-link, mirror view, advanceWeek integration tests     | SPE-1888 registry reopens                     |
| Slice doc (this file) + backlog handoff                            | Contradiction-check evaluator changes         |

## Acceptance

- [x] Missing welfare-debt records yield empty cross-link labels and zero summary count
- [x] Procedure-ref and subject-ref matches surface deterministic sorted labels
- [x] `advanceWeek`-hydrated GameState mirror reads persisted welfare-debt cross-links
- [x] Mirror page shows weekly snapshot count stat card
- [x] Slice 1–11 mirror regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinks.ts`                       |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| UI     | `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.tsx` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/welfareDebtAccountingCrossLinks.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-12.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of welfare-debt cross-link boundary |
| Faction ethics + accountability matrix links on protocol mirror | SPE-1047 / SPE-1131 | Out of slice 12 boundary per parent constraints |
| Compromised-care procedural debt creation wire-up | SPE-1882 follow-up | Parent goal breadth; not registry-wave pattern |
| SPE-1882 parent grooming if auto-closed drift | SPE-1882 | Parent **Done** on Linear; slice 12 is runtime follow-up |

## See also

- `planning/coercive-contained-person-protocol-model-slice-11.md` — weekly snapshot read origin
- `planning/welfare-debt-accounting-registry-slice-7.md` — forward cross-link compose origin
