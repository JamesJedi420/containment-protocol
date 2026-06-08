# SPE-868 — Recommendation action mirror advanceWeek integration (slice 19)

One-page implementation plan. Linear: child [SPE-2388](https://linear.app/spectranoir/issue/SPE-2388) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 18 (`planning/post-incident-review-registry-slice-18.md`, PR #2642 / [SPE-2387](https://linear.app/spectranoir/issue/SPE-2387)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2388 — Recommendation action mirror advanceWeek integration (slice 19)](https://linear.app/spectranoir/issue/SPE-2388) |
| **Status** | **Shipped** — PR #2644 @ merge pending                                                                   |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-recommendation-action-mirror-integration-slice-19`                                       |
| **Base `main` SHA** | `fa38ea64`                                                                                          |

## Goal

Extend `advanceWeek.postIncidentReview.integration.test.ts` to assert recommendation action records materialize end-to-end and `getPostIncidentReviewRecommendationActionMirrorView` reflects linked recommendation + qualifying rows after near-catastrophe advance — integration tests only.

## Prerequisite (on `main` @ `fa38ea64`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Action registry tick | `applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick` slice 17 (SPE-2386) |
| Action mirror view   | `getPostIncidentReviewRecommendationActionMirrorView` slice 18 (SPE-2387) |
| Recommendation mirror integration pattern | `advanceWeek.postIncidentReview.integration.test.ts` slice 16 (SPE-2385) |
| Action materialization fixtures | slice 17 integration block in same test file |

## Integration contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger path** | Near-catastrophe deadline escalation via `advanceWeek` (slice 9 fixture + slice 17 `academyTier >= 1`) |
| **Record ref** | `action:near-catastrophe-{caseId}` linked to `recommendation:near-catastrophe-{caseId}` and `review:near-catastrophe-{caseId}` |
| **Mirror linkage** | `linkedRecommendation` + `linkedQualifyingReview` populated when refs match persisted rows |
| **Empty state** | Quiet week / pre-qualifying state → empty action mirror |
| **Academy tier 0** | Recommendation persists; action registry empty; action mirror empty |
| **Dual path** | Case closeout (training-ref) + near-catastrophe (recommendation-stub) same tick → training enqueued; only stub in action mirror |
| **Idempotency** | Re-advance same week does not duplicate action mirror rows |
| **Ordering** | Byte-stable `id` sort on action mirror rows |
| **Orphan review ref** | When qualifying review row missing, `linkedQualifyingReview` null while recommendation linkage may persist |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Action mirror integration cases in `advanceWeek` test file         | New domain hooks                              |
| Slice doc (this file) + backlog handoff on ship                    | Action tick logic changes                     |
|                                                                  | Mirror UI/page changes                        |
|                                                                  | Follow-on qualification rules                 |
|                                                                  | SPE-1097 authority checks                     |
|                                                                  | SPE-1310 parent closure                       |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Quiet week leaves action mirror empty without throw
- [x] Near-catastrophe advance materializes action mirror row with linked recommendation + qualifying review
- [x] Academy tier 0 leaves recommendation persisted but action mirror empty
- [x] Dual-path same tick enqueues training but only appends stub recommendation action mirror row
- [x] Re-advance idempotent for action mirror view
- [x] Dual near-catastrophe byte-stable action mirror ordering
- [x] Orphan review ref leaves qualifying review linkage null when review row missing
- [x] Slice 16/17/18 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`       |
| Plan   | `planning/post-incident-review-registry-slice-19.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of mirror boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective / action engines | SPE-868 | Integration test slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-16.md`
- `planning/post-incident-review-registry-slice-17.md`
- `planning/post-incident-review-registry-slice-18.md`
