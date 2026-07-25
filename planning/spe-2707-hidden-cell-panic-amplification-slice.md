# SPE-2707 — Hidden-cell strategic interference (panic amplification)

**Linear:** [SPE-2707](https://linear.app/spectranoir/issue/SPE-2707/spe-39-hidden-cell-strategic-interference-panic-amplification)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2707-spe-39-hidden-cell-strategic-interference-panic`  
**Base:** `main` @ `efdc00951be72e59e32aa86a845121941a5930a5`

## Goal

One deterministic bounded hidden-cell interference path from abstract rival/hidden-cell pressure into the existing **panic/pressure/unrest** surface (panic amplification via ambient `globalPressure`), with a player-legible week-close note — closes parent SPE-39 residual for XCOM-style panic amplification without a full adversary org sim or detection layer.

## Acceptance (this slice)

- [x] Identical ranking/pressure + `globalPressure` inputs → identical amplification outcome
- [x] No panic amplification when cell pressure inactive (rival band suppressed/balanced)
- [x] Active path increases bounded `globalPressure`; idempotent per closed week
- [x] Amplification composes into existing pressure score (no parallel panic sim)
- [x] Weekly report note + agency/report summary expose a legible interference signal
- [x] SPE-2704 funding-theft and SPE-2706 research-rollback paths unchanged for the same inputs
- [x] SPE-2699–2706 rival-pressure formula outputs unchanged for same ranking inputs
- [x] Detection / scans / covert confrontation ops out of slice

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/hiddenCellStrategicInterference.ts` — reuse cell-pressure gate; panic amplify resolve + apply |
| Pressure state | `GameState.globalPressure`; idempotency via `lastHiddenCellPanicAmplificationWeek` / `Amount` |
| Week-close | `advanceWeek` after SPE-2706 research rollback (post pressure pipeline — carries to next week) |
| Week-close notes | `hiddenCellInterferenceWeeklyReportNotes` — `agency.hidden_cell_interference` with `kind: panic_amplification` |
| Agency / UI | `buildAgencySummary`, `reportView` summary line |
| Docs | `systems/hub-simulation.md`, `SCHEMA_REGISTRY.md` (idempotency markers) |
| Tests | `src/test/hiddenCellStrategicInterference.test.ts` |

Cell pressure active when rival-pressure band is `competitive` or `severe`. Amplification amount scales from pressure score (1–4). Inactive bands → no effect.

## Out of scope

- SPE-2699–2706 pressure / forgiveness / exposure / coordination / funding-theft / research-rollback formula changes
- Covert cell growth, infrastructure compromise
- Cell detection / intel scans / open confrontation ops
- Responder-duty `panicRisk` formula changes / major-incident civilian-panic template redesign
- SPE-542 / SPE-430 rival sims

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Infrastructure compromise | SPE-2710 | Separate interference surface (opened) |
| Covert cell growth + detection scans | SPE-39 child | Detection layer larger than pressure hook |
| Optional SPE-2702 resolved×open jurisdiction sharpening | SPE-39 child | Post-merge Bugbot follow-up; not blocking |

## Validation

- `npm run test:run -- src/test/hiddenCellStrategicInterference.test.ts src/test/rivalPressure.test.ts src/test/sim.pressurePipeline.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm run lint`
