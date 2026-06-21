# SPE-1046 - Status-class permission sets (slice 1)

One-page implementation plan. Linear: [SPE-2502](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows registry grooming closure in `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2502 - Status-class permission sets (rooms, files, gear, housing, missions)](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions) |
| **Status**          | **In progress** - implementation slice                                                                                                                                                          |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                                             |
| **Branch**          | `spe-1046-status-class-permission-sets-slice-1`                                                                                                                                                 |
| **Base `main` SHA** | `93a328e1`                                                                                                                                                                                      |

## Goal

Make the first SPE-1046 parent deferred row concrete by adding a pure deterministic status-class permission evaluator over existing entity welfare reclassification records. The evaluator maps reclassification state plus proposed disposition into room, file, gear, housing, and mission decisions without adding persistence, UI, onboarding, or site-specific clearance.

## Prerequisite

| Shipped                              | Anchor                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Entity welfare registry schema       | `src/domain/entityWelfareReclassificationRegistry.ts`                                          |
| Persistence and weekly hooks         | `entityWelfareReclassificationRecords`, `applyWeeklyEntityWelfareReclassificationTick`         |
| Planning mirror and weekly surfacing | `EntityWelfareReclassificationMirrorPage`, `entity_welfare_reclassification.weekly_transition` |
| SPE-1046 parent deferred table       | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`                                |

## Scope

| In                                                             | Out                                            |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `entityWelfareStatusPermissions` pure domain helper            | GameState persistence fields                   |
| Stable permission surfaces: room, file, gear, housing, mission | UI surfacing or navigation                     |
| Deterministic decisions and reason codes                       | Recruitment / onboarding / clearance elevation |
| Focused Vitest coverage for policy and fallback behavior       | Site-specific clearance / facility exclusion   |
| Backlog handoff update                                         | SPE-1046 parent Done                           |

## Permission contract

- `approved + cooperative`: housing allowed; files, gear, and missions restricted; unrestricted room access blocked.
- `approved + medical`: housing allowed; rooms and files restricted; gear and missions blocked.
- `approved + sapient_remains`: rooms, files, and housing restricted; gear and missions blocked.
- `approved + hostile`: all surfaces blocked.
- `pending`: all surfaces restricted; review-gate reason included when present.
- `denied` / `reverted`: all surfaces blocked.
- Invalid union values never throw; decisions fall back with explicit validation reason codes.

## Acceptance

- [x] Permission helper exports stable surface/outcome unions and all-surface ordering.
- [x] Single-surface and permission-set evaluators return byte-stable decisions.
- [x] Approved cooperative, medical, sapient remains, and hostile policies are covered.
- [x] Pending, denied, reverted, and invalid-union fallbacks are covered.
- [x] No `EntityWelfareReclassificationRecord` fields or GameState persistence contracts changed.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/entityWelfareStatusPermissions.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                                            | Owner                    | Why                                   |
| --------------------------------------------------------------- | ------------------------ | ------------------------------------- |
| Permission surfacing in planning mirrors / triage / procurement | SPE-1046 follow-up child | This slice is domain-only foundation. |
| Recruitment / onboarding / clearance elevation pipeline         | SPE-1046 follow-up child | Parent AC row 2.                      |
| Site-specific clearance and facility exclusion                  | SPE-1046 follow-up child | Parent AC row 3.                      |
| Dual-loyalty overlap risk                                       | SPE-1046 follow-up child | Parent AC row 4.                      |
| Protected-status action restrictions                            | SPE-1046 follow-up child | Parent AC row 5.                      |
| Revocation/downgrade to access/trust outcomes                   | SPE-1046 follow-up child | Parent AC row 6.                      |

## See also

- `planning/entity-welfare-reclassification-registry-slice-5.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
