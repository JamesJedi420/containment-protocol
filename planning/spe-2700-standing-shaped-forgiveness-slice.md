# SPE-2700 — Standing-shaped forgiveness on external-support reliability drift

**Linear:** [SPE-2700](https://linear.app/spectranoir/issue/SPE-2700/spe-39-standing-shaped-forgiveness-on-external-support-reliability)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-39-standing-shaped-forgiveness`  
**Base:** `main` @ `b37e78ec`

## Goal

One deterministic standing-shaped forgiveness scale from agency ranking / rival pressure into external-support reliability drift (SPE-93 trust surface), without reopening SPE-2696/2697 standing awards or SPE-2699 contract/recruit multipliers.

## Acceptance (this slice)

- [x] Identical ranking inputs → identical `trustFailureDriftScale` and negative reliability deltas
- [x] High standing vs low standing diverge on comparable failure/delay drift (high more forgiving; low harsher)
- [x] Negative drift triggers (`support_failed`, `support_partial`, `week_idle`) use the scale; positive drift unchanged
- [x] Agency summary + rival-pressure summary expose the forgiveness scale signal
- [x] SPE-2699 `contractRewardMultiplier` / `recruitQualityDelta` unchanged for same ranking inputs
- [x] No new persisted fields; SCHEMA_REGISTRY unchanged
- [x] Standing award / ranking-accumulator math untouched

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/rivalPressure.ts` — add `trustFailureDriftScale` on `RivalPressureView` |
| Trust surface | `src/domain/externalSupport.ts` — scale negative deltas in `applyAssetReliabilityDrift` |
| Hub write path | `src/domain/hub/supportActions.ts` — pass scale from `buildRivalPressure` |
| Agency / UI | `buildAgencySummary`, `AgencyPage`, `reportView` (summary already carries rival pressure line) |
| Docs | `systems/hub-simulation.md`, `systems/factions-legitimacy.md`, optional `architecture/external-support-reliability-trust.md` |
| Tests | `src/test/rivalPressure.test.ts`, `src/test/externalSupport.test.ts` |

Scale derives from ranking vs peer baseline (same inputs as SPE-2699 pressure). High rank → scale &lt; 1 (soften trust collapse). Low rank → scale &gt; 1 (accelerate collapse). Peer baseline → 1.0.

## Out of scope

- SPE-2696/2697 standing awards, repeats, hydration
- SPE-2699 contract/recruit multiplier formula changes
- Protective-coercive rival posture after public exposure
- Cross-jurisdiction liaison packets; hidden-cell interference; SPE-542 / SPE-430 rival sims

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Protective-coercive rival posture after exposure | SPE-39 child | Separate AC half (post-exposure comparative pressure) |
| Cross-jurisdiction coordination packets | SPE-39 + SPE-854 | Intake pairing |
| Hidden-cell strategic interference | SPE-39 child | Larger adversary layer |
| Legitimacy fallout tick standing scale | SPE-39 / procurement follow-up | Alternate fallout surface; trust path chosen for this AC |

## Validation

- `npm run test:run -- src/test/rivalPressure.test.ts src/test/externalSupport.test.ts src/test/agency.test.ts src/test/agencyStanding.test.ts`
- `npm run lint`
