# SPE-868 — Audit-cycle recurrence / compliance adequacy mirror labels on qualifying advanceWeek paths (slice 26)

One-page implementation plan. Linear: child [SPE-2395](https://linear.app/spectranoir/issue/SPE-2395) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 25 (`planning/post-incident-review-registry-slice-25.md`, PR #2657 / [SPE-2394](https://linear.app/spectranoir/issue/SPE-2394)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2395 — Audit-cycle recurrence / compliance adequacy mirror labels on qualifying advanceWeek paths (slice 26)](https://linear.app/spectranoir/issue/SPE-2395) |
| **Status** | **Shipped** — SPE-2395 / PR #2659 @ `3bf776ea`                                                                  |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-audit-cycle-recurrence-slice-26`                                                                  |
| **Base `main` SHA** | `3f05ac58`                                                                                          |

## Goal

Extend integration tests to assert `recurrenceObservedLabel`, `reviewRouteLabel`, and `closureOutcomeLabel` (plus summary recurrence/audit-route counts) on qualifying cycle-4 closeout (slice 4), case closeout (slice 7), near-catastrophe (slice 9), and dual-path advanceWeek fixtures.

## Prerequisite (on `main` @ `3f05ac58`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Redacted score integration | slice 25 (SPE-2394)                                              |
| Qualifying case closeout integration | slice 7 (SPE-2376)                                       |
| Near-catastrophe integration | slice 9 (SPE-2378)                                             |
| Cycle-4 closeout integration | slice 4 (SPE-2373)                                             |
| Dual-path fixture | `makeDualPathCloseoutAndNearCatastropheState` (slices 14/17/19) |
| Recurrence/compliance projection | `projectPostIncidentReviewSummary` resolve gates               |
| Mirror label wiring | `formatRecurrenceObserved`, `formatPostIncidentReviewEnumLabel` |

## Test contract (this slice)

| Surface | Assertion |
| --- | --- |
| Cycle-4 closeout path | Post-advance `review:cycle-4-closeout` → `recurrenceObservedLabel` `Yes`; `reviewRouteLabel` `Internal Command`; `closureOutcomeLabel` `Contained`; summary `recurrenceObservedCount` includes stub + orchestration rows |
| Qualifying case closeout path | Post-advance `review:case-case-001-closeout` → `No` / `Internal Command` / `Contained`; summary counts reflect no external-audit route |
| Near-catastrophe path | Post-advance `review:near-catastrophe-case-001` → `No` / `External Audit` / `Administratively Cleared`; summary `externalAuditRouteCount` `1` |
| Redaction | Inject `redactedFields: ['recurrenceObserved']` → label `—`; contrast populated `Yes`/`No` before injection |
| Dual-path week | `makeDualPathCloseoutAndNearCatastropheState` → each qualifying row carries independent recurrence/compliance labels; re-advance does not duplicate rows |

| Rule | Detail |
| --- | --- |
| **Recurrence vs missing** | Populated boolean renders `Yes`/`No`; redaction hides populated values as `—` |
| **Compliance adequacy** | Near-catastrophe external-audit route + administratively cleared outcome mirror on advanceWeek path |
| **Summary counts** | Include seeded `POST_INCIDENT_REVIEW_STUB_REGISTRY` baseline (`recurrenceObservedCount` 1, `externalAuditRouteCount` 1) before orchestration deltas |
| **No code changes** | Mirror and domain behavior already correct from slices 3–7 unless tests expose a bug |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Integration recurrence/compliance mirror label assertions on slices 4 + 7 + 9 | Domain derivation logic changes               |
| Dual-path recurrence/compliance integration assertion              | Mirror or domain code changes                 |
| Slice doc (this file) + backlog handoff on ship                  | Action/recommendation ticks                   |
|                                                                  | SPE-1097 authority checks                     |
|                                                                  | SPE-1310 parent closure                       |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Cycle-4 closeout path asserts recurrence observed + compliance route/outcome mirror labels
- [x] Qualifying case closeout path asserts recurrence/compliance mirror labels
- [x] Near-catastrophe path asserts external-audit compliance adequacy mirror labels
- [x] Redacted `recurrenceObserved` renders em-dash with contrast vs populated labels
- [x] Dual-path week asserts independent recurrence/compliance labels per row
- [x] Slice 22–25 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`         |
| Plan   | `planning/post-incident-review-registry-slice-26.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Authority-route redaction (SPE-1097) | SPE-1097 | Out of recurrence/compliance mirror boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration assertion slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-25.md`
- `planning/post-incident-review-registry-slice-4.md`
- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-9.md`
