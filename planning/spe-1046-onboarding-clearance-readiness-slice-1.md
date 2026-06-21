# SPE-1046 - Onboarding clearance readiness (slice 1)

One-page implementation plan. Linear: [SPE-2504](https://linear.app/spectranoir/issue/SPE-2504/onboarding-clearance-readiness-substrate) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2502](https://linear.app/spectranoir/issue/SPE-2502/status-class-permission-sets-rooms-files-gear-housing-missions) and [SPE-2503](https://linear.app/spectranoir/issue/SPE-2503/permission-surfacing-for-entity-welfare-mirror); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2504 - Onboarding clearance readiness substrate](https://linear.app/spectranoir/issue/SPE-2504/onboarding-clearance-readiness-substrate) |
| **Status**          | **Shipped** - PR #2932 @ `2a409753`                                                                                                           |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**           |
| **Branch**          | `spe-1046-onboarding-clearance-readiness-slice-1`                                                                                             |
| **Base `main` SHA** | `6b4936d7`                                                                                                                                    |

## Goal

Add a pure deterministic onboarding and clearance-readiness substrate over existing recruitment candidates. This makes SPE-1046's recruitment/onboarding parent row concrete without adding persistence, mutating the hiring flow, creating UI, or granting operational access.

## Scope

| In                                                                 | Out                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `affiliationOnboardingReadiness` pure domain helper                | GameState persistence fields                                    |
| Stable checkpoints: identity, background, role fit, training, oath | Candidate / Agent / EntityWelfareReclassificationRecord schemas |
| Optional read-only evidence context for training and oath checks   | Hiring mutation, weekly mutation, or UI surfacing               |
| Focused Vitest coverage and backlog handoff                        | Site-specific clearance, dual-loyalty, protected-status actions |

## Readiness Contract

- Stable checkpoint order: Identity, Background, Role Fit, Training, Oath Contract.
- Recruitment funnel states map to onboarding stages: prospect, contacted, screening, provisional, cleared, lost.
- Hired candidates are provisional until both training and oath/contract context evidence are present.
- Invalid or sparse candidate-like values never throw; decisions fall back with validation reason codes.
- Candidate-set evaluation is sorted by candidate id and byte-stable.

## Acceptance

- [x] Domain helper exports stable checkpoint/outcome/stage unions and evaluators.
- [x] Prospect, contacted, screening, provisional, cleared, and lost/expired policies are covered.
- [x] Optional read-only context can make hired candidates full-access eligible.
- [x] No GameState, Candidate, Agent, or entity-welfare record schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationOnboardingReadiness.test.ts src/test/recruitment.funnel.test.ts src/test/recruitment.helpers.contract.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                              | Owner                    | Why                                     |
| ------------------------------------------------- | ------------------------ | --------------------------------------- |
| Onboarding persistence / weekly progression       | SPE-1046 follow-up child | This slice is pure read-only substrate. |
| UI surfacing in recruitment or operations mirrors | SPE-1046 follow-up child | No UI in this slice.                    |
| Site-specific clearance and facility exclusion    | SPE-1046 follow-up child | Parent AC row 3.                        |
| Dual-loyalty overlap risk                         | SPE-1046 follow-up child | Parent AC row 4.                        |
| Protected-status action restrictions              | SPE-1046 follow-up child | Parent AC row 5.                        |
| Revocation/downgrade to access/trust outcomes     | SPE-1046 follow-up child | Parent AC row 6.                        |

## See also

- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-1046-permission-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
