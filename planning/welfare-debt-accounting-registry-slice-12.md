# SPE-1888 — Welfare-debt mirror matrix projection labels (slice 12)

One-page implementation plan. Linear: child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) (create on start). Follows shipped slice 11 (`planning/welfare-debt-accounting-registry-slice-11.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1888 slice 12 — Welfare-debt mirror matrix projection labels (create on start)                         |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent stays **Backlog** until full SPE-1047/1131 scope closes |
| **Branch** | `spe-1888-welfare-debt-mirror-matrix-projection-labels-slice-12`                                         |
| **Status** | **Shipped** — PR #2844 @ `f6bbf8be`                                                                        |
| **Base `main` SHA** | `45c14223`                                                                                          |

## Goal

Surface SPE-1047 permissibility verdict and SPE-1131 moral/legal outcome projection labels on `getWelfareDebtAccountingMirrorView` when faction ethics and accountability matrix records are hydrated — read-only display labels derived from slice 9 cross-link compose, reusing slice 17 projection formatters, without policy engines or compose changes.

## Prerequisite (on `main` @ `45c14223`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-link compose   | `composeWelfareDebtAccountingCrossLinksForRecord` (slice 9)          |
| Matrix projection formatters | `formatFactionEthicsPermissibilityProjectionLabel`, `formatAccountabilityOutcomeProjectionLabel` (slice 17 / SPE-1882) |
| Matrix persistence   | `factionEthicsRecords` / `accountabilityMatrixRecords` on GameState (slice 10) |
| Mirror cross-links   | slice 2 mirror wired-ref surfacing                                     |

## Mirror contract

- **Read-only** — projection labels derive from hydrated matrix records at mirror build time only; no GameState mutation.
- **Matrix-gated** — labels populate only when `factionEthicsLinks` / `accountabilityMatrixLinks` are non-empty (matrix maps hydrated); opaque `review_owner:` / `mitigation_path:` refs alone yield empty projection labels.
- **Deterministic sort** — multiple matrix matches per ledger record follow cross-link wired-ref sort order.
- **Display-only** — labels do not gate ledger creation or authorization.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Welfare-debt projection label formatters in `welfareDebtAccountingCrossLinks.ts` | Full SPE-1047 policy engine |
| Mirror view per-record projection label fields                      | Full SPE-1131 matrix engine                   |
| Mirror page review-column projection display                        | Inverse compose match kind changes            |
| Targeted cross-link, mirror view, page tests                        | Coercive protocol mirror changes              |
| Slice doc (this file) + backlog handoff on merge                    | Mission triage expansion                      |
|                                                                    | SPE-1908 cross-reconciliation reopen          |

## Acceptance

- [x] Matrix maps absent → permissibility and outcome projection labels empty (opaque wired refs unchanged)
- [x] Matrix hydration surfaces deterministic sorted permissibility verdict labels (e.g. Escalation Required)
- [x] Matrix hydration surfaces deterministic sorted moral/legal outcome summary labels
- [x] Projection labels remain display-only (no creation gates)
- [x] Slice 1–11 mirror regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinks.ts`                       |
| View   | `src/features/operations/welfareDebtAccountingMirrorView.ts`        |
| UI     | `src/features/operations/WelfareDebtAccountingMirrorPage.tsx`         |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/welfareDebtAccountingCrossLinks.test.ts`, `src/features/operations/welfareDebtAccountingMirrorView.test.ts`, `src/features/operations/WelfareDebtAccountingMirrorPage.test.tsx` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-12.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full faction ethics policy engine | SPE-1047 | Parent AC remainder beyond registry-wave mirror surfacing |
| Full accountability matrix engine | SPE-1131 | Parent AC remainder beyond registry-wave mirror surfacing |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of mirror surfacing boundary |

## See also

- `planning/welfare-debt-accounting-registry-slice-9.md` — cross-link compose origin
- `planning/coercive-contained-person-protocol-model-slice-17.md` — projection formatter pattern
