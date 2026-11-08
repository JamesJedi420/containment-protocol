# SPE-44 — Option B proposal: filtered roster fatigue average

| Field         | Value                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Date          | 2026-11-08                                                                                                                                    |
| Revision      | `766de240` (post-#4936); every anchor below is a static read at that commit                                                                   |
| Owner         | SPE-44 (advance-week ownership per the dead-module inventory)                                                                                 |
| Status        | **Proposal — awaiting a lead decision.** Not approved, not started; no source, test or schema file is touched by this note                    |
| Depends on    | [denominator/open-question note](spe-44-roster-fatigue-average-decision.md) and [the extraction slice](spe-44-fatigue-consolidation-slice.md) |
| Approval gate | One yes/no on the denominator; creating the implementing Linear child still needs its own authorization                                       |

This note asks for one decision the [roster-fatigue note](spe-44-roster-fatigue-average-decision.md) deliberately left open: **should `WeeklyReport.avgFatigue` (and the per-team rows beside it) count only deployable agents, or keep counting every agent on the roster?** The empty-set presentation is already decided — an optional `deployableCount` with a "No deployable agents" render — so that is not part of this ask.

## 1. What ships at `766de240`

`WeeklyReport.avgFatigue` still has four definitions, and the filtered one is the only dead one:

| #   | Formula                                                            | Where                                                               | Reachable from a campaign?                                   |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Unfiltered agent mean (every agent, any status)                    | `advanceWeek.ts:1068-1075`, written at `:4515`                      | Yes — the live weekly tick                                   |
| 2   | Unfiltered agent mean, byte-identical copy                         | `weeklyReport.ts:136`, written at `:307`                            | `buildWeeklyReport` only                                     |
| 3   | Filtered deployable mean (`isRosterFatigueAgent`, four exclusions) | `rosterFatigue.ts:25` / predicate at `:5`                           | No production importer; only `src/test/weeklyReport.test.ts` |
| 4   | Team-mean-of-means, applied on load for the current week only      | `runTransfer.ts:1746` (rollup `:1769`, call `:10157`, clamp `:403`) | Every campaign loaded from a save                            |

`isRosterFatigueAgent` excludes `status === 'dead'`, `status === 'resigned'`, `assignment.state === 'training'`, and `isAgentAttritionUnavailable(agent)`.

Team rows keep the same weakness one level down: `reportTeamStatus.ts:27-39` averages `getTeamMemberIds(team)` with no status filter and returns `0` for an empty team.

Nothing in the simulation reads this number. The weekly score counts case buckets; the mission-routing threshold (`missionIntakeRouting.ts:984-996`) computes its own per-team mean; the only structural read is the synthetic week-1 fingerprint at `advanceWeek.ts:955`, which requires `avgFatigue === 0` for a report that is written with zeros. So this is a change to a **stored and displayed summary**, not to agent fatigue, RNG state, or mission outcomes.

## 2. Proposed change (one PR, source plus docs)

1. **Import the filtered helper.** Once the extraction slice lands, `advanceWeek.ts:4515` and `weeklyReport.ts:307` call the single `getAverageRosterFatigue` in `recoveryFatigue.ts`; both local definitions (`advanceWeek.ts:1068`, `weeklyReport.ts:136`) are deleted. **Dependency:** the extraction is not merged at `766de240` — `recoveryFatigue.ts` exists with zero importers and no roster-average export. Option B waits for it rather than carrying the move in the same PR; bundling them recreates the mixed-change review that failed in April.
2. **Filter the team row.** `getTeamAverageFatigue` (`reportTeamStatus.ts:27-39`) filters members through `isRosterFatigueAgent` and returns `0` only when no member survives it. This is a real behaviour change for team rows, and it is intentional: a filtered roster mean over unfiltered team means would disagree structurally.
3. **Write `deployableCount`.** Persist it on `WeeklyReport` and `WeeklyReportTeamStatus` exactly as the [presentation decision](spe-44-roster-fatigue-average-decision.md) specifies — same filtered set, same tick, absence meaning "legacy, render the number".
4. **Fix hydration in the same PR.** `runTransfer.ts:5100-5108` recomputes team entries for the current week; it must use the same filter and write the count. `reconcileWeeklyReportAvgFatigue` (`:1746`) must stop deriving the roster number from the mean of team means and use the filtered agent mean instead. If it keeps the rollup, a reload disagrees with what the tick wrote — the exact defect this slice exists to end, and today it already disagrees whenever team sizes differ.
5. **Move the four readers.** `ReportPage.tsx:137`, `ReportDetailPage.tsx:273`, `DashboardPage.tsx:773`, `frontDeskView.ts:1314`, plus the dashboard card's own fourth copy at `dashboardView.ts:64` and the team row render at `reportDetailHelpers.tsx:288,294`. The card must move with the report, or the home screen and the weekly report show different numbers in the same week.
6. **Schema and fixtures.** Optional field on both shapes in `models.ts:1650-1661`, a `SCHEMA_REGISTRY.md` entry with a normalization rule that accepts absence and clamps a present value to the counted set. No `GAME_SAVE_VERSION` bump; no stored value is rewritten.

## 3. What a player sees

- **Existing campaigns:** historical reports keep their stored numbers. The first week written after the switch shows a visible step, because dead, resigned, training and attrition-unavailable agents stop counting. Nothing rewrites the past.
- **Empty deployable roster:** `deployableCount: 0` renders "No deployable agents" instead of `0 / steady`, so a wiped roster cannot read as perfectly rested.
- **Current-week reload:** the number stops moving between the tick and the load, which is a fix in itself.
- **Dashboard card, front desk, report, report detail:** one number instead of four arithmetic copies.

## 4. Acceptance (each line checkable)

- `git grep -n 'function getAverageRosterFatigue' -- src/domain` returns only `recoveryFatigue.ts`.
- End to end through `settleWeekState`: a dead, a resigned, a training and an attrition-unavailable agent each fail to move `WeeklyReport.avgFatigue` (extends `src/test/weeklyReport.test.ts:70` rather than trusting the helper in isolation).
- A current-week save/reload test asserts the hydrated roster number equals the written one, and that a team entry's number equals the filtered member mean.
- `deployableCount` present on both shapes; `0` renders the message; absent renders the stored number unchanged (pre-change fixture).
- Fixture rebaseline is limited to reports the tick actually writes; literal-number report fixtures in `runTransfer.test.ts`, `ReportFeature.test.tsx` and `App.test.tsx:1086` still pass untouched.
- Dashboard and report agree within one week (projection test).
- `npm run test:run`, `npm run lint`, `npm run format:check`; `SCHEMA_REGISTRY.md` updated.

## 5. Not in this proposal

- `missionIntakeRouting.ts:984-996` — the `>= 65` fatigue blocker keeps its own arithmetic.
- Rewriting historical reports or replaying old weeks.
- Extending `FatigueBand` or any enum shared with agent surfaces (`agent/models.ts:657`).
- Removing the unfiltered helper entirely; the extraction keeps it as the historical definition.
- Any new issue family: this is one bounded change to SPE-44.

## 6. Decision requested

| #   | Question                                             | Recommended                 | Cost of the alternative                                             |
| --- | ---------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| 1   | Which denominator becomes canonical for new reports? | Filtered deployable mean    | Keep unfiltered: the weekly report keeps calling dead agents rested |
| 2   | What does hydration compute for the current week?    | Filtered agent mean         | Keep team rollup: reload can disagree with the write                |
| 3   | Do team rows use the same predicate?                 | Yes, plus `deployableCount` | Leave them unfiltered: report and team rows contradict each other   |

A lead answer of "yes" to all three authorizes creating **one** SPE-44 child slice with §2 as its boundary and §4 as acceptance. It does not authorize the implementation PR by itself, any change to mission-intake thresholds, or a second slice. A "no" leaves this note as the recorded reason the unfiltered form stays, and the slice doc's deferral remains accurate as written.
