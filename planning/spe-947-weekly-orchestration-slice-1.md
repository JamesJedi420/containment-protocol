# SPE-947 — Weekly / advanceWeek orchestration hooks for evaluators (slice 1)

One-page implementation plan. Linear: [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577/weekly-advanceweek-orchestration-hooks-for-spe-947-evaluators-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next deferred row after shipped [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2577 — Weekly / advanceWeek orchestration hooks for SPE-947 evaluators (slice 1)](https://linear.app/spectranoir/issue/SPE-2577/weekly-advanceweek-orchestration-hooks-for-spe-947-evaluators-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                                             |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                                   |
| **Branch**          | `spe-947-weekly-orchestration-slice-1`                                                                                                                                                                      |
| **Base `main` SHA** | `f330bb2e`                                                                                                                                                                                                  |

## Goal

Wire persisted `spe947*` evaluator maps into `advanceWeek` with a pure deterministic week-close tick: advance counter-memetic `elapsedPropagationWeeks` for eligible plans, and apply optional authored platform `weeklyViewDelta` / `weeklyUptimeState` when present. Persistence Done ≠ umbrella Done.

## Prerequisite (on `main` @ `f330bb2e`)

| Shipped                      | Anchor                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GameState persistence        | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — `spe947*` maps + sanitize/hydrate                         |
| Counter-memetic uptake gate  | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) — `elapsedPropagationWeeks`                                 |
| Platform reach / outage      | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) / [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) |
| Weekly orchestration pattern | [SPE-2337](https://linear.app/spectranoir/issue/SPE-2337) — `applyWeeklyVisualTriggerHazardTick`                      |

## Orchestration tick contract (slice 1)

- **Counter-memetic elapsed weeks** — when `loreState === 'crafted'` and `distributorId` is non-empty, increment `elapsedPropagationWeeks` by 1 and stamp `lastWeeklyTickWeek`.
- **Optional platform view delta** — when `weeklyViewDelta` is authored, add it to `viewCount` (defaulting missing viewCount to 0) once per week.
- **Optional platform uptime delta** — when `weeklyUptimeState` is authored, set `uptimeState` to that value once per week.
- **Idempotent same-week re-tick** — `lastWeeklyTickWeek === week` is a no-op.
- **No-op** — empty maps, ineligible plans, platforms without authored deltas; no invented internet growth.

## Scope

| In                                                                                | Out                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------ |
| `applyWeeklySpe947EvaluatorTick` in domain module                                 | Store / UI / planning mirror               |
| Call from `advanceWeek` after week increment                                      | Propagation graph / internet simulator     |
| Optional sanitize fields for authored deltas + tick marker                        | Evaluator contract changes (SPE-2568–2574) |
| Focused Vitest: empty/no-op + plan/platform progression + advanceWeek integration | Mid-week mutations                         |
| Slice doc + backlog handoff                                                       | Weekly report-note surfacing               |
|                                                                                   | SPE-947 parent Done                        |

## Acceptance

- [x] Empty `spe947*` maps are a no-op without throw
- [x] Authored counter-memetic plan advances `elapsedPropagationWeeks` on week-close when eligible
- [x] Optional authored platform view/uptime deltas apply when present; absent deltas leave platforms unchanged
- [x] Empty default state does not falsely satisfy parent AC scenarios
- [x] Tick is deterministic and testable; same-week re-tick is idempotent
- [ ] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947EvaluatorWeeklyOrchestration.test.ts src/test/advanceWeek.spe947Evaluator.integration.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                   | Suggested owner               | Why deferred                    |
| -------------------------------------- | ----------------------------- | ------------------------------- |
| Store / UI / planning-mirror surfacing | New SPE-947 child             | No operator surface             |
| Propagation graph wire-up              | SPE-956 / harvest #965 family | Deferred since SPE-2111 slice 1 |
| Weekly report-note surfacing           | Later SPE-947 child           | Tick first                      |
| Full SPE-2111 registry linkage         | SPE-947 follow-up child       | Compact evaluator inputs only   |
| Parent umbrella Done                   | Later SPE-947 reconciliation  | Wire-up still open              |

## See also

- `planning/spe-947-gamestate-persistence-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-3.md`
- `planning/spe-947-counter-memetic-uptake-gate-slice-1.md`
- `planning/backlog.md`
