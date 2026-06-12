# SPE-1888 — Welfare-debt ledger cross-links (slice 7)

One-page implementation plan. Linear: child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) (create/link slice issue on merge). Follows shipped slice 6 (`planning/welfare-debt-accounting-registry-slice-6.md`, PR #2705) and grooming [SPE-2419](https://linear.app/spectranoir/issue/SPE-2419).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | Welfare-debt ledger cross-links (slice 7) — child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) |
| **Status** | **Shipped** — PR #2760 @ `b7702e4c`                                                                        |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent stays **Backlog** until SPE-1047 / SPE-1131 matrix AC met |
| **Branch** | `spe-1888-welfare-debt-cross-links-slice-7`                                                                |
| **Base `main` SHA** | `73e6e344`                                                                                          |

## Goal

Pure cross-link compose from persisted `welfareDebtAccountingRecords` to coercive protocol records, integrated health bundles, and opaque review-owner / mitigation-path wired refs — surfacing on ledger audit report and planning mirror without duplicating SPE-1047 / SPE-1131 matrix semantics.

## Prerequisite (on `main` @ `73e6e344`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry + audit     | `welfareDebtAccountingRegistry.ts` (SPE-2353 slice 4)                  |
| Integrated health wire-up | `welfareDebtAccountingHealthBundleLinks.ts` (SPE-2350)            |
| Coercive procedure creation | `coerciveProcedureWelfareDebtCreation.ts` (SPE-2417 / SPE-2418)   |
| Cross-link pattern   | `informationIntakeNamingHazardCrossLink.ts` (SPE-2358)                 |

## Cross-link contract (slice 7)

- **Integrated health** — bundle map key ↔ `record.subjectRef`.
- **Coercive protocol** — same `subjectRef`; when creation-tick id embeds `procedureRef`, prefer matching `coerciveContainedPersonProtocolRecords.procedureRef`; else subject-only fallback for authored fixture ids.
- **Accountability refs** — deterministic slug wired refs from `reviewOwnerLabel` / `mitigationPathLabel` only; not SPE-1047 / SPE-1131 projections.
- **Hydrated truth only** — skip invalid records without re-surfacing.
- **Byte-stable ordering** — debt refs, link labels sorted on repeat.
- **Audit + mirror surfacing** — optional registry maps on audit input; mirror reads `containedPersonIntegratedHealthBundles` + `coerciveContainedPersonProtocolRecords` at build time.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `welfareDebtAccountingCrossLinks.ts` compose helpers               | SPE-1047 faction ethics engine                |
| Ledger audit cross-link lines + mirror `crossLinkLabels` column    | SPE-1131 accountability matrix                |
| Targeted unit + mirror + audit tests                               | `advanceWeek` weekly report notes             |
| Slice doc (this file) + backlog handoff                            | SPE-1908 compose extension                    |
|                                                                    | SPE-1888 parent Done                          |
|                                                                    | Full SPE-1882 coercive protocol model         |

## Acceptance

- [x] Empty maps return empty cross-link compose without throw
- [x] Creation-tick ids parse `procedureRef` for coercive protocol matching
- [x] Integrated health bundle links by `subjectRef` on audit + mirror
- [x] Opaque review-owner / mitigation-path wired refs on every valid record
- [x] Audit report appends cross-link lines when optional maps provided; unchanged when omitted
- [x] Mirror shows cross-link labels + `crossLinkedCount` summary
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinks.ts`, `src/domain/welfareDebtAccountingRegistry.ts` |
| Mirror | `src/features/operations/welfareDebtAccountingMirrorView.ts`, `WelfareDebtAccountingMirrorPage.tsx`, `src/data/copy.ts` |
| Tests  | `src/test/welfareDebtAccountingCrossLinks.test.ts`, `src/test/welfareDebtAccountingLedgerAudit.test.ts`, `src/features/operations/welfareDebtAccountingMirrorView.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-7.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Faction ethics matrix runtime | SPE-1047 | Parent AC remainder; no matrix duplication in slice 7 |
| Moral-legal accountability matrix | SPE-1131 | Same |
| Weekly report notes for welfare-debt cross-links | SPE-1888 follow-up | Mirror + audit sufficient for smallest slice |
| SPE-1908 reverse compose (ledger map as compose arg) | SPE-1908 | Bundle path already carries welfare-debt links |
| Full coercive protocol model | SPE-1882 | Minimal procedure anchors only |
| SPE-1888 parent Done | SPE-1888 | Ethics/accountability matrix AC still open per SPE-2419 |

## See also

- `planning/spe-1888-parent-acceptance-review-slice-2.md`
- `planning/welfare-debt-accounting-registry-slice-6.md`
