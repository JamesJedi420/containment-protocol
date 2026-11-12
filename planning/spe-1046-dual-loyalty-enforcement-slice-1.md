# SPE-1046 - Dual-loyalty mission routing enforcement (slice 1)

One-page implementation plan. Linear: [SPE-2515](https://linear.app/spectranoir/issue/SPE-2515/dual-loyalty-enforcement-for-mission-routing) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2506](https://linear.app/spectranoir/issue/SPE-2506/dual-loyalty-risk-substrate), [SPE-2512](https://linear.app/spectranoir/issue/SPE-2512/dual-loyalty-risk-surfacing-for-entity-welfare-mirror), and [SPE-2514](https://linear.app/spectranoir/issue/SPE-2514/site-clearance-enforcement-for-mission-routing); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2515 - Dual-loyalty enforcement for mission routing](https://linear.app/spectranoir/issue/SPE-2515/dual-loyalty-enforcement-for-mission-routing) |
| **Status**          | **In Progress**                                                                                                                                       |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                   |
| **Branch**          | `spe-1046-dual-loyalty-enforcement-slice-1`                                                                                                           |
| **Base `main` SHA** | `83a0298c`                                                                                                                                            |

## Goal

Add conservative mission-routing enforcement for explicit dual-loyalty review missions. Missions without the explicit review tag continue to route normally; missions with `dual-loyalty-clearance` hard-block teams whose team/member tags evaluate to mission-restricted or blocked dual-loyalty risk.

## Scope

| In                                                                 | Out                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Explicit `dual-loyalty-clearance` requirement tag                  | Generic faction, civic, or relationship inference               |
| Team/member `dual-loyalty:*` and `loyalty-primary:*` evidence tags | New `GameState` fields, persistence, schema, or weekly mutation |
| `dual-loyalty-restricted` hard deployment/routing blocker          | Protected-status, revocation, procurement, or facility gates    |
| Focused mission routing/hydration tests and backlog handoff        | Parent closure or durable person-record integration             |

## Enforcement Contract

- No explicit dual-loyalty requirement returns an allowed no-op decision.
- `dual-loyalty-clearance` is read only from mission `requiredTags`.
- `dual-loyalty:<anchor>` and `loyalty-primary:<anchor>` are read only from team/member tags.
- `dual-loyalty:restricted` and `dual-loyalty:blocked` become evaluator evidence tags.
- `none` and `watch` decisions allow routing; `restricted` or `blocked` decisions that restrict `mission` surface `dual-loyalty-restricted`.
- The explicit requirement tag is excluded from ordinary required-tag loadout checks so it does not report as `invalid-loadout-gate`.

## Acceptance

- [x] Existing missions without `dual-loyalty-clearance` route unchanged.
- [x] Clean or watch-only teams can route explicit dual-loyalty review missions.
- [x] Restricted or blocked dual-loyalty evidence surfaces `dual-loyalty-restricted`.
- [x] `dual-loyalty-clearance` does not surface `invalid-loadout-gate`.
- [x] Route record hydration/sanitization preserves the new blocker code.
- [x] No persistence, schema, weekly mutation, or non-mission enforcement changes.

## Validation

- `npm.cmd run test:run -- src/test/missionDualLoyaltyEnforcement.test.ts src/test/mission.intake.triage.routing.test.ts src/test/missionIntakeRouting.hydration.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                              | Owner                    | Why                                                     |
| --------------------------------- | ------------------------ | ------------------------------------------------------- |
| Protected-status enforcement      | SPE-1046 follow-up child | Separate action-safety gate follow-up.                  |
| Revocation/downgrade enforcement  | SPE-1046 follow-up child | Separate access-outcome follow-up.                      |
| Durable person-record integration | SPE-1046 follow-up child | Requires persisted person-status and clearance records. |
| SPE-947 propagation follow-ons    | SPE-947 follow-up child  | Separate registry parent thread.                        |

## See also

- `planning/spe-1046-dual-loyalty-risk-slice-1.md`
- `planning/spe-1046-dual-loyalty-surfacing-slice-1.md`
- `planning/spe-1046-site-clearance-enforcement-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
