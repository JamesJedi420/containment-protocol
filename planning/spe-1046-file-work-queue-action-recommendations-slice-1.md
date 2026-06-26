# SPE-1046 - File work queue action recommendations (slice 1)

One-page implementation plan. Linear: new SPE-1046 child to be created/linked for file work queue action recommendations. Follows `planning/spe-1046-file-work-queues-slice-1.md`; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | New SPE-1046 child - file work queue action recommendations                                                                         |
| **Status**          | **In Progress**                                                                                                                     |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog** |
| **Branch**          | `spe-1046-file-work-queue-action-recommendations-slice-1`                                                                           |
| **Base `main` SHA** | `af849277`                                                                                                                          |

## Goal

Add deterministic read-only action guidance to the existing file access work queue. In plain English: staff can see what kind of follow-up each queue row needs without introducing editable file workflow actions or mutating state.

## Scope

| In                                                                                                 | Out                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Read-only recommended action kind, label, and detail on file access work queue rows                | New persistence fields                |
| Stable mappings for missing-review, blocked, restricted, and allowed queue buckets                 | Editable file workflow actions        |
| Operations mirror table column for recommended action guidance                                     | Mission routing or deployment changes |
| Focused view-model and page tests covering mapping, rendered guidance, and existing queue ordering | Procurement changes                   |
| Backlog handoff refresh showing file work queues shipped and this slice current                    | SPE-1046 parent closure               |

## Acceptance

- [x] File-access queue entries include deterministic recommended action kind, label, and detail.
- [x] Missing-review rows recommend resolving missing candidate/welfare/onboarding/file/site evidence.
- [x] Blocked rows recommend holding access until blocked file/site/facility reasons are resolved.
- [x] Restricted rows recommend supervisor or review-gate handling before release.
- [x] Allowed bucket mapping recommends monitoring only.
- [x] Operations mirror shows recommended action guidance in the file access work queue.
- [x] No GameState schema, routing, procurement, or editable workflow changes.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
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

- `planning/spe-1046-file-work-queues-slice-1.md`
- `planning/spe-1046-facility-file-access-workflows-slice-1.md`
- `planning/spe-1046-file-access-enforcement-slice-1.md`
- `planning/spe-1046-durable-person-status-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
