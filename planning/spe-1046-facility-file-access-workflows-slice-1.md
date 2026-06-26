# SPE-1046 - Facility-specific file access workflows (slice 1)

One-page implementation plan. Linear: [SPE-2526](https://linear.app/spectranoir/issue/SPE-2526/spe-1046-facility-specific-file-workflows) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2525](https://linear.app/spectranoir/issue/SPE-2525/spe-1046-roomhousing-access-enforcement-for-operations-surfaces); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2526 - SPE-1046 facility-specific file workflows](https://linear.app/spectranoir/issue/SPE-2526/spe-1046-facility-specific-file-workflows) |
| **Status**          | **In Progress**                                                                                                                                 |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**             |
| **Branch**          | `spe-1046-facility-file-access-workflows-slice-1`                                                                                               |
| **Base `main` SHA** | `a6166182`                                                                                                                                      |

## Goal

Answer the practical read-only question: can this person access files for this specific site/facility? Compose the existing status-class file permission decision with existing site/facility clearance context, then surface the derived result in the operations person-status mirror.

## Scope

| In                                                                                                                  | Out                                   |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Pure facility-file access helper composing file permission and site/facility clearance decisions                    | New persistence fields                |
| Deterministic effective outcome precedence `blocked > restricted > allowed`                                         | Mission routing or deployment changes |
| Durable person-status projection derives optional `facilityFileAccessDecision` from existing record fields          | Procurement changes                   |
| Operations mirror read-only `Facility file access` column with `-` when no linked welfare/file permission exists    | Broad file UI queues or work queues   |
| Domain, projection, view-model, and page tests for restricted, blocked, missing-link, and stable reason-code output | SPE-1046 parent closure               |

## Acceptance

- [x] Facility-file helper reuses existing file permission decisions and site/facility clearance decisions.
- [x] Effective outcomes preserve `blocked > restricted > allowed` precedence.
- [x] Reason codes from both permission and clearance paths are sorted and deduped.
- [x] Person-status projection derives facility-file access only when linked welfare file permission exists.
- [x] Operations mirror shows `Facility file access: -` when no linked welfare/file permission exists.
- [x] Restricted and blocked facility-file outcomes render in the operations mirror.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFacilityFileAccess.test.ts src/test/affiliationPersonStatusRecords.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                    | Owner                    | Why                                  |
| ----------------------- | ------------------------ | ------------------------------------ |
| Mission routing changes | SPE-1046 follow-up child | Mission gates already shipped.       |
| Procurement changes     | SPE-1046 follow-up child | Gear/procurement path already split. |
| Broad file work queues  | SPE-1046 follow-up child | This slice is read-only projection.  |
| SPE-1046 parent closure | SPE-1046                 | Parent acceptance remains broader.   |

## See also

- `planning/spe-1046-room-housing-access-enforcement-slice-1.md`
- `planning/spe-1046-file-access-enforcement-slice-1.md`
- `planning/spe-1046-site-specific-clearance-slice-1.md`
- `planning/spe-1046-durable-person-status-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
