# SPE-868 — Retrospective follow-on artifact hook (slice 10)

One-page implementation plan. Linear: child [SPE-2379](https://linear.app/spectranoir/issue/SPE-2379) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 9 (`planning/post-incident-review-registry-slice-9.md`, PR #2624 / [SPE-2378](https://linear.app/spectranoir/issue/SPE-2378)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2379 — Retrospective follow-on artifact hook (slice 10)](https://linear.app/spectranoir/issue/SPE-2379) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-follow-on-artifact-slice-10`                                                               |
| **Base `main` SHA** | `3193a843`                                                                                          |

## Goal

When a qualifying orchestration-created post-incident review record materializes, append one bounded follow-on artifact reference (training ref or recommendation stub) to the review record's existing `unknownFields` container — one artifact per review ref, idempotent re-tick.

## Prerequisite (on `main` @ `3193a843`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Qualifying creation hook | `applyWeeklyPostIncidentReviewCreationTick` slice 7 (SPE-2376 / PR #2620) |
| Mirror qualifying surfacing | `getPostIncidentReviewMirrorView` slice 8 (SPE-2377 / PR #2622)     |
| Near-catastrophe integration | `advanceWeek.postIncidentReview.integration.test.ts` slice 9 (SPE-2378 / PR #2624) |

## Follow-on artifact contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger** | Review ref absent from prior map and present after creation tick with `orchestration_week:<week>` token |
| **Container** | Existing `PostIncidentReviewRecord.unknownFields` — no new GameState fields |
| **Training ref** | `follow_on:training-ref:<catalog-id>` for `internal_command` routes |
| **Recommendation stub** | `follow_on:recommendation-stub:<review-ref-suffix>` for external/outside/reform routes |
| **One per review** | At most one follow-on token per review ref |
| **Idempotency** | Re-tick same week or re-run follow-on pass is a no-op when token already present |
| **Stub exclusion** | Starting-state `POST_INCIDENT_REVIEW_STUB_REGISTRY` entries without orchestration token are untouched |
| **Ordering** | Byte-stable `unknownFields` sort after append |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `applyWeeklyPostIncidentReviewFollowOnArtifactTick` + builders   | Orchestration qualification rules (slice 7)   |
| Wire in `advanceWeek` immediately after creation tick            | Mirror UI changes                             |
| Domain unit + integration tests                                  | Domain schema expansion beyond `unknownFields` |
| Slice doc (this file) + backlog handoff on ship                  | SPE-1310 lifecycle                            |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Qualifying draft → follow-on artifact appended once in `unknownFields`
- [x] `advanceWeek` path creates artifact alongside near-catastrophe or closeout review
- [x] Re-advance idempotent; stub registry reviews unchanged; non-qualifying negative case
- [x] Slice 4/7/8/9 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewFollowOnArtifact.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/postIncidentReviewFollowOnArtifact.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts`, `src/test/postIncidentReviewWeeklyOrchestration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-10.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Actual training queue enqueue from follow-on refs | SPE-868 follow-up | Reference stub only this slice |
| Recommendation record registry persistence | SPE-868 follow-up | Bounded token in review `unknownFields` only |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of follow-on hook boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Follow-on artifact hook slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-9.md`
