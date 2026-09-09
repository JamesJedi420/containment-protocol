# SPE-2864 — Additional containment-class inspection kernel (pressure seal)

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                            |
| **Linear**          | [SPE-2864](https://linear.app/spectranoir/issue/SPE-2864/additional-containment-class-inspection-kernel-pressure-seal)          |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog** |
| **Branch**          | `cursor/spe-2864-pressure-seal-inspection-kernel`                                                                               |
| **Base `main` SHA** | `4289da0de449a3a257d9f88baebf6359ac2d74d3`                                                                                      |

## Boundary

One extra frozen containment class (`pressure_seal`) copies the SPE-2860 / week-close kernel:
cadence spec, deficiency continuations, week-close last-inspection stamp, inspect/deficiency
`classId` union, and fail-closed unknown class. Do not add interlock. Do not add store/UI
commands, SPE-1027 consume, workshop live mapping, or mutation stations. Barrier coupling stays
blast-door membrane only — do not silently write `blast_door_membrane` from a pressure-seal
deficiency.

## Authored class

`CONTAINMENT_CLASS_IDS`: `blast_door`, `pressure_seal`.

| Field                           | `blast_door` (unchanged)    | `pressure_seal`         |
| ------------------------------- | --------------------------- | ----------------------- |
| Authored interval               | 4 weeks                     | 3 weeks                 |
| Intensification bucket          | 2                           | 2                       |
| Compensating control            | `secondary_interlock_watch` | `backup_gasket_watch`   |
| Week-close due continuation     | `compensating_continue`     | `compensating_continue` |
| Week-close overdue continuation | `hard_stop`                 | `hard_stop`             |

Mixed class/control pairings fail closed (`malformed_integrity` / event validation). Unknown
class (`interlock`) stays `invalid_class`. SPE-2861 spare-part gate and SPE-2862 technician
stabilization remain blast-door-only.

## Week-close and barrier

Week-close stamps use `parsed.integrity.classId` (no hardcoded `blast_door` drafts). Evaluate
against the closing week (`sourceState.week`). `persistContainmentBarrierCoupling` no-ops unless
the instance class is `blast_door`.

## Events and hydration

Inspect and deficiency payloads accept `classId: 'blast_door' \| 'pressure_seal'` and the matching
authored control. Stabilization and barrier-change events stay `blast_door`. Valid inspect events
hydrate as history without replaying mutations. `GAME_STORE_VERSION` / `GAME_SAVE_VERSION`
unchanged.

## Deferred

| Item or mechanic                                           | Owner or prerequisite                                                                   | Reason                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Interlock class                                            | this SPE-877 child (`planning/spe-877-interlock-containment-class-inspection-slice.md`) | Shipped as the next extra-class child; unknown-class sentinel is now `airlock`   |
| Pressure-seal barrier zone                                 | this SPE-877 child (`planning/spe-877-pressure-seal-barrier-zone-slice.md`)             | Shipped keyed `pressure_seal_membrane`; does not write `blast_door_membrane`     |
| SPE-1027 stock consume of a named part                     | SPE-1027 / later child                                                                  | Suitability stays blast-door-only; no inventory debit                            |
| Live workshop integrity mapping                            | SPE-877 / SPE-1028                                                                      | SPE-2782 stays caller-owned                                                      |
| Mutation stations / integrity labor                        | later SPE-877 child                                                                     | SPE-113 remains design-only                                                      |
| Store/UI inspect or deficiency commands                    | later SPE-877 child                                                                     | Week-close remains the production inspect path                                   |
| Ready / stow                                               | SPE-1658                                                                                | Access-state layer                                                               |
| Salvage / Auto-Scrap                                       | SPE-1055 / SPE-2749                                                                     | Adjacent                                                                         |
| Inspect/deficiency `intervalWeeks` vs authored cadence max | later SPE-877 child                                                                     | Hydrate keeps event provenance; blast_door already accepts any positive interval |

## Acceptance

- Frozen registry exposes `blast_door` and `pressure_seal` only; `interlock` remains `invalid_class`
- Pressure-seal cadence intensifies from `cycleCount`; identical history yields identical interval
- Due / overdue / sticky deficiency and week-close stamp work for `pressure_seal`
- Fail-closed unknown class stays; blast-door regression stays green
- Event validation rejects mixed class/control pairings
- Barrier writer does not couple `pressure_seal` into `blast_door_membrane`
- Inspect/deficiency events hydrate as history without replaying mutation
- Parent SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/containmentClassInspection.contract.test.ts`, `src/test/containmentClassWeekClose.contract.test.ts`, event validation/feed coverage, hydrate cases in `src/test/equipmentInstance.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
