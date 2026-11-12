# SPE-868 — Post-incident review mirror milestone label integration (slice 22)

One-page implementation plan. Linear: child [SPE-2391](https://linear.app/spectranoir/issue/SPE-2391) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 21 (`planning/post-incident-review-registry-slice-21.md`, PR #2648 / [SPE-2390](https://linear.app/spectranoir/issue/SPE-2390)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2391 — Post-incident review mirror milestone label integration (slice 22)](https://linear.app/spectranoir/issue/SPE-2391) |
| **Status** | **Shipped** — PR #2651 @ `bf234197`                                                                      |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-review-milestone-mirror-slice-22`                                                                 |
| **Base `main` SHA** | `3d01d429`                                                                                          |

## Goal

Extend `advanceWeek.postIncidentReview.integration.test.ts` to assert mirror milestone week labels and span on case closeout (slice 7), cycle-4 closeout (slice 4), and near-catastrophe (slice 9) paths via `getPostIncidentReviewMirrorView`.

## Prerequisite (on `main` @ `3d01d429`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Full milestoneTimings on records | slice 21 (SPE-2390)                                              |
| Qualifying mirror surfacing | slice 8 (SPE-2377)                                                |
| Milestone span derivation | `projectPostIncidentReviewSummary` in registry                    |
| Mirror label wiring | `formatMilestoneWeek`, `formatMilestoneSpanWeeks` in mirror view |

## Integration contract (this slice)

| Path | Mirror row | Labels asserted |
| --- | --- | --- |
| Case closeout (slice 7 fixture) | `qualifyingIncidentRecords[0]` | discovery, response, containment, reporting; recovery `—`; span |
| Cycle-4 closeout (slice 4 fixture) | `records` find `review:cycle-4-closeout` | all five milestones + span |
| Near-catastrophe (slice 9 fixture) | `qualifyingIncidentRecords[0]` | discovery, response, reporting; containment/recovery `—`; span |

| Rule | Detail |
| --- | --- |
| **Assertion shape** | `expect(record?.discoveryWeekLabel).toBe('W…')` etc. aligned with `derivePostIncidentMilestoneTimings` + `projectPostIncidentReviewSummary` |
| **Partial profiles** | Near-catastrophe omits containment/recovery labels (`—`); case closeout omits recovery |
| **Idempotency** | Existing re-advance tests unchanged |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Three integration assertion blocks in existing slice 4/7/9 tests | Domain derivation logic changes               |
| Slice doc (this file) + backlog handoff on ship                  | Mirror or domain code changes                 |
|                                                                  | Action/recommendation ticks                   |
|                                                                  | SPE-1097 authority checks                     |
|                                                                  | SPE-1310 parent closure                       |
|                                                                  | Full SPE-868 parent closure                   |

## Acceptance

- [x] Case closeout path asserts milestone mirror labels via `getPostIncidentReviewMirrorView`
- [x] Cycle-4 closeout path asserts milestone mirror labels via `getPostIncidentReviewMirrorView`
- [x] Near-catastrophe path asserts partial milestone mirror labels (containment/recovery `—`)
- [x] Slice 21 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Tests  | `src/test/advanceWeek.postIncidentReview.integration.test.ts`         |
| Plan   | `planning/post-incident-review-registry-slice-22.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Redacted milestoneTimings em-dash label integration | follow-up slice | Out of slice 22 boundary (no redaction fixtures in 4/7/9 paths) |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of milestone mirror boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Integration assertion slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-4.md`
- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-9.md`
- `planning/post-incident-review-registry-slice-21.md`
