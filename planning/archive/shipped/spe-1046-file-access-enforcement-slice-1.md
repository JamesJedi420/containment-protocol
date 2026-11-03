# SPE-1046 - File access enforcement for operations surfaces (slice 1)

One-page implementation plan. Linear: [SPE-2524](https://linear.app/spectranoir/issue/SPE-2524/spe-1046-file-access-enforcement-for-operations-surfaces) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2523](https://linear.app/spectranoir/issue/SPE-2523/spe-1046-procurement-gear-access-enforcement); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2524 - SPE-1046 file access enforcement for operations surfaces](https://linear.app/spectranoir/issue/SPE-2524/spe-1046-file-access-enforcement-for-operations-surfaces) |
| **Status**          | **In Progress**                                                                                                                                                               |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                           |
| **Branch**          | `spe-1046-file-access-enforcement-slice-1`                                                                                                                                    |
| **Base `main` SHA** | `9f623d9a`                                                                                                                                                                    |

## Goal

Expose file-access outcomes from the existing SPE-1046 permission evaluator on the durable person-status operations mirror without adding persistence, name inference, routing, procurement, or full parent closure.

## Scope

| In                                                                                            | Out                                       |
| --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Read-only file-access labels from `EntityWelfarePermissionDecision` surface `file`            | New persistence fields                    |
| Operations mirror surfacing through existing durable person-status projections                | Person-name guessing or broad matching    |
| Focused view-model and page tests for no-record, restricted, and blocked file-access outcomes | Mission routing or procurement changes    |
| Backlog handoff update                                                                        | Room, housing, facility, or file UI flows |
| SPE-1046 parent remains **Backlog**                                                           | SPE-1046 parent closure                   |

## Acceptance

- [x] File access decisions reuse existing SPE-1046 permission evaluator for the `file` surface.
- [x] No linked welfare record preserves an explicit `File access: -` mirror label.
- [x] Restricted file permission surfaces through the person-status mirror.
- [x] Blocked file permission surfaces through the person-status mirror.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                             | Owner                    | Why                                |
| -------------------------------- | ------------------------ | ---------------------------------- |
| Room and housing access gates    | SPE-1046 follow-up child | Separate permission surfaces.      |
| Facility-specific file workflows | SPE-1046 follow-up child | Requires explicit product surface. |
| Mission routing changes          | SPE-1046 follow-up child | Mission gates already shipped.     |
| SPE-1046 parent closure          | SPE-1046                 | Parent acceptance remains broader. |

## See also

- `planning/spe-1046-procurement-gear-access-slice-1.md`
- `planning/spe-1046-durable-person-status-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
