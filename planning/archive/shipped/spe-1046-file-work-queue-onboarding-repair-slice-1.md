# SPE-1046 - File work queue onboarding clearance repair mutation (slice 1)

One-page implementation plan. Linear: [SPE-2538](https://linear.app/spectranoir/issue/SPE-2538/spe-1046-file-work-queue-onboarding-clearance-repair-mutation) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2537](https://linear.app/spectranoir/issue/SPE-2537/spe-1046-file-work-queue-welfare-evidence-repair-mutation) / PR #3007; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2538 - SPE-1046 file work queue onboarding clearance repair mutation](https://linear.app/spectranoir/issue/SPE-2538/spe-1046-file-work-queue-onboarding-clearance-repair-mutation) |
| **Status**          | **In Progress**                                                                                                                                                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                                     |
| **Branch**          | `spe-1046-file-work-queue-onboarding-repair-slice-1`                                                                                                                                    |
| **Base `main` SHA** | `8484abdc`                                                                                                                                                                              |

## Goal

Turn the recorded file work queue repair-action step into a bounded evidence repair workflow for the third narrow lane: `missing_onboarding_clearance`.

## Scope

| In                                                                                               | Out                                                 |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Deterministic onboarding evidence repair for resolved `missing_review` rows                      | File release workflow actions                       |
| Existing repair-action ledger remains the UI/store entry point                                   | Candidate-ref or welfare-ref repair lanes           |
| Minimal repaired candidate/onboarding readiness evidence for rows without an onboarding decision | Mission routing, procurement, or weekly progression |
| Mirror/page tests proving rows move only through existing derived access decisions               | SPE-947 propagation work                            |

## Acceptance

- [x] `missing_onboarding_clearance` repair records the existing deterministic repair-action ledger entry.
- [x] The same repair restores minimal valid onboarding-ready evidence through existing candidate/onboarding state.
- [x] Existing candidate and welfare repair lanes remain unchanged.
- [x] Rows leave only the onboarding missing reason through existing SPE-1046 derivations; remaining missing evidence keeps rows in `missing_review`.
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
| Candidate-ref repair lane     | SPE-2536                 | Already shipped separately.                             |
| Welfare evidence repair       | SPE-2537                 | Already shipped separately.                             |
| File release workflow actions | SPE-1046 follow-up child | Access decisions remain derived from existing evidence. |
| SPE-947 propagation work      | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure       | SPE-1046                 | Broader parent acceptance remains open.                 |

## See also

- `planning/spe-1046-file-work-queue-welfare-evidence-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-candidate-evidence-repair-slice-1.md`
- `planning/spe-1046-file-work-queue-repair-action-ledger-slice-1.md`
- `planning/spe-1046-file-work-queue-evidence-repair-candidates-slice-1.md`
- `planning/backlog.md`
