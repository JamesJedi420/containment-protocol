# SPE-868 — Post-incident recommendation action planning mirror UI (slice 18)

One-page implementation plan. Linear: child [SPE-2387](https://linear.app/spectranoir/issue/SPE-2387) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 17 (`planning/post-incident-review-registry-slice-17.md`, PR #2640 / [SPE-2386](https://linear.app/spectranoir/issue/SPE-2386)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2387 — Post-incident recommendation action planning mirror UI (slice 18)](https://linear.app/spectranoir/issue/SPE-2387) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (do not re-close) |
| **Branch** | `spe-868-review-recommendation-action-mirror-slice-18`                                                     |
| **Base `main` SHA** | `68fe5141`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `postIncidentReviewRecommendationActionRecords` — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `68fe5141`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Action registry schema | `src/domain/postIncidentReviewRecommendationActionRegistry.ts` (SPE-2386 / slice 17) |
| Persistence          | `postIncidentReviewRecommendationActionRecords` on `GameState` (slice 17) |
| Sibling mirror template | `postIncidentReviewRecommendationMirrorView` (SPE-2384 slice 15), qualifying rows (slice 8) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getPostIncidentReviewRecommendationActionMirrorView` + page       | New `advanceWeek` hooks                       |
| Route `/post-incident-review-recommendation-actions` + Front Desk quick link | Follow-on qualification rules          |
| View + component tests                                             | Action tick logic changes                     |
| Slice doc (this file) + backlog handoff on ship                    | SPE-1310 parent closure                       |
| Link `recommendationRef` to persisted recommendation records       | Re-validation of hidden/dropped records       |
| Link `reviewRef` to qualifying post-incident review mirror rows    | SPE-868 parent closure                        |
|                                                                    | SPE-1097 authority checks                     |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted action records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Fields surfaced** — id, label, recommendationRef, reviewRef, stubSuffix, actionToken, orchestrationWeek.
- **Recommendation linkage** — when `recommendationRef` matches a persisted recommendation record, surface linked recommendation label and review ref; link to recommendation mirror route.
- **Review linkage** — when `reviewRef` matches a qualifying incident row in `getPostIncidentReviewMirrorView`, surface linked review label, source, and case id; link to post-incident review mirror route.
- **Empty state** — when `postIncidentReviewRecommendationActionRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id (`localeCompare`).
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `postIncidentReviewRecommendationActionRecords` map renders empty state without throw
- [x] Records table shows id, label, recommendationRef, reviewRef, stubSuffix, actionToken, orchestrationWeek
- [x] Recommendation and qualifying review linkage surfaces when refs match persisted rows
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/postIncidentReviewRecommendationActionMirrorView.ts` |
| UI     | `src/features/operations/PostIncidentReviewRecommendationActionMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/postIncidentReviewRecommendationActionMirrorView.test.ts`, `src/features/operations/PostIncidentReviewRecommendationActionMirrorPage.test.tsx` |
| Plan   | `planning/post-incident-review-registry-slice-18.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of mirror UI boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Action mirror only; parent stays open |
| Full retrospective action engine | SPE-868 follow-up | Mirror display only this slice |

## See also

- `planning/post-incident-review-registry-slice-17.md`
- `planning/post-incident-review-registry-slice-15.md` — sibling mirror UI template
