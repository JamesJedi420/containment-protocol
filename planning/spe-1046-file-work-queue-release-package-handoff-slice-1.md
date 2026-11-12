# SPE-1046 - File work queue release package handoff (slice 1)

One-page implementation plan. Linear child creation/status update is blocked in this session by Linear OAuth reauthentication; intended parent is [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046). Follows file work queue file-release fulfillment / PR #3014; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                            |
| ------------------- | ---------------------------------------------------------------- |
| **Linear**          | Pending SPE-1046 child - file work queue release package handoff |
| **Status**          | In Progress                                                      |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)        |
| **Branch**          | `spe-1046-file-work-queue-release-package-handoff-slice-1`       |
| **Base `main` SHA** | `1aeee304`                                                       |

## Goal

Persist bounded safe handoff package receipts after a file-release fulfillment receipt exists, without storing file contents or changing SPE-1046 access decisions.

## Scope

| In                                                                                    | Out                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Persisted release-package ledger for rows with valid `file_release_fulfilled` records | Actual file payload storage or delivery             |
| Store action over existing derived queue rows and fulfillment records                 | Mission routing, procurement, or weekly progression |
| Operations mirror surfacing for package controls and recorded package refs            | SPE-947 propagation work                            |
| Hydration and page/view/store/domain tests for package records and no-op paths        | SPE-1046 parent closure                             |

## Acceptance

- [x] `file_release_fulfilled` maps to `safe_file_handoff_package`.
- [x] Package recording requires an existing valid release-fulfillment receipt.
- [x] Missing-fulfillment, absent, and already-recorded rows no-op.
- [x] Package records persist through hydrate/export without mutating person-status, release-action, release-outcome, or release-fulfillment records.
- [x] Operations mirror exposes package controls only after fulfillment and recorded package refs after handoff.
- [x] File contents, access decisions, mission routing, procurement, weekly progression, and SPE-947 remain untouched.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFileWorkQueueReleasePackageRecords.test.ts src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- `npm.cmd run test:run`

## Deferred

| Item                          | Owner                    | Why                                                     |
| ----------------------------- | ------------------------ | ------------------------------------------------------- |
| Actual file content release   | SPE-1046 follow-up child | This slice records safe package handoff receipts only.  |
| Mission routing / procurement | SPE-1046 follow-up child | Existing gates remain separate from file workflow UI.   |
| SPE-947 propagation work      | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure       | SPE-1046                 | Broader parent acceptance remains open.                 |
| Linear issue creation/update  | Human / next agent       | Linear connector requires OAuth reauthentication first. |

## See also

- `planning/spe-1046-file-work-queue-file-release-fulfillment-slice-1.md`
- `planning/spe-1046-file-work-queue-release-outcomes-slice-1.md`
- `planning/spe-1046-file-work-queue-release-actions-slice-1.md`
- `planning/backlog.md`
