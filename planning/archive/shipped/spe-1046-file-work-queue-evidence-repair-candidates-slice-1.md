# SPE-1046 - File work queue evidence repair candidates (slice 1)

One-page implementation plan. Linear: [SPE-2534](https://linear.app/spectranoir/issue/SPE-2534/spe-1046-file-work-queue-evidence-repair-candidates) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows PR #2998 evidence-resolution workflow recording; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2534 - SPE-1046 file work queue evidence repair candidates](https://linear.app/spectranoir/issue/SPE-2534/spe-1046-file-work-queue-evidence-repair-candidates) |
| **Status**          | **Shipped**                                                                                                                                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                 |
| **Branch**          | `spe-1046-file-work-queue-evidence-repair-candidates-slice-1`                                                                                                       |
| **Base `main` SHA** | `44e99cf6`                                                                                                                                                          |
| **PR**              | [#3000](https://github.com/JamesJedi420/containment-protocol/pull/3000) @ `5ca14f36`                                                                                |

## Goal

Derive read-only repair-candidate guidance from existing file work queue evidence-resolution records so operators can see which missing evidence channel should be repaired next.

## Scope

| In                                                                    | Out                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| Mapping missing reason codes to deterministic repair-candidate labels | Actual evidence attachment or repair mutation       |
| Operations mirror surfacing for resolved missing-review queue rows    | File release workflow actions                       |
| Focused domain, view-model, and page tests                            | Mission routing, procurement, or weekly progression |
| Backlog/Linear parent status correction to Backlog                    | SPE-947 propagation work                            |

## Acceptance

- [x] Missing reason codes map to deterministic repair candidate labels.
- [x] Unknown `missing_*` reason codes receive stable fallback guidance.
- [x] Operations mirror shows repair candidate labels only after evidence resolution is recorded.
- [x] Existing evidence-resolution and action ledger behavior remains unchanged.
- [x] No mutation to `affiliationPersonStatusRecords`, clearance outcomes, mission routing, procurement, or weekly progression.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFileWorkQueueEvidenceResolutionRecords.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                                    | Owner                    | Why                                                     |
| --------------------------------------- | ------------------------ | ------------------------------------------------------- |
| Attaching or repairing evidence records | SPE-1046 follow-up child | This slice shows repair candidates only.                |
| File release workflow actions           | SPE-1046 follow-up child | Access decisions remain derived from existing evidence. |
| SPE-947 propagation work                | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure                 | SPE-1046                 | Broader parent acceptance remains open.                 |

## See also

- `planning/spe-1046-file-work-queue-evidence-resolution-slice-1.md`
- `planning/spe-1046-file-work-queue-operator-action-ledger-slice-1.md`
- `planning/spe-1046-file-work-queues-slice-1.md`
- `planning/backlog.md`
