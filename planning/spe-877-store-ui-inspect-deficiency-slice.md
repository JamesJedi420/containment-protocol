# SPE-2869 — Store/UI inspect or deficiency commands

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                            |
| **Linear**          | [SPE-2869](https://linear.app/spectranoir/issue/SPE-2869/storeui-inspect-or-deficiency-commands)                                |
| **GitHub issue**    | [#3613](https://github.com/JamesJedi420/containment-protocol/issues/3613)                                                       |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog** |
| **Branch**          | `cursor/spe-2869-store-ui-inspect-deficiency-bd8f`                                                                              |
| **Base `main` SHA** | `2205273b21389a54f3308ee8c2bd523da83ec155`                                                                                      |

## Boundary

Wire existing SPE-2862 `stabilizeContainmentClassDeficiency` through Zustand store, `equipmentView`,
and the Equipment stored-instance surface. That is the player-facing deficiency-disposition command.
Do not add a mid-week inspect command. Do not call `advanceContainmentClassInspectionsAtWeekClose`
from UI or store. Week-close auto-advance remains the production inspect path.

Reuse `repairStoredEquipmentInstanceCondition` / `canRepairCondition` as the store + projection +
confirmation pattern. Prefer `canStabilizeContainmentClassDeficiency` in the projection. Do not
re-derive cadence, barrier coupling, or compensating-control IDs in UI.

## Command contract

Store action `stabilizeContainmentClassDeficiency(instanceId)`:

1. Call domain `stabilizeContainmentClassDeficiency`.
2. On success, append existing `equipment.containment_class_stabilized` with reason
   `technician_stabilization`.
3. On fail-closed, persist the domain state with no event.

Projection `canStabilizeContainmentDeficiency` is true only when domain
`canStabilizeContainmentClassDeficiency` is true (parsed containment class + technician-stabilizable
deficiency). Ordinary identities, `none`, missing, and malformed stay hidden / disabled. Extra-class
eligibility is owned by the extra-class technician-stabilization child. Do not render
`lastInspectionWeek`, `cycleCount`, or raw integrity on the Equipment row.

## Fail closed

| Input                                      | Result                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Missing / unsafe instance id               | no mutation, no event                                                                       |
| Ordinary identity                          | no mutation, no event, no UI command                                                        |
| Extra class (`pressure_seal`, `interlock`) | no mutation, no event, no UI command (this child; extra-class stabilize shipped separately) |
| `deficiency.kind === 'none'`               | no mutation, no event, no UI command                                                        |
| Malformed integrity                        | no mutation, no event, no UI command                                                        |

## Determinism and compatibility

- Domain writer and week-close inspect kernel stay unchanged.
- Success still uses `applyEquipmentInstanceTransition` with hard-stop relief allowance owned by
  SPE-2862.
- Valid events hydrate as history without replaying mutations.
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version stay unchanged.

## Deferred

| Item or mechanic                              | Owner or prerequisite                                                                    | Reason                                                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Mid-week inspect command                      | later SPE-877 child                                                                      | Week-close remains the production inspect path                                                                          |
| SPE-1027 stock consume of a named part        | SPE-1027 / later child                                                                   | Suitability stays blast-door-only; no inventory debit                                                                   |
| Seed `equipment-instance-blast-door-workshop` | this SPE-877 child (`planning/spe-877-seed-blast-door-workshop-slice.md`) | Shipped: starting-state seeds the authored SPE-2866 identity; mapping stays blast-door-only |
| Additional SPE-113 stations                   | this SPE-877 child (`planning/spe-877-pressure-seal-integrity-bench-slice.md`)            | Shipped pressure-seal bench; interlock bench remains later                                                              |
| Extra-class workshop quality                  | later SPE-877 child                                                                      | SPE-2866 stays blast-door only                                                                                          |
| Extra-class technician stabilization          | shipped SPE-877 child (`planning/spe-877-extra-class-technician-stabilization-slice.md`) | This child shipped store/UI on the blast-door writer; extra-class relieve/clear now uses authored compensating controls |

## Acceptance

- Player can trigger deficiency disposition through store/UI without a parallel domain path
- Week-close inspect still runs and remains authoritative for due/overdue auto-advance
- Fail-closed missing / malformed / wrong class
- Parent SPE-877 remains Backlog
- Targeted Vitest for projection availability + store orchestration

## Linear issue body

**Title:** Store/UI inspect or deficiency commands

**Parent:** SPE-877

See Linear [SPE-2869](https://linear.app/spectranoir/issue/SPE-2869/storeui-inspect-or-deficiency-commands).

## Validation

- Targeted Vitest: `src/features/equipment/equipmentView.test.ts`, `src/app/store/gameStore.test.ts`, `src/features/equipment/EquipmentPage.test.tsx`
- `npm run lint`
- `npm run verify:backlog-handoff`
