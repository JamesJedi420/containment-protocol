# SPE-1046 - File work queue welfare evidence repair mutation (slice 1)

One-page implementation plan. Linear: [SPE-2541](https://linear.app/spectranoir/issue/SPE-2541/spe-1046-file-work-queue-welfare-evidence-repair-workflows-slice-2) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2536](https://linear.app/spectranoir/issue/SPE-2536/spe-1046-file-work-queue-candidate-evidence-repair-mutation) / PR #3004; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2541 - SPE-1046 file work queue welfare evidence repair workflows (slice 2)](https://linear.app/spectranoir/issue/SPE-2541/spe-1046-file-work-queue-welfare-evidence-repair-workflows-slice-2) |
| **Status**          | **Backlog** (ready to start)                                                                                                                                                                        |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                                                 |
| **Branch**          | `spe-1046-file-work-queue-welfare-evidence-repair-slice-1`                                                                                                                                          |
| **Base `main` SHA** | `cfb28683`                                                                                                                                                                                          |

## Goal

Turn the recorded file work queue repair-action step into a bounded evidence repair workflow for the second narrow lane: `missing_entity_welfare_reclassification_ref`.

## Scope

| In                                                                                                       | Out                                                 |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Deterministic welfare reclassification evidence repair for resolved `missing_review` rows                | File release workflow actions                       |
| Existing repair-action ledger remains the UI/store entry point                                           | Candidate, onboarding, site, or broad repair lanes  |
| Minimal repaired `entityWelfareReclassificationRecords` evidence for existing person-status welfare refs | Mission routing, procurement, or weekly progression |
| Mirror/page tests proving rows move only through existing derived access decisions                       | SPE-947 propagation work                            |

## Acceptance

- [x] `missing_entity_welfare_reclassification_ref` repair records the existing deterministic repair-action ledger entry.
- [x] The same repair restores minimal valid welfare evidence for the existing person-status `entityWelfareReclassificationRef`.
- [x] Restored evidence is written only to `entityWelfareReclassificationRecords` without duplicating existing welfare records.
- [x] Rows leave only the welfare missing reason through existing SPE-1046 derivations; remaining missing evidence keeps rows in `missing_review`.
- [x] Unsupported or unresolved repair lanes remain no-op for evidence mutation.
- [x] File release, mission routing, procurement, weekly progression, and SPE-947 remain untouched.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx src/test/affiliationFileWorkQueueRepairActionRecords.test.ts`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                          | Owner                    | Why                                                     |
| ----------------------------- | ------------------------ | ------------------------------------------------------- |
| Onboarding/site repair lanes  | SPE-1046 follow-up child | Requires separate lane policy and tests.                |
| File release workflow actions | SPE-1046 follow-up child | Access decisions remain derived from existing evidence. |
| SPE-947 propagation work      | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure       | SPE-1046                 | Broader parent acceptance remains open.                 |

## See also

- `planning/spe-1046-file-work-queue-candidate-evidence-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-repair-action-ledger-slice-1.md`
- `planning/spe-1046-file-work-queue-evidence-repair-candidates-slice-1.md`
- `planning/backlog.md`
