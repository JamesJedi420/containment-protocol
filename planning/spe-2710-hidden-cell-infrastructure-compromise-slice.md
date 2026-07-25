# SPE-2710 — Hidden-cell strategic interference (infrastructure compromise)

**Linear:** [SPE-2710](https://linear.app/spectranoir/issue/SPE-2710/spe-39-hidden-cell-strategic-interference-infrastructure-compromise)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2710-spe-39-hidden-cell-strategic-interference-infrastructure`  
**Base:** `main` @ `61154647198b407bdee19e516a401944b4dfcb44`

## Goal

One deterministic bounded hidden-cell interference path from abstract rival/hidden-cell pressure into the existing **facility/ops/infrastructure** surface (infrastructure compromise via SPE-94 `maintenanceSpecialistsAvailable`), with a player-legible week-close note — closes parent SPE-39 residual for XCOM-style infrastructure compromise without a full adversary org sim or detection layer.

## Acceptance (this slice)

- [x] Identical ranking/pressure + maintenance-capacity inputs → identical compromise outcome
- [x] No infrastructure compromise when cell pressure inactive (rival band suppressed/balanced)
- [x] Active path reduces bounded `maintenanceSpecialistsAvailable`; idempotent per closed week
- [x] Compromise composes into SPE-94 recovery bottleneck (no parallel sabotage sim)
- [x] Weekly report note + agency/report summary expose a legible interference signal
- [x] SPE-2704 funding-theft, SPE-2706 research-rollback, and SPE-2707 panic-amplification paths unchanged for the same inputs
- [x] SPE-2699–2707 rival-pressure formula outputs unchanged for same ranking inputs
- [x] Detection / scans / covert confrontation ops out of slice

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/hiddenCellStrategicInterference.ts` — reuse cell-pressure gate; infra compromise resolve + apply |
| Capacity state | `AgencyState.maintenanceSpecialistsAvailable`; idempotency via `lastHiddenCellInfrastructureCompromiseWeek` / `Amount` |
| Week-close | `advanceWeek` after SPE-2707 panic amplification (carries into next week’s recovery bottleneck) |
| Week-close notes | `hiddenCellInterferenceWeeklyReportNotes` — `agency.hidden_cell_interference` with `kind: infrastructure_compromise` |
| Agency / UI | `buildAgencySummary`, `reportView` summary line |
| Docs | `systems/hub-simulation.md`, `SCHEMA_REGISTRY.md`, `docs/maintenance-specialist-bottleneck.md` |
| Tests | `src/test/hiddenCellStrategicInterference.test.ts` |

Cell pressure active when rival-pressure band is `competitive` or `severe`. Compromise amount scales from pressure score (1–2 specialists), clamped to available capacity. Inactive bands → no effect.

## Out of scope

- SPE-2699–2707 pressure / forgiveness / exposure / coordination / funding-theft / research-rollback / panic formula changes
- Covert cell growth + detection / intel scans / open confrontation ops
- FacilityInstance status offline / FacilityState upgrade wiring
- SPE-542 / SPE-430 rival sims

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Covert cell growth + detection scans | SPE-39 child | Detection layer larger than pressure hook |
| Optional SPE-2702 resolved×open jurisdiction sharpening | SPE-39 child | Post-merge Bugbot follow-up; not blocking |
| Hire/restore path for maintenance specialists | SPE-94 / ops follow-up | Existing pool has no mid-run restore; out of interference boundary |

## Validation

- `npm run test:run -- src/test/hiddenCellStrategicInterference.test.ts src/test/rivalPressure.test.ts src/test/sim.equipmentRecoveryBottleneck.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm run lint`
