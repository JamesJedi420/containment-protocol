# SPE-947 — GameState persistence / schema / hydration for evaluators (slice 1)

One-page implementation plan. Linear: [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576/gamestate-persistence-schema-hydration-for-spe-947-evaluators-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). First deferred row after shipped [SPE-2575](https://linear.app/spectranoir/issue/SPE-2575); follows SPE-2568–2573 pure evaluators; [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2576 — GameState persistence / schema / hydration for SPE-947 evaluators (slice 1)](https://linear.app/spectranoir/issue/SPE-2576/gamestate-persistence-schema-hydration-for-spe-947-evaluators-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                               |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                     |
| **Branch**          | `spe-947-gamestate-persistence-slice-1`                                                                                                                                                       |
| **Base `main` SHA** | `6eca5e46`                                                                                                                                                                                    |

## Goal

Persist compact platform / plan / media / owner inputs (or thin wrappers) needed by shipped SPE-2568–2573 pure evaluators on `GameState` with sanitize/hydrate, `SCHEMA_REGISTRY` documentation, and focused round-trip Vitest. Domain-evaluator Yes ≠ umbrella Done.

## Prerequisite (on `main` @ `6eca5e46`)

| Shipped | Anchor |
| --- | --- |
| Platform reach multiplier | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) — `evaluatePlatformReachMultiplier` |
| Platform outage degrade | [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) — `evaluatePlatformOperationDegrade` |
| Counter-memetic uptake gate | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) — `evaluateCounterMemeticUptakeGate` |
| Footage exposure traffic | [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571) — `evaluateFootageExposureTraffic` |
| Takedown resistance | [SPE-2572](https://linear.app/spectranoir/issue/SPE-2572) — `evaluateContentOwnerTakedownResistance` |
| Post-case media persistence | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573) — `evaluatePostCaseMediaPersistence` |
| Parent AC matrix | [SPE-2575](https://linear.app/spectranoir/issue/SPE-2575) — deferred table names this slice |
| Persistence pattern | [SPE-2336](https://linear.app/spectranoir/issue/SPE-2336) — `visualTriggerHazardRecords` sanitize/hydrate |

## Scope

| In | Out |
| --- | --- |
| Eight compact `spe947*` maps on `GameState` + `spe947EvaluatorPersistence.ts` | Weekly / `advanceWeek` hooks |
| `sanitizeSpe947*` + `runTransfer` hydrate wire | Store / UI / planning mirror |
| `resolve*EvaluationInput` helpers from persisted shape | Propagation graph wire-up |
| Default `{}` in `createStartingState` | Evaluator contract changes (SPE-2568–2574) |
| `SCHEMA_REGISTRY.md` entry (`spe-947-evaluator.v1`) | SPE-2111 registry changes |
| Focused Vitest: sanitize/hydrate round-trip + evaluator parity | SPE-947 parent Done |

## Persisted maps

| GameState field | Evaluator | Thin wrapper |
| --- | --- | --- |
| `spe947PlatformRecords` | SPE-2568 / SPE-2569 | Unified platform + optional `viewCount` / `anomalyReach` |
| `spe947OperationRecords` | SPE-2569 | `PlatformOperationRequest` |
| `spe947ContentArtifacts` | SPE-2571 | `ContentPropagationArtifact` |
| `spe947CounterMemeticPlans` | SPE-2570 | `CounterMemeticPlan` |
| `spe947ContentOwners` | SPE-2572 | `ContentOwner` |
| `spe947PostCaseMediaCases` | SPE-2573 | `PostCaseMediaPersistenceInput` |
| `spe947FootageExposureBindings` | SPE-2571 | Baseline bindings keyed by artifact id |
| `spe947TakedownResistanceBindings` | SPE-2572 | Threshold bindings keyed by owner id |

## Acceptance

- [x] Valid EXAMPLE fixture records round-trip through serialize/import
- [x] Invalid / duplicate-id entries dropped safely on hydrate without throw
- [x] Persisted shape feeds SPE-2568–2573 evaluators with same decisions as direct EXAMPLE inputs
- [x] Empty default state does not falsely satisfy parent AC scenarios
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947EvaluatorPersistence.test.ts`
- `npm.cmd run lint`

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Weekly / `advanceWeek` orchestration hooks | New SPE-947 child | Persistence before week-close |
| Store / UI / planning-mirror surfacing | New SPE-947 child | No operator surface |
| Propagation graph wire-up | SPE-956 / harvest #965 family | Deferred since SPE-2111 slice 1 |
| Full SPE-2111 registry linkage | SPE-947 follow-up child | Compact evaluator inputs only |
| Parent umbrella Done | Later SPE-947 reconciliation | Wire-up still open |

## See also

- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-2.md`
- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/backlog.md`
