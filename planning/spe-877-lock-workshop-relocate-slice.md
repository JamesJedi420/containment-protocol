# SPE-877 — Lock authored workshop seeds from equipping

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                            |
| **Linear**          | [SPE-2881](https://linear.app/spectranoir/issue/SPE-2881/lock-authored-workshop-seeds-from-equipping) — child of SPE-877        |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog** |
| **Branch**          | `cursor/spe-877-lock-workshop-relocate-3400`                                                                                    |
| **Base `main` SHA** | `3a3e543d`                                                                                                                      |

## Boundary

Fail-close any **new** equipped location for the three authored SPE-2866 workshop identities so
relocate / loadout equip cannot take the live mapping targets out of storage. Reuse
`isAuthoredWorkshopIntegrityInstanceId`. Gate in `applyEquipmentInstanceTransitionInternal` (covers
`relocateEquipmentInstance`) with `authored_workshop_identity_protected`. Allow return to stored.
Allow a no-op that keeps the same equipped location so SPE-2879 leftovers can stay on a casualty.
`canEquipStoredEquipmentInstance` returns false for those IDs so loadout `stockOptions` omit them.
`findTransferCandidate` skips those IDs so catalog `equipAgentItem` cannot move a leftover.
`unequipAgentItem` still writes `stored` directly.

Do not consume SPE-1027 stock. Do not remap SPE-2866 workshops. Do not add SPE-113 tags, operators,
legality, or curses. Do not bump `GAME_STORE_VERSION`. Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847. Do not recompute remaining same-class deficiencies. Do not change SPE-2879 casualty skip.

## Protected identities

| Instance ID                                 | Department                         | Class           |
| ------------------------------------------- | ---------------------------------- | --------------- |
| `equipment-instance-blast-door-workshop`    | `department:field-containment`     | `blast_door`    |
| `equipment-instance-pressure-seal-workshop` | `department:emergency-response`    | `pressure_seal` |
| `equipment-instance-interlock-workshop`     | `department:procurement-logistics` | `interlock`     |

Stored → equipped and equipped → other slot/agent fail closed. Stored → stored, equipped → stored,
and same equipped slot succeed. Sequential ordinary `equipment-instance-${week}-${ordinal}`
identities still relocate. Equipped leftovers used in contracts are planted without `relocate`.

## Deferred

| Item or mechanic                          | Owner or prerequisite                                                                                       | Reason                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SPE-1027 stock consume of a named part    | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                                                              |
| Remaining same-class deficiency recompute | later SPE-877 child                                                                                         | Last-writer A cleared to `none` while sibling B is still `compensating_continue` still omits |
| SPE-113 tags, operators, legality, curses | later SPE-877 / SPE-113 child                                                                               | Out of this relocate-lock boundary                                                           |
| Mid-week inspect command                  | later SPE-877 child                                                                                         | Week-close remains the production inspect path                                               |

## Acceptance

- authored stored IDs cannot relocate to an eligible carrier (`a_mina` / `a_kellan`)
- sequential ordinary identities still relocate
- `canEquipStoredEquipmentInstance` is false for authored IDs; loadout options omit them
- catalog `equipAgentItem` transfer skips authored leftovers; sequential equipped copies still transfer
- equipped leftover (planted, not relocated) still fail-closes destroy/re-agg without relocate-then-destroy; unequip / relocate-to-stored still succeeds
- starting-state / omitted-registry hydrate and SPE-2782 `poor` stay unchanged
- no SPE-1027 consume; no workshop remap; no SPE-113 catalog; no store-version bump
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Lock authored workshop seeds from equipping

**Parent:** SPE-877

Mechanic: fail-close new equipped locations for the three authored SPE-2866 workshop instance IDs
so relocate / loadout equip cannot take the live mapping targets out of storage. Return to stored
and same-slot no-op stay legal. Ordinary sequential identities still relocate.

## Validation

- `npx vitest run src/test/equipmentInstance.contract.test.ts src/test/sim.missionResolutionAgents.test.ts src/features/equipment/equipmentView.test.ts src/test/fieldContainmentBlastDoorWorkshopSeed.contract.test.ts src/test/extraClassWorkshopIntegrityQualitySeed.contract.test.ts --configLoader bundle --pool forks`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run test:run:ci`
