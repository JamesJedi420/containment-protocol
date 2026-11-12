# SPE-868 — Post-incident review redacted milestoneTimings mirror label integration (slice 23)

One-page implementation plan. Linear: child [SPE-2392](https://linear.app/spectranoir/issue/SPE-2392) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 22 (`planning/post-incident-review-registry-slice-22.md`, PR #2651 / [SPE-2391](https://linear.app/spectranoir/issue/SPE-2391)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2392 — Post-incident review redacted milestoneTimings mirror label integration (slice 23)](https://linear.app/spectranoir/issue/SPE-2392) |
| **Status** | **Shipped** — PR #2653 @ `24eb391a`                                                                                            |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-milestone-redaction-mirror-slice-23`                                                       |
| **Base `main` SHA** | `46214587`                                                                                          |

## Goal

Extend integration or mirror unit tests to assert em-dash milestone labels when `redactedFields` includes `milestoneTimings` on a qualifying advanceWeek path (or mirror unit fixture).

## Prerequisite (on `main` @ `46214587`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Milestone mirror label integration | slice 22 (SPE-2391)                                            |
| Mirror redaction legibility gaps | slice 3 (SPE-2372) — partial milestone redaction test          |
| Redaction policy | `projectPostIncidentReviewSummary` + `formatMilestoneWeek` gate |

## Test contract (this slice)

| Surface | Assertion |
| --- | --- |
| Mirror unit fixture | Full `RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE` with `redactedFields: ['milestoneTimings']` → all five milestone week labels + span `—` |
| Partial profile contrast | Near-catastrophe partial timings without redaction → mix of `W…` and `—`; redacted full profile → all `—` and `redacted: true` |
| Cycle-4 advanceWeek path | Post-advance record with injected `milestoneTimings` redaction → mirror em-dash labels |

| Rule | Detail |
| --- | --- |
| **Redaction vs missing** | Redaction hides populated milestone weeks; partial profiles show `—` only for undefined fields |
| **Span** | `milestoneSpanWeeksLabel` also `—` when projection redacts milestone span |
| **No code changes** | Mirror and domain behavior already correct from slice 3 |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Mirror unit + integration redaction label assertions             | Domain derivation logic changes               |
| Slice doc (this file) + backlog handoff on ship                  | Mirror or domain code changes                 |
|                                                                  | Action/recommendation ticks                   |
|                                                                  | SPE-1097 authority checks                     |
|                                                                  | SPE-1310 parent closure                       |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Redacted `milestoneTimings` mirror labels assert em-dash on unit fixture and cycle-4 path
- [x] Span label redacts when `milestoneTimings` redacted
- [x] Redacted full profile distinguished from partial missing-milestone profile
- [x] Slice 22 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/features/operations/postIncidentReviewMirrorView.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-23.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of milestone mirror boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration assertion slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-3.md`
- `planning/post-incident-review-registry-slice-22.md`
