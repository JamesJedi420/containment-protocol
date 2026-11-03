# SPE-1046 - Site-clearance mission routing enforcement (slice 1)

One-page implementation plan. Linear: [SPE-2514](https://linear.app/spectranoir/issue/SPE-2514/site-clearance-enforcement-for-mission-routing) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2505](https://linear.app/spectranoir/issue/SPE-2505/site-specific-clearance-substrate), [SPE-2511](https://linear.app/spectranoir/issue/SPE-2511/site-specific-clearance-surfacing-for-entity-welfare-mirror), and [SPE-2513](https://linear.app/spectranoir/issue/SPE-2513/protected-status-action-surfacing-for-entity-welfare-mirror); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2514 - Site-clearance enforcement for mission routing](https://linear.app/spectranoir/issue/SPE-2514/site-clearance-enforcement-for-mission-routing) |
| **Status**          | **In Progress**                                                                                                                                           |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                       |
| **Branch**          | `spe-1046-site-clearance-enforcement-slice-1`                                                                                                             |
| **Base `main` SHA** | `30aac683`                                                                                                                                                |

## Goal

Add conservative mission-routing enforcement for explicit site/facility clearance requirements. Missions without explicit clearance tokens continue to route normally; missions with clearance tokens hard-block teams that do not carry a matching team/member grant.

## Scope

| In                                                                        | Out                                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Explicit `site-clearance:<id>` and `facility-clearance:<id>` requirements | Generic `site:*` metadata inference                             |
| Team/member tag grants using the same token format                        | New `GameState` fields, persistence, schema, or weekly mutation |
| `site-clearance-required` hard deployment/routing blocker                 | Procurement, facility, protected-status, or revocation gates    |
| Focused mission routing/hydration tests and backlog handoff               | Parent closure or durable person-record integration             |

## Enforcement Contract

- No explicit clearance requirement returns an allowed no-op decision.
- Explicit site/facility requirements are read only from mission `requiredTags`.
- Site/facility grants are read only from team tags and member tags using the same token format.
- The mission surface uses existing `evaluateAffiliationSiteClearance`.
- Any non-allowed clearance decision becomes the `site-clearance-required` hard deployment/routing blocker.
- Clearance requirement tokens are excluded from ordinary required-tag loadout checks so they do not report as `invalid-loadout-gate`.

## Acceptance

- [x] Existing missions without clearance tags route unchanged.
- [x] Site clearance requirements allow matching team/member grants.
- [x] Facility clearance requirements allow matching facility grants.
- [x] Missing or non-matching grants surface `site-clearance-required`.
- [x] Route record hydration/sanitization preserves the new blocker code.
- [x] No persistence, schema, weekly mutation, or non-mission enforcement changes.

## Validation

- `npm.cmd run test:run -- src/test/mission.intake.triage.routing.test.ts src/test/affiliationSiteClearance.test.ts src/test/missionIntakeRouting.hydration.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                              | Owner                    | Why                                                     |
| --------------------------------- | ------------------------ | ------------------------------------------------------- |
| Dual-loyalty enforcement          | SPE-1046 follow-up child | Separate risk gate follow-up.                           |
| Protected-status enforcement      | SPE-1046 follow-up child | Separate action-safety gate follow-up.                  |
| Revocation/downgrade enforcement  | SPE-1046 follow-up child | Separate access-outcome follow-up.                      |
| Durable person-record integration | SPE-1046 follow-up child | Requires persisted person-status and clearance records. |
| SPE-947 propagation follow-ons    | SPE-947 follow-up child  | Separate registry parent thread.                        |

## See also

- `planning/spe-1046-site-specific-clearance-slice-1.md`
- `planning/spe-1046-site-clearance-surfacing-slice-1.md`
- `planning/spe-1046-protected-status-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
