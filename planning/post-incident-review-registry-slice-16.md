# SPE-868 — Recommendation registry advanceWeek mirror integration (slice 16)

One-page implementation plan. Linear: child [SPE-2385](https://linear.app/spectranoir/issue/SPE-2385) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 15 (`planning/post-incident-review-registry-slice-15.md`, PR #2636 / [SPE-2384](https://linear.app/spectranoir/issue/SPE-2384)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2385 — Recommendation registry advanceWeek mirror integration (slice 16)](https://linear.app/spectranoir/issue/SPE-2385) |
| **Status** | **Ready for PR**                                                                                           |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-recommendation-mirror-integration-slice-16`                                                |
| **Base `main` SHA** | `594edc45`                                                                                          |

## Goal

Extend `advanceWeek.postIncidentReview.integration.test.ts` to assert recommendation records materialize end-to-end and `getPostIncidentReviewRecommendationMirrorView` reflects linked qualifying rows after near-catastrophe advance — integration tests only.

## Prerequisite (on `main` @ `594edc45`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Recommendation registry tick | `applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick` slice 14 (SPE-2383) |
| Recommendation mirror view | `getPostIncidentReviewRecommendationMirrorView` slice 15 (SPE-2384) |
| Near-catastrophe integration pattern | `advanceWeek.postIncidentReview.integration.test.ts` slice 9 (SPE-2378) |

## Integration contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger path** | Near-catastrophe deadline escalation via `advanceWeek` (slice 9 fixture) |
| **Record ref** | `recommendation:near-catastrophe-{caseId}` linked to `review:near-catastrophe-{caseId}` |
| **Mirror linkage** | `linkedQualifyingReview` populated when review ref matches qualifying incident mirror row |
| **Empty state** | Quiet week / pre-qualifying state → empty recommendation mirror |
| **Dual path** | Case closeout (training-ref) + near-catastrophe (recommendation-stub) same tick → training enqueued; only stub in recommendation registry |
| **Idempotency** | Re-advance same week does not duplicate recommendation records or mirror rows |
| **Ordering** | Byte-stable `id` sort on recommendation mirror rows |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Recommendation mirror integration cases in `advanceWeek` test file | New domain hooks                              |
| Slice doc (this file) + backlog handoff on ship                    | Training enqueue path changes                 |
|                                                                  | Follow-on qualification rules                 |
|                                                                  | Mirror UI surface changes                     |
|                                                                  | SPE-1310 lifecycle                            |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Quiet week leaves recommendation mirror empty without throw
- [x] Near-catastrophe advance materializes recommendation record with linked qualifying mirror row
- [x] Dual-path same tick enqueues training but only appends recommendation stub registry entry
- [x] Re-advance idempotent for recommendation records and mirror view
- [x] Dual near-catastrophe byte-stable recommendation mirror ordering
- [x] Slice 9/14/15 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`       |
| Plan   | `planning/post-incident-review-registry-slice-16.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Recommendation action/training wire-up | SPE-868 follow-up | Integration closure only this slice |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of mirror boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration test slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-9.md`
- `planning/post-incident-review-registry-slice-14.md`
- `planning/post-incident-review-registry-slice-15.md`
