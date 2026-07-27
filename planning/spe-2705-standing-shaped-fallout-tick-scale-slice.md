# SPE-2705 — Standing-shaped scale on emergency gray-market legitimacy fallout tick

**Linear:** [SPE-2705](https://linear.app/spectranoir/issue/SPE-2705/spe-39-standing-shaped-scale-on-emergency-gray-market-legitimacy)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2705-spe-39-standing-shaped-scale-on-emergency-gray-market`  
**Base:** `main` @ `f1e7eaf35e7657096294d87ddab961645607ca7d`

## Goal

One deterministic standing/rival-pressure scale into the existing SPE-1184/SPE-1524 emergency gray-market legitimacy fallout tick penalties (funding/containment bands), with a player-legible summary — closes parent SPE-39 residual for standing-shaped fallout on the gray-market waiver surface.

## Acceptance (this slice)

- [x] Identical ranking + fallout inputs → identical scaled funding/containment penalties
- [x] No tick / no scale application when fallout inactive (`falloutRisk` neither `risk` nor `costly`)
- [x] SPE-2699–2704 rival-pressure formula outputs unchanged for same ranking inputs
- [x] Tick event fields coherent: `precedentPenaltyMultiplier` still from waiver precedent only; standing scale recorded separately
- [x] Agency / rival-pressure / report summary exposes the standing fallout scale signal
- [x] No new GameState schema fields; SCHEMA_REGISTRY unchanged (event payload fields only)
- [x] No new waiver UX

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain pressure | `src/domain/rivalPressure.ts` — `falloutPenaltyScale` (same standing-shaped inputs as trust forgiveness) |
| Fallout tick | `src/domain/procurementEmergency.ts` — compose scale with precedent multiplier on penalty bands |
| Event contract | `types.ts` / `eventValidation.ts` / fixtures / `runTransfer` hydration |
| Agency / UI | `buildAgencySummary`, `reportView` rival-pressure summary line |
| Docs | `systems/hub-simulation.md`, `systems/factions-legitimacy.md` |
| Tests | `src/test/procurementEmergency.test.ts`, `src/test/rivalPressure.test.ts` |

High standing → scale &lt; 1 (soften fallout penalties). Low standing → scale &gt; 1 (harden). Peer baseline → 1.0. Precedent multiplier stays independent.

## Out of scope

- SPE-2699–2704 pressure / forgiveness / exposure / coordination / funding-theft formula changes
- SPE-854 verification engine
- New waiver UX or eligibility redesign
- Full legitimacy redesign
- Other hidden-cell interference surfaces (research rollback, etc.)

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Research rollback / panic amplification / infrastructure compromise | SPE-39 child | Separate interference surfaces |
| Covert cell growth + detection scans | SPE-39 child | Detection layer larger than funding hook |
| Optional SPE-2702 resolved×open jurisdiction sharpening | SPE-39 child | Post-merge Bugbot follow-up; not blocking |

## Validation

- `npm run test:run -- src/test/procurementEmergency.test.ts src/test/rivalPressure.test.ts src/test/events.validation.test.ts src/test/agency.test.ts`
- `npm run lint`
