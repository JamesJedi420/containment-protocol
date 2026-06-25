# SPE-1046 - Durable person-status mission routing evidence (slice 1)

One-page implementation plan. Linear: [SPE-2521](https://linear.app/spectranoir/issue/SPE-2521/durable-person-status-mission-routing-evidence) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2520](https://linear.app/spectranoir/issue/SPE-2520/durable-person-status-weekly-progression); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2521 - Durable person-status mission routing evidence](https://linear.app/spectranoir/issue/SPE-2521/durable-person-status-mission-routing-evidence) |
| **Status**          | **In Progress**                                                                                                                                           |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                       |
| **Branch**          | `spe-1046-durable-person-status-mission-routing-slice-1`                                                                                                  |
| **Base `main` SHA** | `a0196aa7`                                                                                                                                                |

## Goal

Let persisted `affiliationPersonStatusRecords` participate in existing explicit mission-routing clearance gates without adding new blocker codes, persistence fields, UI, or non-mission enforcement.

## Scope

| In                                                                                                 | Out                                                 |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Exact `subjectId` match to routed team id or member agent ids                                      | Name/label/candidate inference                      |
| Durable evidence for existing site, facility, dual-loyalty, protected-status, and revocation gates | New mission requirement tags or blocker codes       |
| Reuse existing SPE-1046 evaluators/projections                                                     | New persistence, schema, UI, or weekly mutation     |
| Focused mission-routing and weekly-progression integration tests                                   | Procurement, facility, or broader non-mission gates |
| Backlog handoff update                                                                             | SPE-1046 parent closure                             |

## Acceptance

- [x] Missions without explicit SPE-1046 clearance requirements route unchanged.
- [x] Durable site/facility grants can satisfy explicit mission clearance requirements for exact matched team/member subjects.
- [x] Non-matching durable records do not affect routing.
- [x] Durable dual-loyalty, protected-status, and revocation evidence can surface existing hard blocker codes.
- [x] Weekly progression can advance durable evidence and change later mission-routing eligibility.
- [x] No new persistence fields, UI surfaces, weekly mutation policy, non-mission gates, or blocker codes.

## Validation

- `npm.cmd run test:run -- src/test/mission.intake.triage.routing.test.ts src/test/missionRevocationEnforcement.test.ts src/test/missionProtectedStatusEnforcement.test.ts src/test/missionDualLoyaltyEnforcement.test.ts src/test/advanceWeek.affiliationPersonStatus.integration.test.ts src/test/affiliationPersonStatusRecords.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                                   | Owner                    | Why                                      |
| -------------------------------------- | ------------------------ | ---------------------------------------- |
| Procurement/facility/non-mission gates | SPE-1046 follow-up child | Separate gate surfaces and policy.       |
| SPE-947 propagation follow-ons         | SPE-947 follow-up child  | Separate registry parent thread.         |
| SPE-1046 parent closure                | SPE-1046                 | Parent acceptance remains broader scope. |

## See also

- `planning/spe-1046-durable-person-status-records-slice-1.md`
- `planning/spe-1046-durable-person-status-weekly-progression-slice-1.md`
- `planning/spe-1046-site-clearance-enforcement-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
