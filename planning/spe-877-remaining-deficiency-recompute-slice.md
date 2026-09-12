# SPE-877 — Remaining same-class deficiency recompute on technician relief

| Field               | Value                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                             |
| **Linear**          | [SPE-2885](https://linear.app/spectranoir/issue/SPE-2885/remaining-same-class-deficiency-recompute-on-technician-relief) — child of SPE-877                      |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                  |
| **Branch**          | `cursor/spe-877-remaining-deficiency-recompute-3400`                                                                                                             |
| **Base `main` SHA** | `3545b106`                                                                                                                                                       |

## Boundary

When technician-relief matching-source omit would drop a class-zone `flow_restraint`, recouple that
zone from a remaining same-class stored or equipped identity that is still `compensating_continue`
or `hard_stop`. Keep [SPE-2878](https://linear.app/spectranoir/issue/SPE-2878/preserve-sibling-sourced-flow-restraint-on-technician-relief)
last-writer omit on `resolveContainmentBarrierIntegrityCoupling`. Own the scan in
`persistContainmentBarrierCoupling` only. Recouple against empty existing so never-downgrade cannot
keep the cleared last-writer as source. Omit still drops when no remaining live source exists.
Recorded `zone_breach` stays sticky. Week-close inspect and `applyContainmentClassDeficiency` stay
never-downgrade last-writer.

Do not consume SPE-1027 stock. Do not remap SPE-2866 workshops. Do not change SPE-2881 equip lock,
SPE-2879 casualty skip, or SPE-2880 recovery guard. Do not implement SPE-2882 week-close workshop
grading. Do not add SPE-113 tags, operators, legality, or curses. Do not bump `GAME_STORE_VERSION`.
Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

## Recouple contract

`technicianRelief: true` after stabilize. Resolver matching-source omit is unchanged. Persist then:

| Remaining same-class live source                         | Result                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| none                                                     | omit that zone (`barrier: undefined`)                                  |
| `compensating_continue`                                  | write `flow_restraint` sourced from the remaining identity             |
| `hard_stop`                                              | write `zone_breach` sourced from the remaining identity                |
| several `compensating_continue`                          | pick lexicographically first `instanceId`                              |
| mix of `hard_stop` and `compensating_continue`           | pick `hard_stop` first, then `instanceId`                              |

SPE-2878 sibling-sourced keep (source ID differs from the stabilizer) still short-circuits before
the scan. Recouple does not emit `equipment.containment_barrier_integrity_changed`. Extra-class
membranes follow the same persist path.

## Deferred

| Item or mechanic                       | Owner or prerequisite                                                                                       | Why deferred                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| SPE-1027 stock consume of a named part | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                   |
| Same-week workshop completion grading  | [SPE-2882](https://linear.app/spectranoir/issue/SPE-2882/same-week-workshop-completion-grades-pre-close-integrity-after-mapped) | Already In Review; out of this persist-scan boundary |
| SPE-113 tags, operators, legality, curses | later SPE-877 / SPE-113 child                                                                            | Out of this remaining-deficiency boundary         |
| Mid-week inspect command               | later SPE-877 child                                                                                         | Week-close remains the production inspect path    |
| Station-stamped recovery source guard  | later child / open draft PR #3619                                                                           | Out of this remaining-deficiency boundary         |

## Acceptance

- last-writer omit recouples `flow_restraint` from a remaining compensating sibling (`blast_door` / `pressure_seal` / `interlock`)
- two remaining compensating siblings pick lexicographically first `instanceId`
- remaining sibling `hard_stop` upgrades the omitted `flow_restraint` to `zone_breach`
- omit still drops when no remaining live source exists
- SPE-2878 sibling-sourced keep and sticky `zone_breach` stay
- week-close inspect and `applyContainmentClassDeficiency` still never-downgrade
- no SPE-1027 consume; no workshop remap; no event-schema expansion; no store-version bump
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Remaining same-class deficiency recompute on technician relief

**Parent:** SPE-877

Mechanic: when technician-relief matching-source omit would drop a class-zone `flow_restraint`,
scan remaining same-class identities for `compensating_continue` or `hard_stop` and recouple that
zone from the remaining live source (empty existing). Omit still drops when no remaining live
source exists. `zone_breach` stays sticky. Inspect/apply stay never-downgrade last-writer.

## Validation

- `npx vitest run src/test/containmentBarrierIntegrity.contract.test.ts src/test/equipmentInstance.contract.test.ts --configLoader bundle --pool forks`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run test:run:ci`
