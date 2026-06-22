# SPE-1046 - Dual-loyalty risk substrate (slice 1)

One-page implementation plan. Linear: [SPE-2506](https://linear.app/spectranoir/issue/SPE-2506/dual-loyalty-risk-substrate) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2502](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions), [SPE-2504](https://linear.app/spectranoir/issue/SPE-2504/onboarding-clearance-readiness-substrate), and [SPE-2505](https://linear.app/spectranoir/issue/SPE-2505/site-specific-clearance-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2506 - Dual-loyalty risk substrate](https://linear.app/spectranoir/issue/SPE-2506/dual-loyalty-risk-substrate)                 |
| **Status**          | **Shipped**                                                                                                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog** |
| **Branch**          | `spe-1046-dual-loyalty-risk-slice-1`                                                                                                |
| **Base `main` SHA** | `15c1d643`                                                                                                                          |

## Goal

Add a pure deterministic dual-loyalty risk substrate over explicit read-only affiliation evidence. This makes SPE-1046's overlapping-affiliation risk parent row concrete without adding persistence, UI, enforcement wiring, or weekly mutation.

## Scope

| In                                                     | Out                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `affiliationDualLoyaltyRisk` pure domain helper        | GameState persistence fields                                   |
| Stable loyalty anchors and risk levels                 | Candidate / Agent / EntityWelfareReclassificationRecord schema |
| Optional onboarding and site-clearance decision inputs | Mission, procurement, facility, or hire-flow mutation          |
| Focused Vitest coverage and backlog handoff            | Protected-status actions, revocation paths, or UI surfacing    |

## Risk Contract

- Agency-only subjects remain no risk.
- Benign civic, family, medical, religious, and academic overlaps produce watch risk.
- Criminal, occult, patron, and rival-containment overlaps restrict file, gear, and mission surfaces.
- Hostile evidence, lost onboarding, or blocked site clearance blocks all permission surfaces.
- Invalid or sparse input never throws; decisions fall back with validation reason codes.

## Acceptance

- [x] Domain helper exports stable anchor/risk/decision types and set evaluators.
- [x] Benign, restricted, blocked, onboarding, site-clearance, and invalid fallback policies are covered.
- [x] No GameState, Candidate, Agent, or entity-welfare record schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationDualLoyaltyRisk.test.ts src/test/affiliationSiteClearance.test.ts src/test/affiliationOnboardingReadiness.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                              | Owner                    | Why                                     |
| ------------------------------------------------- | ------------------------ | --------------------------------------- |
| Dual-loyalty UI surfacing                         | SPE-1046 follow-up child | This slice is pure read-only substrate. |
| Enforcement in mission/procurement/facility flows | SPE-1046 follow-up child | No operational mutation in this slice.  |
| Protected-status action restrictions              | SPE-1046 follow-up child | Parent AC row 5.                        |
| Revocation/downgrade to access/trust outcomes     | SPE-1046 follow-up child | Parent AC row 6.                        |

## See also

- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-1046-onboarding-clearance-readiness-slice-1.md`
- `planning/spe-1046-site-specific-clearance-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
