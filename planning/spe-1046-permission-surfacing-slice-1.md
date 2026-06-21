# SPE-1046 - Permission surfacing for entity welfare mirror (slice 1)

One-page implementation plan. Linear: [SPE-2503](https://linear.app/spectranoir/issue/SPE-2503/permission-surfacing-for-entity-welfare-mirror) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2502](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2503 - Permission surfacing for entity welfare mirror](https://linear.app/spectranoir/issue/SPE-2503/permission-surfacing-for-entity-welfare-mirror) |
| **Status**          | **In progress** - implementation slice                                                                                                                    |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                       |
| **Branch**          | `spe-1046-permission-surfacing-slice-1`                                                                                                                   |
| **Base `main` SHA** | `5e3aa575`                                                                                                                                                |

## Goal

Surface the status-class permission decisions shipped in SPE-2502 inside the existing entity welfare reclassification planning mirror. This is a read-only UI/mirror slice: it makes room, file, gear, housing, and mission access outcomes inspectable without adding persistence, weekly mutation, onboarding, site-specific clearance, or parent closure.

## Prerequisite

| Shipped                           | Anchor                                                                |
| --------------------------------- | --------------------------------------------------------------------- |
| Status-class permission evaluator | `src/domain/entityWelfareStatusPermissions.ts`                        |
| Entity welfare mirror read model  | `src/features/operations/entityWelfareReclassificationMirrorView.ts`  |
| Entity welfare mirror page        | `src/features/operations/EntityWelfareReclassificationMirrorPage.tsx` |
| SPE-2502 slice doc                | `planning/spe-1046-status-class-permission-sets-slice-1.md`           |

## Scope

| In                                                                              | Out                                                              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Mirror record permission labels from `evaluateEntityWelfareStatusPermissionSet` | GameState persistence fields                                     |
| Compact Permissions column in the existing mirror table                         | `EntityWelfareReclassificationRecord` schema changes             |
| Focused view/page tests for order and rendered outcomes                         | Mission triage, procurement, facility, or onboarding integration |
| Backlog handoff update                                                          | SPE-1046 parent Done                                             |

## Surfacing contract

- Stable order: Room, File, Gear, Housing, Mission.
- Display format: `{Surface}: {Outcome}`.
- Read-only compose over hydrated records; no state mutation.
- Empty mirror state remains unchanged.
- Invalid records dropped during hydration remain absent from the mirror.

## Acceptance

- [x] Mirror view model includes permission labels for each persisted record.
- [x] Page renders permission outcomes in the persisted records table.
- [x] Cooperative, medical, and sapient-remains representative records cover distinct outcomes.
- [x] Repeated mirror builds remain byte-stable.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/entityWelfareStatusPermissions.test.ts src/features/operations/entityWelfareReclassificationMirrorView.test.ts src/features/operations/EntityWelfareReclassificationMirrorPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only; repo-wide format baseline is noisy.

## Deferred

| Item                                                             | Owner                    | Why                                  |
| ---------------------------------------------------------------- | ------------------------ | ------------------------------------ |
| Permission use in mission triage / procurement / facility gating | SPE-1046 follow-up child | This slice is mirror-only surfacing. |
| Recruitment / onboarding / clearance elevation pipeline          | SPE-1046 follow-up child | Parent AC row 2.                     |
| Site-specific clearance and facility exclusion                   | SPE-1046 follow-up child | Parent AC row 3.                     |
| Dual-loyalty overlap risk                                        | SPE-1046 follow-up child | Parent AC row 4.                     |
| Protected-status action restrictions                             | SPE-1046 follow-up child | Parent AC row 5.                     |
| Revocation/downgrade to access/trust outcomes                    | SPE-1046 follow-up child | Parent AC row 6.                     |

## See also

- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
