# SPE-947 — Content-owner takedown resistance (slice 1)

One-page implementation plan. Linear: [SPE-2572](https://linear.app/spectranoir/issue/SPE-2572/content-owner-takedown-resistance-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) / [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) / [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) / [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2572 — Content-owner takedown resistance (slice 1)](https://linear.app/spectranoir/issue/SPE-2572/content-owner-takedown-resistance-slice-1) |
| **Status**          | **In Progress**                                                                                                                                   |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**         |
| **Branch**          | `spe-947-takedown-resistance-slice-1`                                                                                                             |
| **Base `main` SHA** | `d3582267`                                                                                                                                        |

## Goal

Satisfy SPE-947 parent AC row 5 with a pure deterministic evaluator: a content owner resists takedown because of audience, status, profit, or identity incentives — outcomes `resists` / `yields` / `contested`, verifiable from the resulting decision in tests.

## Prerequisite

| Shipped                      | Anchor                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Platform reach multiplier    | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) — AC row 1; related, not rewritten |
| Platform outage / degrade    | [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) — AC row 4; distinct, not composed |
| Counter-memetic uptake gate  | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) — AC row 3; related, not composed  |
| Footage exposure traffic     | [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571) — AC row 2; related, not composed  |
| Parent AC / deferred hygiene | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`                              |
| Pure-evaluator pattern       | `platformOperationDegrade.ts` / `footageExposureTraffic.ts`                                  |

## Scope

| In                                                                          | Out                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------- |
| Compact owner + incentive inputs + `evaluateContentOwnerTakedownResistance` | GameState persistence / schema / hydration              |
| Outcomes `resists` \| `yields` \| `contested` with sorted reason codes      | Weekly orchestration / advanceWeek hooks                |
| Deterministic fallbacks for missing/invalid config (never resists)          | Store / UI / planning mirror                            |
| Focused Vitest: resist, yield, contested, incomplete fallbacks              | Full attention-economy sim                              |
| Slice doc + backlog handoff line                                            | Platform outage degrade (row 4 / SPE-2569)              |
|                                                                             | Post-case media (row 6); SPE-2111 rewrite; SPE-947 Done |

## Evaluation contract

- `resistanceScore = audience + status + profit + identity` (omitted incentives contribute 0; at least one valid incentive required).
- `score >= resistThreshold` → `resists` (`incentive_resistance`).
- `contestedThreshold <= score < resistThreshold` → `contested` (`incentive_contested`).
- `score < contestedThreshold` → `yields` (`incentive_yield`).
- Default `contestedThreshold = resistThreshold / 2` when omitted and resist threshold is valid.
- Missing/invalid owner, incentives, or thresholds → no throw; reason codes; **`yields`** (incomplete config never resists).
- Distinct from SPE-2569: no uptime / reach / platform operation fields.

## Acceptance

- [x] Domain helper exports stable owner/incentive types and `evaluateContentOwnerTakedownResistance`.
- [x] Resist path asserted when incentives meet threshold.
- [x] Yield path asserted when incentives are insufficient.
- [x] Contested path asserted for borderline band.
- [x] Missing/invalid config returns deterministic fallbacks with reason codes (no resist).
- [x] No GameState, persistence, schema, weekly hook, store, or UI changes.
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge.
- [x] Targeted tests + lint green.

## Validation

- `npm.cmd run test:run -- src/test/contentOwnerTakedownResistance.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                    | Owner                        | Why                                  |
| --------------------------------------- | ---------------------------- | ------------------------------------ |
| Post-case media persistence             | SPE-947 follow-up / SPE-1085 | Parent AC row 6                      |
| Persistence / weekly / UI wire-up       | SPE-947 follow-up child      | This slice is domain-only foundation |
| Propagation graph wire-up               | SPE-956 / harvest family     | Deferred since SPE-2111              |
| Compose with platform outage / exposure | SPE-947 follow-up child      | Keep evaluators independently pure   |
| Takedown pressure / coercion offsets    | SPE-947 follow-up child      | Out of slice-1 incentive floor       |

## See also

- `planning/spe-947-footage-exposure-traffic-slice-1.md`
- `planning/spe-947-counter-memetic-uptake-gate-slice-1.md`
- `planning/spe-947-platform-outage-degrade-slice-1.md`
- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
