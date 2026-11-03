# SPE-877 — Preserve sibling-sourced flow_restraint on technician relief

| Field               | Value                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                      |
| **Linear**          | [SPE-2878](https://linear.app/spectranoir/issue/SPE-2878/preserve-sibling-sourced-flow-restraint-on-technician-relief) — child of SPE-877 |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**           |
| **Branch**          | `cursor/spe-2878-sibling-sourced-restraint-3400`                                                                                          |
| **Base `main` SHA** | `974707e0`                                                                                                                                |

## Boundary

On technician-relief omit, drop a class-zone `flow_restraint` only when
`existing.sourceInstanceId` matches the stabilizing instance. A sibling-sourced restraint stays.
Recorded `zone_breach` stays sticky. Week-close inspect and `applyContainmentClassDeficiency`
stay never-downgrade last-writer. Do not recompute remaining same-class deficiencies.

Do not consume SPE-1027 stock. Do not remap SPE-2866 workshops. Do not add SPE-113 tags, operators,
legality, or curses. Do not bump `GAME_STORE_VERSION`. Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847. Do not skip mission-casualty equipped loss of authored workshop IDs.

## Recouple contract

`technicianRelief: true` after stabilize, using `resolved.deficiency`:

| New deficiency          | Existing zone    | Last-writer vs stabilizer | Result                                |
| ----------------------- | ---------------- | ------------------------- | ------------------------------------- |
| `none`                  | `flow_restraint` | same instance             | omit that zone (`barrier: undefined`) |
| `none`                  | `flow_restraint` | different instance        | keep existing restraint               |
| `none`                  | `zone_breach`    | any                       | keep breach                           |
| `none`                  | absent / intact  | any                       | no-op                                 |
| `compensating_continue` | `zone_breach`    | any                       | keep breach                           |
| `compensating_continue` | absent / intact  | any                       | write `flow_restraint`                |
| `compensating_continue` | `flow_restraint` | any                       | no-op                                 |

Hard-stop relief is one step. Two-step relief of a recorded breach still leaves `zone_breach`.
Sibling zones stay untouched. Omit does not emit `equipment.containment_barrier_integrity_changed`.
Missing registry key hydrates as intact. Malformed records without `sourceInstanceId` already drop.

## Deferred

| Item or mechanic                                     | Owner or prerequisite                                                                                                                                                                        | Reason                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Remaining same-class deficiency recompute            | [SPE-2885](https://linear.app/spectranoir/issue/SPE-2885/remaining-same-class-deficiency-recompute-on-technician-relief) (`planning/spe-877-remaining-deficiency-recompute-slice.md`)         | Shipped: last-writer omit recouples from a remaining same-class live source                         |
| SPE-1027 stock consume of a named part               | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027                                                                                  | Blocked: no SPE-1027 debit port                                                                     |
| Mission-loss / mission-injury equipped workshop drop | [SPE-2879](https://linear.app/spectranoir/issue/SPE-2879/skip-authored-workshop-identity-on-mission-casualty-equipped-loss) (`planning/spe-877-mission-casualty-workshop-identity-slice.md`) | Shipped: casualty writer skips authored SPE-2866 IDs in place; SPE-2881 locks new equipped relocate |
| Lock relocate so workshop seeds cannot equip         | [SPE-2881](https://linear.app/spectranoir/issue/SPE-2881/lock-authored-workshop-seeds-from-equipping) (`planning/spe-877-lock-workshop-relocate-slice.md`)                                   | Shipped: new equipped locations fail-close; return to stored and same-slot no-op stay legal         |
| SPE-113 tags, operators, legality, curses            | later SPE-877 / SPE-113 child                                                                                                                                                                | Out of this last-writer omit boundary                                                               |
| Mid-week inspect command                             | later SPE-877 child                                                                                                                                                                          | Week-close remains the production inspect path                                                      |

## Acceptance

- technician-relief `none` omits `flow_restraint` only when `existing.sourceInstanceId` matches the stabilizer (`blast_door` / `pressure_seal` / `interlock`)
- sibling-sourced `flow_restraint` survives omit when the source ID differs
- matching-source omit in this slice dropped even if a sibling remained `compensating_continue`; remaining-deficiency recouple is SPE-2885
- recorded `zone_breach` stays after hard-stop relief and after two-step clear to `none`
- week-close inspect and `applyContainmentClassDeficiency` still never-downgrade
- no SPE-1027 consume; no workshop remap; no remaining-deficiency scan in this slice; no event-schema expansion
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Preserve sibling-sourced flow_restraint on technician relief

**Parent:** SPE-877

Mechanic: on technician-relief omit, drop a class-zone `flow_restraint` only when
`existing.sourceInstanceId` matches the stabilizing instance. Sibling-sourced restraint stays.
Recorded `zone_breach` stays sticky. Inspect/apply stay never-downgrade last-writer.

## Validation

- `npx vitest run src/test/containmentBarrierIntegrity.contract.test.ts src/test/equipmentInstance.contract.test.ts --configLoader bundle --pool forks`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run test:run:ci`
