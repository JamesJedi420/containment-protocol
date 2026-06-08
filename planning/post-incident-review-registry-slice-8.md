# SPE-868 — Post-incident review mirror qualifying incident surfacing (slice 8)

One-page implementation plan. Linear: child [SPE-2377](https://linear.app/spectranoir/issue/SPE-2377) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 7 (`planning/post-incident-review-registry-slice-7.md`, PR #2620 / [SPE-2376](https://linear.app/spectranoir/issue/SPE-2376)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2377 — Post-incident review mirror qualifying incident surfacing (slice 8)](https://linear.app/spectranoir/issue/SPE-2377) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-qualifying-incident-mirror-slice-8`                                                               |
| **Base `main` SHA** | `f7d21218`                                                                                          |

## Goal

Extend `getPostIncidentReviewMirrorView` and `PostIncidentReviewMirrorPage` to filter, group, and surface orchestration-created qualifying incident reviews (`review:case-*-closeout`, `review:near-catastrophe-*`) from persisted `game.postIncidentReviewRecords`.

## Prerequisite (on `main` @ `f7d21218`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Qualifying creation hook | `applyWeeklyPostIncidentReviewCreationTick` slice 7 (SPE-2376 / PR #2620) |
| Mirror UI base       | `getPostIncidentReviewMirrorView` (SPE-2372 / PR #2612)                |
| Linked-review columns pattern | `RecurrentCatastropheMirrorPage` (SPE-2375 / PR #2618)           |
| Compose projection   | `projectPostIncidentReviewSummary` (SPE-868 registry)                  |

## Mirror UI contract

| Rule | Detail |
| --- | --- |
| **Qualifying refs** | `review:case-*-closeout` and `review:near-catastrophe-*` with `orchestration_week:<week>` in `unknownFields` |
| **Stub distinction** | Starting-state stub fixtures (`POST_INCIDENT_REVIEW_STUB_REGISTRY`) without orchestration token classify as stub, not qualifying |
| **Recurrence orchestration** | `review:cycle-*-closeout` with orchestration token classifies separately; not grouped under qualifying incident section |
| **Hydrated truth only** | Display persisted records as hydrated; do not re-sanitize dropped entries |
| **Ordering** | Byte-stable `id` sort inherited for all record lists |
| **Empty qualifying group** | No qualifying section when filter yields zero records |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Source classification + qualifying group in mirror view            | Weekly orchestration qualification rules      |
| Summary stat cards + qualifying incident table section             | Domain schema expansion                       |
| Source column on persisted records table                           | Domain link API changes                       |
| View + component + integration tests                               | SPE-1310 lifecycle                            |
| Slice doc (this file) + backlog handoff on ship                    | Full SPE-868 parent closure                   |
| Copy strings in `POST_INCIDENT_REVIEW_MIRROR_UI_TEXT`              | Catastrophe mirror page changes               |

## Acceptance

- [ ] Empty map renders empty state without throw
- [ ] Orchestration-created `review:case-*-closeout` appears in qualifying incident group with case closeout source label
- [ ] Orchestration-created `review:near-catastrophe-*` appears in qualifying incident group with near-catastrophe source label
- [ ] Stub fixtures classify as stub fixture, not qualifying orchestration
- [ ] `advanceWeek` integration asserts mirror view after qualifying case resolution
- [ ] Byte-stable mirror builds; slice 3/5/7 regressions green
- [ ] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/postIncidentReviewMirrorView.ts`           |
| UI     | `src/features/operations/PostIncidentReviewMirrorPage.tsx`        |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/postIncidentReviewMirrorView.test.ts`, `src/features/operations/PostIncidentReviewMirrorPage.test.tsx`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-8.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of mirror UI boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Mirror surfacing slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-6.md`
