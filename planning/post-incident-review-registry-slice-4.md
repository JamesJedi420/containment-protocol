# SPE-868 — Post-incident review registry weekly retrospective creation hook (slice 4)

One-page implementation plan. Linear: child [SPE-2373](https://linear.app/spectranoir/issue/SPE-2373) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 3 (`planning/post-incident-review-registry-slice-3.md`, PR #2612 / [SPE-2372](https://linear.app/spectranoir/issue/SPE-2372)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2373 — Post-incident review registry weekly retrospective creation hook (slice 4)](https://linear.app/spectranoir/issue/SPE-2373) |
| **Status** | Ready for PR                                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-post-incident-review-weekly-hook-slice-4`                                                         |
| **Base `main` SHA** | `4a5cb838`                                                                                          |

## Goal

Wire persisted `postIncidentReviewRecords` into `advanceWeek` with a pure domain tick that deterministically creates qualifying `PostIncidentReviewRecord` entries when recurrent catastrophe orchestration conditions are met.

## Prerequisite (on `main` @ `4a5cb838`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/postIncidentReviewRegistry.ts` (SPE-868 slice 5 / PR #2608) |
| Persistence          | `postIncidentReviewRecords` on `GameState` (SPE-2371 / PR #2610)       |
| Planning mirror UI   | `postIncidentReviewMirrorView` (SPE-2372 / PR #2612)                   |
| Ref wire-up          | `recurrentCatastrophePostIncidentReviewLinks.ts` (SPE-2370)            |
| Recurrence weekly hook | `recurrentCatastropheWeeklyOrchestration.ts` (SPE-2364)              |

## Orchestration tick contract (slice 4)

| Step | Rule |
| --- | --- |
| **Trigger** | Recurrent catastrophe record is valid and `lastOccurrenceWeek === week` with `recurrenceCount > 0` (recurrence anchored this simulation week). |
| **Qualifying refs** | Non-empty `postIncidentReviewRefs` missing from the review map; franchise/branded tokens rejected. |
| **Cycle closeout match** | `review:cycle-{n}-closeout` only when `n === recurrenceCount`. |
| **Creation template** | Cycle closeout refs use milestone timings anchored to `lastOccurrenceWeek`; generic refs use minimal contained closeout stub. |
| **Idempotency** | Skip refs already present; append `orchestration_week:<week>` on created records; re-tick same week is a no-op. |
| **Hydrated truth** | Shallow-copy existing review entries unchanged; do not re-sanitize or mutate dropped invalid hydrated payloads. |
| **Validation gate** | Invalid post-creation candidate → skip ref without mutating map. |
| **Empty catastrophe map** | Return same review map reference without throw. |

### `unknownFields` token convention

- Format: `orchestration_week:<normalizedWeek>` (e.g. `orchestration_week:53`).
- Orchestration-only marker on newly created records.
- Sorted lexicographically with other `unknownFields` entries.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyPostIncidentReviewCreationTick` + builders             | Mirror UI changes                             |
| Call from `advanceWeek` after week increment + recurrence tick     | `sanitizePostIncidentReviewRecords` semantics |
| Targeted domain + `advanceWeek` integration tests                  | Slice 5 link API changes                        |
| Slice doc (this file) + backlog handoff on ship                    | Recurrent catastrophe weekly hook/mirror        |
|                                                                    | SPE-1310 lifecycle / full retrospective engine |

## Acceptance

- [x] Empty catastrophe map is a no-op without throw
- [x] Missing qualifying closeout refs materialize when recurrence anchors same week
- [x] Cycle closeout refs require `n === recurrenceCount`
- [x] Re-applying tick after creation is idempotent for the same week
- [x] Franchise token refs are rejected without map mutation
- [x] Existing hydrated review entries are not mutated
- [x] `npm run lint` + targeted tests + mirror/persistence/slice 5 regressions green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/postIncidentReviewWeeklyOrchestration.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of weekly-hook boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on compliance breach | SPE-1310 | Domain tick only in slice 4 |
| Full SPE-868 retrospective engine | SPE-868 | Stub registry + creation hook only; parent stays open |
| Wire slice 5 compose call sites to `game.postIncidentReviewRecords` | SPE-868 follow-up | Out of weekly-hook boundary |

## See also

- `planning/post-incident-review-registry-slice-2.md`
- `planning/post-incident-review-registry-slice-3.md`
- `planning/naming-hazard-descriptor-registry-slice-4.md` — sibling weekly-hook template (SPE-2360)
- `planning/recurrent-catastrophe-amelioration-registry-slice-3.md` — recurrence tick prerequisite (SPE-2364)
