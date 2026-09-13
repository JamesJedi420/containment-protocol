# SPE-2882 — Same-week workshop completion grades post-close integrity

| Field               | Value                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                               |
| **Linear**          | [SPE-2882](https://linear.app/spectranoir/issue/SPE-2882/same-week-workshop-completion-grades-pre-close-integrity-after-mapped) — child of SPE-877 |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                    |
| **Branch**          | `cursor/critical-bug-management-9415`                                                                                                              |
| **Base `main` SHA** | `ac5571d0` (rebased; original open against earlier `main`)                                                                                         |

## Boundary

Register same-week department-workshop completion receipts against the post-close `GameState` so
live equipment-integrity grading matches the persisted mapped containment-class instance. Reuse the
existing registration seam. Do not add a second quality grader or week-close hook. Queue progression
still ticks from pre-close `inputWeeklyState`.

Do not consume SPE-1027 stock. Do not implement SPE-2870. Do not change SPE-2886 mid-week inspect.
Do not change SPE-2885 persist scan. Do not change SPE-2881 / SPE-2879 / SPE-2880 workshop guards.
Do not add SPE-113 tags, operators, legality, or curses. Do not bump `GAME_STORE_VERSION`. Do not
reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

## Seam

`advanceContainmentClassInspectionsAtWeekClose` already mutates `context.nextState` inside
week-close queues. After `finalizeEvents`, `registerDepartmentWorkshopCompletionOutcomes` must read
`outputWeeklyState` (post-inspection `equipmentInstances`, after the unknown-field patch and after
the workshop tick copies snapshots). `processDepartmentWorkshopTick` stays on `inputWeeklyState`.

Same-close escalate from `none` (`lastInspectionWeek` stale) to `hard_stop` therefore grades
`poor_equipment_condition` / `degraded`, matching the returned instance. Existing-receipt
precedence/replay stays on the registrar.

## Deferred

| Item or mechanic                          | Owner or prerequisite                                                                                       | Why deferred                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------- |
| SPE-1027 stock consume of a named part    | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port   |
| SPE-113 tags, operators, legality, curses | later SPE-877 / SPE-113 child                                                                               | Out of this grading-seam boundary |

## Acceptance

- Same-close mapped workshop completion uses the same post-inspection integrity that persists on `GameState`
- Due/overdue week-close inspect that writes `hard_stop` degrades that receipt (`poor_equipment_condition`)
- Existing-receipt precedence/replay stays stable
- No second grader; queue tick timing unchanged
- Parent SPE-877 remains Backlog

## Linear issue body

**Title:** Same-week workshop completion grades pre-close integrity after mapped equipment hard-stop

**Parent:** SPE-877

See Linear [SPE-2882](https://linear.app/spectranoir/issue/SPE-2882/same-week-workshop-completion-grades-pre-close-integrity-after-mapped).

## Validation

- Targeted Vitest: `src/test/departmentWorkshopLiveIntegrityQuality.integration.test.ts`, `src/test/containmentClassWeekClose.contract.test.ts`, `src/test/extraClassWorkshopIntegrityQualitySeed.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
