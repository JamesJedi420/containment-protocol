# SPE-1046 - Revocation outcome surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2509](https://linear.app/spectranoir/issue/SPE-2509/revocation-outcome-surfacing-for-entity-welfare-mirror) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2508](https://linear.app/spectranoir/issue/SPE-2508/revocationdowngrade-access-outcomes-substrate); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2509 - Revocation outcome surfacing for entity welfare mirror](https://linear.app/spectranoir/issue/SPE-2509/revocation-outcome-surfacing-for-entity-welfare-mirror) |
| **Status**          | **In Progress**                                                                                                                                                           |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                       |
| **Branch**          | `spe-1046-revocation-outcome-surfacing-slice-1`                                                                                                                           |
| **Base `main` SHA** | `afb89b48`                                                                                                                                                                |

## Goal

Surface compact read-only revocation/access outcome labels in the existing entity-welfare reclassification mirror so designers can inspect later access and trust consequences without adding persistence, schema fields, weekly mutation, or enforcement wiring.

## Scope

| In                                                                                  | Out                                                   |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Mirror view labels derived from `evaluateAffiliationRevocationOutcome`              | New `GameState` fields                                |
| Compact `Access outcome` column in the reclassification mirror page                 | Entity-welfare record schema changes                  |
| Deterministic pending/denied/reverted/approved projection from existing record data | Mission, procurement, facility, or hire-flow mutation |
| Focused mirror/page tests and backlog handoff                                       | Parent closure or durable person-record integration   |

## Projection

- `pending` maps to `clearance_review` and restricted review outcomes.
- `denied` maps to `revocation` and blocked sensitive access when aligned upstream permission evidence is blocked.
- `reverted` maps to `downgrade` and reduced file/gear access.
- `approved` displays stable unchanged/trusted inspection labels and does not imply an active revocation event.

## Acceptance

- [x] Mirror records expose stable access outcome labels.
- [x] The mirror page renders an `Access outcome` column for persisted records.
- [x] Empty registry state remains unchanged.
- [x] No GameState or entity-welfare record schemas change.
- [x] Targeted tests pass.

## Validation

- `npm.cmd run test:run -- src/test/affiliationRevocationOutcomes.test.ts src/features/operations/entityWelfareReclassificationMirrorView.test.ts src/features/operations/EntityWelfareReclassificationMirrorPage.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                              | Owner                    | Why                                              |
| ------------------------------------------------- | ------------------------ | ------------------------------------------------ |
| Revocation outcome enforcement                    | SPE-1046 follow-up child | This slice is read-only surfacing.               |
| Mission/procurement/facility integration          | SPE-1046 follow-up child | Operational mutation is outside this slice.      |
| Onboarding persistence or site-clearance mutation | SPE-1046 follow-up child | Separate parent thread.                          |
| SPE-947 propagation follow-ons                    | SPE-947/SPE-1046 child   | Separate parent thread and owner prioritization. |

## See also

- `planning/spe-1046-revocation-downgrade-outcomes-slice-1.md`
- `planning/spe-1046-permission-surfacing-slice-1.md`
- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
