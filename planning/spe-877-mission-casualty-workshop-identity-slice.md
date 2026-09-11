# SPE-877 — Skip authored workshop identity on mission-casualty equipped loss

| Field               | Value                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                           |
| **Linear**          | [SPE-2879](https://linear.app/spectranoir/issue/SPE-2879/skip-authored-workshop-identity-on-mission-casualty-equipped-loss) — child of SPE-877 |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                |
| **Branch**          | `cursor/spe-2879-mission-casualty-workshop-identity-3400`                                                                                      |
| **Base `main` SHA** | `23dc18a5`                                                                                                                                     |

## Boundary

Skip the three authored SPE-2866 workshop identities in
`takeEquippedInstancesLostOnMissionResolution` so mission-loss and mission-injury cannot delete the
live mapping targets. Reuse `isAuthoredWorkshopIntegrityInstanceId`. Other equipped ordinary
identities still drop. Relocate of the seeds stays legal. Do not relocate-then-destroy.

Do not consume SPE-1027 stock. Do not remap SPE-2866 workshops. Do not add SPE-113 tags, operators,
legality, or curses. Do not bump `GAME_STORE_VERSION`. Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847. Do not recompute remaining same-class deficiencies. Do not lock relocate.

## Protected identities

| Instance ID                                 | Department                         | Class           |
| ------------------------------------------- | ---------------------------------- | --------------- |
| `equipment-instance-blast-door-workshop`    | `department:field-containment`     | `blast_door`    |
| `equipment-instance-pressure-seal-workshop` | `department:emergency-response`    | `pressure_seal` |
| `equipment-instance-interlock-workshop`     | `department:procurement-logistics` | `interlock`     |

Skip is by instance ID inside the casualty writer, after recovery-claimed, before `skipInstance`.
Mission-injury Combat Stim retain stays on `skipInstance`. Authored IDs stay equipped on the
casualty carrier. No destroy / dispose event for those IDs.

## Deferred

| Item or mechanic                             | Owner or prerequisite                                                                                       | Reason                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SPE-1027 stock consume of a named part       | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                                                              |
| Remaining same-class deficiency recompute    | later SPE-877 child                                                                                         | Last-writer A cleared to `none` while sibling B is still `compensating_continue` still omits |
| Lock relocate so workshop seeds cannot equip | later SPE-877 child                                                                                         | Relocate of authored IDs stays legal; seeds can still leave storage                          |
| SPE-113 tags, operators, legality, curses    | later SPE-877 / SPE-113 child                                                                               | Out of this casualty-skip boundary                                                           |
| Mid-week inspect command                     | later SPE-877 child                                                                                         | Week-close remains the production inspect path                                               |

## Acceptance

- equipped authored IDs survive `takeEquippedInstancesLostOnMissionResolution` on mission-loss and mission-injury
- sequential equipped ordinary identities still drop
- no destroy/dispose event for authored IDs; slots stay instance-backed
- starting-state / omitted-registry hydrate and SPE-2782 `poor` stay unchanged
- no SPE-1027 consume; no workshop remap; no relocate lock; no store-version bump
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Skip authored workshop identity on mission-casualty equipped loss

**Parent:** SPE-877

Mechanic: skip the three authored SPE-2866 workshop instance IDs in
`takeEquippedInstancesLostOnMissionResolution` so mission-loss / mission-injury cannot delete the
live mapping targets. Ordinary sequential equipped identities still drop. Relocate of the seeds
stays legal.

## Validation

- `npx vitest run src/test/sim.missionResolutionAgents.test.ts src/test/fieldContainmentBlastDoorWorkshopSeed.contract.test.ts src/test/extraClassWorkshopIntegrityQualitySeed.contract.test.ts --configLoader bundle --pool forks`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run test:run:ci`
