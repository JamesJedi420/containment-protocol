# SPE-1046 - File access work queues (slice 1)

One-page implementation plan. Linear: new SPE-1046 child to be created/linked for broad file-access work queues. Follows [SPE-2526](https://linear.app/spectranoir/issue/SPE-2526/spe-1046-facility-specific-file-workflows); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | New SPE-1046 child - file access work queues                                                                                        |
| **Status**          | **In Progress**                                                                                                                     |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog** |
| **Branch**          | `spe-1046-file-work-queues-slice-1`                                                                                                 |
| **Base `main` SHA** | `3242f52b`                                                                                                                          |

## Goal

Turn the existing per-person file access decisions into a read-only operations queue. In plain English: staff can now see which people need file access attention, whether access is blocked, restricted, allowed, or missing review, and why.

## Scope

| In                                                                                                    | Out                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Derived file-access work queue in the existing affiliation person-status mirror view model            | New persistence fields                |
| Queue buckets for `blocked`, `restricted`, `missing_review`, and `allowed`                            | Mission routing or deployment changes |
| Stable priority ordering: blocked first, then restricted, missing review, allowed                     | Procurement changes                   |
| Page surfacing with summary counts and reason-code labels                                             | Broad editable file workflow actions  |
| Focused view-model and page tests covering queue counts, order, blocked, restricted, and missing refs | SPE-1046 parent closure               |

## Acceptance

- [x] File-access queue is derived from existing person-status snapshots only.
- [x] Blocked, restricted, missing-review, and allowed buckets have stable labels.
- [x] Queue priority orders blocked before restricted before missing-review before allowed.
- [x] Missing linked welfare/file permission appears as missing review instead of fabricating access.
- [x] Operations mirror shows queue counts and row-level reasons.
- [x] No GameState schema or routing behavior changes.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx src/test/affiliationPersonStatusRecords.test.ts src/test/affiliationFacilityFileAccess.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                       | Owner                    | Why                                  |
| -------------------------- | ------------------------ | ------------------------------------ |
| Editable file work actions | SPE-1046 follow-up child | This slice is read-only surfacing.   |
| Mission routing changes    | SPE-1046 follow-up child | Mission gates already shipped.       |
| Procurement changes        | SPE-1046 follow-up child | Gear/procurement path already split. |
| SPE-1046 parent closure    | SPE-1046                 | Parent acceptance remains broader.   |

## See also

- `planning/spe-1046-facility-file-access-workflows-slice-1.md`
- `planning/spe-1046-file-access-enforcement-slice-1.md`
- `planning/spe-1046-durable-person-status-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
