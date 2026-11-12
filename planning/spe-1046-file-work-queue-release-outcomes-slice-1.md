# SPE-1046 - File work queue release outcomes (slice 1)

One-page implementation plan. Linear: [SPE-2540](https://linear.app/spectranoir/issue/SPE-2540/spe-1046-file-work-queue-release-outcomes) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2539](https://linear.app/spectranoir/issue/SPE-2539/spe-1046-file-work-queue-release-actions) / PR #3011; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2540 - SPE-1046 file work queue release outcomes](https://linear.app/spectranoir/issue/SPE-2540/spe-1046-file-work-queue-release-outcomes) |
| **Status**          | **Done** — PR #3016 merged @ `38960983`                                                                                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**             |
| **Branch**          | `spe-1046-file-work-queue-release-outcomes-slice-1`                                                                                             |
| **Base `main` SHA** | `f1d96633`                                                                                                                                      |

## Goal

Record bounded release workflow outcomes for file access work queue rows after a release action exists, without changing the underlying SPE-1046 access decisions or releasing actual file contents.

## Scope

| In                                                                                  | Out                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| Persisted release-outcome ledger for rows with recorded release actions             | Actual file content release                         |
| Store action over existing derived queue rows and release-action records            | Mission routing, procurement, or weekly progression |
| Operations mirror surfacing for outcome follow-up buttons and recorded week labels  | SPE-947 propagation work                            |
| Hydration and page/view/store/domain tests for outcome records and no-op boundaries | SPE-1046 parent closure                             |

## Acceptance

- [x] `file_release_authorized` maps to `file_released`.
- [x] `restricted_release_review_routed` maps to `restricted_review_pending`.
- [x] Outcome recording requires an existing release action.
- [x] Blocked, missing-review, absent, missing-action, and already-recorded rows no-op.
- [x] Outcome records persist through hydrate/export without mutating person-status, release-action, evidence-resolution, or repair-action records.
- [x] Operations mirror shows outcome controls only after release action recording and recorded labels after outcome action.
- [x] File contents, access decisions, mission routing, procurement, weekly progression, and SPE-947 remain untouched.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/app/store/gameStore.test.ts src/app/store/runTransfer.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx src/test/affiliationFileWorkQueueReleaseOutcomeRecords.test.ts`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                          | Owner                    | Why                                                   |
| ----------------------------- | ------------------------ | ----------------------------------------------------- |
| Actual file content release   | SPE-1046 follow-up child | This slice records workflow outcome receipts only.    |
| Mission routing / procurement | SPE-1046 follow-up child | Existing gates remain separate from file workflow UI. |
| SPE-947 propagation work      | SPE-947 child            | Separate parent thread.                               |
| SPE-1046 parent closure       | SPE-1046                 | Broader parent acceptance remains open.               |

## See also

- `planning/spe-1046-file-work-queue-release-actions-slice-1.md`
- `planning/spe-1046-file-work-queue-onboarding-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-welfare-evidence-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-candidate-evidence-repair-slice-1.md`
- `planning/backlog.md`
