# SPE-1046 - Revocation/downgrade access outcomes substrate (slice 1)

One-page implementation plan. Linear: [SPE-2508](https://linear.app/spectranoir/issue/SPE-2508/revocationdowngrade-access-outcomes-substrate) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2502](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions), [SPE-2504](https://linear.app/spectranoir/issue/SPE-2504/onboarding-clearance-readiness-substrate), [SPE-2505](https://linear.app/spectranoir/issue/SPE-2505/site-specific-clearance-substrate), [SPE-2506](https://linear.app/spectranoir/issue/SPE-2506/dual-loyalty-risk-substrate), and [SPE-2507](https://linear.app/spectranoir/issue/SPE-2507/protected-status-action-restrictions-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2508 - Revocation/downgrade access outcomes substrate](https://linear.app/spectranoir/issue/SPE-2508/revocationdowngrade-access-outcomes-substrate) |
| **Status**          | **In Progress**                                                                                                                                          |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                      |
| **Branch**          | `spe-1046-revocation-downgrade-outcomes-slice-1`                                                                                                         |
| **Base `main` SHA** | `b1915bc7`                                                                                                                                               |

## Goal

Add a pure deterministic revocation/downgrade access outcome substrate over explicit read-only subject evidence. This makes SPE-1046's revocation/downgrade parent row concrete without adding persistence, UI, enforcement wiring, or weekly mutation.

## Scope

| In                                                                                    | Out                                                            |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `affiliationRevocationOutcomes` pure domain helper                                    | GameState persistence fields                                   |
| Stable revocation kinds, causes, trust outcomes, and blocked-surface decisions        | Candidate / Agent / EntityWelfareReclassificationRecord schema |
| Optional permission, onboarding, site-clearance, dual-loyalty, and protected overlays | Mission, procurement, facility, or hire-flow mutation          |
| Focused Vitest coverage and backlog handoff                                           | Revocation UI surfacing or enforcement                         |

## Risk Contract

- Suspension/probation restricts affected surfaces and lowers trust outcome.
- Downgrade reduces file/gear/mission or site access while preserving housing unless upstream blocks apply.
- Revocation/expulsion revokes sensitive file/gear/mission access.
- Quarantine blocks mission/site movement while preserving care-duty room and housing handling.
- Betrayal, corruption, or blocked upstream decisions escalate to blocked.
- Medical-hold and protected-status causes remain restricted and care-aware.
- Invalid or sparse input never throws; decisions fall back with validation reason codes.

## Acceptance

- [x] Domain helper exports stable kind/cause/outcome/decision types and set evaluators.
- [x] Suspension, downgrade, revocation, quarantine, upstream-overlay, care-aware, and invalid fallback policies are covered.
- [x] No GameState, Candidate, Agent, or entity-welfare record schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationRevocationOutcomes.test.ts src/test/affiliationProtectedStatusActions.test.ts src/test/affiliationDualLoyaltyRisk.test.ts src/test/affiliationSiteClearance.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                              | Owner                    | Why                                     |
| ------------------------------------------------- | ------------------------ | --------------------------------------- |
| Revocation/downgrade UI surfacing                 | SPE-1046 follow-up child | This slice is pure read-only substrate. |
| Enforcement in mission/procurement/facility flows | SPE-1046 follow-up child | No operational mutation in this slice.  |
| Onboarding persistence or surfacing               | SPE-1046 follow-up child | Separate parent thread.                 |
| SPE-947 propagation follow-ons                    | SPE-947/SPE-1046 child   | Separate parent thread.                 |

## See also

- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-1046-onboarding-clearance-readiness-slice-1.md`
- `planning/spe-1046-site-specific-clearance-slice-1.md`
- `planning/spe-1046-dual-loyalty-risk-slice-1.md`
- `planning/spe-1046-protected-status-action-restrictions-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
