# SPE-1046 - File work queue operator action ledger (slice 1)

One-page implementation plan. Linear: [SPE-2529](https://linear.app/spectranoir/issue/SPE-2529/spe-1046-file-work-queue-operator-action-ledger) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2527](https://linear.app/spectranoir/issue/SPE-2527/spe-1046-file-work-queue-action-recommendations) and [SPE-2528](https://linear.app/spectranoir/issue/SPE-2528/spe-1046-post-spe-2527-status-reconciliation); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2529 - SPE-1046 file work queue operator action ledger](https://linear.app/spectranoir/issue/SPE-2529/spe-1046-file-work-queue-operator-action-ledger) |
| **Status**          | **In Progress**                                                                                                                                             |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                         |
| **Branch**          | `spe-1046-file-work-queue-operator-action-ledger-slice-1`                                                                                                   |
| **Base `main` SHA** | `b84a1fc5`                                                                                                                                                  |

## Goal

Persist deterministic operator acknowledgements for file access work queue recommended actions without changing the underlying access decisions.

## Scope

| In                                                            | Out                                    |
| ------------------------------------------------------------- | -------------------------------------- |
| Sanitized `affiliationFileWorkQueueActionRecords` ledger      | Resolving missing evidence             |
| Store action to record the current queue row recommendation   | Releasing files or editing workflows   |
| File access work queue action-status column and record button | Mission routing or procurement changes |
| Focused persistence, store, view-model, and page tests        | Weekly progression changes             |

## Acceptance

- [ ] Action records hydrate/export as optional GameState persistence.
- [ ] Invalid, mismatched-key, and malformed action records are dropped on hydrate.
- [ ] Store action upserts one deterministic record for the current queue entry and recommended action.
- [ ] Missing-entry store calls no-op.
- [ ] Operations mirror shows unrecorded rows with a record button and recorded rows with `Recorded W{week}`.
- [ ] No mutation to `affiliationPersonStatusRecords`, clearance outcomes, mission routing, procurement, or weekly progression.
- [ ] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFileWorkQueueActionRecords.test.ts src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                          | Owner                    | Why                                                     |
| ----------------------------- | ------------------------ | ------------------------------------------------------- |
| Evidence resolution workflows | SPE-1046 follow-up child | This slice records acknowledgement only.                |
| File release workflow actions | SPE-1046 follow-up child | Access decisions remain derived from existing evidence. |
| SPE-947 propagation work      | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure       | SPE-1046                 | Broader parent acceptance remains open.                 |

## See also

- `planning/spe-1046-file-work-queue-action-recommendations-slice-1.md`
- `planning/spe-1046-file-work-queues-slice-1.md`
- `planning/spe-1046-post-spe-2527-status-reconciliation-slice-1.md`
- `planning/backlog.md`
