# SPE-947 — Counter-memetic lore + distributor + uptake gate (slice 1)

One-page implementation plan. Linear: [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570/counter-memetic-lore-distributor-uptake-gate-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) / [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2570 — Counter-memetic lore + distributor + uptake gate (slice 1)](https://linear.app/spectranoir/issue/SPE-2570/counter-memetic-lore-distributor-uptake-gate-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                             |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                   |
| **Branch**          | `spe-947-counter-memetic-uptake-gate-slice-1`                                                                                                                               |
| **Base `main` SHA** | `ee721082`                                                                                                                                                                  |

## Goal

Satisfy SPE-947 parent AC row 3 with a pure deterministic evaluator: a counter-memetic plan requires crafted lore, distributor choice, propagation time, and sufficient uptake before a dependent countermeasure is ready, verifiable from the readiness outcome in tests.

## Prerequisite

| Shipped                      | Anchor                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Platform reach multiplier    | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) — AC row 1; related, not rewritten |
| Platform outage / degrade    | [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) — AC row 4; related, not composed  |
| Parent AC / deferred hygiene | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`                              |
| Pure-evaluator pattern       | `platformReachMultiplier.ts` / `platformOperationDegrade.ts`                                 |

## Scope

| In                                                                      | Out                                          |
| ----------------------------------------------------------------------- | -------------------------------------------- |
| Compact plan input + `evaluateCounterMemeticUptakeGate`                 | GameState persistence / schema / hydration   |
| Outcomes `blocked` \| `propagating` \| `ready` with sorted reason codes | Weekly orchestration / advanceWeek hooks     |
| Deterministic fallbacks for missing/invalid config                      | Store / UI / planning mirror                 |
| Focused Vitest coverage of ready, blocked, and propagating paths        | Full counter-memetic pipeline / internet sim |
| Slice doc + backlog handoff line                                        | Footage/exposure (row 2), takedown (row 5)   |
|                                                                         | Post-case media (row 6); SPE-947 parent Done |

## Evaluation contract

- Priority (first match): missing/invalid plan or enums → `blocked`; lore not `crafted` → `blocked`; missing distributor → `blocked`; invalid required weeks → `blocked`; `elapsed < required` → `propagating`; uptake not `sufficient` → `blocked`; else → `ready`.
- `partial` uptake is never enough for `ready`.
- Missing plan / invalid enums / invalid week values → no throw; reason codes; conservative `blocked` fallbacks as coded.

## Acceptance

- [x] Domain helper exports stable types and `evaluateCounterMemeticUptakeGate`.
- [x] Ready path only when lore crafted + distributor set + propagation elapsed + uptake sufficient; blocked and propagating paths asserted in tests.
- [x] Missing/invalid config returns deterministic fallbacks with reason codes.
- [x] No GameState, persistence, schema, weekly hook, store, or UI changes.
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge.
- [x] Targeted tests + lint green.

## Validation

- `npm.cmd run test:run -- src/test/counterMemeticUptakeGate.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                        | Owner                        | Why                                  |
| ------------------------------------------- | ---------------------------- | ------------------------------------ |
| Footage/post → civilian exposure traffic    | SPE-947 follow-up child      | Parent AC row 2                      |
| Content-owner takedown resistance           | SPE-947 follow-up child      | Parent AC row 5                      |
| Post-case media persistence                 | SPE-947 follow-up / SPE-1085 | Parent AC row 6                      |
| Persistence / weekly / UI wire-up for plans | SPE-947 follow-up child      | This slice is domain-only foundation |
| Propagation graph wire-up                   | SPE-956 / harvest family     | Deferred since SPE-2111              |

## See also

- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/spe-947-platform-outage-degrade-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
