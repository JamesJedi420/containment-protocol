# SPE-1046 - Protected-status action surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2513](https://linear.app/spectranoir/issue/SPE-2513/protected-status-action-surfacing-for-entity-welfare-mirror) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2507](https://linear.app/spectranoir/issue/SPE-2507/protected-status-action-restrictions-substrate) and [SPE-2512](https://linear.app/spectranoir/issue/SPE-2512/dual-loyalty-risk-surfacing-for-entity-welfare-mirror); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2513 - Protected-status action surfacing for entity welfare mirror](https://linear.app/spectranoir/issue/SPE-2513/protected-status-action-surfacing-for-entity-welfare-mirror) |
| **Status**          | **Shipped** - PR #2954 @ `30aac683`                                                                                                                                                 |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                                 |
| **Branch**          | `spe-1046-protected-status-surfacing-slice-1`                                                                                                                                       |
| **Base `main` SHA** | `9173ba80`                                                                                                                                                                          |

## Goal

Surface compact read-only protected-status action labels in the existing entity welfare reclassification mirror so designers can inspect staff, care, custody, sapient-remains, and unknown-status outcomes without adding persistence, schema fields, weekly mutation, or enforcement wiring.

## Scope

| In                                                                 | Out                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| Entity welfare mirror labels derived from protected-status actions | New `GameState` fields                              |
| Compact `Protected status` column on the mirror table              | Entity welfare record schema changes                |
| Deterministic projection from existing read-only record fields     | Facility, mission, procurement, or hire-flow gates  |
| Focused mirror view/page tests and backlog handoff                 | Parent closure or durable person-record integration |

## Projection

- Medical disposition or psych/veterinary review projects `patient` + `assign_housing`.
- Sapient-remains disposition projects `sapient_remains` + `disclose_identity`.
- Hostile disposition projects `detainee` + `release` with due-process required.
- Approved cooperative disposition projects `full_staff` + `grant_file_access`.
- Pending cooperative disposition projects `probationary_staff` + `grant_file_access`.
- Unknown disposition projects `unknown` + `assign_mission`.
- Existing read-only onboarding, permission, site-clearance, and dual-loyalty decisions overlay the protected-status decision.

## Acceptance

- [x] Entity welfare mirror records expose stable protected-status action labels.
- [x] UI renders compact protected-status details for hydrated records.
- [x] Staff, patient/care, sapient-remains, detainee/due-process, and unknown-status outcomes are deterministic and test-covered.
- [x] Empty registry state remains unchanged.
- [x] No GameState or entity welfare schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/features/operations/entityWelfareReclassificationMirrorView.test.ts src/features/operations/EntityWelfareReclassificationMirrorPage.test.tsx src/test/affiliationProtectedStatusActions.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                              | Owner                    | Why                                     |
| --------------------------------- | ------------------------ | --------------------------------------- |
| Protected-status enforcement      | SPE-1046 follow-up child | This slice is read-only surfacing.      |
| Site-clearance enforcement        | SPE-1046 follow-up child | Operational mutation is outside scope.  |
| Dual-loyalty enforcement          | SPE-1046 follow-up child | Separate risk gate follow-up.           |
| Revocation/downgrade enforcement  | SPE-1046 follow-up child | Separate access-outcome follow-up.      |
| Durable person-record integration | SPE-1046 follow-up child | Requires persisted person-status model. |

## See also

- `planning/spe-1046-protected-status-action-restrictions-slice-1.md`
- `planning/spe-1046-dual-loyalty-surfacing-slice-1.md`
- `planning/spe-1046-site-clearance-surfacing-slice-1.md`
- `planning/spe-1046-revocation-outcome-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
