# SPE-2699 — Rival comparative pressure into contracts and recruitment

**Linear:** [SPE-2699](https://linear.app/spectranoir/issue/SPE-2699/spe-39-rival-comparative-pressure-into-contracts-and-recruitment)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-39-rival-comparative-pressure`  
**Base:** `main` @ `2619f896`

## Goal

One deterministic rival/comparative-pressure hook from agency ranking into ≥2 downstream surfaces (contract payouts + recruit quality), without reopening SPE-2696/2697 standing award math.

## Acceptance (this slice)

- [x] Rival pressure score/band deterministic for identical ranking inputs
- [x] Low ranking → lower contract funding than high ranking (same template)
- [x] Low ranking → lower recruit quality delta than high ranking
- [x] Agency summary + report summary expose band/summary
- [x] No new persisted fields; SCHEMA_REGISTRY unchanged
- [x] Standing award / ranking-accumulator math untouched

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/rivalPressure.ts` — `buildRivalPressure`, scalar/quality helpers |
| Contracts | `buildRewardPackage` in `src/domain/contracts.ts` |
| Recruitment | `buildRecruitmentGenerationState` + qualityBias / faction-sponsored path in `candidateGenerator.ts` |
| Agency / UI | `buildAgencySummary`, `AgencyPage`, `reportView` |
| Docs | `systems/hub-simulation.md`, `systems/factions-legitimacy.md` |
| Tests | `src/test/rivalPressure.test.ts` |

Peer baseline = ranking base score (50). Pressure inverts ranking delta; multipliers bounded.

## Out of scope

- SPE-2696/2697 standing awards, repeats, hydration
- Cross-jurisdiction liaison packets
- Forgiveness thresholds / public-exposure posture
- Hidden-cell interference; SPE-542 / SPE-430 rival sims

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Forgiveness thresholds from standing | SPE-2700 | Shipped: trustFailureDriftScale → SPE-93 negative drift |
| Cross-jurisdiction coordination packets | SPE-39 + SPE-854 | Intake pairing |
| Hidden-cell strategic interference | SPE-39 child | Larger adversary layer |
| Protective-coercive rival posture after exposure | SPE-39 child | Harvest fold-in C23/C26 |

## Validation

- `npm run test:run -- src/test/rivalPressure.test.ts src/test/agency.test.ts src/test/agencyStanding.test.ts src/test/contracts.test.ts src/test/recruitment.generator.test.ts`
- `npm run lint`
