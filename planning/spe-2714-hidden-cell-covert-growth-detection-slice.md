# SPE-2714 — Hidden-cell strategic interference (covert cell growth + detection narrowing)

**Linear:** [SPE-2714](https://linear.app/spectranoir/issue/SPE-2714/spe-39-hidden-cell-strategic-interference-covert-cell-growth-detection)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2714-spe-39-hidden-cell-strategic-interference-covert-growth`  
**Base:** `main` @ `b2b99603bac827ecdfff30ab99cacc3b8de2097c`

## Goal

One deterministic bounded hidden-cell interference path from abstract rival/hidden-cell pressure into **covert cell growth** plus a minimal **intelligence-driven detection-narrowing** signal (vague → regional → sector → imminent) before open confrontation — closes parent SPE-39 residual for XCOM-style covert growth/detection without a full adversary org sim, SPE-854 verification-core changes, or scan UX sprawl.

## Acceptance (this slice)

- [x] Identical ranking/pressure + prior growth/narrowing inputs → identical growth/detection outcome
- [x] No covert growth or detection narrowing when cell pressure inactive (rival band suppressed/balanced)
- [x] Active path increases bounded cumulative covert-growth level and advances detection-narrowing band; idempotent per closed week
- [x] Weekly report note + agency/report summary expose a legible interference signal (narrowing band without full location truth)
- [x] SPE-2704/2706/2707/2710 paths unchanged for the same inputs
- [x] SPE-2699–2710 rival-pressure formula outputs unchanged for same ranking inputs
- [x] No SPE-854 verification-core changes; no case-scouting DetectionScanResult UX

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/hiddenCellStrategicInterference.ts` — reuse cell-pressure gate; covert growth + narrowing resolve + apply |
| Agency state | `hiddenCellCovertGrowthLevel`, `hiddenCellDetectionNarrowing`; idempotency via `lastHiddenCellCovertGrowthWeek` / `Amount` |
| Week-close | `advanceWeek` after SPE-2710 infrastructure compromise |
| Week-close notes | `hiddenCellInterferenceWeeklyReportNotes` — `agency.hidden_cell_interference` with `kind: covert_cell_growth` |
| Agency / UI | `buildAgencySummary`, `reportView` summary line |
| Docs | `systems/hub-simulation.md`, `SCHEMA_REGISTRY.md` |
| Tests | `src/test/hiddenCellStrategicInterference.test.ts` |

Cell pressure active when rival-pressure band is `competitive` or `severe`. Growth amount scales from pressure score (1–3), clamped so cumulative level stays within max. Detection narrowing advances from the same growth tick (deterministic delta), mapped to player-facing bands without revealing coordinates. Inactive bands → no effect.

## Out of scope

- SPE-2699–2710 pressure / forgiveness / exposure / coordination / funding / research / panic / infra formula changes
- Open confrontation ops / cell raid missions
- SPE-854 verification core; case-scouting DetectionScanResult UX
- FacilityInstance status offline / FacilityState upgrade wiring
- SPE-542 / SPE-430 rival sims

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Optional SPE-2702 resolved×open jurisdiction sharpening | SPE-39 child | Post-merge Bugbot follow-up; not blocking |
| Open confrontation / cell raid ops after imminent narrowing | SPE-39 / ops follow-up | Larger mission surface than growth/narrowing signal |
| Player-initiated intel scan actions | intel follow-up | Avoid scans UX sprawl in this slice |

## Validation

- `npm run test:run -- src/test/hiddenCellStrategicInterference.test.ts src/test/rivalPressure.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm run lint`
