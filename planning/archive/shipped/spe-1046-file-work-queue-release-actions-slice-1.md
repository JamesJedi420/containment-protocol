# SPE-1046 - File work queue release actions (slice 1)

One-page implementation plan. Linear: [SPE-2539](https://linear.app/spectranoir/issue/SPE-2539/spe-1046-file-work-queue-release-actions) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2538](https://linear.app/spectranoir/issue/SPE-2538/spe-1046-file-work-queue-onboarding-clearance-repair-mutation) / PR #3009; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2539 - SPE-1046 file work queue release actions](https://linear.app/spectranoir/issue/SPE-2539/spe-1046-file-work-queue-release-actions) |
| **Status**          | **In Progress**                                                                                                                               |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**           |
| **Branch**          | `spe-1046-file-work-queue-release-actions-slice-1`                                                                                            |
| **Base `main` SHA** | `dcdda6bb`                                                                                                                                    |

## Goal

Turn eligible file access work queue rows into bounded persisted release workflow acknowledgements after the evidence repair chain, without changing the underlying SPE-1046 access decisions.

## Scope

| In                                                                                         | Out                                                 |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Persisted release-action ledger for restricted and allowed file work queue rows            | Actual file release side effects                    |
| Store action over existing derived queue rows                                              | Mission routing, procurement, or weekly progression |
| Operations mirror surfacing for release-action buttons and recorded week labels            | SPE-947 propagation work                            |
| Hydration and page/view/store/domain tests for release-action records and no-op boundaries | SPE-1046 parent closure                             |

## Acceptance

- [ ] Restricted rows can record `restricted_release_review_routed`.
- [ ] Allowed rows are supported by deterministic `file_release_authorized` domain records.
- [ ] Blocked, missing-review, absent, and already-recorded rows no-op.
- [ ] Release records persist through hydrate/export without mutating person-status, evidence-resolution, or repair-action records.
- [ ] Operations mirror shows release controls only for eligible rows and recorded labels after action.
- [ ] File release side effects, mission routing, procurement, weekly progression, and SPE-947 remain untouched.
- [ ] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/app/store/gameStore.test.ts src/app/store/runTransfer.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx src/test/affiliationFileWorkQueueReleaseActionRecords.test.ts`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                             | Owner                    | Why                                                   |
| -------------------------------- | ------------------------ | ----------------------------------------------------- |
| Actual file release side effects | SPE-1046 follow-up child | This slice records workflow acknowledgement only.     |
| Mission routing / procurement    | SPE-1046 follow-up child | Existing gates remain separate from file workflow UI. |
| SPE-947 propagation work         | SPE-947 child            | Separate parent thread.                               |
| SPE-1046 parent closure          | SPE-1046                 | Broader parent acceptance remains open.               |

## See also

- `planning/spe-1046-file-work-queue-onboarding-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-welfare-evidence-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-candidate-evidence-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-repair-action-ledger-slice-1.md`
- `planning/backlog.md`
