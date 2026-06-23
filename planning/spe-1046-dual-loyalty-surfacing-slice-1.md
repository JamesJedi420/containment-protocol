# SPE-1046 - Dual-loyalty risk surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2512](https://linear.app/spectranoir/issue/SPE-2512/dual-loyalty-risk-surfacing-for-entity-welfare-mirror) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2506](https://linear.app/spectranoir/issue/SPE-2506/dual-loyalty-risk-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2512 - Dual-loyalty risk surfacing for entity welfare mirror](https://linear.app/spectranoir/issue/SPE-2512/dual-loyalty-risk-surfacing-for-entity-welfare-mirror) |
| **Status**          | **In Progress**                                                                                                                                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                     |
| **Branch**          | `spe-1046-dual-loyalty-surfacing-slice-1`                                                                                                                               |
| **Base `main` SHA** | `2a463d0e`                                                                                                                                                              |

## Goal

Surface compact read-only dual-loyalty risk labels in the existing entity welfare reclassification mirror so designers can inspect agency-only, medical/watch, rival-containment, restricted, and blocked outcomes without adding persistence, schema fields, weekly mutation, or enforcement wiring.

## Scope

| In                                                                     | Out                                                 |
| ---------------------------------------------------------------------- | --------------------------------------------------- |
| Entity welfare mirror labels derived from `affiliationDualLoyaltyRisk` | New `GameState` fields                              |
| Compact `Dual loyalty` column on the mirror table                      | Entity welfare record schema changes                |
| Deterministic anchor derivation from existing read-only fields         | Facility, mission, procurement, or hire-flow gates  |
| Focused mirror view/page tests and backlog handoff                     | Parent closure or durable person-record integration |

## Projection

- All records use `agency` as the primary anchor.
- Medical disposition or veterinary/psych review derives a `medical` secondary anchor.
- Hostile disposition or hostile/threat/predator/apex prior labels derive a `rival_containment` secondary anchor.
- Unknown disposition derives an `unknown` secondary anchor.
- Existing read-only onboarding and site-clearance decisions overlay the dual-loyalty decision.
- Evidence and containment refs pass through as affiliation refs only.

## Acceptance

- [x] Entity welfare mirror records expose stable dual-loyalty risk labels.
- [x] UI renders compact dual-loyalty details for hydrated records.
- [x] Agency-only, medical/watch, hostile/restricted, denied/blocked, and reverted/blocked outcomes are deterministic and test-covered.
- [x] Empty registry state remains unchanged.
- [x] No GameState or entity welfare schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationDualLoyaltyRisk.test.ts src/features/operations/entityWelfareReclassificationMirrorView.test.ts src/features/operations/EntityWelfareReclassificationMirrorPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                     | Owner                    | Why                                     |
| ---------------------------------------- | ------------------------ | --------------------------------------- |
| Dual-loyalty enforcement                 | SPE-1046 follow-up child | This slice is read-only surfacing.      |
| Protected-status surfacing / enforcement | SPE-1046 follow-up child | Separate substrate and owner thread.    |
| Site-clearance enforcement               | SPE-1046 follow-up child | Operational mutation is outside scope.  |
| Revocation/downgrade enforcement         | SPE-1046 follow-up child | Separate access-outcome follow-up.      |
| Durable person-record integration        | SPE-1046 follow-up child | Requires persisted person-status model. |

## See also

- `planning/spe-1046-dual-loyalty-risk-slice-1.md`
- `planning/spe-1046-site-clearance-surfacing-slice-1.md`
- `planning/spe-1046-revocation-outcome-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
