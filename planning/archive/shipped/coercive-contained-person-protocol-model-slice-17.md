# SPE-1047 / SPE-1131 — Coercive protocol mirror ethics + accountability projection labels (slice 17)

One-page implementation plan. Linear: SPE-1882 slice 17 child (create on merge) under SPE-1047 / SPE-1131 deferred scope. Follows shipped slice 16 (`planning/coercive-contained-person-protocol-model-slice-16.md`, PR #2842).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1882 slice 17 — Mirror ethics + accountability projection labels (create on merge)                     |
| **Status** | **Shipped** — PR #2843 @ `b6e0f649`                                                                        |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–16 shipped)           |
| **Related**| [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047), [SPE-1131](https://linear.app/spectranoir/issue/SPE-1131) — registry-wave compose deferred; mirror surfacing only |
| **Branch** | `spe-1047-coercive-protocol-mirror-ethics-projection-labels-slice-17`                                    |
| **Base `main` SHA** | `269e6e89`                                                                                          |

## Goal

Surface SPE-1047 permissibility verdict and SPE-1131 moral/legal outcome projection labels on `getCoerciveContainedPersonProtocolMirrorView` when faction ethics and accountability matrix records are hydrated — read-only display labels derived from slice 16 cross-link compose, without policy engines or creation gates.

## Prerequisite (on `main` @ `269e6e89`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Ethics/accountability inverse compose | `composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord` (slice 16) |
| Matrix projection    | `projectFactionEthicsMatrixReview`, `projectMoralLegalAccountabilityMatrixReview` |
| Matrix persistence   | `factionEthicsRecords` / `accountabilityMatrixRecords` on GameState (SPE-2454) |
| Cross-link mirror    | slice 16 wired-ref surfacing (PR #2842)                                |

## Mirror contract

- **Read-only** — projection labels derive from hydrated matrix records at mirror build time only; no GameState mutation.
- **Matrix-gated** — labels populate only when `factionEthicsLinks` / `accountabilityMatrixLinks` are non-empty (matrix maps hydrated); opaque `review_owner:` / `mitigation_path:` refs alone yield empty projection labels.
- **Deterministic sort** — multiple matrix matches per protocol follow slice 16 cross-link wired-ref sort order.
- **Display-only** — labels do not gate protocol creation or authorization.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Projection label formatters in `welfareDebtAccountingCrossLinks.ts` | Full SPE-1047 policy engine |
| Mirror view per-record projection label fields                      | Full SPE-1131 matrix engine                   |
| Mirror page owner-ref column projection display                     | Inverse compose match kind changes            |
| Targeted cross-link, mirror view, page tests                        | Procedure anchors / debt category mapping     |
| Slice doc (this file) + backlog handoff on merge                    | Mission triage expansion                      |
|                                                                    | SPE-1908 cross-reconciliation reopen          |

## Acceptance

- [x] Matrix maps absent → permissibility and outcome projection labels empty (opaque wired refs unchanged)
- [x] Matrix hydration surfaces deterministic sorted permissibility verdict labels (e.g. Escalation Required)
- [x] Matrix hydration surfaces deterministic sorted moral/legal outcome summary labels
- [x] Projection labels remain display-only (no creation gates)
- [x] Slice 1–16 mirror regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinks.ts`                       |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| UI     | `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.tsx` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/welfareDebtAccountingCrossLinks.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.test.tsx` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-17.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full faction ethics policy engine | SPE-1047 | Parent AC remainder beyond registry-wave mirror surfacing |
| Full accountability matrix engine | SPE-1131 | Parent AC remainder beyond registry-wave mirror surfacing |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of mirror surfacing boundary |

## See also

- `planning/coercive-contained-person-protocol-model-slice-16.md` — cross-link compose + deferred row origin
- `planning/welfare-debt-accounting-registry-slice-9.md` — matrix cross-link compose origin
