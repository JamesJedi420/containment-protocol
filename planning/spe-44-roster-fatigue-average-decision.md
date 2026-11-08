# SPE-44 — decision note: roster fatigue average, unfiltered or filtered?

| Field      | Value                                                                   |
| ---------- | ----------------------------------------------------------------------- |
| Date       | 2026-11-08                                                              |
| Revision   | `f0099457` (post-#4932)                                                 |
| Owner      | SPE-44 (advance-week ownership per the dead-module inventory)           |
| Status     | **Open decision** — not implementation approval                         |
| Blocks     | Nothing. The SPE-44 extraction ships unfiltered either way (Decision 3) |
| Formalises | `planning/spe-44-fatigue-consolidation-slice.md` § Decision 3, line 106 |

This note settles one question: when the weekly fatigue average is consolidated into `recoveryFatigue.ts`, which denominator is canonical? It records what ships today, what a switch costs an existing save, and a recommendation. All line anchors are static reads at `f0099457`; re-check before implementing.

## What ships today

`WeeklyReport.avgFatigue` has **three competing definitions and a fourth applied on load**:

| #   | Formula                                                                               | Where                                                                                         | Consumers                                                               |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | **Unfiltered** agent mean (every agent in `agents`, whatever its status)              | `src/domain/sim/advanceWeek.ts:1068-1075`, written at `:4515`                                 | live weekly tick — the number a campaign actually gets                  |
| 2   | **Unfiltered** agent mean, byte-identical copy                                        | `src/domain/sim/weeklyReport.ts:136`, written at `:307`                                       | `buildWeeklyReport` only; no production importer (test-only)            |
| 3   | **Filtered** deployable-roster mean                                                   | `src/domain/sim/rosterFatigue.ts:25` with `isRosterFatigueAgent` at `:5`                      | `src/test/weeklyReport.test.ts` only — **not** called by either builder |
| 4   | **Team-mean-of-means**, applied over the clamp on hydration for the current week only | `src/app/store/runTransfer.ts:1746` (rollup at `:1769`, call at `:10157`), `:403` caps at 100 | every campaign loaded from a save                                       |

Definition 3 excludes four classes: `status === 'dead'`, `status === 'resigned'`, `assignment.state === 'training'`, and `isAgentAttritionUnavailable(agent)`.

Definition 4 is worth noticing before arguing about 1 versus 3: on load, if the current week's report carries persisted `teamStatus`, its stored `avgFatigue` is **replaced** by `round(mean(teamStatus[].avgFatigue))`, and each entry is itself a per-team mean over `getTeamMemberIds` (`reportTeamStatus.getTeamAverageFatigue`). So a reloaded current-week report can already disagree with the number the tick wrote, before anyone touches this decision.

## Does the choice change the simulation? No

`WeeklyReport.avgFatigue` is display-only today. Everything that gates on fatigue computes its own aggregate:

- `src/domain/missionIntakeRouting.ts:984-996` computes a per-team mean over that team's live members and raises `fatigue-over-threshold` at `>= 65` (`fatigueBurden` at `:1014`). It never reads a report.
- `src/app/store/runTransfer.ts:1746` only clamps and, for one week, recomputes.
- `src/domain/sim/advanceWeek.ts:955` reads the field only as part of the `isBootstrapWeeklyReport` fingerprint (week 1, `rngStateBefore 1000`, `rngStateAfter 1001`, every case bucket empty, `maxStage 1`, `avgFatigue === 0`, no `teamStatus`/`notes`/`caseSnapshots`) so the synthetic week-1 report is skipped as a source. Those reports are written with zeros and hydration leaves them at 0, so a denominator change cannot flip that predicate.
- Readers are presentational: `DashboardPage.tsx:773`, `frontDeskView.ts:1314`, `ReportPage.tsx:137`, `ReportDetailPage.tsx:273`. The dashboard card's figure is a **fourth unfiltered copy** of the same arithmetic — `getDashboardMetrics` averages every agent (`dashboardView.ts:63-66`) — so the card and the report agree today.

Consequence: switching denominators moves **no agent fatigue, no RNG state, and no mission outcome**. It moves a displayed and stored summary number. That is a smaller blast radius than the slice doc's line 106 originally implied ("feeds the weekly score") — there is no scoring reader in the current tree.

## Option A — keep unfiltered (status quo, recommended for the extraction)

- Zero discontinuity: every stored report, fixture and saved campaign already matches this formula.
- Zero fixture churn, so the extraction PR stays honestly behaviour-preserving.

Cost: the metric stops describing the roster as soon as anyone dies. Dead agents keep their last `fatigue` forever and stay in the denominator; training and attrition-unavailable agents dilute it downward while they recover. A campaign with three dead agents at fatigue 80 and two live agents at 10 reports **52** — a number that describes nobody. It also leaves `src/test/weeklyReport.test.ts:265` asserting a rule production does not use, which is the kind of test that looks like coverage and is not.

## Option B — adopt the filtered definition

Because the dashboard card is the same unfiltered mean, a report-only switch would leave two visible averages disagreeing for the same campaign; any sweep has to include `getDashboardMetrics`.

What it actually costs an existing save:

| Concern                 | Impact                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Save schema / version   | **None.** The field is a `number` clamped to 0–100 with a 0 default (`runTransfer.ts:403,1746`). No `SCHEMA_REGISTRY.md` entry, no migration, no event schema change.                 |
| Agent state and RNG     | **None.** The field is derived from agents and never written back; no seeded input reads it.                                                                                          |
| Deterministic replay    | Agents, RNG cursor and case outcomes identical; `avgFatigue` differs on every week written after the switch.                                                                          |
| Historical reports      | **Unchanged.** Stored values are kept (only clamped), so old reports keep their old numbers — the campaign shows a visible step at the change week rather than a rewritten past.      |
| Hydrated current week   | Same code path; the two formulas now agree instead of quietly diverging, so a reload stops moving the number.                                                                         |
| Fixtures and tests      | `weeklyReport.test.ts:265` becomes truthful about production; literal-number report fixtures in `runTransfer.test.ts` and `App.test.tsx` are unaffected because they never recompute. |
| Empty deployable roster | **Returns 0**, which is also a legitimate "perfectly rested" value. The number silently reads as rested when everyone is dead, resigned, or in training.                              |

That last row is the reason not to bundle the change into an extraction. `0` is ambiguous, so the switch needs an answer before it ships: either keep `0` and add a report note when the filtered roster is empty, or make `avgFatigue` optional and render "no deployable agents". Returning the unfiltered value as a fallback is the worst option — it reinstates the dilution exactly in the case the change exists to fix.

## Recommendation

1. **Ship the extraction with Option A.** `getAverageRosterFatigue` moves into `recoveryFatigue.ts` unfiltered, both builders import it, and no number moves. This keeps the April review's "not behaviour-preserving" blocker closed.
2. **Then land Option B as its own small PR under SPE-44**, in the same two-file footprint: switch `advanceWeek.ts:4515` and `weeklyReport.ts:307` to the filtered helper, add the empty-roster presentation, and rebaseline only the fixtures that pin the weekly report.
3. **Keep them separate PRs.** A bisect can then distinguish "the extraction broke numbers" from "we deliberately chose new numbers" — the exact confusion that made the original SPE-44 closure indefensible.

## Acceptance if Option B is taken

- Both builders import the filtered helper; no local definition remains (the slice's static guardrail already covers `getAverageRosterFatigue` declarations and its body expression).
- A test proves exclusion **end to end** through `settleWeekState`, not just against the helper: dead, resigned, training and attrition-unavailable agents must not move `WeeklyReport.avgFatigue`.
- An empty deployable roster yields 0 **plus** the presentation decided above.
- One save/replay fixture spans the change and asserts the expected step, so the discontinuity is recorded rather than discovered by a player.
- `planning/spe-44-fatigue-consolidation-slice.md` and the inventory row are updated to say the unfiltered form is historical-only.

## Not decided here

- Whether the player's headline fatigue number _should_ track deployables at all — that is balance intent, and it belongs to whoever owns the weekly report surface.
- Whether the dashboard card follows the report when Option B lands. It uses the identical unfiltered formula today, so leaving it behind would be a visible inconsistency rather than a neutral choice.
- Whether `WeeklyReportTeamStatus` should drop dead members. It averages over `getTeamMemberIds` regardless of status, so definition 4 inherits the same weakness one level down. Fixing that would move hydrated numbers and is a bigger change than this decision.
