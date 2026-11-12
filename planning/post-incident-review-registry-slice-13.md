# SPE-868 — Post-incident follow-on training queue enqueue (slice 13)

One-page implementation plan. Linear: child [SPE-2382](https://linear.app/spectranoir/issue/SPE-2382) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 12 (`planning/post-incident-review-registry-slice-12.md`, PR #2630 / [SPE-2381](https://linear.app/spectranoir/issue/SPE-2381)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2382 — Post-incident follow-on training queue enqueue (slice 13)](https://linear.app/spectranoir/issue/SPE-2382) |
| **Status** | **Shipped** — PR #2632 @ merge                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-follow-on-training-enqueue-slice-13`                                                       |
| **Base `main` SHA** | `210d70c1`                                                                                          |

## Goal

When orchestration-created reviews materialize with catalog-valid `follow_on:training-ref:` tokens, enqueue one agent training program via the existing `queueTraining` path — domain-only; mirrors slice 10 artifact hook + slice 11/12 report note projection.

## Prerequisite (on `main` @ `210d70c1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Follow-on artifact hook | `applyWeeklyPostIncidentReviewFollowOnArtifactTick` slice 10 (SPE-2379) |
| Follow-on report notes | `buildWeeklyPostIncidentReviewFollowOnReportNotes` slice 11/12 (SPE-2380 / SPE-2381) |

## Training enqueue contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger** | Review ref absent from prior map, present after follow-on tick with catalog-valid training-ref token |
| **Path** | Existing `queueTraining` + `assessAgentTrainingQueue` — no parallel enqueue system |
| **Agent pick** | Linked case assigned-team members (stable id sort), else first eligible active agent globally |
| **Stub exclusion** | Starting-state stub registry entries and recommendation-stub tokens skip enqueue |
| **Idempotency** | Re-advance is a no-op when review ref already in prior map |
| **Dual path cap** | Closeout + near-catastrophe same tick → at most one enqueue (near-catastrophe uses recommendation stub by default) |
| **Catalog validation** | Unknown training ids are ignored |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick`       | `PostIncidentReviewRecord` schema changes     |
| Wire in `advanceWeek` after follow-on artifact tick              | Mirror UI changes                             |
| Domain unit + integration tests                                  | Follow-on qualification rules (slice 7)       |
| Slice doc (this file) + backlog handoff on ship                  | Recommendation record registry persistence    |
|                                                                  | SPE-1310 lifecycle                            |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Qualifying internal_command review → one `threat-assessment` queue entry
- [x] Re-advance idempotent; stub registry unchanged; recommendation-stub path skips enqueue
- [x] `advanceWeek` recurrence closeout + qualifying case closeout integration expectations
- [x] Slice 10/11/12 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewFollowOnTrainingEnqueue.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/postIncidentReviewFollowOnTrainingEnqueue.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-13.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Recommendation record registry persistence | SPE-868 follow-up | Bounded token in review `unknownFields` only |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of training-enqueue boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Training enqueue slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-12.md`
- `planning/post-incident-review-registry-slice-10.md`
