# SPE-1028 child — Live facility/staff → workshop safety inputs (mapping seam required)

| Field               | Value                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/live-facilitystaff-workshop-safety-inputs-mapping-seam-required) |
| **GitHub**          | [#3419](https://github.com/JamesJedi420/containment-protocol/issues/3419)                                                |
| **Status**          | **Backlog** (blocked on explicit mapping seam)                                                                           |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                 |
| **Branch**          | n/a until mapping seam exists                                                                                            |
| **Base `main` SHA** | `298c5eaa`                                                                                                               |

## Goal

When an explicit mapping seam exists, project live facility / staff (or other
authored) conditions into caller-owned `DepartmentWorkshopSafetyConditions` for
`registerDepartmentWorkshopCompletionOutcomes` at week-close. Until that seam
is designed, this child stays **Backlog** and must not invent ad hoc wiring.

## Current shipped contract (authoritative now)

Owned by [#3411](https://github.com/JamesJedi420/containment-protocol/issues/3411) /
[`planning/spe-1028-workshop-unsafe-processing-safety-slice.md`](spe-1028-workshop-unsafe-processing-safety-slice.md):

- Safety axes remain optional caller-owned stubs: `isolation`, `ventilation`,
  `ppe`, `dualAuth` (`good` / `poor`).
- Missing conditions and omitted axes resolve to `good` → receipt `safe` via
  `resolveDepartmentWorkshopCompletionSafety` (sole grading authority).
- Week-close calls `registerDepartmentWorkshopCompletionOutcomes` with only the
  three required args and therefore remains all-good.
- Replay / save-load keep stored `safety`; siblings stay isolated.
- Quality `roomContamination` is orthogonal and must not be conflated with
  safety isolation / ventilation.

## Non-goals (locked until mapping seam)

- Do not project live facility or staffing conditions in a premature slice.
- Keep `FacilityEffect` and `FACILITY_EFFECT_KEYS` unchanged for that attempt.
- Do not add a `departmentId → facilityId` lookup without a designed seam.
- Do not derive safety from facility status, level, activity, or upgrades.
- Do not introduce a staff-to-workshop assignment seam ad hoc.
- Do not broaden into quality live wiring, adjacency, UI, inventory mutation,
  or secondary-incident spawn rule changes.

## Acceptance (when unblocked)

- Explicit mapping seam documented (department / facility / staff → the four
  safety axes) and implemented as a pure projector.
- Week-close builds per–work-order `safetyConditionsByWorkOrderId` from that
  seam only; grading still goes through `resolveDepartmentWorkshopCompletionSafety`.
- Missing mapped inputs default safe; no hidden RNG; no parallel safety state.
- Targeted tests: mapped poor axis → `unsafe`; all-good / missing → `safe`;
  replay keeps stored safety; sibling work orders isolated.
- Docs: this slice doc → Shipped; audit + backlog handoff updated; schema only
  if new persisted fields appear (prefer none).

## Deferred

| Item                                      | Owner              | Why deferred                                                         |
| ----------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| Explicit facility/staff → safety map seam | SPE-1028 / this child | Required before any week-close live projection.                   |
| Live facility/staff → quality inputs      | SPE-1028 follow-up | Separate SPE-2768 deferral; do not co-wire unless scoped.            |
| Adjacency and player workshop surface     | SPE-1028 follow-up | Outside completion-receipt / safety-input ownership.                 |

Parent SPE-1028 remains **In Progress** because broader workshop acceptance
(adjacency, live quality/safety inputs after a mapping seam, player surface)
remains open.
