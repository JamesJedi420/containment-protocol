# SPE-1046 - Revocation/downgrade mission routing enforcement (slice 1)

One-page implementation plan. Linear: [SPE-2517](https://linear.app/spectranoir/issue/SPE-2517/revocationdowngrade-enforcement-for-mission-routing) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2508](https://linear.app/spectranoir/issue/SPE-2508/revocationdowngrade-access-outcomes-substrate), [SPE-2509](https://linear.app/spectranoir/issue/SPE-2509/revocation-outcome-surfacing-for-entity-welfare-mirror), and [SPE-2516](https://linear.app/spectranoir/issue/SPE-2516/protected-status-enforcement-for-mission-routing); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2517 - Revocation/downgrade enforcement for mission routing](https://linear.app/spectranoir/issue/SPE-2517/revocationdowngrade-enforcement-for-mission-routing) |
| **Status**          | **In Progress**                                                                                                                                                      |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                  |
| **Branch**          | `spe-1046-revocation-enforcement-slice-1`                                                                                                                            |
| **Base `main` SHA** | `705867da`                                                                                                                                                           |

## Goal

Add conservative mission-routing enforcement for explicit revocation/downgrade review missions. Missions without `revocation-clearance` continue to route normally; missions with the explicit tag hard-block teams whose team/member revocation evidence restricts mission access.

## Scope

| In                                                                                                                                       | Out                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Explicit `revocation-clearance` requirement tag                                                                                          | Generic person-record, faction, or civic inference                 |
| Team/member `revocation-kind:*`, `revocation-cause:*`, `revocation-surface:*`, `revocation-trust:*`, `revocation-review:*` evidence tags | New `GameState` fields, persistence, schema, or weekly mutation    |
| `revocation-restricted` hard deployment/routing blocker                                                                                  | Procurement, facility, durable person-record, or non-mission gates |
| Focused mission routing/hydration tests, pure helper coverage, and backlog handoff                                                       | Parent closure                                                     |

## Enforcement Contract

- No explicit revocation requirement returns an allowed no-op decision.
- `revocation-clearance` is read only from mission `requiredTags`.
- Revocation evidence is read only from team/member tags.
- An explicit revocation mission with no `revocation-kind:*` evidence remains allowed.
- The mission surface uses existing `evaluateAffiliationRevocationOutcome`.
- Any active decision that blocks or restricts mission access becomes the `revocation-restricted` hard deployment/routing blocker.
- The explicit requirement tag is excluded from ordinary required-tag loadout checks so it does not report as `invalid-loadout-gate`.

## Acceptance

- [ ] Existing missions without `revocation-clearance` route unchanged.
- [ ] Explicit missions with no active revocation evidence route unchanged.
- [ ] Suspension, revocation, quarantine, mission-surface downgrade/probation/clearance review, malformed restricted fallback, or blocked trust outcomes surface `revocation-restricted`.
- [ ] `revocation-clearance` does not surface `invalid-loadout-gate`.
- [ ] Route record hydration/sanitization preserves the new blocker code.
- [ ] No persistence, schema, weekly mutation, or non-mission enforcement changes.

## Validation

- `npm.cmd run test:run -- src/test/missionRevocationEnforcement.test.ts src/test/mission.intake.triage.routing.test.ts src/test/missionIntakeRouting.hydration.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                                  | Owner                    | Why                                                     |
| ------------------------------------- | ------------------------ | ------------------------------------------------------- |
| Durable person-record integration     | SPE-1046 follow-up child | Requires persisted person-status and clearance records. |
| Procurement/facility revocation gates | SPE-1046 follow-up child | This slice only gates mission routing.                  |
| SPE-947 propagation follow-ons        | SPE-947 follow-up child  | Separate registry parent thread.                        |

## See also

- `planning/spe-1046-revocation-downgrade-outcomes-slice-1.md`
- `planning/spe-1046-revocation-outcome-surfacing-slice-1.md`
- `planning/spe-1046-protected-status-enforcement-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
