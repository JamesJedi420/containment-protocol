# SPE-868 — Near-catastrophe advanceWeek mirror integration (slice 9)

One-page implementation plan. Linear: child [SPE-2378](https://linear.app/spectranoir/issue/SPE-2378) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 8 (`planning/post-incident-review-registry-slice-8.md`, PR #2622 / [SPE-2377](https://linear.app/spectranoir/issue/SPE-2377)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2378 — Near-catastrophe advanceWeek mirror integration (slice 9)](https://linear.app/spectranoir/issue/SPE-2378) |
| **Status** | **Shipped** — PR #2624 @ merge                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-near-catastrophe-mirror-integration-slice-9`                                                      |
| **Base `main` SHA** | `60d1f40f`                                                                                          |

## Goal

Extend `advanceWeek.postIncidentReview.integration.test.ts` to assert orchestration-created `review:near-catastrophe-*` records and mirror `qualifyingNearCatastropheCount` after qualifying escalation/raid conversion through the real weekly sim path.

## Prerequisite (on `main` @ `60d1f40f`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Qualifying creation hook | `applyWeeklyPostIncidentReviewCreationTick` slice 7 (SPE-2376 / PR #2620) |
| Mirror qualifying surfacing | `getPostIncidentReviewMirrorView` slice 8 (SPE-2377 / PR #2622)     |
| Resolved-case integration | `advanceWeek.postIncidentReview.integration.test.ts` slice 7/8       |

## Integration contract (this slice)

| Rule | Detail |
| --- | --- |
| **Trigger path** | Open unassigned case with `deadlineRemaining: 1` crosses near-catastrophe band via deadline escalation (often raid conversion on starter templates) |
| **Record ref** | `review:near-catastrophe-{caseId}` with `orchestration_week:<week>` |
| **Mirror group** | `qualifying_near_catastrophe` source group; `qualifyingNearCatastropheCount` increments |
| **Precedence** | Resolved closeout wins over near-catastrophe same week (slice 7 test asserts zero near-catastrophe when closeout exists) |
| **Non-qualifying escalation** | Low stage-delta escalation must not materialize near-catastrophe review |
| **Ordering** | Byte-stable `id` sort on qualifying incident mirror rows |
| **Idempotency** | Re-advance same week does not duplicate near-catastrophe record |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Near-catastrophe integration cases + mirror assertions           | Weekly orchestration qualification rules      |
| Direct-tick parity test for escalation week                      | Domain schema expansion                       |
| Slice 7 closeout test tightened (`qualifyingNearCatastropheCount === 0`) | Mirror UI changes unless test gaps found |
| Slice doc (this file) + backlog handoff on ship                  | SPE-1310 lifecycle                            |
|                                                                  | Full SPE-868 parent closure                   |
|                                                                  | Catastrophe mirror page changes               |

## Acceptance

- [x] Deadline escalation crossing threshold materializes `review:near-catastrophe-*` via `advanceWeek`
- [x] Mirror view reports `qualifyingNearCatastropheCount` and near-catastrophe source labels
- [x] Non-qualifying escalation does not create review
- [x] Re-advance idempotent; dual-case byte-stable ordering asserted
- [x] Direct review tick parity for escalation week
- [x] Slice 4/7/8 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`       |
| Plan   | `planning/post-incident-review-registry-slice-9.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of integration-test boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration closure slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-8.md`
