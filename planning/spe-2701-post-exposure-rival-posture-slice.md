# SPE-2701 — Protective-coercive rival posture after public exposure

**Linear:** [SPE-2701](https://linear.app/spectranoir/issue/SPE-2701/spe-39-protective-coercive-rival-posture-after-public-exposure)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2701-spe-39-protective-coercive-rival-posture-after-public`  
**Base:** `main` @ `614454327703470f7a394447afffb76789b8a60b`

## Goal

One deterministic post-exposure comparative-pressure / protective-coercive rival-posture shift from agency standing/ranking into public-disclosure regional trust → cooperation bands, without reopening standing-award math, SPE-2699 contract/recruit multipliers, or SPE-2700 forgiveness-scale formula.

## Acceptance (this slice)

- [x] Identical standing + exposure inputs → identical `postExposureTrustDelta` and trust/cooperation outcomes
- [x] High standing vs low standing diverge after comparable public exposure (protective vs coercive)
- [x] No active exposure → no post-exposure comparative trust shift (`rivalPosture` inactive; delta applied 0)
- [x] Agency + rival-pressure summary + disclosure report notes expose posture/pressure signal
- [x] SPE-2699 `contractRewardMultiplier` / `recruitQualityDelta` and SPE-2700 `trustFailureDriftScale` unchanged for same ranking inputs
- [x] No new persisted fields; SCHEMA_REGISTRY unchanged
- [x] Standing award / ranking-accumulator math untouched

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/rivalPressure.ts` — `postExposureTrustDelta` + `postExposurePosture` on `RivalPressureView` |
| Trust surface | `src/domain/publicDisclosureTrustOutcomeProjection.ts` — apply delta only when awareness ≠ secrecy_intact |
| Week-close notes | `publicDisclosureTrustOutcomeWeeklyReportNotes` + `advanceWeek` pass delta from `buildRivalPressure` |
| Agency / UI | `buildAgencySummary`, `reportView` summary line |
| Docs | `systems/hub-simulation.md`, `systems/factions-legitimacy.md` |
| Tests | `src/test/rivalPressure.test.ts`, `src/test/publicDisclosureTrustOutcomeProjection.test.ts` |

Delta derives from ranking vs peer baseline (same inputs as SPE-2699/2700 pressure). High rank → positive trust delta (protective). Low rank → negative (coercive). Peer baseline → 0 / neutral. Application is projection-time only.

## Out of scope

- SPE-2696/2697 standing awards, repeats, hydration
- SPE-2699 contract/recruit multiplier formula changes
- SPE-2700 `trustFailureDriftScale` formula changes
- Cross-jurisdiction liaison packets; hidden-cell interference; SPE-542 / SPE-430 rival sims
- Emergency-waiver legitimacy fallout tick standing scale

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Cross-jurisdiction coordination packets | SPE-39 + SPE-854 | Intake pairing |
| Hidden-cell strategic interference | SPE-39 child | Larger adversary layer |
| Legitimacy fallout tick standing scale | SPE-39 / procurement follow-up | Alternate fallout surface; disclosure trust path chosen |

## Validation

- `npm run test:run -- src/test/rivalPressure.test.ts src/test/publicDisclosureTrustOutcomeProjection.test.ts src/test/publicDisclosureSegmentedTrustOutcomeProjection.test.ts src/test/publicDisclosureCampaignView.test.ts src/test/publicDisclosurePostureChoice.test.ts src/test/agency.test.ts`
- `npm run lint`
