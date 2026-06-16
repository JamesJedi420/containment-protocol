# SPE-1047 / SPE-1131 — Coercive protocol mirror faction ethics + accountability cross-links (slice 16)

One-page implementation plan. Linear: SPE-1882 slice 16 child (create on merge) under SPE-1047 / SPE-1131 deferred scope. Follows shipped slice 15 (`planning/coercive-contained-person-protocol-model-slice-15.md`, PR #2841).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1882 slice 16 — Mirror faction ethics + accountability cross-links (create on merge)                   |
| **Status** | **In Progress** — branch `spe-1047-coercive-protocol-mirror-ethics-accountability-slice-16` |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–15 shipped)           |
| **Related**| [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047), [SPE-1131](https://linear.app/spectranoir/issue/SPE-1131) — registry-wave compose deferred; mirror surfacing only |
| **Branch** | `spe-1047-coercive-protocol-mirror-ethics-accountability-slice-16`                                       |
| **Base `main` SHA** | `23dd59b1`                                                                                          |

## Goal

Surface SPE-1047 faction ethics and SPE-1131 accountability matrix cross-links on `getCoerciveContainedPersonProtocolMirrorView` by reusing welfare-debt-mediated inverse compose — read-only agent-routing labels without registry reopen, policy engines, or creation gates.

## Prerequisite (on `main` @ `23dd59b1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Welfare-debt inverse compose | `composeWelfareDebtCrossLinksForCoerciveProtocolRecord` (slice 12) |
| Matrix cross-link compose | `composeWelfareDebtAccountingCrossLinksForRecord` + matrix maps (SPE-1888 slice 9) |
| Matrix persistence | `factionEthicsRecords` / `accountabilityMatrixRecords` on GameState (SPE-2454) |
| Canonical fixture posture | slice 15 compromised-care realignment (PR #2841)                |

## Mirror contract

- **Read-only** — mirror calls inverse compose at build time only; no GameState mutation.
- **Welfare-debt mediated** — ethics/accountability links derive from linked welfare-debt ledger entries' `reviewOwnerLabel` / `mitigationPathLabel`; match kinds stay byte-stable with welfare-debt mirror compose.
- **Opaque fallback** — when matrix maps absent, surface `review-owner:` / `mitigation-path:` wired refs from linked debt labels (display-only; not authorization gates).
- **Summary** — `factionEthicsLinkedRecordCount` and `accountabilityMatrixLinkedRecordCount` count records with ≥1 linked label.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Inverse ethics/accountability compose in `welfareDebtAccountingCrossLinks.ts` | Full SPE-1047 policy engine |
| Mirror view per-record cross-link labels + summary counts           | Full SPE-1131 matrix engine                   |
| Mirror page stat cards + owner-ref column display                   | Registry reopen / handling-mode rewrite       |
| Targeted cross-link, mirror view, page, advanceWeek tests           | Procedure anchors / merge precedence          |
| Slice doc (this file) + backlog handoff on merge                    | Mission triage expansion                      |
|                                                                    | SPE-1908 cross-reconciliation reopen          |

## Acceptance

- [x] Missing welfare-debt or matrix maps yield empty ethics/accountability labels and zero summary counts
- [x] Matrix hydration surfaces deterministic sorted `faction-ethics:` / `accountability-matrix:` wired refs
- [x] Opaque `review_owner:` / `mitigation_path:` labels surface when matrix maps absent but linked debt carries labels
- [x] `advanceWeek`-hydrated GameState mirror reads persisted cross-links
- [x] Ethics labels remain display-only (no creation gates)
- [x] Slice 1–15 mirror regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinks.ts`                       |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| UI     | `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.tsx` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/welfareDebtAccountingCrossLinks.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.test.tsx`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-16.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full faction ethics policy engine | SPE-1047 | Parent AC remainder beyond registry-wave mirror surfacing |
| Full accountability matrix engine | SPE-1131 | Parent AC remainder beyond registry-wave mirror surfacing |
| Permissibility verdict / outcome projection label columns | SPE-1047 / SPE-1131 follow-up | Cross-link wired refs sufficient for agent routing this slice |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of mirror surfacing boundary |

## See also

- `planning/coercive-contained-person-protocol-model-slice-12.md` — welfare-debt inverse compose origin
- `planning/coercive-contained-person-protocol-model-slice-15.md` — deferred row origin
- `planning/welfare-debt-accounting-registry-slice-9.md` — matrix cross-link compose origin
