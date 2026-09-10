# SPE-2868 — Extra-class barrier zones (pressure-seal / interlock membranes)

| Field               | Value                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                             |
| **Linear**          | [SPE-2868](https://linear.app/spectranoir/issue/SPE-2868/extra-class-barrier-zones-pressure-seal-interlock-membranes)                                            |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                  |
| **Branch**          | `cursor/spe-2868-extra-class-barrier-zones-647f`                                                                                                                 |
| **Base `main` SHA** | `87defc53d725f0d0f609dc17cb5a8f7edbaa0d69` (pressure-seal membrane already on `main` via PR #3611; this child adds `interlock_membrane` on the same keyed field) |

## Boundary

Couple SPE-2864 `pressure_seal` and SPE-2865 `interlock` deficiency into SPE-1387 / SPE-471 barrier
pairing on authored extra-class membranes. Copy SPE-2863 blast-door contract per zone: hard-stop →
that zone's `zone_breach`; compensating continue → `flow_restraint` (`barrier_integrity_watch`)
only. Extra-class deficiency must not write `blast_door_membrane`. Reuse
`persistContainmentBarrierCoupling`, `resolveContainmentBarrierIntegrityCoupling`, week-close
inspect advance, and event `equipment.containment_barrier_integrity_changed`. Domain-only. No
store/UI inspect command, no SPE-1027 consume, no SPE-2866 workshop remapping, no additional
SPE-113 stations, no seed `equipment-instance-blast-door-workshop`, no SPE-2827 / SPE-2848
unstamped re-aggregation reopen, no fourth class, no parallel GameState field, no
`GAME_STORE_VERSION` / `GAME_SAVE_VERSION` bump.

## Registry

`GameState.containmentBarrierIntegrity` is a keyed collection of zone records (only present zones
stored). Do not add `containmentBarrierIntegrityByZone`. Hydration:

1. omit / undefined → all intact (undefined)
2. legacy single-record `{ zoneId: 'blast_door_membrane', status, sourceInstanceId, sourceDeficiencyKind }` → keyed `{ blast_door_membrane: parsed }`. Singular extra-class records are not a persisted shape and drop.
3. keyed map: parse each known zone independently. Unknown keys drop. Malformed extra-class zone drops without dropping siblings. Malformed blast-door drops independently.

`persistContainmentBarrierCoupling` maps instance `classId` → zone, resolves against that zone's
existing record only, and writes back only that slot.

| Class           | Zone                     | This child  |
| --------------- | ------------------------ | ----------- |
| `blast_door`    | `blast_door_membrane`    | Unchanged   |
| `pressure_seal` | `pressure_seal_membrane` | Extra-class |
| `interlock`     | `interlock_membrane`     | Extra-class |

## Coupling contract

Same resolver `resolveContainmentBarrierIntegrityCoupling` (optional `classId`, default
`blast_door` for existing kernel tests). Pass the instance class so extra-class compensating
controls (`backup_gasket_watch`, `dual_circuit_watch`) resolve for their zone. Blast-door zone
still fail-closes extra-class controls.

| Deficiency               | Barrier status    | Notes                                        |
| ------------------------ | ----------------- | -------------------------------------------- |
| `hard_stop`              | `zone_breach`     | SPE-471 catastrophic wall-breach             |
| `compensating_continue`  | `flow_restraint`  | `barrier_integrity_watch`; not a full breach |
| `none` / ordinary / omit | intact (no write) | SPE-2851 `damaged` is not an input           |

Recorded `zone_breach` never downgrades. SPE-2862 relief, SPE-2851 repair, compensating continue,
and SPE-2867 integrity labor must not close a recorded extra-class breach. Mixed class/zone
pairings fail closed (pressure-seal payload claiming `blast_door_membrane`; blast-door control on
an extra-class zone). Extra-class events must carry matching `zoneId` and must not claim
`blast_door_membrane`. Event hydrates as history without replaying mutation.

## Deferred

| Item or mechanic                              | Owner or prerequisite                                                                            | Reason                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Store/UI inspect or deficiency commands       | [SPE-2869](https://linear.app/spectranoir/issue/SPE-2869/storeui-inspect-or-deficiency-commands) | Shipped: technician stabilization via store/UI; week-close remains the inspect path         |
| SPE-1027 stock consume of a named part        | SPE-1027 / later child                                                                           | Suitability stays blast-door-only; no inventory debit                                       |
| Seed `equipment-instance-blast-door-workshop` | this SPE-877 child (`planning/spe-877-seed-blast-door-workshop-slice.md`)                        | Shipped: starting-state seeds the authored SPE-2866 identity; mapping stays blast-door-only |
| Additional SPE-113 stations                   | this SPE-877 child (`planning/spe-877-interlock-integrity-bench-slice.md`)                       | Shipped pressure-seal and interlock benches; SPE-113 tags/operators/curses remain           |
| Extra-class workshop quality                  | later SPE-877 child                                                                              | SPE-2866 stays blast-door only                                                              |

## Acceptance

- Extra-class hard-stop writes that zone's `zone_breach`; `blast_door_membrane` unchanged/absent
- Extra-class compensating continue writes that zone's `flow_restraint` only
- Blast-door sticky rank / never-downgrade semantics unchanged
- Mixed class/zone pairings fail closed
- Recorded extra-class `zone_breach` never downgrades
- SPE-2851 `damaged` is not a breach
- Legacy single-record hydration still yields the blast-door zone
- Malformed extra-class record drops independently
- Barrier events hydrate as history without replaying mutation
- Week-close inspect for overdue pressure-seal/interlock couples extra-class membranes and does not write `blast_door_membrane`
- Extra-class week-close may add its own zone while leaving an existing blast-door slot identical
- Parent SPE-877 remains Backlog

## Linear issue body

**Title:** Extra-class barrier zones (pressure-seal / interlock membranes)

**Parent:** SPE-877

**Goal:** Couple SPE-2864 `pressure_seal` and SPE-2865 `interlock` deficiency into SPE-1387 / SPE-471 barrier pairing on authored extra-class membranes. Hard-stop opens that zone's `zone_breach`. Compensating continue is `flow_restraint` (`barrier_integrity_watch`) only. Extra-class must not write `blast_door_membrane`.

**Scope:** Evolve `GameState.containmentBarrierIntegrity` into a keyed zone registry. `persistContainmentBarrierCoupling` class→zone lookup writes one slot. Targeted Vitest. Docs: this slice, `architecture/containment-environment-patterns.md`, `SCHEMA_REGISTRY.md`, `planning/equipment-instance-architecture.md`, `planning/backlog.md` + handoff manifest. No store/UI inspect, SPE-1027 consume, SPE-2866 remapping, additional SPE-113 stations, instance seed, or `GAME_STORE_VERSION` bump.

**Constraints:** Do not write extra-class deficiency into `blast_door_membrane`. Do not change SPE-2863 blast-door sticky rank. Do not reopen SPE-2860 / SPE-2864 / SPE-2865 inspection kernels. Do not add a fourth class or a parallel GameState field.

**Acceptance criteria:** Frozen zones `pressure_seal_membrane` and `interlock_membrane`; hard-stop → that zone's `zone_breach`; compensating continue is not a full breach; blast-door membrane unchanged; mixed class/zone fail-closed; malformed extra-class drops independently; legacy singular blast-door hydrates keyed; parent SPE-877 remains Backlog.

## Validation

- Targeted Vitest: `src/test/containmentBarrierIntegrity.contract.test.ts`, SPE-877 cases in `src/test/equipmentInstance.contract.test.ts` and `src/test/containmentClassWeekClose.contract.test.ts`, event validation/feed coverage
- `npm run lint`
- `npm run verify:backlog-handoff`
