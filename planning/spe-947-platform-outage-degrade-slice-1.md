# SPE-947 — Platform outage / reach-failure operation degrade (slice 1)

One-page implementation plan. Linear: [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569/platform-outage-reach-failure-operation-degrade-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2569 — Platform outage / reach-failure operation degrade (slice 1)](https://linear.app/spectranoir/issue/SPE-2569/platform-outage-reach-failure-operation-degrade-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                 |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                       |
| **Branch**          | `spe-947-platform-outage-degrade-slice-1`                                                                                                                                       |
| **Base `main` SHA** | `cc1ec1d4`                                                                                                                                                                      |

## Goal

Satisfy SPE-947 parent AC row 4 with a pure deterministic evaluator: an in-world platform fails or degrades an operation due to outage, crash, deletion, or insufficient reach, verifiable from the resulting outcome in tests.

## Prerequisite

| Shipped                      | Anchor                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| Platform reach multiplier    | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) — AC row 1 foundation; related, not rewritten |
| Parent AC / deferred hygiene | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`                                         |
| Pure-evaluator pattern       | `platformReachMultiplier.ts` / SPE-1046 permission evaluators                                           |

## Scope

| In                                                                       | Out                                          |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| Compact platform + operation inputs + `evaluatePlatformOperationDegrade` | GameState persistence / schema / hydration   |
| Outcomes `ok` \| `degraded` \| `failed` with sorted reason codes         | Weekly orchestration / advanceWeek hooks     |
| Deterministic fallbacks for missing/invalid config                       | Store / UI / planning mirror                 |
| Focused Vitest coverage of fail and degrade paths                        | Full internet sim / counter-memetic pipeline |
| Slice doc + backlog handoff line                                         | Takedown resistance / post-case media        |
|                                                                          | SPE-947 parent Done                          |

## Evaluation contract

- Uptime priority (first match): `deleted` → `failed`; `outage` / `crashed` → `failed`; `degraded` → `degraded`.
- When uptime allows continuation: valid `requiredReach` and `availableReach < requiredReach` → `degraded` (`insufficient_reach`); otherwise online + sufficient reach → `ok`.
- Missing platform / operation / invalid uptime / invalid reach values → no throw; reason codes; conservative fail or degrade fallbacks as coded.
- Explicit `availableReach` on the platform input (does not require composing SPE-2568 view-scale math).

## Acceptance

- [x] Domain helper exports stable types and `evaluatePlatformOperationDegrade`.
- [x] Failed path from outage/crash/deletion and degraded path from insufficient reach or degraded uptime asserted in tests.
- [x] Missing/invalid config returns deterministic fallbacks with reason codes.
- [x] No GameState, persistence, schema, weekly hook, store, or UI changes.
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge.
- [x] Targeted tests + lint green.

## Validation

- `npm.cmd run test:run -- src/test/platformOperationDegrade.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                                 | Owner                        | Why                                  |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------ |
| Counter-memetic lore + distributor + uptake          | SPE-947 follow-up child      | Parent AC row 3                      |
| Footage/post → civilian exposure traffic             | SPE-947 follow-up child      | Parent AC row 2                      |
| Content-owner takedown resistance                    | SPE-947 follow-up child      | Parent AC row 5                      |
| Post-case media persistence                          | SPE-947 follow-up / SPE-1085 | Parent AC row 6                      |
| Persistence / weekly / UI wire-up for platform nodes | SPE-947 follow-up child      | This slice is domain-only foundation |
| Propagation graph wire-up                            | SPE-956 / harvest family     | Deferred since SPE-2111              |

## See also

- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
