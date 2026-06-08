# SPE-868 — Weekly post-incident follow-on report notes (slice 11)

One-page implementation plan. Linear: child [SPE-2380](https://linear.app/spectranoir/issue/SPE-2380) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 10 (`planning/post-incident-review-registry-slice-10.md`, PR #2626 / [SPE-2379](https://linear.app/spectranoir/issue/SPE-2379)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2380 — Weekly post-incident follow-on report notes (slice 11)](https://linear.app/spectranoir/issue/SPE-2380) |
| **Status** | **Shipped** — PR #2628 @ merge                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-follow-on-report-notes-slice-11`                                                           |
| **Base `main` SHA** | `cea7de00`                                                                                          |

## Goal

Project newly appended follow-on artifact tokens into deterministic weekly report notes when orchestration-created reviews materialize this tick — domain-only; mirrors `buildWeeklyIntakeVerificationReportNotes` (SPE-854 slice 7).

## Prerequisite (on `main` @ `cea7de00`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Follow-on artifact hook | `applyWeeklyPostIncidentReviewFollowOnArtifactTick` slice 10 (SPE-2379 / PR #2626) |
| Qualifying creation + near-catastrophe integration | `advanceWeek.postIncidentReview.integration.test.ts` slices 7–10 |

## Report note contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger** | Review ref absent from prior map, present after follow-on tick with follow-on token in `unknownFields` |
| **Content** | `Post-incident follow-on — {label}: training reference ({catalog-id})` or `recommendation stub ({suffix})` |
| **Idempotency** | Re-advance is a no-op when review ref already in prior map |
| **Stub exclusion** | Starting-state stub registry entries emit no notes |
| **Dual path cap** | Closeout + near-catastrophe same tick → at most two notes |
| **Type** | `system.week_delta` with bounded metadata (no dedicated UI bucket this slice) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `buildWeeklyPostIncidentReviewFollowOnReportNotes` + token parsing | `PostIncidentReviewRecord` schema changes     |
| Wire in `advanceWeek` immediately after follow-on artifact tick  | Mirror UI changes                             |
| Domain unit + integration tests                                  | Orchestration qualification rules (slice 7)   |
| Slice doc (this file) + backlog handoff on ship                  | Actual training queue enqueue                 |
|                                                                  | SPE-1310 lifecycle                            |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Qualifying draft → one follow-on report note with training-ref content
- [x] Near-catastrophe path → recommendation-stub note content
- [x] `advanceWeek` recurrence closeout path surfaces follow-on note
- [x] Re-advance idempotent; stub registry unchanged; non-qualifying negative case
- [x] Slice 4/7/8/9/10 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewFollowOnWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/postIncidentReviewFollowOnWeeklyReportNotes.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-11.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Dedicated `post_incident_review.follow_on` report note type + UI bucket | SPE-868 follow-up | Slice 11 uses `system.week_delta` like intake slice 7 pre–slice 8 |
| Actual training queue enqueue from follow-on refs | SPE-868 follow-up | Reference stub only slice 10 |
| Recommendation record registry persistence | SPE-868 follow-up | Bounded token in review `unknownFields` only |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of report-note boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Follow-on report notes slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-10.md`
- `planning/information-intake-weekly-hook-slice-7.md`
