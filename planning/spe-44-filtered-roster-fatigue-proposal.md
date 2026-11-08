# SPE-44 — Option B proposal: filtered roster fatigue average

| Field         | Value                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Date          | 2026-11-08                                                                                                                                    |
| Revision      | `766de240` (post-#4936); every anchor below is a static read at that commit                                                                   |
| Owner         | SPE-44 (advance-week ownership per the dead-module inventory)                                                                                 |
| Status        | **Proposal — awaiting a lead decision.** Not approved, not started; no source, test or schema file is touched by this note                    |
| Depends on    | [denominator/open-question note](spe-44-roster-fatigue-average-decision.md) and [the extraction slice](spe-44-fatigue-consolidation-slice.md) |
| Approval gate | One answer to each of the three §6 questions; a yes to all three authorizes **creating** one bounded child slice, not implementing it         |

This note asks for one decision the [roster-fatigue note](spe-44-roster-fatigue-average-decision.md) deliberately left open: **should `WeeklyReport.avgFatigue` (and the per-team rows beside it) count only deployable agents, or keep counting every agent on the roster?** The empty-set presentation is already decided — an optional `deployableCount` with a "No deployable agents" render — so that is not part of this ask.

## 1. What ships at `766de240`

`WeeklyReport.avgFatigue` still has four definitions, and the filtered one is the only dead one:

| #   | Formula                                                            | Where                                                               | Reachable from a campaign?                                                                        |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Unfiltered agent mean (every agent, any status)                    | `advanceWeek.ts:1068-1075`, written at `:4515`                      | Yes — the live weekly tick                                                                        |
| 2   | Unfiltered agent mean, byte-identical copy                         | `weeklyReport.ts:136`, written at `:307`                            | `buildWeeklyReport` only                                                                          |
| 3   | Filtered deployable mean (`isRosterFatigueAgent`, four exclusions) | `rosterFatigue.ts:25` / predicate at `:5`                           | No production importer; only `src/test/weeklyReport.test.ts`                                      |
| 4   | Team-mean-of-means, applied on load for the current week only      | `runTransfer.ts:1746` (rollup `:1769`, call `:10157`, clamp `:403`) | `teamStatus` non-empty in the save and at least one row survives sanitizing; otherwise clamp only |

Definition 4 is narrower than its row suggests: `reconcileWeeklyReportAvgFatigue` (`runTransfer.ts:1746`) returns the clamped stored value unless the report is the current week, the save carried a non-empty `teamStatus` array, and at least one entry survives sanitizing (`:1761-1766`). A current-week report with empty or missing `teamStatus` keeps its stored number, and every historical week only clamps — "every campaign loaded from a save" overstates it.

`isRosterFatigueAgent` excludes `status === 'dead'`, `status === 'resigned'`, `assignment.state === 'training'`, and `isAgentAttritionUnavailable(agent)`.

Team rows keep the same weakness one level down: `reportTeamStatus.ts:27-39` averages `getTeamMemberIds(team)` with no status filter and returns `0` for an empty team.

Nothing in the simulation reads this number. The weekly score counts case buckets; the mission-routing threshold (`missionIntakeRouting.ts:984-996`) computes its own per-team mean; the only structural read is the synthetic week-1 fingerprint at `advanceWeek.ts:955`, which requires `avgFatigue === 0` for a report that is written with zeros. So this is a change to a **stored and displayed summary**, not to agent fatigue, RNG state, or mission outcomes.

## 2. Proposed change (one PR, source plus docs)

1. **Import the filtered helper.** Once the extraction slice lands, `advanceWeek.ts:4515` and `weeklyReport.ts:307` call the single `getAverageRosterFatigue` in `recoveryFatigue.ts`; both local definitions (`advanceWeek.ts:1068`, `weeklyReport.ts:136`) are deleted. **Dependency:** the extraction is not merged at `766de240` — `recoveryFatigue.ts` exists with zero importers and no roster-average export. Option B waits for it rather than carrying the move in the same PR; bundling them recreates the mixed-change review that failed in April.
2. **Filter the team row.** `getTeamAverageFatigue` (`reportTeamStatus.ts:27-39`) filters members through `isRosterFatigueAgent`, averages them, and persists a `deployableCount` beside the mean. `0` is the empty-set default, but a nonempty fully rested set also averages `0`; only `deployableCount` distinguishes the two, which is why the row carries it and why `avgFatigue === 0` alone must not render "No deployable agents". This is a real behaviour change for team rows, and it is intentional: a filtered roster mean over unfiltered team means would disagree structurally.
3. **Write `deployableCount`.** Persist it on `WeeklyReport` and `WeeklyReportTeamStatus` exactly as the [presentation decision](spe-44-roster-fatigue-average-decision.md) specifies — same filtered set, same tick, absence meaning "legacy, render the number".
4. **Hydration preserves the written tick, gated on the count.** `WeeklyReport.deployableCount` doubles as the marker of a report written under this rule. When it is present, the report is treated as a tick snapshot: `runTransfer.ts:5100-5108` must not recompute team rows, team counts or the roster number from live agents or teams, and `reconcileWeeklyReportAvgFatigue` (`:1746`) must not run the current-week team rollup. Hydration only normalizes what the tick wrote — deterministically treating a malformed (non-finite, negative or fractional) count as absent, forcing `avgFatigue` to `0` when the count is `0`, turning a non-finite mean into `0`, and clamping a finite mean to `0..100` — and never adds a count to a report that has none. A post-tick hire, resignation, reassignment or team change therefore does not move the stored report; the next tick writes a new one. When `deployableCount` is **absent** — every save written before the change — hydration must not synthesize a count and must not apply the filtered predicate to stored rows or to the roster average; the existing unfiltered path stays as it is. A legacy report whose only agent is dead at fatigue 100 still reads `100` (its team row is refreshed with the unfiltered mean, and the rollup preserves the number), never `0` and never "No deployable agents". §4 carries both fixtures.
5. **Move the readers and define the snapshot they share.** `ReportPage.tsx:137`, `ReportDetailPage.tsx:273`, `DashboardPage.tsx:773`, `frontDeskView.ts:1314`, the team row render at `reportDetailHelpers.tsx:288,294`, and the dashboard card's own copy at `dashboardView.ts:64`. **Proposed semantics:** both the card and the report render the current week's _written_ `avgFatigue` and `deployableCount`, so they describe the same tick; the card falls back to live arithmetic only when no report exists for the current week, and for a legacy report it shows the same report value the report surface shows under the existing legacy path rather than falling back merely because the count is absent. This is a proposal, not a description of today — `getDashboardMetrics` averages live agents (`dashboardView.ts:64`) while a report is a tick snapshot, so hiring after the tick legitimately moves the card and not the report. Making the report canonical for both is part of the ask; item 4 preserves the stored pair on load, so a post-tick hire cannot make the report and the card disagree after a save/reload. **This snapshot rule is proposed, not approved** — it replaces the earlier "filtered agent mean on load" wording, which rebased the report on the live roster. §4 pins both the projection and the post-tick reload with acceptance cases.
6. **Schema and fixtures.** Optional field on both shapes in `models.ts:1650-1661`, a `SCHEMA_REGISTRY.md` normalization rule that accepts absence, treats a malformed count as absent, forces `avgFatigue` to `0` when the count is `0`, and never derives a value from the live roster. No `GAME_SAVE_VERSION` bump and no bulk rewrite of stored reports.

## 3. What a player sees

- **Existing campaigns:** historical reports keep their stored numbers. The first week written after the switch shows a visible step, because dead, resigned, training and attrition-unavailable agents stop counting. Nothing rewrites the past.
- **Empty deployable roster:** `deployableCount: 0` renders "No deployable agents" instead of `0 / steady`, so a wiped roster cannot read as perfectly rested. A nonempty fully rested roster also averages `0` and keeps the numeric render; the count, not the mean, selects the message.
- **Current-week reload:** for a report written with the count, the stored number, count and team rows survive the load unchanged, even if the roster changed after the tick; the next tick writes the new snapshot. Legacy reports keep the unfiltered path and never adopt filtered arithmetic.
- **Dashboard card, front desk, report, report detail:** one number instead of four arithmetic copies.

## 4. Acceptance (each line checkable)

- `git grep -n 'function getAverageRosterFatigue' -- src/domain` returns only `recoveryFatigue.ts`.
- End to end through `settleWeekState`: a dead, a resigned, a training and an attrition-unavailable agent each fail to move `WeeklyReport.avgFatigue` (extends `src/test/weeklyReport.test.ts:70` rather than trusting the helper in isolation).
- **`buildWeeklyReport` gets its own exclusion test.** `settleWeekState` exercises the `advanceWeek.ts:4515` writer only; a separate call through `weeklyReport.ts:278-307` with the same four excluded agents must yield the deployable mean and count. One writer's coverage does not prove the other's.
- A current-week save/reload test for a report carrying `deployableCount` asserts hydration leaves the written roster number, count and every team row unchanged, including a team whose live membership changed after the tick; the team entry equals the written row, not a live recomputation.
- A current-week legacy reload fixture — one dead agent at fatigue 100, no `deployableCount` — asserts the stored `100` survives, the team row stays numeric, and the load writes no count: the filtered predicate never touches a pre-change report.
- `deployableCount` present on both shapes; `0` renders the message; absent renders the stored number unchanged (pre-change fixture). The implication is one-way: count `0` means the mean is `0`, but a fully rested nonempty roster also averages `0`, so `avgFatigue === 0` alone is not evidence of an empty deployable set.
- Normalization stays snapshot-safe: a counted report with count `0` and a stale nonzero mean loads as `0` and renders the message, while count `1` with mean `0` renders `0 / steady`; neither case consults the live roster.
- Fixture rebaseline is limited to reports the tick actually writes; literal-number report fixtures in `runTransfer.test.ts`, `ReportFeature.test.tsx` and `App.test.tsx:1086` still pass untouched.
- Post-tick hire + save/reload: after the tick, hire an agent, save and reload; the dashboard card, weekly report and team row still show the stored tick number and count, and none is rebased on the changed roster. Both the projection test and the hydration test cover this, and the next advanced week includes the hire.
- `npm run test:run`, `npm run lint`, `npm run format:check`; `SCHEMA_REGISTRY.md` updated.

## 5. Not in this proposal

- `missionIntakeRouting.ts:984-996` — the `>= 65` fatigue blocker keeps its own arithmetic.
- Rewriting historical reports or replaying old weeks.
- Extending `FatigueBand` or any enum shared with agent surfaces (`agent/models.ts:657`).
- Removing the unfiltered helper entirely; the extraction keeps it as the historical definition.
- Any new issue family: this is one bounded change to SPE-44.

## 6. Decision requested

| #   | Question                                               | Recommended                                                            | Cost of the alternative                                                                             |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Which denominator becomes canonical for new reports?   | Filtered deployable mean                                               | Keep unfiltered: the weekly report keeps calling dead agents rested                                 |
| 2   | What does hydration do with the current week's report? | Preserve the written tick snapshot (normalize only, no live recompute) | Recompute from the live roster: a post-tick hire silently rebases the stored report and its readers |
| 3   | Do team rows use the same predicate?                   | Yes, plus `deployableCount`                                            | Leave them unfiltered: report and team rows contradict each other                                   |

Question 2's recommendation changed in this revision: item 4 now preserves the written tick instead of recomputing the filtered agent mean from the live roster. That is a product choice within the same unapproved proposal, not an existing decision; the lead answer in §6 covers it. A lead answer of "yes" to all three authorizes creating **one** SPE-44 child slice with §2 as its boundary and §4 as acceptance. It does not authorize the implementation PR by itself, any change to mission-intake thresholds, or a second slice. A "no" leaves this note as the recorded reason the unfiltered form stays, and the slice doc's deferral remains accurate as written.
