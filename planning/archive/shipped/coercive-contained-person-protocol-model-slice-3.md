# SPE-1882 — Coercive contained-person protocol weekly orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2422](https://linear.app/spectranoir/issue/SPE-2422) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Follows shipped slice 2 (`planning/coercive-contained-person-protocol-model-slice-2.md`, PR #2711 / [SPE-2421](https://linear.app/spectranoir/issue/SPE-2421)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2422 — Coercive contained-person protocol weekly orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2422) |
| **Status** | **Shipped** — PR #2713 @ `cfad608f`                                                                        |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–3 shipped)          |
| **Branch** | `spe-1882-coercive-protocol-weekly-hook-slice-3`                                                           |
| **Base `main` SHA** | `a40cb18f`                                                                                          |

## Goal

Wire persisted `coerciveContainedPersonProtocolRecords` into `advanceWeek` with a pure domain tick: run deterministic tradeoff and coercion-risk projections each week while preserving source records byte-stable.

## Prerequisite (on `main` @ `a40cb18f`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Welfare-debt hook    | `coerciveProcedureWelfareDebtCreation.ts` (SPE-1888 slice 5)           |
| Sibling weekly hooks | `containedPersonTherapeuticCareWeeklyOrchestration.ts` (SPE-2343)      |

## Orchestration tick contract (slice 3)

- **Projection pass** — for each persisted record, compute `projectContainmentCareTradeoff` and `projectCoerciveProtocolRiskReview` deterministically; projections are not persisted this slice.
- **Record preservation** — source `CoerciveProtocolRecord` entries are never mutated; owner refs (`procedureRef`, `medicationRegimenRef`, `custodyStatusRef`) byte-stable.
- **One pass per week** — bounded orchestration over the map; re-tick same week is idempotent (same map reference when unchanged).
- **No-op** — empty map returns without throw.
- **No welfare-debt duplication** — tick does not create or mutate `welfareDebtAccountingRecords`.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyCoerciveProtocolTick` in domain module                 | New persistence fields, UI                    |
| Call from `advanceWeek` after therapeutic care tick, before welfare-debt creation | Contradiction-check siblings (SPE-1897+) |
| Targeted domain + `advanceWeek` integration tests                  | Sanitize/hydration changes (slice 2)          |
| Slice doc (this file) + backlog handoff                            | Registry schema/validation changes (slice 1)  |

## Acceptance

- [x] Empty `coerciveContainedPersonProtocolRecords` map is a no-op without throw
- [x] Projections run deterministically for fixture records during tick
- [x] Records byte-stable after `advanceWeek`; owner refs preserved
- [x] Re-applying tick after advance is idempotent for the same week
- [x] Welfare-debt creation regression green when protocol records present
- [x] Slice 1 registry + slice 2 persistence tests unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/coerciveContainedPersonProtocolWeeklyOrchestration.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Persisted projection snapshots | SPE-1882 follow-up | Slice 3 is wire-up stub only |
| Contradiction-check sibling implementations | SPE-1897+ | Registry exposes flags only |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of weekly-hook boundary |
| SPE-1889 integrated health bundle compose | SPE-1889 | Out of weekly-hook boundary |
| Full SPE-1882 parent Done | SPE-1882 | Multiple slices remain |

## See also

- `planning/coercive-contained-person-protocol-model-slice-2.md`
- `planning/contained-person-therapeutic-care-registry-slice-3.md`
