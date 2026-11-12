# SPE-1046 - File work queue repair action ledger (slice 1)

One-page implementation plan. Linear: [SPE-2535](https://linear.app/spectranoir/issue/SPE-2535/spe-1046-file-work-queue-repair-action-ledger) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows PR #3000 evidence repair candidates; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2535 - SPE-1046 file work queue repair action ledger](https://linear.app/spectranoir/issue/SPE-2535/spe-1046-file-work-queue-repair-action-ledger) |
| **Status**          | **In Progress**                                                                                                                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                     |
| **Branch**          | `spe-1046-file-work-queue-repair-action-ledger-slice-1`                                                                                                 |
| **Base `main` SHA** | `5ca14f36`                                                                                                                                              |

## Goal

Persist deterministic repair-action ledger records for individual missing-evidence repair candidates after a file work queue evidence-resolution workflow has been recorded.

## Scope

| In                                                                  | Out                                                 |
| ------------------------------------------------------------------- | --------------------------------------------------- |
| Sanitized `affiliationFileWorkQueueRepairActionRecords` persistence | Actual evidence attachment or repair mutation       |
| Store action for resolved `missing_review` repair candidates        | File release workflow actions                       |
| Operations mirror/page status and button for unresolved repairs     | Mission routing, procurement, or weekly progression |
| Focused persistence, store, view-model, and page tests              | SPE-947 propagation work                            |

## Acceptance

- [x] Repair-action records hydrate/export as optional GameState persistence.
- [x] Invalid, mismatched-key, malformed, non-missing, and empty-subject records are dropped on hydrate.
- [x] Store action records one deterministic repair-action record for a resolved missing-review repair candidate.
- [x] Store action no-ops for absent, unresolved, non-matching, non-missing, and already-recorded candidates.
- [x] Operations mirror shows unresolved repair candidates with a record button and resolved candidates with `Repair recorded W{week}`.
- [x] Existing person-status records, evidence-resolution records, and access outcomes remain read-only derivations.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFileWorkQueueRepairActionRecords.test.ts src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                                    | Owner                    | Why                                                     |
| --------------------------------------- | ------------------------ | ------------------------------------------------------- |
| Attaching or repairing evidence records | SPE-1046 follow-up child | This slice records the repair workflow step only.       |
| File release workflow actions           | SPE-1046 follow-up child | Access decisions remain derived from existing evidence. |
| SPE-947 propagation work                | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure                 | SPE-1046                 | Broader parent acceptance remains open.                 |

## See also

- `planning/spe-1046-file-work-queue-evidence-repair-candidates-slice-1.md`
- `planning/spe-1046-file-work-queue-evidence-resolution-slice-1.md`
- `planning/spe-1046-file-work-queue-operator-action-ledger-slice-1.md`
- `planning/backlog.md`
