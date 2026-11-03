# SPE-868 — Post-incident review redacted score mirror labels on qualifying advanceWeek paths (slice 25)

One-page implementation plan. Linear: child [SPE-2394](https://linear.app/spectranoir/issue/SPE-2394) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 24 (`planning/post-incident-review-registry-slice-24.md`, PR #2655 / [SPE-2393](https://linear.app/spectranoir/issue/SPE-2393)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2394 — Post-incident review redacted score mirror labels on qualifying advanceWeek paths (slice 25)](https://linear.app/spectranoir/issue/SPE-2394) |
| **Status** | **Shipped** — SPE-2394 / PR #2657 @ `1890f37b`                                                                  |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-redaction-mirror-slice-25`                                                                 |
| **Base `main` SHA** | `ca9c704c`                                                                                          |

## Goal

Extend integration tests to assert em-dash score labels when `redactedFields` includes `procedureAdherenceScore` and/or `confidence` on qualifying case-closeout (slice 7), near-catastrophe (slice 9), and dual-path closeout+near-catastrophe advanceWeek fixtures.

## Prerequisite (on `main` @ `ca9c704c`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Milestone redaction integration | slice 24 (SPE-2393)                                            |
| Qualifying case closeout integration | slice 7 (SPE-2376)                                       |
| Near-catastrophe integration | slice 9 (SPE-2378)                                             |
| Dual-path fixture | `makeDualPathCloseoutAndNearCatastropheState` (slices 14/17/19) |
| Score redaction unit fixture | slice 3 (SPE-2372) — stub `procedureAdherenceScore` + `confidence` |
| Redaction policy | `projectPostIncidentReviewSummary` score resolve gates |

## Test contract (this slice)

| Surface | Assertion |
| --- | --- |
| Qualifying case closeout path | Post-advance `review:case-case-001-closeout` with injected `redactedFields: ['procedureAdherenceScore', 'confidence']` → both score labels `—`; contrast populated labels before injection |
| Near-catastrophe path | Post-advance `review:near-catastrophe-case-001` with injected redaction → score labels `—`; milestone labels remain visible (partial redaction profile) |
| Dual-path week | `makeDualPathCloseoutAndNearCatastropheState` → inject redaction on both qualifying rows → each row scores `—` independently; re-advance does not duplicate rows |
| Helper | New `expectRedactedScoreMirrorLabels` (or extend existing helpers) in integration file |

| Rule | Detail |
| --- | --- |
| **Redaction vs missing** | Redaction hides populated orchestration scores (0.68/0.72 closeout, 0.55/0.61 near-catastrophe); partial redaction leaves milestone labels visible |
| **Span / milestones** | Out of scope — covered by slices 23–24 |
| **No code changes** | Mirror and domain behavior already correct from slice 3 unless tests expose a bug |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Integration redaction score label assertions on slices 7 + 9 paths | Domain derivation logic changes               |
| Dual-path score redaction integration assertion                  | Mirror or domain code changes                 |
| Slice doc (this file) + backlog handoff on ship                  | Action/recommendation ticks                   |
|                                                                  | SPE-1097 authority checks                     |
|                                                                  | SPE-1310 parent closure                       |
|                                                                  | Full SPE-868 parent closure                   |
|                                                                  | Audit-cycle recurrence hooks (slice 26)       |

## Acceptance

- [x] Redacted `procedureAdherenceScore` + `confidence` mirror labels on qualifying case-closeout advanceWeek path
- [x] Redacted score mirror labels on near-catastrophe advanceWeek path (milestones remain legible under partial profile)
- [x] Dual-path week redacts scores on both qualifying rows without row duplication on re-advance
- [x] Slice 22/23/24 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`         |
| Plan   | `planning/post-incident-review-registry-slice-25.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Audit-cycle recurrence / compliance adequacy hooks | SPE-868 slice 26+ | Next parent-acceptance slice; out of score redaction boundary |
| Authority-route redaction (SPE-1097) | SPE-1097 | Out of mirror score boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration assertion slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-24.md`
- `planning/post-incident-review-registry-slice-3.md`
- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-9.md`
