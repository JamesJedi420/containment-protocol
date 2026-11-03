# SPE-1888 — Welfare-debt accounting registry ledger summary audit output (slice 4)

One-page implementation plan. Linear: [SPE-2353](https://linear.app/spectranoir/issue/SPE-2353) (child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888)). Follows shipped slice 3 (`planning/welfare-debt-accounting-registry-slice-3.md`, PR #2572).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2353 — Welfare-debt accounting registry ledger summary audit output (slice 4)](https://linear.app/spectranoir/issue/SPE-2353) |
| **Status** | **Shipped** — PR #2574 @ `1ec3ca12`                                                                        |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — ledger summary audit closes deferred slice 2/3 item |
| **Branch** | `spe-1888-welfare-debt-ledger-summary-audit-slice-4`                                                       |
| **Base `main` SHA** | `1ec3ca12`                                                                                          |

## Goal

Deterministic audit/summary projection over persisted `welfareDebtAccountingRecords` for agent routing — unresolved / escalated / mitigated counts plus canonical category breakdown.

## Prerequisite (on `main` @ `1ec3ca12`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/welfareDebtAccountingRegistry.ts` (SPE-1888 slice 1 / SPE-2350 / PR #2568) |
| Persistence          | `welfareDebtAccountingRecords` on `GameState` (SPE-1888 slice 1 / PR #2568) |
| Mirror UI            | `welfareDebtAccountingMirrorView` (SPE-2351 / PR #2570)                |
| Weekly orchestration | `applyWeeklyWelfareDebtAccountingTick` (SPE-2352 / PR #2572)             |

## Audit contract (slice 4)

- **Hydrated truth only** — summarize persisted records as hydrated; do not re-sanitize or surface invalid hydrate drops.
- **Mitigation buckets** — count `unresolved`, `escalated`, `mitigated`, `acknowledged`, `waived`, and `denied` separately.
- **Warning-only inclusion** — valid records with warning-severity validation issues contribute to `warningOnlyCount`.
- **Category breakdown** — all `WELFARE_DEBT_CATEGORIES` in canonical order with zero counts preserved for byte stability.
- **Export surface** — `buildWelfareDebtAccountingLedgerAuditReport` emits deterministic `lines` for agent routing; no new UI in this slice.
- **Mirror integration** — `summarizeWelfareDebtAccountingRecords` shared with mirror summary counts (read-time only).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `summarizeWelfareDebtAccountingRecords` + `buildWelfareDebtAccountingLedgerAuditReport` | New persistence fields                     |
| Mirror summary counts via shared summarize helper                  | UI page/route changes                         |
| Unit tests for summary/audit helper                                | Weekly tick contract changes                  |
| Slice doc (this file) + backlog handoff                            | Coercive-protocol wire-up (SPE-1882)          |
|                                                                    | Bundle compose chain changes                  |

## Acceptance

- [ ] Empty `welfareDebtAccountingRecords` map returns zeroed summary without throw
- [ ] Warning-only hydrated records included in counts
- [ ] Terminal states (`mitigated`, `waived`, `denied`) bucketed correctly; `acknowledged` counted separately
- [ ] Category breakdown covers all canonical categories in stable order
- [ ] Byte-stable ordering on repeated audit builds
- [ ] No re-surfacing of invalid hydrate drops
- [ ] `npm run lint` + targeted tests + slice 1–3 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingRegistry.ts`                         |
| Mirror | `src/features/operations/welfareDebtAccountingMirrorView.ts` (summary reuse) |
| Tests  | `src/test/welfareDebtAccountingLedgerAudit.test.ts`                   |
| Plan   | `planning/welfare-debt-accounting-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Coercive protocol wire-up | SPE-1882 | Parent umbrella; out of audit boundary |
| SPE-1888 parent Done | SPE-1888 | Slice 4 closes ledger-summary deferral; coercive wire-up remains |

## See also

- `planning/welfare-debt-accounting-registry-slice-3.md`
- `src/domain/branchContinuityAudit.ts` — sibling audit report pattern
