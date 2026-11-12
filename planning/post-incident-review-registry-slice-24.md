# SPE-868 — Post-incident review redacted milestoneTimings mirror labels on qualifying advanceWeek paths (slice 24)

One-page implementation plan. Linear: child [SPE-2393](https://linear.app/spectranoir/issue/SPE-2393) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 23 (`planning/post-incident-review-registry-slice-23.md`, PR #2653 / [SPE-2392](https://linear.app/spectranoir/issue/SPE-2392)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2393 — Post-incident review redacted milestoneTimings mirror labels on qualifying advanceWeek paths (slice 24)](https://linear.app/spectranoir/issue/SPE-2393) |
| **Status** | **Shipped** — PR #2655 @ `9f236401`                                                                                            |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-milestone-redaction-mirror-slice-24`                                                       |
| **Base `main` SHA** | `c9c2355d`                                                                                          |

## Goal

Extend integration tests to assert em-dash milestone labels when `redactedFields` includes `milestoneTimings` on qualifying case-closeout (slice 7) and near-catastrophe (slice 9) advanceWeek paths.

## Prerequisite (on `main` @ `c9c2355d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cycle-4 redaction integration | slice 23 (SPE-2392)                                            |
| Qualifying case closeout integration | slice 7 (SPE-2376)                                       |
| Near-catastrophe integration | slice 9 (SPE-2378)                                             |
| Partial vs full redaction contrast | slice 23 unit fixture                                        |

## Test contract (this slice)

| Surface | Assertion |
| --- | --- |
| Qualifying case closeout path | Post-advance `review:case-case-001-closeout` with injected `redactedFields: ['milestoneTimings']` → all five milestone week labels + span `—` |
| Near-catastrophe path | Post-advance `review:near-catastrophe-case-001` with injected redaction → all `—`; contrast partial profile (populated `W…` + missing `—`) before redaction |
| Helper reuse | `expectRedactedMilestoneMirrorLabels` from slice 23 integration file |

| Rule | Detail |
| --- | --- |
| **Redaction vs missing** | Redaction hides populated milestone weeks; near-catastrophe partial timings show `—` only for undefined fields without redaction |
| **Span** | `milestoneSpanWeeksLabel` also `—` when projection redacts milestone span |
| **No code changes** | Mirror and domain behavior already correct from slice 3/23 unless tests expose a bug |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Integration redaction label assertions on slices 7 + 9 paths       | Domain derivation logic changes               |
| Slice doc (this file) + backlog handoff on ship                  | Mirror or domain code changes                 |
|                                                                  | Action/recommendation ticks                   |
|                                                                  | SPE-1097 authority checks                     |
|                                                                  | SPE-1310 parent closure                       |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Redacted `milestoneTimings` mirror labels on qualifying case-closeout advanceWeek path
- [x] Redacted `milestoneTimings` mirror labels on near-catastrophe advanceWeek path (hides populated partial weeks)
- [x] Slice 22/23 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`         |
| Plan   | `planning/post-incident-review-registry-slice-24.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of milestone mirror boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration assertion slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-23.md`
- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-9.md`
