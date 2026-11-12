# SPE-28 — compromised authority procurement routing (child slice)

**Linear:** [SPE-2322](https://linear.app/spectranoir/issue/SPE-2322/spe-28-compromised-authority-distorts-procurement-routing)  
**Parent:** [SPE-28](https://linear.app/spectranoir/issue/SPE-28/funding-pressure-and-procurement-availability) (stays **Backlog**)  
**Branch:** `spe-28-corruption-routing`  
**Base:** `main` @ `f11320e4`

## Goal

One deterministic procurement outcome change routed through office-mediated diversion / `compromisedAuthority` signals — not price, shortage bundles, or week-close cash. Read-time derivation only (listings derived at read per SPE-448).

Satisfies parent acceptance: *at least one procurement outcome changes because of corruption routing rather than price alone.*

## Acceptance (this slice)

- [x] Only `material:electronic_parts` receives corruption routing penalty
- [x] Penalty fires on office-mediated diversion (magistrate/watchCommander + evidence distortion)
- [x] Procurement outcome changes: buy blocked by diverted availability while funding sufficient
- [x] Deterministic, no new persistence fields
- [x] Market copy distinguishes corruption routing from shortage and holding-cost budget tightening
- [x] Sibling slices (shortage SPE-2321, holding cost SPE-2320, delayed SPE-2319, favor) regression-clean
- [x] Tests + lint clean

## Implementation notes

| Area | Anchor |
| --- | --- |
| Calibration | `FUNDING_CALIBRATION.procurementCorruptionRouting` in `src/domain/sim/calibration.ts` |
| Domain signal | `assessCompromisedAuthorityProcurementDiversion` in `src/domain/sim/compromisedAuthority.ts` |
| Domain hook | `assessProcurementCorruptionRouting`, `applyCorruptionRoutingToBundleAvailability` in `src/domain/market.ts`; wired in `getBaseAvailability` after shortage delta |
| Pressure / UX | `assessFundingPressure` reason `compromised-authority-procurement-diversion`; `src/features/market/marketView.ts` budget summary + listing detail |
| Tests | `src/test/market.corruptionRouting.test.ts`, `src/features/market/marketView.test.ts` |

Office-mediated diversion requires `magistrate` or `watchCommander` role with `evidence` in `distortedCategories`. Penalty stacks after shortage on the same read path but targets a different listing id.

## Out of scope

- Week-close holding cost (`applyWeeklyInventoryHoldingCostToFundingState`, SPE-2320)
- Vendor shortage pressure hook (`assessProcurementShortagePressure`, SPE-2321)
- Delayed fulfillment / favor exchange / merchant sim
- New persisted market state or price multipliers
- `ProcurementPage.tsx` legacy surface

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Service-boon / callable-obligation rewards | [SPE-2323](https://linear.app/spectranoir/issue/SPE-2323) | Shipped as obligation substitution on `material:occult_reagents` |
| Barter / recovery channel variants | SPE-28 child | Multi-system |
| Full merchant / cashflow simulator | — | Explicit non-goal |

## Sibling slices (do not regress)

| Slice | Issue | Notes |
| --- | --- | --- |
| Vendor shortage pressure | [SPE-2321](https://linear.app/spectranoir/issue/SPE-2321) | `material:medical_supplies`; orthogonal listing |
| Weekly inventory holding cost | [SPE-2320](https://linear.app/spectranoir/issue/SPE-2320) | Cash at week-close |
| Delayed fulfillment | [SPE-2319](https://linear.app/spectranoir/issue/SPE-2319) | `placeDelayedMarketOrder` unchanged |
| Favor exchange | SPE-28 (merged) | Access vs budget separation |
| Weekly operating cost | SPE-28 (merged) | Budget blocker path unchanged |

## Validation

- `npm run test:run -- src/test/market.corruptionRouting.test.ts src/features/market/marketView.test.ts src/test/market.shortagePressure.test.ts src/domain/funding.test.ts`
- `npm run lint`
