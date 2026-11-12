# SPE-868 — Post-incident review redacted reviewRoute/closureOutcome mirror labels on qualifying advanceWeek paths (slice 27)

One-page implementation plan. Linear: child [SPE-2396](https://linear.app/spectranoir/issue/SPE-2396) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 26 (`planning/post-incident-review-registry-slice-26.md`, PR #2659 / [SPE-2395](https://linear.app/spectranoir/issue/SPE-2395)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2396 — Post-incident review redacted reviewRoute/closureOutcome mirror labels on qualifying advanceWeek paths (slice 27)](https://linear.app/spectranoir/issue/SPE-2396) |
| **Status** | **Shipped** — SPE-2396 / PR #2661 @ `1fe6f323`                                                                  |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-route-redaction-slice-27`                                                                  |
| **Base `main` SHA** | `829ce083`                                                                                          |

## Goal

Extend integration tests to assert em-dash `reviewRouteLabel` and `closureOutcomeLabel` when `redactedFields` includes `reviewRoute` and/or `closureOutcome` on qualifying case closeout (slice 7), near-catastrophe (slice 9), and dual-path advanceWeek fixtures.

## Prerequisite (on `main` @ `829ce083`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Recurrence/compliance integration | slice 26 (SPE-2395)                                              |
| Qualifying case closeout integration | slice 7 (SPE-2376)                                       |
| Near-catastrophe integration | slice 9 (SPE-2378)                                             |
| Dual-path fixture | `makeDualPathCloseoutAndNearCatastropheState` (slices 14/17/19) |
| Redaction contrast patterns | slices 23–26 helpers                                               |

## Test contract (this slice)

| Surface | Assertion |
| --- | --- |
| Qualifying case closeout path | Post-advance `review:case-case-001-closeout` with injected `redactedFields: ['reviewRoute', 'closureOutcome']` → both labels `—`; contrast populated `Internal Command` / `Contained` before injection |
| Near-catastrophe path | Post-advance `review:near-catastrophe-case-001` with injected redaction → route/outcome labels `—`; recurrence/score labels remain visible under partial profile |
| Dual-path week | `makeDualPathCloseoutAndNearCatastropheState` → inject redaction on both qualifying rows → each row route/outcome `—` independently; re-advance does not duplicate rows |
| Summary counts | Redacted `reviewRoute` excludes row from `externalAuditRouteCount`; stub baseline awareness unchanged |

| Rule | Detail |
| --- | --- |
| **Redaction vs missing** | Redaction hides populated route/outcome as `—`; invalid enum fallbacks remain out of slice unless tests expose a bug |
| **Partial redaction** | Redacting route/outcome leaves recurrence/score/milestone labels visible when not in `redactedFields` |
| **No scope creep** | Domain/mirror changes only if integration tests expose missing projection gates |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Integration reviewRoute/closureOutcome redaction mirror assertions on slices 7 + 9 | Action/recommendation ticks                   |
| Dual-path route/outcome redaction integration assertion            | SPE-1097 authority checks                     |
| Projection/mirror redaction gates if tests expose gap             | SPE-1310 parent closure                       |
| Slice doc (this file) + backlog handoff on ship                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Qualifying case closeout path asserts redacted reviewRoute/closureOutcome mirror labels with contrast
- [x] Near-catastrophe path asserts redacted route/outcome labels; partial profile leaves other labels legible
- [x] Dual-path week asserts independent route/outcome redaction per row without row duplication on re-advance
- [x] Slice 22–26 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewRegistry.ts` (if tests expose gap)    |
| Mirror | `src/features/operations/postIncidentReviewMirrorView.ts`, `recurrentCatastrophePostIncidentReviewLinksView.ts` (if needed) |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`         |
| Plan   | `planning/post-incident-review-registry-slice-27.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Authority-route redaction (SPE-1097) | SPE-1097 | Out of route/outcome mirror boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration assertion slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-26.md`
- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-9.md`
