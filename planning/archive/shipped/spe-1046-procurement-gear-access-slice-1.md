# SPE-1046 - Procurement gear access enforcement (slice 1)

One-page implementation plan. Linear: [SPE-2523](https://linear.app/spectranoir/issue/SPE-2523/spe-1046-procurement-gear-access-enforcement) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2521](https://linear.app/spectranoir/issue/SPE-2521/durable-person-status-mission-routing-evidence); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2523 - SPE-1046 procurement gear access enforcement](https://linear.app/spectranoir/issue/SPE-2523/spe-1046-procurement-gear-access-enforcement) |
| **Status**          | **In Progress**                                                                                                                                       |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                   |
| **Branch**          | `spe-1046-procurement-gear-access-slice-1`                                                                                                            |
| **Base `main` SHA** | `451eac0d`                                                                                                                                            |

## Goal

Let procurement listings ask the existing SPE-1046 gear permission surface whether restricted or rare gear can be released, while preserving current clearance, budget, supplier-stock, and resource-allocation blockers as separate reasons.

## Scope

| In                                                                                    | Out                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Pure procurement gear access helper over `entityWelfareStatusPermissions` gear checks | New persistence fields                           |
| Enforcement only for `restricted` / `rare` acquisition listings                       | Person-name guessing or durable-record inference |
| Existing `accessAvailable`, `accessBlockedReason`, and `accessDetails` surfaces       | Mission-routing changes                          |
| Market/procurement view detail surfacing through existing view models                 | Facility, housing, room, or file enforcement     |
| Focused market/procurement tests plus full pre-ship validation                        | SPE-1046 parent closure                          |

## Acceptance

- [ ] Restricted listing still blocks before permission/clearance.
- [ ] Clearance-authorized restricted gear remains available when no SPE-1046 gear record restricts it.
- [ ] Restricted or blocked SPE-1046 gear permission keeps restricted procurement unavailable.
- [ ] Blocker reason appears in market/procurement details through existing fields.
- [ ] Budget blockers remain separate from access blockers.
- [ ] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/sim.market.test.ts src/features/market/marketView.test.ts src/features/procurement/procurementView.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                                         | Owner                    | Why                                       |
| -------------------------------------------- | ------------------------ | ----------------------------------------- |
| Durable person-name or broad record matching | SPE-1046 follow-up child | Requires explicit matching policy.        |
| Facility, housing, room, and file gates      | SPE-1046 follow-up child | Separate permission surfaces.             |
| Mission routing changes                      | SPE-1046 follow-up child | Mission gates already shipped separately. |
| SPE-1046 parent closure                      | SPE-1046                 | Parent acceptance remains broader scope.  |

## See also

- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/spe-1046-durable-person-status-mission-routing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
