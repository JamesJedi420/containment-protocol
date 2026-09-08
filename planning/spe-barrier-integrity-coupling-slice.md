# Barrier-integrity coupling (SPE-877 child)

| Field               | Value                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                                                           |
| **Linear**          | Child of [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — ID pending Linear create (MCP `needsAuth` this session) |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                                |
| **Branch**          | `cursor/spe-barrier-integrity-coupling-4588`                                                                                                                                   |
| **Base `main` SHA** | `ca7c8ec8db6c6acc991d3791f9fc23da1f34d3c3`                                                                                                                                     |

## Boundary

One `blast_door` hard-stop (and compensating continue as flow-restraint only) propagates into SPE-1387
`barrier_integrity` / SPE-471 catastrophic wall-breach pairing. Smallest consumer of SPE-2860
`containmentIntegrity.deficiency`. Restores `architecture/containment-environment-patterns.md`.
No new integrity class, extra classes, week-close inspect advance, SPE-1027 consume, or store/UI
command surface.

## Coupling contract

Pure resolver in `src/domain/containmentBarrierIntegrity.ts`. Frozen zone `blast_door_membrane`.

| Deficiency               | Barrier status    | Notes                                        |
| ------------------------ | ----------------- | -------------------------------------------- |
| `hard_stop`              | `zone_breach`     | SPE-471 catastrophic wall-breach             |
| `compensating_continue`  | `flow_restraint`  | `barrier_integrity_watch`; not a full breach |
| `none` / ordinary / omit | intact (no write) | SPE-2851 `damaged` is not an input           |

Recorded `zone_breach` never downgrades. SPE-2862 technician relief restores door `inService`
without closing the breach. `applyContainmentClassDeficiency` is the only writer. Optional
`GameState.containmentBarrierIntegrity`. Event
`equipment.containment_barrier_integrity_changed` hydrates as history without replaying mutation.
Malformed barrier records drop independently. Fail-closed missing/malformed class stays on SPE-2860.

## Deferred

| Item or mechanic                              | Owner or prerequisite                                                                                          | Reason                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Week-close last-inspection auto-advance       | shipped SPE-877 child                                                                                          | `planning/spe-877-week-close-last-inspection-advance-slice.md`  |
| Additional classes (pressure seal, interlock) | [SPE-2864](https://linear.app/spectranoir/issue/SPE-2864) pressure seal shipped; interlock later SPE-877 child | One extra class per child; this slice shipped `blast_door` only |
| SPE-1027 stock consume of the named part      | SPE-1027 / later child                                                                                         | Suitability already shipped; no inventory debit                 |
| Live workshop integrity mapping               | SPE-877 / SPE-1028                                                                                             | SPE-2782 stays caller-owned                                     |
| Mutation stations / integrity labor           | later SPE-877 child                                                                                            | SPE-113 remains design-only                                     |
| Ready / stow                                  | SPE-1658                                                                                                       | Access-state layer                                              |
| Salvage / Auto-Scrap                          | SPE-1055 / SPE-2749                                                                                            | Adjacent                                                        |

## Acceptance

- `blast_door` hard-stop drives one `blast_door_membrane` `zone_breach`
- compensating continue writes `flow_restraint` / `barrier_integrity_watch`, not a full breach
- SPE-2862 relief does not silently close a recorded breach
- SPE-2851 `damaged` is not a breach; ordinary identities fail closed
- Fail-closed missing / malformed class and malformed barrier records
- Barrier event hydrates as history without replaying mutation
- Parent SPE-877 remains Backlog (extra classes, workshop adapter, mutation stations remain)

## Linear issue body

**Title:** Barrier-integrity coupling

**Parent:** SPE-877

**Goal:** Couple SPE-2860 `blast_door` deficiency into SPE-1387 `barrier_integrity` / SPE-471 catastrophic wall-breach pairing. Hard-stop opens one zone breach. Compensating continue is flow-restraint (`barrier_integrity_watch`) only. Restore `architecture/containment-environment-patterns.md`. Do not add a second integrity class.

**Scope:** Pure resolver + `applyContainmentClassDeficiency` writer + optional `GameState.containmentBarrierIntegrity` + `equipment.containment_barrier_integrity_changed` hydration. Targeted Vitest. No week-close inspect advance, extra classes, SPE-1027 consume, SPE-2862 command rewrite, or store/UI unless an existing event-feed label is required for the new event type.

**Constraints:** Do not change SPE-877 parent Goal. Do not change SPE-2860 cadence kernel, SPE-2861 suitability, or SPE-2862 technician command semantics. Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847. Do not fold SPE-1658, SPE-1027 stock, or SPE-1055 salvage.

**Acceptance criteria:**

- Frozen zone `blast_door_membrane`; hard-stop → `zone_breach`
- Compensating continue does not open a full breach
- SPE-2862 relief does not close a recorded breach
- SPE-2851 damaged is not a breach
- Fail-closed missing/malformed class; malformed barrier drops
- New event hydrates as history without replaying mutation
- Parent SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/containmentBarrierIntegrity.contract.test.ts`, SPE-877 cases in `src/test/equipmentInstance.contract.test.ts`, event validation/feed coverage
- `npm run lint`
- `npm run verify:backlog-handoff`
