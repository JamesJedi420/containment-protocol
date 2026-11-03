# SPE-868 — Near-catastrophe + cycle closeout milestone integration (slice 21)

One-page implementation plan. Linear: child [SPE-2390](https://linear.app/spectranoir/issue/SPE-2390) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 20 (`planning/post-incident-review-registry-slice-20.md`, PR #2646 / [SPE-2389](https://linear.app/spectranoir/issue/SPE-2389)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2390 — Near-catastrophe + cycle closeout milestone integration (slice 21)](https://linear.app/spectranoir/issue/SPE-2390) |
| **Status** | **Shipped** — PR #2648 @ `8e0d0207`                                                                      |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-milestone-integration-slice-21`                                                            |
| **Base `main` SHA** | `1c0bb3cf`                                                                                          |

## Goal

Extend `advanceWeek.postIncidentReview.integration.test.ts` to assert full `milestoneTimings` on near-catastrophe (slice 9 fixture) and cycle-4 closeout (slice 4 fixture) paths via `derivePostIncidentMilestoneTimings`.

## Prerequisite (on `main` @ `1c0bb3cf`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Milestone derivation | `derivePostIncidentMilestoneTimings` slice 20 (SPE-2389)               |
| Case closeout integration | `advanceWeek.postIncidentReview.integration.test.ts` slice 7 (SPE-2376) |
| Cycle closeout integration | `advanceWeek.postIncidentReview.integration.test.ts` slice 4 (SPE-2373) |
| Near-catastrophe integration | `advanceWeek.postIncidentReview.integration.test.ts` slice 9 (SPE-2378) |

## Integration contract (this slice)

| Path | Profile | Milestones asserted |
| --- | --- | --- |
| Cycle-4 closeout (slice 4 fixture) | `cycle_closeout` | discovery, response, containment, recovery, reporting |
| Near-catastrophe (slice 9 fixture) | `near_catastrophe` | discovery, response, reporting |

| Rule | Detail |
| --- | --- |
| **Assertion shape** | `expect(created?.milestoneTimings).toEqual(derivePostIncidentMilestoneTimings(profile, nextState.week))` |
| **Anchor week** | `nextState.week` after `advanceWeek` (week-1 anchor clamping handled by registry derivation) |
| **Partial profiles** | Near-catastrophe omits containment/recovery; cycle closeout captures all five milestones |
| **Idempotency** | Existing re-advance tests unchanged; milestone timings not mutated on re-advance |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Two integration assertions in existing slice 4/9 tests           | Domain derivation logic changes               |
| Slice doc (this file) + backlog handoff on ship                  | Mirror UI changes                             |
|                                                                  | Action/recommendation ticks                   |
|                                                                  | SPE-1097 authority checks                     |
|                                                                  | SPE-1310 parent closure                       |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Cycle-4 closeout path asserts full 5-milestone profile via registry derivation
- [x] Near-catastrophe path asserts full 3-milestone profile via registry derivation
- [x] Slice 20/7/9 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`         |
| Plan   | `planning/post-incident-review-registry-slice-21.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of milestone boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine, compliance audit cycling, branching reward logic | SPE-868 | Integration assertion slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-4.md`
- `planning/post-incident-review-registry-slice-9.md`
- `planning/post-incident-review-registry-slice-20.md`
