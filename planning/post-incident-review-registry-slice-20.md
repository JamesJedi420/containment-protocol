# SPE-868 — Milestone timing capture beyond reportingWeek (slice 20)

One-page implementation plan. Linear: child [SPE-2389](https://linear.app/spectranoir/issue/SPE-2389) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 19 (`planning/post-incident-review-registry-slice-19.md`, PR #2644 / [SPE-2388](https://linear.app/spectranoir/issue/SPE-2388)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2389 — Milestone timing capture beyond reportingWeek (slice 20)](https://linear.app/spectranoir/issue/SPE-2389) |
| **Status** | **Shipped** — PR #2646 @ `8cfe85bc`                                                                      |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-milestone-timing-capture-slice-20`                                                         |
| **Base `main` SHA** | `bb40af3c`                                                                                          |

## Goal

Extend qualifying review records with distinct milestone intervals (discovery / response / containment / recovery / reporting) on the deterministic creation-tick path — domain schema + creation tick only.

## Prerequisite (on `main` @ `bb40af3c`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Qualifying incident creation tick | `applyWeeklyPostIncidentReviewCreationTick` slice 7 (SPE-2376) |
| Near-catastrophe fixture | `advanceWeek.postIncidentReview.integration.test.ts` slice 9 (SPE-2378) |
| `milestoneTimings` schema | `PostIncidentMilestoneTimings` on `postIncidentReviewRegistry` slice 5 |
| `reportingWeek` on creation | Private builders in orchestration (pre-slice-20) |

## Milestone derivation contract (this slice)

| Profile | Milestones captured | Use |
| --- | --- | --- |
| `cycle_closeout` | discovery, response, containment, recovery, reporting | Recurrence cycle closeout refs |
| `case_closeout` | discovery, response, containment, reporting | Qualifying case resolved |
| `near_catastrophe` | discovery, response, reporting | Near-catastrophe threshold |
| `reporting_only` | reporting | Generic closeout stub when lifecycle unknown |

| Rule | Detail |
| --- | --- |
| **Anchor week** | `anchorWeek` from draft or `lastOccurrenceWeek`; normalized to `max(1, trunc(week))`. |
| **Partial data** | Profiles omit milestones when incident lifecycle lacks full events (no recovery on case closeout; no containment/recovery on near-catastrophe). |
| **Registry API** | `derivePostIncidentMilestoneTimings(profile, anchorWeek)` exported from `postIncidentReviewRegistry.ts`. |
| **Creation tick** | Orchestration imports registry derivation; no duplicate private builders. |
| **Idempotency** | Re-advance same week does not mutate milestone timings on existing records. |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `derivePostIncidentMilestoneTimings` + profile union on registry | Mirror UI changes                             |
| Orchestration uses registry derivation                           | Action engine / recommendation tick           |
| Domain unit tests for milestone profiles                         | SPE-1097 authority checks                     |
| One `advanceWeek` integration case (qualifying case closeout)    | SPE-1310 parent closure                       |
| Slice doc (this file) + backlog handoff on ship                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Registry exports deterministic milestone derivation for cycle closeout, case closeout, and near-catastrophe profiles
- [x] Creation tick uses registry derivation (no duplicate private builders)
- [x] Domain unit tests cover all three profiles + partial-milestone edge cases
- [x] `advanceWeek` integration asserts full milestone intervals on qualifying case closeout path
- [x] Re-advance idempotent; slice 7/9 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewRegistry.ts`, `src/domain/postIncidentReviewWeeklyOrchestration.ts` |
| Tests  | `src/test/postIncidentReviewRegistry.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-20.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of milestone boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine, compliance audit cycling, branching reward logic | SPE-868 | Milestone capture slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-9.md`
- `planning/post-incident-review-registry-slice-19.md`
