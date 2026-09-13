# SPE-2886 — Mid-week inspect command for stored containment-class identity

| Field               | Value                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                        |
| **Linear**          | [SPE-2886](https://linear.app/spectranoir/issue/SPE-2886/mid-week-inspect-command-for-stored-containment-class-identity) — child of SPE-877 |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**             |
| **Branch**          | `cursor/spe-877-mid-week-inspect-3400`                                                                                                      |
| **Base `main` SHA** | `ba1300e8`                                                                                                                                  |

## Boundary

Add one player/store command that runs the existing inspect kernel for one stored containment-class
identity mid-week. Reuse `resolveContainmentClassWeekCloseInspection` /
`evaluateContainmentInspection`. Do not call `advanceContainmentClassInspectionsAtWeekClose` from
UI or store. Week-close auto-advance stays the production batch path. Persist barrier coupling
without `technicianRelief` (never-downgrade; SPE-2885 scan does not run). Extra-class membranes
use the same command.

Do not consume SPE-1027 stock. Do not implement SPE-2870. Do not pick SPE-2882 week-close workshop
grading. Do not change SPE-2881 / SPE-2879 / SPE-2880 workshop guards. Do not add SPE-113 tags,
operators, legality, or curses. Do not bump `GAME_STORE_VERSION`. Do not reopen SPE-2827 /
SPE-2848. Do not pick SPE-2847.

## Command contract

Domain `inspectContainmentClassIntegrity(state, instanceId)`:

1. Accept one **stored** parsed containment-class identity (`blast_door` / `pressure_seal` /
   `interlock`).
2. Call `resolveContainmentClassWeekCloseInspection` (due → compensating continue, overdue →
   hard-stop, sticky hard-stop never downgrades).
3. Stamp `lastInspectionWeek` to the current week.
4. Persist barrier coupling without `technicianRelief`.
5. Fail-close `inspection_not_due` when freshness is `current` (including same-week replay).

Store action `inspectContainmentClassIntegrity(instanceId)`:

1. Call the domain writer.
2. On success, append `equipment.containment_class_inspected` with reason `mid_week_player_inspect`.
3. Append `equipment.containment_class_deficiency_recorded` only when deficiency changed.
4. On fail-closed, persist the domain state with no event.

Projection `canInspectContainmentClassIntegrity` is true only when domain can-inspect is true
(stored + parsed class + due or overdue). Ordinary identities, missing, malformed, equipped, and
current freshness stay hidden / disabled. Do not render `lastInspectionWeek`, `cycleCount`, or raw
integrity on the Equipment row.

## Fail closed

| Input                               | Result                               |
| ----------------------------------- | ------------------------------------ |
| Missing / unsafe instance id        | no mutation, no event                |
| Ordinary identity                   | no mutation, no event, no UI command |
| Equipped identity                   | `instance_not_stored`, no UI command |
| `inspection` status `current`       | `inspection_not_due`, no UI command  |
| Malformed / unknown class integrity | no mutation, no event, no UI command |

## Determinism and compatibility

- Week-close batch still stamps remaining due/overdue identities with reason
  `week_close_auto_advance`.
- Mid-week inspect does not recouple with `technicianRelief`.
- Valid events hydrate as history without replaying mutations.
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version stay unchanged.
  The inspected-event reason union is additive (`week_close_auto_advance` still hydrates).

## Deferred

| Item or mechanic                          | Owner or prerequisite                                                                                                           | Why deferred                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| SPE-1027 stock consume of a named part    | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027                     | Blocked: no SPE-1027 debit port                         |
| Same-week workshop completion grading     | [SPE-2882](https://linear.app/spectranoir/issue/SPE-2882/same-week-workshop-completion-grades-pre-close-integrity-after-mapped) / `planning/spe-877-workshop-completion-post-close-integrity-slice.md` | Shipped: same-week receipts grade post-close integrity; queue tick stays pre-close |
| SPE-113 tags, operators, legality, curses | later SPE-877 / SPE-113 child                                                                                                   | Out of this inspect-command boundary                    |

## Acceptance

- Player can inspect one stored containment-class identity mid-week through store/UI without a parallel cadence kernel
- Due writes compensating continue; overdue writes hard-stop; current fail-closes `inspection_not_due`
- Extra-class twins use the same command
- Inspect never-downgrades recorded `zone_breach`
- Same-week replay is a no-op (no double stamp)
- Ordinary / missing / malformed stay hidden
- Week-close auto-advance still runs and remains the production batch path
- Parent SPE-877 remains Backlog

## Linear issue body

**Title:** Mid-week inspect command for stored containment-class identity

**Parent:** SPE-877

See Linear [SPE-2886](https://linear.app/spectranoir/issue/SPE-2886/mid-week-inspect-command-for-stored-containment-class-identity).

## Validation

- Targeted Vitest: `src/test/equipmentInstance.contract.test.ts`, `src/test/containmentClassWeekClose.contract.test.ts`, `src/features/equipment/equipmentView.test.ts`, `src/app/store/gameStore.test.ts`, `src/features/equipment/EquipmentPage.test.tsx`, `src/test/events.validation.test.ts`, `src/test/eventFeedView.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
