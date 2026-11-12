# SPE-1046 - Site-specific clearance substrate (slice 1)

One-page implementation plan. Linear: [SPE-2505](https://linear.app/spectranoir/issue/SPE-2505/site-specific-clearance-substrate) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2502](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions), [SPE-2503](https://linear.app/spectranoir/issue/SPE-2503/permission-surfacing-for-entity-welfare-mirror), and [SPE-2504](https://linear.app/spectranoir/issue/SPE-2504/onboarding-clearance-readiness-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2505 - Site-specific clearance substrate](https://linear.app/spectranoir/issue/SPE-2505/site-specific-clearance-substrate)     |
| **Status**          | **In Progress**                                                                                                                     |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog** |
| **Branch**          | `spe-1046-site-specific-clearance-slice-1`                                                                                          |
| **Base `main` SHA** | `cea2f035`                                                                                                                          |

## Goal

Add a pure deterministic site/facility clearance substrate over the existing onboarding-readiness and status-class permission evaluators. This makes SPE-1046's site-specific clearance parent row concrete without adding persistence, UI, enforcement wiring, or weekly mutation.

## Scope

| In                                                                | Out                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `affiliationSiteClearance` pure domain helper                     | GameState persistence fields                                   |
| Stable site/facility context grants, restrictions, and blocks     | Candidate / Agent / EntityWelfareReclassificationRecord schema |
| Optional read-only onboarding and base-permission decision inputs | Mission triage, procurement, facility, or hire-flow mutation   |
| Focused Vitest coverage and backlog handoff                       | Dual-loyalty, protected-status, revocation, or UI surfacing    |

## Clearance Contract

- Explicit blocked site or facility decisions block access before any grant.
- Lost onboarding blocks; other non-cleared onboarding restricts until the minimum stage is met.
- Blocked base status-permission decisions remain blocked even when site clearance is granted.
- Cleared onboarding plus explicit site or facility grant allows access unless blocked earlier.
- Missing site/facility scope, restricted scope, missing grants, or interior scope without a grant restrict access.
- Invalid or sparse input never throws; decisions fall back with validation reason codes.

## Acceptance

- [x] Domain helper exports stable boundary/context/decision types and set evaluators.
- [x] Explicit grant, restriction, block, onboarding, base-permission, and invalid fallback policies are covered.
- [x] No GameState, Candidate, Agent, or entity-welfare record schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationSiteClearance.test.ts src/test/affiliationOnboardingReadiness.test.ts src/test/entityWelfareStatusPermissions.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                              | Owner                    | Why                                     |
| ------------------------------------------------- | ------------------------ | --------------------------------------- |
| Site-clearance UI surfacing                       | SPE-1046 follow-up child | This slice is pure read-only substrate. |
| Enforcement in mission/procurement/facility flows | SPE-1046 follow-up child | No operational mutation in this slice.  |
| Dual-loyalty overlap risk                         | SPE-1046 follow-up child | Parent AC row 4.                        |
| Protected-status action restrictions              | SPE-1046 follow-up child | Parent AC row 5.                        |
| Revocation/downgrade to access/trust outcomes     | SPE-1046 follow-up child | Parent AC row 6.                        |

## See also

- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-1046-permission-surfacing-slice-1.md`
- `planning/spe-1046-onboarding-clearance-readiness-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
