# SPE-947 — Parent AC scenario integration tests (slice 1)

One-page implementation plan. Linear: [SPE-2574](https://linear.app/spectranoir/issue/SPE-2574/parent-ac-scenario-integration-tests-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568)–[SPE-2573](https://linear.app/spectranoir/issue/SPE-2573); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2574 — Parent AC scenario integration tests (slice 1)](https://linear.app/spectranoir/issue/SPE-2574/parent-ac-scenario-integration-tests-slice-1) |
| **Status**          | **In Progress**                                                                                                                                         |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**               |
| **Branch**          | `spe-947-parent-ac-integration-tests-slice-1`                                                                                                           |
| **Base `main` SHA** | `f65cb6b1`                                                                                                                                              |

## Goal

Satisfy SPE-947 parent AC row 7 with a focused Vitest suite that composes the six shipped pure evaluators into parent AC scenarios — deterministic spread, reach-dependent amplification, counter-memetic propagation delay, platform failure, takedown resistance, and post-case media persistence — without GameState/weekly/UI wire-up.

## Prerequisite

| Shipped                      | Anchor                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Platform reach multiplier    | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) — AC row 1; compose, do not rewrite |
| Platform outage / degrade    | [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) — AC row 4; compose, do not rewrite |
| Counter-memetic uptake gate  | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) — AC row 3; compose, do not rewrite |
| Footage exposure traffic     | [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571) — AC row 2; compose, do not rewrite |
| Takedown resistance          | [SPE-2572](https://linear.app/spectranoir/issue/SPE-2572) — AC row 5; compose, do not rewrite |
| Post-case media persistence  | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573) — AC row 6; compose, do not rewrite |
| Parent AC / deferred hygiene | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`                               |

## Scope

| In                                                                               | Out                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------ |
| One focused Vitest file composing SPE-2568–2573 evaluators into parent scenarios | GameState persistence / schema / hydration |
| EXAMPLE\_\* fixtures + existing evaluator APIs only                              | Weekly orchestration / advanceWeek hooks   |
| Incomplete-config paths that must not falsely satisfy AC                         | Store / UI / planning mirror               |
| Slice doc + backlog handoff                                                      | New composed domain subsystem              |
| Distinguish “AC met at domain-evaluator level” vs umbrella Done                  | Rewrite of prior evaluator contracts       |
|                                                                                  | SPE-2111 registry changes; SPE-947 Done    |

## Scenario contract

| Parent scenario                   | Evaluator                                | Satisfying assertion                                            |
| --------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Deterministic spread              | `evaluateFootageExposureTraffic`         | Active footage amplifies civilian exposure / attraction traffic |
| Reach-dependent amplification     | `evaluatePlatformReachMultiplier`        | Reach scales with view count from configured factor             |
| Counter-memetic propagation delay | `evaluateCounterMemeticUptakeGate`       | Incomplete elapsed weeks → `propagating` (not ready)            |
| Platform failure                  | `evaluatePlatformOperationDegrade`       | Outage / crash / insufficient reach → failed or degraded        |
| Takedown resistance               | `evaluateContentOwnerTakedownResistance` | Audience/status incentives → `resists`                          |
| Post-case media persistence       | `evaluatePostCaseMediaPersistence`       | After containment, persisting media → `remains_risky`           |

Incomplete-config paths assert non-satisfying outcomes (no false AC pass): missing platform does not amplify view-scale; missing artifact does not amplify; incomplete plan is not ready; missing platform fails operation; incomplete owner does not resist; incomplete media config never `remains_risky`.

## Acceptance

- [x] Focused Vitest suite asserts all six parent AC scenario families via SPE-2568–2573 evaluators.
- [x] Incomplete-config paths do not falsely satisfy AC.
- [x] No GameState, persistence, schema, weekly hook, store, or UI changes.
- [x] No rewrite of prior SPE-947 evaluator contracts; no new composed domain subsystem.
- [x] Slice doc + backlog handoff present.
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge.
- [x] Targeted tests + lint green.

## Validation

- `npm.cmd run test:run -- src/test/spe947ParentAcScenarioIntegration.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                 | Owner                   | Why                                             |
| ------------------------------------ | ----------------------- | ----------------------------------------------- |
| GameState / weekly / UI wire-up      | SPE-947 follow-up child | This slice is domain-evaluator integration only |
| Propagation graph wire-up            | SPE-956 / harvest       | Deferred since SPE-2111                         |
| Parent umbrella Done                 | SPE-947 reconciliation  | Child Done ≠ parent Done; wire-up still open    |
| Adaptation / commercialization kinds | SPE-947 / SPE-1085      | Out of SPE-2573 slice-1 kinds                   |
| Full SPE-2111 registry linkage       | SPE-947 follow-up child | Compact evaluator inputs only                   |

## See also

- `planning/spe-947-post-case-media-persistence-slice-1.md`
- `planning/spe-947-takedown-resistance-slice-1.md`
- `planning/spe-947-footage-exposure-traffic-slice-1.md`
- `planning/spe-947-counter-memetic-uptake-gate-slice-1.md`
- `planning/spe-947-platform-outage-degrade-slice-1.md`
- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
