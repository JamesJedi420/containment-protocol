# SPE-1046 - Room/housing access enforcement for operations surfaces (slice 1)

One-page implementation plan. Linear: [SPE-2525](https://linear.app/spectranoir/issue/SPE-2525/spe-1046-roomhousing-access-enforcement-for-operations-surfaces) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2524](https://linear.app/spectranoir/issue/SPE-2524/spe-1046-file-access-enforcement-for-operations-surfaces); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2525 - SPE-1046 room/housing access enforcement for operations surfaces](https://linear.app/spectranoir/issue/SPE-2525/spe-1046-roomhousing-access-enforcement-for-operations-surfaces) |
| **Status**          | **Shipped** - PR #2978 @ `a6166182`                                                                                                                                                          |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                                          |
| **Branch**          | `spe-1046-room-housing-access-enforcement-slice-1`                                                                                                                                           |
| **Base `main` SHA** | `c5869e65`                                                                                                                                                                                   |

## Goal

Expose room-access and housing-access outcomes from the existing SPE-1046 permission evaluator on the durable person-status operations mirror without adding persistence, name inference, routing, procurement, facility-specific file flows, or full parent closure.

## Scope

| In                                                                                                                | Out                                    |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Read-only room-access labels from `EntityWelfarePermissionDecision` surface `room`                                | New persistence fields                 |
| Read-only housing-access labels from `EntityWelfarePermissionDecision` surface `housing`                          | Person-name guessing or broad matching |
| Operations mirror surfacing through existing durable person-status projections                                    | Mission routing or deployment changes  |
| Focused view-model and page tests for no-record, restricted/blocked room, and allowed/restricted housing outcomes | Procurement changes                    |
| Backlog handoff update                                                                                            | Facility-specific file workflows       |
| SPE-1046 parent remains **Backlog**                                                                               | SPE-1046 parent closure                |

## Acceptance

- [x] Room access decisions reuse existing SPE-1046 permission evaluator for the `room` surface.
- [x] Housing access decisions reuse existing SPE-1046 permission evaluator for the `housing` surface.
- [x] No linked welfare record preserves explicit `Room access: -` and `Housing access: -` mirror labels.
- [x] Restricted or blocked room permission surfaces through the person-status mirror.
- [x] Allowed and restricted housing permission surfaces through the person-status mirror.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                             | Owner                    | Why                                |
| -------------------------------- | ------------------------ | ---------------------------------- |
| Facility-specific file workflows | SPE-1046 follow-up child | Requires explicit product surface. |
| Mission routing changes          | SPE-1046 follow-up child | Mission gates already shipped.     |
| SPE-1046 parent closure          | SPE-1046                 | Parent acceptance remains broader. |

## See also

- `planning/spe-1046-file-access-enforcement-slice-1.md`
- `planning/spe-1046-durable-person-status-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
