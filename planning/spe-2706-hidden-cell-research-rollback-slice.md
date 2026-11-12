# SPE-2706 — Hidden-cell strategic interference (research rollback)

**Linear:** [SPE-2706](https://linear.app/spectranoir/issue/SPE-2706/spe-39-hidden-cell-strategic-interference-research-rollback)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2706-spe-39-hidden-cell-strategic-interference-research-rollback`  
**Base:** `main` @ `27a31742b8bc925072439770c68d525917d8ad86`

## Goal

One deterministic bounded hidden-cell interference path from abstract rival/hidden-cell pressure into the existing **research/progression** surface (research rollback), with a player-legible week-close note — closes parent SPE-39 residual for XCOM-style research sabotage without a full adversary org sim or detection layer.

## Acceptance (this slice)

- [x] Identical ranking/pressure + research progress inputs → identical rollback outcome
- [x] No research rollback when cell pressure inactive (rival band suppressed/balanced)
- [x] Active path reduces bounded `progressTime` on a deterministically selected active project; idempotent per closed week
- [x] Does not un-complete finished projects; rollback reversible-friendly (progress only)
- [x] Weekly report note + agency/report summary expose a legible interference signal
- [x] SPE-2704 funding-theft path unchanged for the same pressure + funding inputs
- [x] SPE-2699–2705 rival-pressure formula outputs unchanged for same ranking inputs
- [x] Detection / scans / covert confrontation ops out of slice

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/hiddenCellStrategicInterference.ts` — reuse cell-pressure gate; research rollback resolve + apply |
| Research state | `ResearchState` active project `progressTime`; optional `lastHiddenCellRollbackWeek` for idempotency |
| Week-close | `advanceWeek` after SPE-2704 funding theft |
| Week-close notes | `hiddenCellInterferenceWeeklyReportNotes` — `agency.hidden_cell_interference` with `kind: research_rollback` |
| Agency / UI | `buildAgencySummary`, `reportView` summary line |
| Docs | `systems/hub-simulation.md`, `docs/research-system-audit.md` |
| Tests | `src/test/hiddenCellStrategicInterference.test.ts` |

Cell pressure active when rival-pressure band is `competitive` or `severe`. Target = lex-min active project id with `progressTime > 0`. Rollback amount scales from pressure score (1–2 weeks). Inactive bands or no eligible progress → no effect.

## Out of scope

- SPE-2699–2705 pressure / forgiveness / exposure / coordination / funding-theft / fallout-scale formula changes
- Panic amplification, covert cell growth, infrastructure compromise
- Cell detection / intel scans / open confrontation ops
- Un-completing finished research
- SPE-542 / SPE-430 rival sims

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Panic amplification / infrastructure compromise | SPE-39 child | Separate interference surfaces |
| Covert cell growth + detection scans | SPE-2714 | Detection layer larger than research hook |
| Optional SPE-2702 resolved×open jurisdiction sharpening | SPE-39 child | Post-merge Bugbot follow-up; not blocking |

## Validation

- `npm run test:run -- src/test/hiddenCellStrategicInterference.test.ts src/test/rivalPressure.test.ts src/test/research.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm run lint`
