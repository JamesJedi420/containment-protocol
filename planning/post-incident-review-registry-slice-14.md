# SPE-868 — Post-incident recommendation record registry persistence (slice 14)

One-page implementation plan. Linear: child [SPE-2383](https://linear.app/spectranoir/issue/SPE-2383) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 13 (`planning/post-incident-review-registry-slice-13.md`, PR #2632 / [SPE-2382](https://linear.app/spectranoir/issue/SPE-2382)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2383 — Post-incident recommendation record registry persistence (slice 14)](https://linear.app/spectranoir/issue/SPE-2383) |
| **Status** | **Shipped** — PR #2634 @ merge                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (do not re-close) |
| **Branch** | `spe-868-review-follow-on-recommendation-registry-slice-14`                                                |
| **Base `main` SHA** | `1d6066fd`                                                                                          |

## Goal

When orchestration-created reviews materialize with `follow_on:recommendation-stub:` tokens, persist one bounded recommendation record per review ref into `postIncidentReviewRecommendationRecords` on `GameState` — domain-only; mirrors slice 10 artifact hook + slice 13 materialization/idempotency pattern.

## Prerequisite (on `main` @ `1d6066fd`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Follow-on artifact hook | `applyWeeklyPostIncidentReviewFollowOnArtifactTick` slice 10 (SPE-2379) |
| Training enqueue     | `applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick` slice 13 (SPE-2382) |
| Review persistence   | `postIncidentReviewRecords` slice 2 (SPE-2371)                         |

## Recommendation registry contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger** | Review ref absent from prior map, present after follow-on tick with recommendation-stub token |
| **Record id** | `recommendation:<stub-suffix>` derived from token |
| **Training exclusion** | `follow_on:training-ref:` tokens skip registry append |
| **Stub exclusion** | Starting-state stub registry entries without orchestration token are untouched |
| **Idempotency** | Re-advance is a no-op when review ref already in prior map or recommendation id already persisted |
| **Dual path** | Closeout (training-ref) + near-catastrophe (recommendation-stub) same tick → only stub path appends |
| **Forbidden tokens** | Franchise/source-literal and branded object numbers in id, label, or stub suffix drop the record |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `postIncidentReviewRecommendationRecords` on `GameState`         | Training enqueue path changes                 |
| `applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick` | Follow-on qualification rules (slice 7)      |
| `sanitizePostIncidentReviewRecommendationRecords` + `runTransfer` | Mirror UI changes                             |
| Wire in `advanceWeek` after follow-on artifact tick              | New report note types                         |
| Domain unit + integration tests                                  | SPE-1310 lifecycle                            |
| Slice doc (this file) + backlog handoff on ship                  | SPE-868 parent closure                        |

## Acceptance

- [x] Near-catastrophe review → one `recommendation:<suffix>` registry entry
- [x] Re-advance idempotent; stub registry unchanged; training-ref path skips recommendation append
- [x] `advanceWeek` near-catastrophe + recurrence closeout integration expectations
- [x] Slice 10/11/12/13 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewRecommendationRegistry.ts`, `src/domain/postIncidentReviewFollowOnRecommendationRegistry.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Tests  | `src/test/postIncidentReviewFollowOnRecommendationRegistry.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-14.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Recommendation registry planning mirror UI | SPE-868 follow-up | Persistence + advance hook only this slice |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of recommendation-registry boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Recommendation persistence slice only |

## See also

- `planning/post-incident-review-registry-slice-13.md`
- `planning/post-incident-review-registry-slice-10.md`
