# SPE-1046 - File work queue candidate evidence repair mutation (slice 1)

One-page implementation plan. Linear: [SPE-2536](https://linear.app/spectranoir/issue/SPE-2536/spe-1046-file-work-queue-candidate-evidence-repair-mutation) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2535](https://linear.app/spectranoir/issue/SPE-2535/spe-1046-file-work-queue-repair-action-ledger) / PR #3002; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2536 - SPE-1046 file work queue candidate evidence repair mutation](https://linear.app/spectranoir/issue/SPE-2536/spe-1046-file-work-queue-candidate-evidence-repair-mutation) |
| **Status**          | **Shipped** - PR #3004 @ `7ab3739f`                                                                                                                                                 |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                                 |
| **Branch**          | `spe-1046-file-work-queue-candidate-evidence-repair-slice-1`                                                                                                                        |
| **Base `main` SHA** | `5c165a7c`                                                                                                                                                                          |

## Goal

Turn the recorded file work queue repair-action step into a bounded evidence repair workflow for the first narrow lane: `missing_candidate_ref`.

## Scope

| In                                                                                    | Out                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Deterministic candidate evidence repair for resolved `missing_review` rows            | File release workflow actions                       |
| Existing repair-action ledger remains the UI/store entry point                        | Welfare, onboarding, site, or broad repair lanes    |
| Minimal repaired recruitment candidate evidence in `candidates` and `recruitmentPool` | Mission routing, procurement, or weekly progression |
| Mirror/page tests proving rows move only through existing derived access decisions    | SPE-947 propagation work                            |

## Acceptance

- [x] `missing_candidate_ref` repair records the existing deterministic repair-action ledger entry.
- [x] The same repair restores minimal candidate evidence for the existing person-status `candidateRef`.
- [x] Restored evidence is written to both `candidates` and `recruitmentPool` without duplicating existing candidates.
- [x] Rows leave `missing_review` only when existing SPE-1046 derivations naturally produce a file/facility access decision.
- [x] Unsupported repair lanes remain no-op for evidence mutation.
- [x] File release, mission routing, procurement, weekly progression, and SPE-947 remain untouched.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                          | Owner                    | Why                                                     |
| ----------------------------- | ------------------------ | ------------------------------------------------------- |
| Welfare evidence repair       | SPE-1046 follow-up child | Followed by SPE-2537.                                   |
| Onboarding/site repair lanes  | SPE-1046 follow-up child | Requires separate lane policy and tests.                |
| File release workflow actions | SPE-1046 follow-up child | Access decisions remain derived from existing evidence. |
| SPE-947 propagation work      | SPE-947 child            | Separate parent thread.                                 |
| SPE-1046 parent closure       | SPE-1046                 | Broader parent acceptance remains open.                 |

## See also

- `planning/spe-1046-file-work-queue-repair-action-ledger-slice-1.md`
- `planning/spe-1046-file-work-queue-evidence-repair-candidates-slice-1.md`
- `planning/spe-1046-file-work-queue-evidence-resolution-slice-1.md`
- `planning/backlog.md`
