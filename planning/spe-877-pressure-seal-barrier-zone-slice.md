# SPE-877 child — Extra-class barrier zones (pressure-seal membrane)

| Field               | Value                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                                                           |
| **Linear**          | Child of [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — ID pending Linear create (MCP `needsAuth` this session) |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                                |
| **Branch**          | `cursor/spe-877-pressure-seal-barrier-zone-6667`                                                                                                                               |
| **Base `main` SHA** | `61ab74a9c5ecc2bce45f8551950885f24c3b39a0`                                                                                                                                     |

## Boundary

One extra membrane class: `pressure_seal` writes a new zone `pressure_seal_membrane`. Do not write
`blast_door_membrane` from pressure-seal. Do not author an interlock membrane. Reuse
`persistContainmentBarrierCoupling`, the inspect/deficiency kernel, and event
`equipment.containment_barrier_integrity_changed`. Domain-only. No store/UI inspect command, no
SPE-1027 consume, no SPE-2866 workshop remapping, no blast-door labor stamp changes, no SPE-2827 /
SPE-2848 unstamped re-aggregation reopen.

## Registry

`GameState.containmentBarrierIntegrity` is a keyed registry (`blast_door_membrane` /
`pressure_seal_membrane`), not a second GameState field. Legacy singular
`{ zoneId, status, sourceInstanceId, sourceDeficiencyKind }` hydrates into the keyed shape. Omit
hydrates as intact. Malformed siblings drop independently. Key must match `record.zoneId`. Mixed
class/zone pairings fail closed. Recorded `zone_breach` never downgrades. No `GAME_STORE_VERSION` /
`GAME_SAVE_VERSION` change.

| Class           | Zone                     | This child                                |
| --------------- | ------------------------ | ----------------------------------------- |
| `blast_door`    | `blast_door_membrane`    | Unchanged                                 |
| `pressure_seal` | `pressure_seal_membrane` | New coupling                              |
| `interlock`     | none                     | `persistContainmentBarrierCoupling` no-op |

## Coupling contract

Same resolver `resolveContainmentBarrierIntegrityCoupling` (optional `classId`, default
`blast_door` for existing kernel tests). `applyContainmentClassDeficiency` and week-close inspect
advance share `persistContainmentBarrierCoupling`, which looks up `zoneIdForContainmentClass` and
merges only that zone.

| Deficiency               | Barrier status    | Notes                                        |
| ------------------------ | ----------------- | -------------------------------------------- |
| `hard_stop`              | `zone_breach`     | SPE-471 catastrophic wall-breach             |
| `compensating_continue`  | `flow_restraint`  | `barrier_integrity_watch`; not a full breach |
| `none` / ordinary / omit | intact (no write) | SPE-2851 `damaged` is not an input           |

## Deferred

| Item or mechanic                            | Owner or prerequisite                                                                                                 | Reason                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Interlock barrier zone                      | [SPE-2868](https://linear.app/spectranoir/issue/SPE-2868/extra-class-barrier-zones-pressure-seal-interlock-membranes) | Shipped `interlock_membrane` on the keyed registry; does not write `blast_door_membrane`            |
| Store/UI inspect or deficiency commands     | later SPE-877 child                                                                                                   | Week-close remains the production inspect path                                                      |
| SPE-1027 stock consume of a named part      | SPE-1027 / later child                                                                                                | Suitability stays blast-door-only; no inventory debit                                               |
| Additional SPE-113 stations                 | this SPE-877 child (`planning/spe-877-interlock-integrity-bench-slice.md`)                                            | Shipped pressure-seal and interlock benches; SPE-113 tags/operators/curses remain                   |
| Mapping extra classes into workshop quality | this SPE-877 child (`planning/spe-877-extra-class-workshop-quality-slice.md`)                                         | Shipped extra-class workshop mappings + no-debit seeds; field-containment blast-door path unchanged |

## Acceptance

- `pressure_seal` hard-stop drives `pressure_seal_membrane` `zone_breach`
- pressure-seal compensating continue writes `flow_restraint` on that zone, not a full breach
- existing `blast_door_membrane` is unchanged when pressure-seal writes
- interlock still no-ops (does not write either authored zone)
- mixed class/zone pairings fail closed
- recorded `zone_breach` does not silently downgrade
- malformed extra-class records drop independently; legacy singular blast-door hydrates keyed
- week-close inspect reuses the same persist helper for pressure-seal
- Parent SPE-877 remains Backlog (interlock membrane remains)

## Linear issue body

**Title:** Extra-class barrier zones (pressure-seal membrane)

**Parent:** SPE-877

**Goal:** Couple SPE-2864 `pressure_seal` deficiency into its own SPE-1387 / SPE-471 membrane without clobbering `blast_door_membrane`. One extra class, one new zone. Interlock stays no-op.

**Scope:** Keyed `containmentBarrierIntegrity` registry + `pressure_seal_membrane` + `persistContainmentBarrierCoupling` class→zone lookup. Targeted Vitest. Docs: this slice, `architecture/containment-environment-patterns.md`, `SCHEMA_REGISTRY.md`, `planning/backlog.md` + handoff manifest. No interlock membrane, store/UI inspect, SPE-1027 consume, SPE-2866 remapping, or `GAME_STORE_VERSION` bump.

**Constraints:** Do not invent a Linear child ID. Do not write `blast_door_membrane` from pressure-seal. Do not change blast-door labor stamps, SPE-2827 / SPE-2848 unstamped re-aggregation, or SPE-2862 relief semantics.

**Acceptance criteria:**

- Frozen zone `pressure_seal_membrane`; hard-stop → `zone_breach`
- Compensating continue does not open a full breach
- Blast-door membrane unchanged
- Interlock persist no-op
- Mixed class/zone fail-closed; malformed extra-class drops independently
- Legacy singular blast-door hydrates into the keyed registry
- Parent SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/containmentBarrierIntegrity.contract.test.ts`, SPE-877 cases in `src/test/equipmentInstance.contract.test.ts` and `src/test/containmentClassWeekClose.contract.test.ts`, event validation/feed coverage
- `npm run lint`
- `npm run verify:backlog-handoff`
