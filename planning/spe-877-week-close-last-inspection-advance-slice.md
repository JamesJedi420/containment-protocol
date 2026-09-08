# SPE-877 — Week-close last-inspection auto-advance

| Field               | Value                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                                                           |
| **Linear**          | Child of [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — ID pending Linear create (MCP `needsAuth` this session) |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                                |
| **Branch**          | `cursor/spe-877-week-close-inspect-advance-2f18`                                                                                                                               |
| **Base `main` SHA** | `ea408a52348e70463ea725f6bd6b55a751d975b3`                                                                                                                                     |

## Boundary

Week-close stamps `blast_door` `lastInspectionWeek` to the closing week when SPE-2860 freshness is
`due` or `overdue`, and applies a frozen deficiency continuation so the integrity loop can cycle.
Schema kernel already shipped in SPE-2860. No extra classes, store/UI command, SPE-1027 consume,
or mutation stations.

## Week-close contract

Pure resolver in `src/domain/containmentClassInspection.ts`. Seam in
`src/domain/containmentClassWeekClose.ts`. Discriminated result; no throw; no default continue.

| Freshness            | `lastInspectionWeek`    | Deficiency                                            |
| -------------------- | ----------------------- | ----------------------------------------------------- |
| `current`            | unchanged (no-op)       | unchanged                                             |
| `due`                | stamped to closing week | `compensating_continue` / `secondary_interlock_watch` |
| `overdue`            | stamped to closing week | `hard_stop`                                           |
| existing `hard_stop` | still stamped           | sticky hard-stop (SPE-2860)                           |

Same deficiency is idempotent (no second deficiency/barrier event). `cycleCount`, `condition`,
inventory, lots, and `damagedEquipmentQueue` stay unchanged. Ordinary identities and malformed
integrity records skip independently. Same-week replay is a no-op once stamped.
`persistContainmentBarrierCoupling` runs after a successful stamp (same helper as SPE-2860).
Week-close stamps equipped copies even when the carrier is not idle (`allowNonIdleCarrier`);
player relocate/repair commands keep the idle lock.

Evaluate and stamp against the **closing week** (`context.sourceState.week`). `advanceQueues`
runs after `settleWeekState` increments `GameState.week`, so the seam takes the closing week
explicitly — same pattern as Combat Stim overdrive expiry.

## Events and hydration

Successful stamps emit `equipment.containment_class_inspected` with reason
`week_close_auto_advance`. Deficiency changes also emit existing
`equipment.containment_class_deficiency_recorded`. Valid events hydrate as history without
replaying mutations. `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` unchanged.

## Deferred

| Item or mechanic                              | Owner or prerequisite  | Reason                                          |
| --------------------------------------------- | ---------------------- | ----------------------------------------------- |
| Additional classes (pressure seal, interlock) | later SPE-877 child    | One class in this slice                         |
| SPE-1027 stock consume of the named part      | SPE-1027 / later child | Suitability already shipped; no inventory debit |
| Live workshop integrity mapping               | SPE-877 / SPE-1028     | SPE-2782 stays caller-owned                     |
| Mutation stations / integrity labor           | later SPE-877 child    | SPE-113 remains design-only                     |
| Store/UI inspect or deficiency commands       | later SPE-877 child    | Week-close is the production inspect path       |
| Ready / stow                                  | SPE-1658               | Access-state layer                              |
| Salvage / Auto-Scrap                          | SPE-1055 / SPE-2749    | Adjacent                                        |

## Acceptance

- `due` week-close stamps `lastInspectionWeek` and records compensating continue
- `overdue` week-close stamps `lastInspectionWeek` and records hard-stop
- sticky hard-stop is preserved and still stamped
- `current` and same-week replay are no-ops
- equipped copies stamp even when the carrier is not idle
- ordinary / malformed / inverted-week records fail closed without dropping the instance
- `cycleCount` and `condition` unchanged
- first hard-stop still couples SPE-1387 / SPE-471 barrier integrity
- inspect event hydrates as history without replaying mutation
- Parent SPE-877 remains Backlog (extra classes, workshop adapter, mutation stations remain)

## Linear issue body

**Title:** Week-close last-inspection auto-advance

**Parent:** SPE-877

**Goal:** At week-close, auto-advance `blast_door` last-inspection when cadence is due or overdue, and apply the frozen deficiency continuation so SPE-2860 freshness can cycle. Do not add a second integrity class.

**Scope:** Pure resolver + week-close seam + `advanceWeek` wire + `equipment.containment_class_inspected` hydration. Targeted Vitest. No extra classes, SPE-1027 consume, store/UI command, or SPE-2861 / SPE-2862 command rewrite.

**Constraints:** Do not change SPE-877 parent Goal. Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847. Do not fold SPE-1658, SPE-1027 stock, or SPE-1055 salvage.

**Acceptance criteria:**

- Frozen `blast_door` only; due → compensating continue; overdue → hard-stop
- Sticky hard-stop preserved; last-inspection still advances
- Fail-closed ordinary / malformed / inverted weeks
- Inspect event hydrates as history without replaying mutation
- Parent SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/containmentClassInspection.contract.test.ts`, `src/test/containmentClassWeekClose.contract.test.ts`, event validation/feed coverage
- `npm run lint`
- `npm run verify:backlog-handoff`
