# SPE-1882 — Coercive protocol mirror reads persisted weekly projection snapshots (slice 11)

One-page implementation plan. Linear: SPE-1882 slice 11 child (create on merge). Follows shipped slice 10 (`planning/coercive-contained-person-protocol-model-slice-10.md`, PR #2725 / [SPE-2427](https://linear.app/spectranoir/issue/SPE-2427)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1882 slice 11 — Mirror reads persisted weekly projection snapshots (create on merge)                 |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–10 shipped)           |
| **Branch** | `spe-1882-coercive-protocol-mirror-snapshot-read-slice-11`                                                 |
| **Base `main` SHA** | `02e2a9aa`                                                                                          |

## Goal

Wire `getCoerciveContainedPersonProtocolMirrorView` to read slice-5 persisted `coerciveContainedPersonProtocolWeeklyProjectionSnapshots` for tradeoff + risk-review display, with read-time projection fallback when snapshots are missing.

## Prerequisite (on `main` @ `02e2a9aa`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` + snapshots (SPE-2422 / SPE-2424)    |
| Mirror UI (base)     | `coerciveContainedPersonProtocolMirrorView` (SPE-2423 / slices 4–10)   |

## Mirror contract

- **Read-only** — no GameState mutation from mirror build.
- **Snapshot-first** — when a hydrated snapshot exists for a record id, tradeoff + risk-review fields and summary counts use persisted projection payloads.
- **Fallback** — missing or orphan snapshots fall back to `projectContainmentCareTradeoff` / `projectCoerciveProtocolRiskReview` at read time.
- **Stale snapshot** — persisted snapshot wins over current record mutation (weekly tick truth, not live re-projection).
- **Contradiction checks** — remain read-time via `evaluateCoerciveProtocolContradictionChecks`; not part of snapshot payload.
- **Summary** — add `weeklySnapshotCount` for agent routing visibility (mirrors truth-layer mirror pattern).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Mirror view resolves tradeoff + risk-review from snapshots          | Mirror page UI stat card for snapshot count   |
| Summary counts use resolved projections                            | Welfare-debt accounting math                  |
| Targeted mirror view + advanceWeek integration tests               | SPE-1886 medication engine                    |
| Slice doc (this file) + backlog handoff                            | SPE-1889 condition bundles                    |
|                                                                    | Contradiction-check evaluator changes         |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |

## Acceptance

- [x] Missing snapshots fall back to read-time tradeoff + risk-review projections
- [x] Hydrated snapshots drive tradeoff + risk-review mirror fields and summary counts
- [x] Stale snapshot preferred over read-time after record mutation
- [x] `advanceWeek`-hydrated GameState mirror reads persisted snapshots
- [x] Slice 1–10 mirror regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| Tests  | `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-11.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mirror page stat card for weekly snapshot count | SPE-1882 follow-up | View field only this slice |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of snapshot read boundary |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of mirror UI boundary |
| SPE-1882 parent Done | SPE-1882 | Parent may auto-close on child Done — return to Backlog if grooming-style closure |

## See also

- `planning/coercive-contained-person-protocol-model-slice-5.md` — snapshot persistence origin
- `planning/coercive-contained-person-protocol-model-slice-10.md` — deferred mirror snapshot read row
