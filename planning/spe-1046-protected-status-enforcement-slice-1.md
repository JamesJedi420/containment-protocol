# SPE-1046 - Protected-status mission routing enforcement (slice 1)

One-page implementation plan. Linear: [SPE-2516](https://linear.app/spectranoir/issue/SPE-2516/protected-status-enforcement-for-mission-routing) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2507](https://linear.app/spectranoir/issue/SPE-2507/protected-status-action-restrictions-substrate), [SPE-2513](https://linear.app/spectranoir/issue/SPE-2513/protected-status-action-surfacing-for-entity-welfare-mirror), and [SPE-2515](https://linear.app/spectranoir/issue/SPE-2515/dual-loyalty-enforcement-for-mission-routing); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2516 - Protected-status enforcement for mission routing](https://linear.app/spectranoir/issue/SPE-2516/protected-status-enforcement-for-mission-routing) |
| **Status**          | **In Progress**                                                                                                                                               |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                           |
| **Branch**          | `spe-1046-protected-status-enforcement-slice-1`                                                                                                               |
| **Base `main` SHA** | `af2a0d05`                                                                                                                                                    |

## Goal

Add conservative mission-routing enforcement for explicit protected-status review missions. Missions without the explicit review tag continue to route normally; missions with `protected-status-clearance` hard-block teams whose team/member protected-status evidence evaluates to a restricted or blocked mission-assignment action.

## Scope

| In                                                                                       | Out                                                             |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Explicit `protected-status-clearance` requirement tag                                    | Generic person-record, faction, or civic inference              |
| Team/member `protected-status:*`, protected flag, and `protected-review:*` evidence tags | New `GameState` fields, persistence, schema, or weekly mutation |
| `protected-status-restricted` hard deployment/routing blocker                            | Revocation, procurement, facility, or non-mission gates         |
| Focused mission routing/hydration tests, pure helper coverage, and backlog handoff       | Parent closure or durable person-record integration             |

## Enforcement Contract

- No explicit protected-status requirement returns an allowed no-op decision.
- `protected-status-clearance` is read only from mission `requiredTags`.
- Protected-status evidence is read only from team/member tags.
- Missing status evidence on an explicit review mission evaluates as `unknown`.
- The mission surface uses existing `evaluateAffiliationProtectedStatusAction` with `action: 'assign_mission'`.
- Any non-allowed protected-status action decision becomes the `protected-status-restricted` hard deployment/routing blocker.
- The explicit requirement tag is excluded from ordinary required-tag loadout checks so it does not report as `invalid-loadout-gate`.

## Acceptance

- [x] Existing missions without `protected-status-clearance` route unchanged.
- [x] Full-staff teams can route explicit protected-status review missions.
- [x] Missing, unknown, care-protected, or otherwise restricted statuses surface `protected-status-restricted`.
- [x] `protected-status-clearance` does not surface `invalid-loadout-gate`.
- [x] Route record hydration/sanitization preserves the new blocker code.
- [x] No persistence, schema, weekly mutation, or non-mission enforcement changes.

## Validation

- `npm.cmd run test:run -- src/test/missionProtectedStatusEnforcement.test.ts src/test/mission.intake.triage.routing.test.ts src/test/missionIntakeRouting.hydration.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                              | Owner                    | Why                                                     |
| --------------------------------- | ------------------------ | ------------------------------------------------------- |
| Revocation/downgrade enforcement  | SPE-1046 follow-up child | Separate access-outcome follow-up.                      |
| Durable person-record integration | SPE-1046 follow-up child | Requires persisted person-status and clearance records. |
| SPE-947 propagation follow-ons    | SPE-947 follow-up child  | Separate registry parent thread.                        |

## See also

- `planning/spe-1046-protected-status-action-restrictions-slice-1.md`
- `planning/spe-1046-protected-status-surfacing-slice-1.md`
- `planning/spe-1046-dual-loyalty-enforcement-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
