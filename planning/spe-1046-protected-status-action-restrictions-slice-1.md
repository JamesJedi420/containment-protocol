# SPE-1046 - Protected-status action restrictions substrate (slice 1)

One-page implementation plan. Linear: [SPE-2507](https://linear.app/spectranoir/issue/SPE-2507/protected-status-action-restrictions-substrate) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2502](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions), [SPE-2504](https://linear.app/spectranoir/issue/SPE-2504/onboarding-clearance-readiness-substrate), [SPE-2505](https://linear.app/spectranoir/issue/SPE-2505/site-specific-clearance-substrate), and [SPE-2506](https://linear.app/spectranoir/issue/SPE-2506/dual-loyalty-risk-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2507 - Protected-status action restrictions substrate](https://linear.app/spectranoir/issue/SPE-2507/protected-status-action-restrictions-substrate) |
| **Status**          | **Shipped**                                                                                                                                               |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                       |
| **Branch**          | `spe-1046-protected-status-action-restrictions-slice-1`                                                                                                   |
| **Base `main` SHA** | `7e47e23c`                                                                                                                                                |

## Goal

Add a pure deterministic protected-status action restriction substrate over explicit read-only subject evidence. This makes SPE-1046's protected-status parent row concrete without adding persistence, UI, enforcement wiring, or weekly mutation.

## Scope

| In                                                                         | Out                                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `affiliationProtectedStatusActions` pure domain helper                     | GameState persistence fields                                    |
| Stable protected statuses, proposed actions, outcomes, and decision labels | Candidate / Agent / EntityWelfareReclassificationRecord schema  |
| Optional permission, onboarding, site-clearance, and dual-loyalty overlays | Mission, procurement, facility, or hire-flow mutation           |
| Focused Vitest coverage and backlog handoff                                | Revocation paths, protected-status UI surfacing, or enforcement |

## Risk Contract

- Minors, patients, and sapient remains block coercive or high-risk actions.
- Civilians, witnesses, informants, and contractors restrict access actions and block coercive actions without review evidence.
- Staff and allied personnel defer to onboarding, permission, site-clearance, and dual-loyalty overlays; probationary or non-cleared subjects restrict.
- Detainee and compromised-person statuses restrict release/transfer and block unrestricted sensitive access.
- Invalid or sparse input never throws; decisions fall back with validation reason codes.

## Acceptance

- [x] Domain helper exports stable status/action/outcome/decision types and set evaluators.
- [x] Protected, staff, custody, upstream-overlay, and invalid fallback policies are covered.
- [x] No GameState, Candidate, Agent, or entity-welfare record schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationProtectedStatusActions.test.ts src/test/affiliationDualLoyaltyRisk.test.ts src/test/affiliationSiteClearance.test.ts src/test/entityWelfareStatusPermissions.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                              | Owner                    | Why                                     |
| ------------------------------------------------- | ------------------------ | --------------------------------------- |
| Protected-status UI surfacing                     | SPE-1046 follow-up child | This slice is pure read-only substrate. |
| Enforcement in mission/procurement/facility flows | SPE-1046 follow-up child | No operational mutation in this slice.  |
| Revocation/downgrade to access/trust outcomes     | SPE-1046 follow-up child | Parent AC row 6.                        |
| SPE-947 propagation follow-ons                    | SPE-947/SPE-1046 child   | Separate parent thread.                 |

## See also

- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-1046-onboarding-clearance-readiness-slice-1.md`
- `planning/spe-1046-site-specific-clearance-slice-1.md`
- `planning/spe-1046-dual-loyalty-risk-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
