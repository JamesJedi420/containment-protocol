# SPE-1046 - File work queue file-release fulfillment (slice 1)

One-page implementation plan. Linear child creation/status update is blocked in this session by Linear OAuth reauthentication; intended parent is [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046). Follows [SPE-2540](https://linear.app/spectranoir/issue/SPE-2540/spe-1046-file-work-queue-release-outcomes) / commit `320e356e`; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                        |
| ------------------- | ------------------------------------------------------------ |
| **Linear**          | Pending SPE-1046 child - file work queue release fulfillment |
| **Status**          | Local implementation                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)    |
| **Branch**          | `spe-1046-file-work-queue-file-release-fulfillment-slice-1`  |
| **Base `main` SHA** | `320e356e`                                                   |

## Goal

Persist bounded file-release fulfillment receipts after a release outcome exists, without storing file contents or changing SPE-1046 access decisions.

## Scope

| In                                                                                 | Out                                                 |
| ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| Persisted release-fulfillment ledger for eligible `file_released` outcome rows     | Actual file payload storage or delivery             |
| Store action over existing derived queue rows and release outcome records          | Mission routing, procurement, or weekly progression |
| Operations mirror surfacing for fulfillment controls and recorded week labels      | SPE-947 propagation work                            |
| Hydration and page/view/store/domain tests for fulfillment records and no-op paths | SPE-1046 parent closure                             |

## Acceptance

- [x] `file_released` maps to `file_release_fulfilled`.
- [x] `restricted_review_pending` has no fulfillment action.
- [x] Fulfillment recording requires an existing release action and release outcome on an allowed row.
- [x] Missing-outcome, restricted-review, absent, and ineligible rows no-op.
- [x] Fulfillment records persist through hydrate/export without mutating person-status, release-action, or release-outcome records.
- [x] Operations mirror exposes fulfillment controls only for eligible allowed release outcomes and recorded labels after fulfillment.
- [x] File contents, access decisions, mission routing, procurement, weekly progression, and SPE-947 remain untouched.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/app/store/gameStore.test.ts src/app/store/runTransfer.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx src/test/affiliationFileWorkQueueReleaseFulfillmentRecords.test.ts`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- `npm.cmd run test:run`

## Deferred

| Item                          | Owner                    | Why                                                     |
| ----------------------------- | ------------------------ | ------------------------------------------------------- |
| Actual file content release   | SPE-1046 follow-up child | This slice records fulfillment receipts only.           |
| Mission routing / procurement | SPE-1046 follow-up child | Existing gates remain separate from file workflow UI.   |
| SPE-947 propagation work      | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure       | SPE-1046                 | Broader parent acceptance remains open.                 |
| Linear issue creation/update  | Human / next agent       | Linear connector requires OAuth reauthentication first. |

## See also

- `planning/spe-1046-file-work-queue-release-outcomes-slice-1.md`
- `planning/spe-1046-file-work-queue-release-actions-slice-1.md`
- `planning/backlog.md`
