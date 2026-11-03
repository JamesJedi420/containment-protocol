# SPE-868 — Dedicated post-incident follow-on report note type (slice 12)

One-page implementation plan. Linear: child [SPE-2381](https://linear.app/spectranoir/issue/SPE-2381) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 11 (`planning/post-incident-review-registry-slice-11.md`, PR #2628 / [SPE-2380](https://linear.app/spectranoir/issue/SPE-2380)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2381 — Dedicated post-incident follow-on report note type (slice 12)](https://linear.app/spectranoir/issue/SPE-2381) |
| **Status** | **Shipped** — PR #2630 @ merge                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-follow-on-report-note-type-slice-12`                                                       |
| **Base `main` SHA** | `f8fab0bd`                                                                                          |

## Goal

Add dedicated `post_incident_review.follow_on` report note type with UI categorization bucket; switch weekly follow-on note builder from `system.week_delta`. Mirrors [SPE-2299](https://linear.app/spectranoir/issue/SPE-2299) / information-intake slice 8.

## Prerequisite (on `main` @ `f8fab0bd`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Follow-on report notes | `src/domain/postIncidentReviewFollowOnWeeklyReportNotes.ts` (SPE-2380 slice 11) |
| Follow-on artifact hook | `applyWeeklyPostIncidentReviewFollowOnArtifactTick` slice 10 (SPE-2379) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `ReportNoteType` union + audit registry                          | `PostIncidentReviewRecord` schema changes     |
| `runTransfer` hydration allowlist + metadata keys                | Follow-on qualification rules (slice 7)       |
| `reportNoteView` `post_incident_review` category bucket          | Mirror UI changes                             |
| Switch follow-on note builder from `system.week_delta`           | Orchestration tick order changes              |
| Unit + audit/view/integration note type expectations             | Actual training queue enqueue                 |
| Slice doc (this file) + backlog handoff on ship                  | SPE-1310 lifecycle                            |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Follow-on notes use `post_incident_review.follow_on` with bounded metadata
- [x] Audit registry, `REPORT_NOTE_TYPES`, and `reportNoteView` stay aligned (40 types)
- [x] `npm run test:run -- src/test/reportNoteTypeAudit.test.ts src/features/report/reportNoteView.test.ts src/test/postIncidentReviewFollowOnWeeklyReportNotes.test.ts src/test/advanceWeek.postIncidentReview.integration.test.ts` and `npm run lint` pass

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/models.ts`, `src/domain/postIncidentReviewFollowOnWeeklyReportNotes.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| UI     | `src/features/report/reportNoteView.ts`                               |
| Tests  | `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts`, `src/test/postIncidentReviewFollowOnWeeklyReportNotes.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-12.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Actual training queue enqueue from follow-on refs | SPE-868 follow-up | Reference stub only slice 10 |
| Recommendation record registry persistence | SPE-868 follow-up | Bounded token in review `unknownFields` only |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of report-note boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Follow-on type slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-11.md`
- `planning/information-intake-weekly-hook-slice-8.md`
