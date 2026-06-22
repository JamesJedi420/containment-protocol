# SPE-1046 - Onboarding readiness surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2510](https://linear.app/spectranoir/issue/SPE-2510/onboarding-readiness-surfacing-for-recruitment-board) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2504](https://linear.app/spectranoir/issue/SPE-2504/onboarding-clearance-readiness-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2510 - Onboarding readiness surfacing for recruitment board](https://linear.app/spectranoir/issue/SPE-2510/onboarding-readiness-surfacing-for-recruitment-board) |
| **Status**          | **In Progress**                                                                                                                                                       |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                   |
| **Branch**          | `spe-1046-onboarding-readiness-surfacing-slice-1`                                                                                                                     |
| **Base `main` SHA** | `99e387c2`                                                                                                                                                            |

## Goal

Surface compact read-only onboarding and clearance readiness labels in the existing recruitment board so designers can inspect identity/background/role-fit/training/oath readiness without adding persistence, schema fields, hire-flow mutation, or enforcement wiring.

## Scope

| In                                                                            | Out                                                 |
| ----------------------------------------------------------------------------- | --------------------------------------------------- |
| Recruitment view labels derived from `evaluateAffiliationOnboardingReadiness` | New `GameState` fields                              |
| Compact `Clearance readiness` block on recruitment candidate cards            | Candidate schema changes                            |
| Stable checkpoint order: identity, background, role fit, training, oath       | Hire-flow mutation or access enforcement            |
| Focused recruitment view/page tests and backlog handoff                       | Parent closure or durable person-record integration |

## Projection

- Candidate stage displays from the existing readiness evaluator.
- Full-access eligibility displays as a read-only inspection label.
- Checkpoints display in deterministic order with safe outcome labels.
- Existing reveal/scout evidence can improve screening checkpoint outcomes through the shipped substrate.

## Acceptance

- [x] Recruitment candidate views expose stable onboarding readiness labels.
- [x] Recruitment candidate cards render compact clearance readiness details.
- [x] Empty recruitment pools remain unchanged.
- [x] No GameState or Candidate schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationOnboardingReadiness.test.ts src/features/recruitment/recruitmentView.test.ts src/features/recruitment/RecruitmentPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                      | Owner                    | Why                                              |
| ----------------------------------------- | ------------------------ | ------------------------------------------------ |
| Onboarding persistence                    | SPE-1046 follow-up child | This slice is read-only surfacing.               |
| Hire-flow gating or clearance enforcement | SPE-1046 follow-up child | Operational mutation is outside this slice.      |
| Site-clearance / dual-loyalty UI          | SPE-1046 follow-up child | Separate surfacing/enforcement threads.          |
| SPE-947 propagation follow-ons            | SPE-947/SPE-1046 child   | Separate parent thread and owner prioritization. |

## See also

- `planning/spe-1046-onboarding-clearance-readiness-slice-1.md`
- `planning/spe-1046-permission-surfacing-slice-1.md`
- `planning/spe-1046-revocation-outcome-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
