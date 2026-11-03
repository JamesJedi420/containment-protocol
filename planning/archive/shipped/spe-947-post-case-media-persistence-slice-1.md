# SPE-947 — Post-case media persistence (slice 1)

One-page implementation plan. Linear: [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573/post-case-media-persistence-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) / [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) / [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) / [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571) / [SPE-2572](https://linear.app/spectranoir/issue/SPE-2572); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2573 — Post-case media persistence (slice 1)](https://linear.app/spectranoir/issue/SPE-2573/post-case-media-persistence-slice-1)     |
| **Status**          | **In Progress**                                                                                                                           |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog** |
| **Branch**          | `spe-947-post-case-media-persistence-slice-1`                                                                                             |
| **Base `main` SHA** | `7301db05`                                                                                                                                |

## Goal

Satisfy SPE-947 parent AC row 6 with a pure deterministic evaluator: after local containment succeeds, hazardous content, mirrors, or derivative media can still mark the case risky — verifiable from the resulting decision in tests.

## Prerequisite

| Shipped                      | Anchor                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Platform reach multiplier    | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) — AC row 1; related, not rewritten |
| Platform outage / degrade    | [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) — AC row 4; distinct, not composed |
| Counter-memetic uptake gate  | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) — AC row 3; related, not composed  |
| Footage exposure traffic     | [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571) — AC row 2; related, not composed  |
| Takedown resistance          | [SPE-2572](https://linear.app/spectranoir/issue/SPE-2572) — AC row 5; distinct, not composed |
| Latent / derivative concepts | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) — compact inputs only; no rewrite  |
| Parent AC / deferred hygiene | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`                              |
| Pure-evaluator pattern       | `contentOwnerTakedownResistance.ts` / `footageExposureTraffic.ts`                            |

## Scope

| In                                                                          | Out                                        |
| --------------------------------------------------------------------------- | ------------------------------------------ |
| Compact case + media-artifact inputs + `evaluatePostCaseMediaPersistence`   | GameState persistence / schema / hydration |
| Outcomes `remains_risky` \| `cleared` \| `blocked` with sorted reason codes | Weekly orchestration / advanceWeek hooks   |
| Deterministic fallbacks for missing/invalid config (never remains risky)    | Store / UI / planning mirror               |
| Focused Vitest: persist-risk, clear/no-persist, incomplete fallbacks        | Full mirror graph / commercialization sim  |
| Slice doc + backlog handoff line                                            | Takedown resistance (row 5 / SPE-2572)     |
|                                                                             | Platform outage degrade (row 4 / SPE-2569) |
|                                                                             | SPE-2111 registry rewrite; SPE-947 Done    |

## Evaluation contract

- Requires `localContainmentSucceeded === true` for persist-risk / clear paths. When false or invalid → `blocked` (incomplete post-containment evaluation; never `remains_risky`).
- Sum `riskWeight` of artifacts with `persistsAfterContainment === true` and valid kind/weight (omitted empty list after successful containment → `cleared`).
- `rawScore >= riskThreshold` → `remains_risky` (`media_persistence_risk` plus kind-specific persist codes).
- `rawScore < riskThreshold` (including zero from non-persisting artifacts) → `cleared` (`media_cleared`).
- Missing/invalid input, threshold, or any present-but-invalid artifact → no throw; reason codes; **`blocked`** (incomplete config never marks risky). Displayed score is micro-rounded; band decisions use the raw sum.
- Distinct from SPE-2572 (no owner incentives) and SPE-2569 (no uptime / reach / platform operation fields).

## Acceptance

- [x] Domain helper exports stable media/case types and `evaluatePostCaseMediaPersistence`.
- [x] Persists-risk path asserted when local containment succeeded and hazardous/mirror/derivative media persist.
- [x] Clear / no-persist path asserted when media are absent or non-persisting after containment.
- [x] Missing/invalid config returns deterministic non-risky / blocked fallbacks with reason codes.
- [x] No GameState, persistence, schema, weekly hook, store, or UI changes.
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge.
- [x] Targeted tests + lint green.

## Validation

- `npm.cmd run test:run -- src/test/postCaseMediaPersistence.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                      | Owner                                   | Why                                                          |
| ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| Adaptation / commercialization kinds      | **SPE-2606** (in progress) / SPE-1085   | Opened as next SPE-947-owned deferred sibling after SPE-2605 |
| Persistence / weekly / UI wire-up         | SPE-2576 / SPE-2577 / SPE-2578 **Done** | Domain-only foundation; wire-up shipped in follow-ons        |
| Propagation graph wire-up                 | SPE-956 / harvest family                | Deferred since SPE-2111                                      |
| Compose with takedown / outage / exposure | SPE-947 follow-up child                 | Keep evaluators independently pure                           |
| Full SPE-2111 registry linkage            | SPE-947 follow-up child                 | Compact inputs only in slice 1                               |

## See also

- `planning/spe-947-takedown-resistance-slice-1.md`
- `planning/spe-947-footage-exposure-traffic-slice-1.md`
- `planning/spe-947-counter-memetic-uptake-gate-slice-1.md`
- `planning/spe-947-platform-outage-degrade-slice-1.md`
- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
