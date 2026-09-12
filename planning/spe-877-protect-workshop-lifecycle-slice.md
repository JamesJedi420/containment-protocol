# SPE-877 — Protect authored workshop identities from equipment lifecycle

| Field               | Value                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                         |
| **Linear**          | [SPE-2880](https://linear.app/spectranoir/issue/SPE-2880/protect-authored-workshop-identities-from-equipment-lifecycle) — related to SPE-877 |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**              |
| **Branch**          | `cursor/critical-bug-management-8d27`                                                                                                        |
| **Base `main` SHA** | `34c6bb23`                                                                                                                                   |

## Boundary

Fail-close authored SPE-2866 workshop identities as equipment recovery sources so
`resolveEquipmentDeconstructionSources` / `queueEquipmentDeconstruction` cannot consume the live
mapping targets. Reuse `isAuthoredWorkshopIntegrityInstanceId`. Gate in `resolveInstanceIssue` with
`equipment_instance_authored_workshop_protected`. Sequential ordinary `ward_seals` copies stay
recoverable.

Equip and mission-casualty guards already shipped as [SPE-2881](https://linear.app/spectranoir/issue/SPE-2881/lock-authored-workshop-seeds-from-equipping)
and [SPE-2879](https://linear.app/spectranoir/issue/SPE-2879/skip-authored-workshop-identity-on-mission-casualty-equipped-loss).
This slice does **not** relocate leftovers to storage on casualty; SPE-2879 skip-in-place stays.

Do not consume SPE-1027 stock. Do not remap SPE-2866 workshops. Do not bump `GAME_STORE_VERSION`.
Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

## Protected identities

| Instance ID                                 | Department                         | Class           |
| ------------------------------------------- | ---------------------------------- | --------------- |
| `equipment-instance-blast-door-workshop`    | `department:field-containment`     | `blast_door`    |
| `equipment-instance-pressure-seal-workshop` | `department:emergency-response`    | `pressure_seal` |
| `equipment-instance-interlock-workshop`     | `department:procurement-logistics` | `interlock`     |

## Deferred

| Item or mechanic                          | Owner or prerequisite                                                                                       | Why deferred                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SPE-1027 stock consume of a named part    | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                                                              |
| Remaining same-class deficiency recompute | later SPE-877 child                                                                                         | Last-writer A cleared to `none` while sibling B is still `compensating_continue` still omits |
| Station-stamped recovery source guard     | later child / open draft PR #3619                                                                           | Out of this authored-identity recovery boundary                                              |

## Acceptance

- authored stored IDs cannot be selected or queued as `ward_seals` recovery sources
- sequential ordinary identities still queue for recovery
- SPE-2881 equip lock and SPE-2879 casualty skip-in-place stay unchanged
- starting-state / omitted-registry hydrate stay unchanged
- no SPE-1027 consume; no workshop remap; no store-version bump
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Protect authored workshop identities from equipment lifecycle consumption

**Related:** SPE-877

Mechanic: fail-close equipment recovery source selection/queueing for the three authored SPE-2866
workshop instance IDs. Equip and mission-casualty paths are owned by SPE-2881 / SPE-2879.

## Validation

- `npx vitest run src/test/equipmentInstance.contract.test.ts src/test/sim.missionResolutionAgents.test.ts src/features/equipment/equipmentView.test.ts --configLoader bundle --pool forks`
- `npm run lint`
- `npm run verify:backlog-handoff`
