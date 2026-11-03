# SPE-1046 - Site-specific clearance surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2511](https://linear.app/spectranoir/issue/SPE-2511/site-specific-clearance-surfacing-for-entity-welfare-mirror) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2505](https://linear.app/spectranoir/issue/SPE-2505/site-specific-clearance-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2511 - Site-specific clearance surfacing for entity welfare mirror](https://linear.app/spectranoir/issue/SPE-2511/site-specific-clearance-surfacing-for-entity-welfare-mirror) |
| **Status**          | **In Progress**                                                                                                                                                                     |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                                 |
| **Branch**          | `jamesdyedbq/spe-1046-site-clearance-surfacing-slice-1`                                                                                                                             |
| **Base `main` SHA** | `6ddf6f84`                                                                                                                                                                          |

## Goal

Surface compact read-only site/facility clearance labels in the existing entity welfare reclassification mirror so designers can inspect allowed, restricted, blocked, and unscoped outcomes without adding persistence, schema fields, weekly mutation, or enforcement wiring.

## Scope

| In                                                                           | Out                                                 |
| ---------------------------------------------------------------------------- | --------------------------------------------------- |
| Entity welfare mirror labels derived from `evaluateAffiliationSiteClearance` | New `GameState` fields                              |
| Compact `Site clearance` column on the mirror table                          | Entity welfare record schema changes                |
| Deterministic labels for scoped, restricted, blocked, and unscoped records   | Hire-flow mutation or access enforcement            |
| Focused mirror view/page tests and backlog handoff                           | Parent closure or durable person-record integration |

## Projection

- Evidence refs provide the visible site anchor when present.
- Containment revision refs provide the visible facility anchor when present.
- Approved records with scoped anchors can surface allowed site/facility labels.
- Pending records surface restricted scoped labels.
- Denied/reverted records surface blocked scoped labels.
- Records without site/facility anchors surface an unscoped restricted label.

## Acceptance

- [x] Entity welfare mirror records expose stable site-specific clearance labels.
- [x] UI renders compact site/facility clearance details for hydrated records.
- [x] Missing scope, restricted, blocked, and allowed outcomes are deterministic and test-covered.
- [x] Empty registry state remains unchanged.
- [x] No GameState or entity welfare schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationSiteClearance.test.ts src/features/operations/entityWelfareReclassificationMirrorView.test.ts src/features/operations/EntityWelfareReclassificationMirrorPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                     | Owner                    | Why                                         |
| ---------------------------------------- | ------------------------ | ------------------------------------------- |
| Site-clearance persistence               | SPE-1046 follow-up child | This slice is read-only surfacing.          |
| Access enforcement / facility gating     | SPE-1046 follow-up child | Operational mutation is outside this slice. |
| Dual-loyalty surfacing / enforcement     | SPE-1046 follow-up child | Separate substrate and owner thread.        |
| Protected-status surfacing / enforcement | SPE-1046 follow-up child | Separate substrate and owner thread.        |
| Durable person-record integration        | SPE-1046 follow-up child | Requires persisted person-status model.     |

## See also

- `planning/spe-1046-site-specific-clearance-slice-1.md`
- `planning/spe-1046-permission-surfacing-slice-1.md`
- `planning/spe-1046-revocation-outcome-surfacing-slice-1.md`
- `planning/spe-1046-onboarding-readiness-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
