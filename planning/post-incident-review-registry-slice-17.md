# SPE-868 — Post-incident recommendation action wire-up (slice 17)

One-page implementation plan. Linear: child [SPE-2386](https://linear.app/spectranoir/issue/SPE-2386) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 16 (`planning/post-incident-review-registry-slice-16.md`, PR #2638 / [SPE-2385](https://linear.app/spectranoir/issue/SPE-2385)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2386 — Post-incident recommendation action wire-up (slice 17)](https://linear.app/spectranoir/issue/SPE-2386) |
| **Status** | **Shipped** — PR pending @ merge                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-recommendation-action-wire-up-slice-17`                                                     |
| **Base `main` SHA** | `7b26c547`                                                                                          |

## Goal

When persisted `postIncidentReviewRecommendationRecords` materialize from orchestration-created recommendation stubs, append one bounded action-stub record per recommendation into `postIncidentReviewRecommendationActionRecords` — domain-only; mirrors slice 13 training enqueue + slice 14 recommendation registry materialization/idempotency pattern.

## Prerequisite (on `main` @ `7b26c547`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Recommendation registry tick | `applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick` slice 14 (SPE-2383) |
| Training enqueue     | `applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick` slice 13 (SPE-2382) |
| Mirror integration   | `advanceWeek.postIncidentReview.integration.test.ts` slice 16 (SPE-2385) |

## Recommendation action contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger** | Recommendation id absent from prior map, present after recommendation registry tick |
| **Record id** | `action:<stub-suffix>` derived from recommendation `stubSuffix` |
| **Action token** | `follow_on:action-stub:<stub-suffix>` |
| **Training exclusion** | Training-ref closeouts never produce recommendation records upstream |
| **Idempotency** | Re-advance is a no-op when recommendation id already in prior map or action id already persisted |
| **Dual path** | Closeout (training-ref) + near-catastrophe (recommendation-stub) same tick → training enqueued; only stub recommendation gets action record |
| **Academy gating** | `academyTier >= 1` required (parity with slice 13 threat-assessment enqueue gate) |
| **Forbidden tokens** | Franchise/source-literal and branded object numbers in id, label, or stub suffix drop the action record |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `postIncidentReviewRecommendationActionRecords` on `GameState`   | Mirror UI changes                             |
| `applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick`  | Follow-on qualification rules (slice 7)       |
| `sanitizePostIncidentReviewRecommendationActionRecords` + `runTransfer` | SPE-1097 authority checks              |
| Wire in `advanceWeek` after recommendation registry tick           | SPE-1310 lifecycle                            |
| Domain unit + integration tests                                  | Full SPE-868 parent closure                   |
| Slice doc (this file) + backlog handoff on ship                    | Full retrospective action engine              |

## Acceptance

- [x] Near-catastrophe review → one `action:<suffix>` registry entry linked to recommendation
- [x] Re-advance idempotent; training-ref closeout skips recommendation action
- [x] Dual-path same tick enqueues training but only appends stub recommendation action
- [x] Academy tier 0 skips action materialization while recommendation records still persist
- [x] Forbidden stub suffix tokens drop action records
- [x] Slice 13/14/16 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewRecommendationActionRegistry.ts`, `src/domain/postIncidentReviewFollowOnRecommendationAction.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Tests  | `src/test/postIncidentReviewFollowOnRecommendationAction.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-17.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Recommendation action planning mirror UI | SPE-868 follow-up | Action persistence + advance hook only this slice |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of action-wire boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Action stub slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-16.md`
- `planning/post-incident-review-registry-slice-14.md`
- `planning/post-incident-review-registry-slice-13.md`
