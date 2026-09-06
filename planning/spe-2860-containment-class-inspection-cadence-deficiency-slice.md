# SPE-2860 — Containment-class inspection cadence and deficiency stop/continue

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                            |
| **Linear**          | [SPE-2860](https://linear.app/spectranoir/issue/SPE-2860)                                                                       |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog** |
| **Branch**          | `cursor/spe-2860-containment-inspection-f235`                                                                                   |
| **Base `main` SHA** | `675f2e7eeae91a234acb28c552f9f36340b595f5`                                                                                      |

## Boundary

One frozen containment-class fixture (`blast_door`) gets compact integrity class, derived inspection
freshness, and deficiency state **distinct** from `EquipmentInstanceCondition`. Cadence is the
authored positive-integer week interval, intensified deterministically by local `cycleCount`.
Deficiency is hard-stop (not in-service) or compensating-control continuation (temporary in-service
with named `secondary_interlock_watch`). Compensating continue cannot clear a later hard-stop.
Sanitize/hydrate fail closed on missing/malformed/unknown class. Optional persisted field on
`EquipmentInstance` plus `equipment.containment_class_deficiency_recorded`. SPE-2851 repair, return,
and re-agg damaged gates stay unchanged.

**Mismatch vs SPE-877 grooming kernel:** grooming named a persistence-free catalog
`functionalClass: 'containment'` evaluator. SPE-2860 binds `blast_door`, compact persistence,
history intensification, and events. Follow SPE-2860. Week-close auto-advance of last-inspection
remains deferred (grooming child 4).

## Compact state

Optional `EquipmentInstance.containmentIntegrity`:

- `classId: 'blast_door'`
- `lastInspectionWeek` (positive integer)
- `cycleCount` (non-negative integer; local operating history)
- `deficiency`: `{ kind: 'none' }` \| `{ kind: 'hard_stop' }` \| `{ kind: 'compensating_continue', compensatingControlId: 'secondary_interlock_watch' }`

Freshness (`current` / `due` / `overdue`) is derived, not stored. `condition` stays `operational` |
`damaged`. Legacy omit hydrates as no containment class. Malformed or unknown-class records drop
the instance independently.

## Cadence

Authored interval: 4 weeks. Intensification: `max(1, 4 - floor(cycleCount / 2))`. Same history →
same interval. Evaluator inputs: class, last-inspection week, current week, cycleCount.
`weeksSinceInspection < interval` → current; `===` → due; `>` → overdue. Fail-closed:
`invalid_class`, `missing_cadence`, `invalid_weeks`, `inverted_weeks`, `invalid_history`.

## Deficiency stop / continue

`applyContainmentClassDeficiency` records deficiency only when freshness is `due` or `overdue`.
Hard-stop → `inService: false`. Compensating continue → `inService: true` with named control.
Existing hard-stop rejects compensating continue (no clear of later deterioration). Escalation from
compensating continue to hard-stop is allowed. Repeat same deficiency is idempotent (no second
event). Does not mutate `condition`, inventory, lots, or `damagedEquipmentQueue`. Does not gate
return / re-agg.

## Events and hydration

Successful first-time (or escalated) deficiency writes emit
`equipment.containment_class_deficiency_recorded`. Valid events hydrate as history without replaying
mutations. `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` unchanged.

## Deferred

| Item or mechanic                              | Owner or prerequisite                                                            | Reason                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Spare-part suitability / repair economics     | SPE-877 spare-part child (`planning/spe-spare-part-suitability-repair-slice.md`) | Typed `blast_door` / `blast_door_hinge_seal` gate on SPE-2851; no stock consume |
| Stabilization / deficiency clear              | later SPE-877 child                                                              | Hard-stop is sticky; no inspect-to-clear command                                |
| Breach / `barrier_integrity` propagation      | later SPE-877 child                                                              | SPE-1387 pairing; architecture file still missing                               |
| Additional classes (pressure seal, interlock) | later SPE-877 child                                                              | One class in this slice                                                         |
| Week-close last-inspection auto-advance       | later SPE-877 child                                                              | Schema kernel ships; `advanceWeek` stays out                                    |
| Live workshop integrity mapping               | SPE-877 / SPE-1028                                                               | SPE-2782 stays caller-owned                                                     |
| Ready / stow                                  | SPE-1658                                                                         | Access-state layer                                                              |
| Salvage / Auto-Scrap                          | SPE-1055 / SPE-2749                                                              | Adjacent                                                                        |

## Acceptance

- Frozen registry exposes exactly one class: `blast_door`
- Cadence intensifies from `cycleCount`; identical history yields identical interval
- Hard-stop is not in-service; compensating continue is temporary and cannot overwrite hard-stop
- Fail-closed missing / malformed / unknown class
- Hydration of new field + deficiency event; SPE-2851 repair still preserves integrity and damaged gates
- Parent SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/containmentClassInspection.contract.test.ts`, SPE-2851-adjacent cases in `src/test/equipmentInstance.contract.test.ts`, event validation/feed coverage
- `npm run lint`
- `npm run verify:backlog-handoff`
