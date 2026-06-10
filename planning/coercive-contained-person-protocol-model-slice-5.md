# SPE-1882 — Coercive contained-person protocol weekly projection snapshots (slice 5)

One-page implementation plan. Linear: [SPE-2424](https://linear.app/spectranoir/issue/SPE-2424) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Follows shipped slice 4 (`planning/coercive-contained-person-protocol-model-slice-4.md`, PR #2715 / [SPE-2423](https://linear.app/spectranoir/issue/SPE-2423)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2424 — Coercive contained-person protocol weekly projection snapshots (slice 5)](https://linear.app/spectranoir/issue/SPE-2424) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–4 shipped)          |
| **Branch** | `spe-1882-coercive-protocol-projection-snapshots-slice-5`                                                  |
| **Base `main` SHA** | `25a6e9a1`                                                                                          |

## Goal

Persist bounded weekly tradeoff and coercion-risk projection snapshots on `GameState`, hydrate/sanitize on load, and wire the persistence pass into `applyWeeklyCoerciveProtocolTick` without changing mirror UI or welfare-debt math.

## Prerequisite (on `main` @ `25a6e9a1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` projection pass (SPE-2422)           |
| Mirror UI            | `coerciveContainedPersonProtocolMirrorView` (SPE-2423)                 |

## Snapshot contract (slice 5)

- **Field** — `coerciveContainedPersonProtocolWeeklyProjectionSnapshots` keyed by byte-stable protocol record id.
- **Payload** — `{ recordId, week, tradeoff, riskReview }` from registry projection helpers.
- **Tick pass** — `applyWeeklyCoerciveProtocolTick` writes/updates snapshots for active records; prunes removed record ids.
- **Idempotency** — re-tick same week with unchanged records returns same snapshot map reference.
- **No-op** — empty protocol map returns records and snapshots unchanged without throw.
- **Bounds** — sanitize caps map size (`MAX_COERCIVE_PROTOCOL_WEEKLY_PROJECTION_SNAPSHOTS`) and unknown-field list length; drops orphan snapshot keys not in hydrated protocol records.
- **Metadata** — redacted/unknown field propagation preserved in tradeoff and risk-review projections.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Snapshot types + sanitize in registry                              | Mirror UI module changes                      |
| `coerciveContainedPersonProtocolWeeklyProjectionSnapshots` on `GameState` | Contradiction-check siblings (SPE-1897+) |
| `applyWeeklyCoerciveProtocolTick` persistence pass + `advanceWeek` wire | Welfare-debt accounting math           |
| `runTransfer` hydrate/sanitize                                     | Medication/custody registry changes           |
| Targeted orchestration + persistence + advanceWeek tests           | SPE-1882 parent Done                            |
| Slice doc (this file)                                              | Faction ethics links (SPE-1047 / SPE-1131)    |

## Acceptance

- [x] Empty protocol map tick is a no-op for records and snapshots without throw
- [x] Weekly tick persists tradeoff + risk-review snapshots keyed by record id
- [x] Re-tick same week is idempotent (stable snapshot map reference)
- [x] Save/load and hydrate round-trip snapshots byte-stable
- [x] Redacted/unknown metadata propagates into persisted projections
- [x] Sanitize drops invalid entries, orphan ids, and enforces snapshot bounds
- [x] Slice 1–4 regression + `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`, `src/domain/coerciveContainedPersonProtocolWeeklyOrchestration.ts`, `src/domain/models.ts`, `src/domain/sim/advanceWeek.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/coerciveContainedPersonProtocolWeeklyOrchestration.test.ts`, `src/test/coerciveContainedPersonProtocolRegistryPersistence.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Contradiction-check sibling implementations | SPE-1897+ | Registry exposes flags only |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of snapshot persistence boundary |
| SPE-1889 integrated health bundle compose | SPE-1889 | Out of snapshot persistence boundary |
| Mirror UI reads persisted snapshots instead of read-time projection | SPE-1882 follow-up | Slice 5 persists only; mirror unchanged |

## See also

- `planning/coercive-contained-person-protocol-model-slice-3.md` — tick contract origin
- `planning/coercive-contained-person-protocol-model-slice-4.md` — mirror UI (read-time projections)
