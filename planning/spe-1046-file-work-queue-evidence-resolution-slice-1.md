# SPE-1046 - File work queue evidence resolution workflows (slice 1)

One-page implementation plan. Linear: new SPE-1046 child to be created/linked for file work queue evidence resolution workflows. Follows [SPE-2529](https://linear.app/spectranoir/issue/SPE-2529/spe-1046-file-work-queue-operator-action-ledger) and post-SPE-2533 handoff reconciliation; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | New SPE-1046 child - file work queue evidence resolution workflows                                                                  |
| **Status**          | **In Progress**                                                                                                                     |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog** |
| **Branch**          | `spe-1046-file-work-queue-evidence-resolution-slice-1`                                                                              |
| **Base `main` SHA** | `cfab81d7`                                                                                                                          |

## Goal

Persist deterministic evidence-resolution workflow records for existing `missing_review` file access work queue rows without changing the underlying person-status evidence or access decisions.

## Scope

| In                                                                                  | Out                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| Sanitized `affiliationFileWorkQueueEvidenceResolutionRecords` GameState persistence | Editing person-status evidence                      |
| Store action for current missing-review queue rows                                  | Releasing files or changing access                  |
| Mirror/page status and button for unresolved missing evidence                       | Mission routing, procurement, or weekly progression |
| Focused persistence, store, view-model, and page tests                              | SPE-947 propagation work                            |

## Acceptance

- [x] Evidence-resolution records hydrate/export as optional GameState persistence.
- [x] Invalid, mismatched-key, non-missing, malformed, and empty-reason records are dropped on hydrate.
- [x] Store action records one deterministic resolution record for current `missing_review` queue rows.
- [x] Store action no-ops for absent, blocked, restricted, or allowed queue rows.
- [x] Operations mirror shows unresolved missing-review rows with a record button and resolved rows with `Evidence resolution recorded W{week}`.
- [x] No mutation to `affiliationPersonStatusRecords`, clearance outcomes, mission routing, procurement, or weekly progression.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFileWorkQueueEvidenceResolutionRecords.test.ts src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                                    | Owner                    | Why                                                     |
| --------------------------------------- | ------------------------ | ------------------------------------------------------- |
| Attaching or repairing evidence records | SPE-1046 follow-up child | This slice records resolution workflow intent only.     |
| File release workflow actions           | SPE-1046 follow-up child | Access decisions remain derived from existing evidence. |
| SPE-947 propagation work                | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure                 | SPE-1046                 | Broader parent acceptance remains open.                 |

## See also

- `planning/spe-1046-file-work-queue-operator-action-ledger-slice-1.md`
- `planning/spe-1046-file-work-queues-slice-1.md`
- `planning/spe-1046-post-spe-2532-handoff-reconciliation-slice-1.md`
- `planning/backlog.md`
