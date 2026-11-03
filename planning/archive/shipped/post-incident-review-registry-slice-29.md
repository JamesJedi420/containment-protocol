# SPE-868 — Reward-branch payout wire-up on qualifying closeout week (slice 29)

One-page implementation plan. Linear: child [SPE-2404](https://linear.app/spectranoir/issue/SPE-2404) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 28 (`planning/post-incident-review-registry-slice-28.md`, PR #2675 / [SPE-2403](https://linear.app/spectranoir/issue/SPE-2403)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2404 — Reward-branch payout wire-up on qualifying closeout week (slice 29)](https://linear.app/spectranoir/issue/SPE-2404) |
| **Status** | **Shipped** — PR #2677 @ `51a040f0`                                                                      |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (**Done** on Linear; owner-choice deferred slice) |
| **Branch** | `spe-868-reward-branch-payout-slice-29`                                                                    |
| **Base `main` SHA** | `da694b31`                                                                                          |

## Goal

Read `reward_branch:` tokens from orchestration-created reviews and apply bounded funding/training credit deltas on the qualifying closeout week only — no registry schema change.

## Prerequisite (on `main` @ `da694b31`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Reward branch tokens | slice 28 (SPE-2403) — `applyWeeklyPostIncidentReviewCloseoutRewardBranchTick` |
| Follow-on training enqueue | slice 13 (SPE-2382) — `applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick` |
| Mission reward breakdown | `src/domain/missionResults.ts` (reference scale only)              |

## Payout contract (this slice)

| Branch | Funding delta | Training credit (when `follow_on:training-ref:` present) |
| --- | --- | --- |
| `containment_priority` | +6 | +3 |
| `contested_containment` | +2 | 0 |
| `threshold_mitigation` | +4 | +2 |
| `recurrence_softening` | +3 | +2 |

| Rule | Detail |
| --- | --- |
| **Trigger** | Review ref absent from prior map, present after reward-branch tick with parsed `reward_branch:` token |
| **Apply tick** | `applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick` after follow-on training enqueue |
| **Funding path** | `applyFundingIncome` on `agency.fundingState` + top-level `funding` sync |
| **Idempotency** | `post-incident-closeout-reward:<reviewRef>` sourceId in `fundingHistory` |
| **Stub exclusion** | Orchestration-created reviews only |
| **Training credit** | Skipped when review carries recommendation-stub token only |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `postIncidentReviewCloseoutRewardBranchPayout.ts` payout tick    | Registry schema expansion                     |
| `advanceWeek` wire after follow-on training enqueue              | Branch derivation rules (slice 28)            |
| Domain unit tests per branch + advanceWeek integration           | Mission triage UI                             |
| Slice doc (this file) + backlog handoff on ship                  | SPE-1310 lifecycle                            |
|                                                                  | Full SPE-868 parent re-close                  |

## Acceptance

- [x] Orchestration-created reviews with `reward_branch:` token trigger bounded funding delta on materialization week
- [x] Training credit delta differs by branch when follow-on training-ref present
- [x] `containment_priority` funding delta > `contested_containment` (deterministic)
- [x] Re-advance idempotent; stub fixtures excluded
- [x] Slice 28 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewCloseoutRewardBranchPayout.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/postIncidentReviewCloseoutRewardBranchPayout.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-29.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage / payout UI surfacing | SPE-868 follow-up | Domain funding history only this slice |
| Compliance audit cycling | SPE-868 | Deferred per slice 20 |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |

## See also

- `planning/post-incident-review-registry-slice-28.md`
- `planning/post-incident-review-registry-slice-13.md`
