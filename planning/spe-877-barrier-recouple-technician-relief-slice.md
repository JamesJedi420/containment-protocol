# SPE-877 — Barrier recouple on technician relief

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                            |
| **Linear**          | [SPE-2876](https://linear.app/spectranoir/issue/SPE-2876/barrier-recouple-on-technician-relief) — child of SPE-877              |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog** |
| **Branch**          | `cursor/spe-2876-barrier-recouple-technician-relief-3400`                                                                       |
| **Base `main` SHA** | `1f091d4e`                                                                                                                      |

## Boundary

After successful `stabilizeContainmentClassDeficiency`, recouple that instance's authored membrane
from the **new** deficiency. Opt-in `technicianRelief` on
`resolveContainmentBarrierIntegrityCoupling` / `persistContainmentBarrierCoupling` may omit that
class zone's `flow_restraint` when deficiency becomes `none`. Recorded `zone_breach` stays sticky.
Week-close inspect and `applyContainmentClassDeficiency` omit the flag (never-downgrade).

Do not consume SPE-1027 stock. Do not remap SPE-2866 workshops. Authored workshop identity
destroy/re-agg protection shipped as SPE-2877. Do not add SPE-113 tags, operators, legality, or curses. Do not
expand `equipment.containment_barrier_integrity_changed` to `intact`. Do not bump
`GAME_STORE_VERSION`. Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

## Recouple contract

`technicianRelief: true` after stabilize, using `resolved.deficiency`:

| New deficiency          | Existing zone    | Result                                |
| ----------------------- | ---------------- | ------------------------------------- |
| `none`                  | `flow_restraint` | omit that zone (`barrier: undefined`) |
| `none`                  | `zone_breach`    | keep breach                           |
| `none`                  | absent / intact  | no-op                                 |
| `compensating_continue` | `zone_breach`    | keep breach                           |
| `compensating_continue` | absent / intact  | write `flow_restraint`                |
| `compensating_continue` | `flow_restraint` | no-op                                 |

Hard-stop relief is one step. Two-step relief of a recorded breach still leaves `zone_breach`.
Sibling zones stay untouched. Omit does not emit `equipment.containment_barrier_integrity_changed`.
Missing registry key hydrates as intact.

## Deferred

| Item or mechanic                                       | Owner or prerequisite                                                                                       | Reason                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Protect authored workshop identity from destroy/re-agg | [SPE-2877](https://linear.app/spectranoir/issue/SPE-2877/protect-authored-workshop-identity-from-destroyre-agg) (`planning/spe-877-protect-workshop-identity-slice.md`) | Shipped: authored SPE-2866 IDs fail-close ordinary destroy/re-agg without stock credit |
| SPE-1027 stock consume of a named part                 | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                                                                     |
| SPE-113 tags, operators, legality, curses              | later SPE-877 / SPE-113 child                                                                               | Out of this recouple boundary                                                                       |
| Mid-week inspect command                               | later SPE-877 child                                                                                         | Week-close remains the production inspect path                                                      |

## Acceptance

- compensating-continue clear to `none` omits that class's `flow_restraint` (`blast_door` / `pressure_seal` / `interlock`)
- recorded `zone_breach` stays after hard-stop relief and after two-step clear to `none`
- uncoupled hard-stop relief writes that class's `flow_restraint`; extra-class never writes `blast_door_membrane`
- sibling zones unchanged; empty registry hydrates `undefined` / intact
- week-close inspect and `applyContainmentClassDeficiency` still never-downgrade
- hydrate/replay of a prior barrier event does not regrade after omit
- no SPE-1027 consume; no workshop remap; no seed protect; no event-schema expansion
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Barrier recouple on technician relief

**Parent:** SPE-877

Mechanic: after successful `stabilizeContainmentClassDeficiency`, recouple that instance's authored
membrane from the new deficiency. When deficiency becomes `none`, drop that zone's `flow_restraint`.
Recorded `zone_breach` stays sticky. All three classes on existing coupling helpers. Technician-relief
path only; week-close inspect stays never-downgrade.

## Validation

- `npx vitest run src/test/containmentBarrierIntegrity.contract.test.ts src/test/equipmentInstance.contract.test.ts --pool forks`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run test:run:ci`
