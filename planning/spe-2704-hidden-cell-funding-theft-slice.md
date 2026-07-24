# SPE-2704 — Hidden-cell strategic interference (funding theft)

**Linear:** [SPE-2704](https://linear.app/spectranoir/issue/SPE-2704/spe-39-hidden-cell-strategic-interference-funding-theft)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2704-spe-39-hidden-cell-strategic-interference-funding-theft`  
**Base:** `main` @ `f1bf9b41b200e24c834b553346453bf832428eb1`

## Goal

One deterministic bounded hidden-cell interference path from abstract rival/hidden-cell pressure into the existing **funding** surface (funding theft), with a player-legible summary — closes parent SPE-39 residual for XCOM-style strategic interference without a full adversary org sim.

## Acceptance (this slice)

- [x] Identical ranking/pressure + funding inputs → identical funding-theft outcome
- [x] No funding theft when cell pressure inactive (rival band suppressed/balanced)
- [x] Active path deducts bounded funding and records idempotent fundingHistory for the closed week
- [x] Weekly report note + agency/report summary expose a legible interference signal
- [x] SPE-2699/2700/2701 rival-pressure formula outputs unchanged for same ranking inputs
- [x] No new GameState schema fields; SCHEMA_REGISTRY unchanged (reuse fundingHistory)
- [x] Detection / scans / covert confrontation ops out of slice

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/hiddenCellStrategicInterference.ts` — cell-pressure gate, theft amount, apply + history |
| Week-close funding | `advanceWeek` agency metrics — deduct after operating/holding costs |
| Week-close notes | `hiddenCellInterferenceWeeklyReportNotes` + `advanceWeek` |
| Agency / UI | `buildAgencySummary`, `reportView` summary line |
| Note type | `agency.hidden_cell_interference` |
| Docs | `systems/hub-simulation.md` |
| Tests | `src/test/hiddenCellStrategicInterference.test.ts` |

Cell pressure active when rival-pressure band is `competitive` or `severe`. Base theft scales from pressure score; applied amount clamps to available funding. Inactive bands → no effect.

## Out of scope

- SPE-2696/2697 standing awards
- SPE-2699/2700/2701/2702 pressure/forgiveness/exposure/coordination math changes
- Research rollback, panic amplification, covert cell growth, infrastructure compromise
- Cell detection / intel scans / open confrontation ops
- SPE-542 / SPE-430 rival sims

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Research rollback / panic amplification / infrastructure compromise | SPE-39 child | Separate interference surfaces |
| Covert cell growth + detection scans | SPE-39 child | Detection layer is larger than funding hook |
| Legitimacy fallout tick standing scale | SPE-39 / procurement follow-up | Alternate fallout surface |
| SPE-2702 resolved×open jurisdiction sharpening | SPE-39 child (optional) | Post-merge Bugbot follow-up; not blocking |

## Validation

- `npm run test:run -- src/test/hiddenCellStrategicInterference.test.ts src/test/rivalPressure.test.ts src/test/agency.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm run lint`
