# SPE-868 — Closeout reward payout line surfacing (slice 30)

One-page implementation plan. Linear: child [SPE-2407](https://linear.app/spectranoir/issue/SPE-2407) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 29 (`planning/post-incident-review-registry-slice-29.md`, PR #2677 / [SPE-2404](https://linear.app/spectranoir/issue/SPE-2404)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2407 — Closeout reward payout line surfacing (slice 30)](https://linear.app/spectranoir/issue/SPE-2407) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (**Done** on Linear; owner-choice deferred slice) |
| **Branch** | `spe-868-closeout-reward-payout-surfacing-slice-30`                                                        |
| **Base `main` SHA** | `54738ba3`                                                                                          |

## Goal

Surface read-only closeout reward payout lines in post-incident mirror and weekly report notes — labels from `fundingHistory` payout sourceIds and `reward_branch:` tokens on qualifying closeout paths. No numeric deltas in player-facing copy.

## Prerequisite (on `main` @ `54738ba3`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Reward branch tokens | slice 28 (SPE-2403) — `applyWeeklyPostIncidentReviewCloseoutRewardBranchTick` |
| Payout wire-up       | slice 29 (SPE-2404) — `applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick` |
| Follow-on report notes | slice 11 (SPE-2380) — `buildWeeklyPostIncidentReviewFollowOnReportNotes` |
| Mirror branch label  | slice 28 — `closeoutRewardBranchLabel`                                 |

## Surfacing contract (this slice)

| Surface | Assertion |
| --- | --- |
| Mirror | `closeoutRewardPayoutLineLabels` per record — `Funding credit — {Branch}` / `Training credit — {Branch}` when matching `fundingHistory` sourceIds exist |
| Weekly report | `post_incident_review.closeout_reward_payout` note on materialization week with branch + credit kinds (no numeric deltas) |
| Trigger | Review ref absent from prior map, present after payout tick with qualifying history entries |
| Empty history | No payout lines / no notes |
| Stub exclusion | Orchestration-created reviews only |

| Rule | Detail |
| --- | --- |
| **No amount leakage** | Labels use branch + credit kind only; never surface `fundingHistory.delta` |
| **Ordering** | Funding credit line before training credit; review refs sorted lexicographically |
| **Idempotency** | Re-advance when review ref already in prior map emits no new notes |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `postIncidentReviewCloseoutRewardPayoutSurfacing.ts`             | Payout logic (slice 29)                       |
| Mirror `closeoutRewardPayoutLineLabels`                          | Branch derivation (slice 28)                    |
| `advanceWeek` wire after payout tick                             | Mission triage UI                             |
| Domain unit + mirror + integration tests                         | Registry schema expansion                     |
| Slice doc (this file) + backlog handoff on ship                  | Full SPE-868 parent re-close                  |

## Acceptance

- [ ] Qualifying closeout payout lines appear on mirror when funding history entries exist
- [ ] Weekly report notes emit on materialization week with branch + credit kinds (no numeric deltas)
- [ ] Empty funding history → no payout lines / no notes
- [ ] Stub fixtures and non-qualifying paths excluded
- [ ] Slice 28–29 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewCloseoutRewardPayoutSurfacing.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Mirror | `src/features/operations/postIncidentReviewMirrorView.ts`             |
| Report | `src/features/report/reportNoteView.ts`                               |
| Tests  | `src/test/postIncidentReviewCloseoutRewardPayoutSurfacing.test.ts`, `src/features/operations/postIncidentReviewMirrorView.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-30.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage payout UI | SPE-868 follow-up | Mirror/report read-only labels only this slice |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |

## See also

- `planning/post-incident-review-registry-slice-28.md`
- `planning/post-incident-review-registry-slice-29.md`
- `planning/post-incident-review-registry-slice-11.md`
