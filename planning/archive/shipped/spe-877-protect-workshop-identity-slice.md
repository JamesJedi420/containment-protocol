# SPE-877 — Protect authored workshop identity from destroy/re-agg

| Field               | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                               |
| **Linear**          | [SPE-2877](https://linear.app/spectranoir/issue/SPE-2877/protect-authored-workshop-identity-from-destroyre-agg) — child of SPE-877 |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**    |
| **Branch**          | `cursor/spe-2877-protect-workshop-identity-3400`                                                                                   |
| **Base `main` SHA** | `7ff8259b`                                                                                                                         |

## Boundary

Fail-close `destroyStoredOrdinaryEquipmentInstance` and
`reaggregateStoredOrdinaryEquipmentInstance` for the three authored SPE-2866 workshop identities so
destroy cannot drop the mapping target and catalog re-agg cannot credit never-debited `ward_seals`.
Gate by instance ID immediately after the safe-ID check, before equipped relocate-then-recurse.
Ordinary sequential `equipment-instance-${week}-${ordinal}` identities stay eligible. Starting-state
still writes the seeds without debit.

Do not consume SPE-1027 stock. Do not remap SPE-2866 workshops. Do not add SPE-113 tags, operators,
legality, or curses. Do not bump `GAME_STORE_VERSION`. Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847. Do not recouple barriers. Do not skip mission-casualty equipped loss.

## Protected identities

| Instance ID                                 | Department                         | Class           |
| ------------------------------------------- | ---------------------------------- | --------------- |
| `equipment-instance-blast-door-workshop`    | `department:field-containment`     | `blast_door`    |
| `equipment-instance-pressure-seal-workshop` | `department:emergency-response`    | `pressure_seal` |
| `equipment-instance-interlock-workshop`     | `department:procurement-logistics` | `interlock`     |

`isAuthoredWorkshopIntegrityInstanceId` reads those IDs from
`DEFAULT_DEPARTMENT_WORKSHOP_INTEGRITY_QUALITY_MAPPINGS`. Both writers return
`authored_workshop_identity_protected` without mutating inventory, the registry, or location.
Stored and equipped Equipment projections disable destroy/re-agg with blocker
`authored_workshop_identity`. Stabilize / inspect / return-to-stored stay available. New equipped
relocate fail-closes ([SPE-2881](https://linear.app/spectranoir/issue/SPE-2881/lock-authored-workshop-seeds-from-equipping)).

## Deferred

| Item or mechanic                                         | Owner or prerequisite                                                                                                                                                                        | Reason                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| SPE-1027 stock consume of a named part                   | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027                                                                                  | Blocked: no SPE-1027 debit port                                                                     |
| Mission-loss / mission-injury equipped workshop drop     | [SPE-2879](https://linear.app/spectranoir/issue/SPE-2879/skip-authored-workshop-identity-on-mission-casualty-equipped-loss) (`planning/spe-877-mission-casualty-workshop-identity-slice.md`) | Shipped: casualty writer skips authored SPE-2866 IDs in place                                       |
| Lock relocate so workshop seeds cannot equip             | [SPE-2881](https://linear.app/spectranoir/issue/SPE-2881/lock-authored-workshop-seeds-from-equipping) (`planning/spe-877-lock-workshop-relocate-slice.md`)                                   | Shipped: new equipped locations fail-close; return to stored and same-slot no-op stay legal         |
| Same-class sibling `sourceInstanceId`-gated barrier omit | [SPE-2878](https://linear.app/spectranoir/issue/SPE-2878/preserve-sibling-sourced-flow-restraint-on-technician-relief) (`planning/spe-877-sibling-sourced-restraint-slice.md`)               | Shipped: technician-relief omit drops `flow_restraint` only when last-writer matches the stabilizer |
| SPE-113 tags, operators, legality, curses                | later SPE-877 / SPE-113 child                                                                                                                                                                | Out of this identity-lock boundary                                                                  |
| Mid-week inspect command                                 | later SPE-877 child                                                                                                                                                                          | Week-close remains the production inspect path                                                      |

## Acceptance

- destroy and catalog re-agg of each authored ID fail closed with unchanged inventory and registry
- equipped relocate-then-destroy / re-agg of an authored ID fail closed without storing the copy
- sequential ordinary `ward_seals` identities still destroy/re-agg
- hydrate/save keeps seeds; omitted registry still hydrates `{}` and fail-closes SPE-2782 `poor`
- Equipment stored/equipped projections disable destroy/re-agg for those IDs
- no SPE-1027 consume; no workshop remap; no SPE-113 catalog; no store-version bump
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Protect authored workshop identity from destroy/re-agg

**Parent:** SPE-877

Mechanic: fail-close destroy and catalog re-aggregation for the three authored SPE-2866 workshop
identities so a player cannot delete the seeds or credit never-debited `ward_seals`. Ordinary
sequential identities stay eligible. Starting-state still writes the seeds without debit.

## Validation

- `npx vitest run src/test/equipmentInstance.contract.test.ts src/test/fieldContainmentBlastDoorWorkshopSeed.contract.test.ts src/test/extraClassWorkshopIntegrityQualitySeed.contract.test.ts src/features/equipment/equipmentView.test.ts --configLoader bundle --pool forks`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run test:run:ci`
