# SPE-28 — vendor shortage pressure (child slice)

**Linear:** [SPE-2321](https://linear.app/spectranoir/issue/SPE-2321/spe-28-vendor-shortage-pressure-tightens-supplier-availability)  
**Parent:** [SPE-28](https://linear.app/spectranoir/issue/SPE-28/funding-pressure-and-procurement-availability) (stays **Backlog**)  
**Branch:** `spe-28-shortage-pressure`  
**Base:** `main` @ `2a2d2f47`

## Goal

One vendor-managed availability distortion on canonical listing `material:medical_supplies`: supplier bundles tighten when agency inventory is high or funding is strained, without changing price or deducting cash. Read-time derivation only (listings derived at read per SPE-448).

Satisfies parent acceptance: *at least one procurement outcome changes because of shortage pressure rather than price alone.*

## Acceptance (this slice)

- [x] Only `material:medical_supplies` receives shortage penalty
- [x] Penalty fires on high agency stock or funding strain (either signal sufficient)
- [x] Procurement outcome changes: buy blocked by availability while funding sufficient
- [x] Deterministic, no new persistence fields
- [x] Market copy distinguishes shortage from holding-cost budget tightening
- [x] Sibling slices (holding cost SPE-2320, delayed SPE-2319, favor) regression-clean
- [x] Tests + lint clean

## Implementation notes

| Area | Anchor |
| --- | --- |
| Calibration | `FUNDING_CALIBRATION.procurementShortagePressure` in `src/domain/sim/calibration.ts` |
| Domain | `assessProcurementShortagePressure`, `applyShortagePressureToBundleAvailability` in `src/domain/market.ts`; wired in `getBaseAvailability` after RNG/pressure delta |
| Pressure / UX | `assessFundingPressure` reason `vendor-shortage-pressure`; `src/features/market/marketView.ts` budget summary + listing detail |
| Stock sum | `sumInventoryStock` exported from `src/domain/funding.ts` |
| Tests | `src/test/market.shortagePressure.test.ts`, `src/features/market/marketView.test.ts` |

High stock uses `stockThreshold: 60` (holding cost bills above 50). Penalty stacks with `market.pressure === 'tight'` availability delta on the same listing.

## Out of scope

- Week-close holding cost (`applyWeeklyInventoryHoldingCostToFundingState`, SPE-2320)
- Delayed fulfillment / favor exchange / merchant sim
- New persisted market state or price multipliers
- `ProcurementPage.tsx` legacy surface

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Corruption routing on procurement outcomes | SPE-28 child | `compromisedAuthority.ts` is patrol/custody-focused |
| Service-boon / callable-obligation rewards | SPE-28 child | Obligation semantics + UI are larger |
| Barter / recovery channel variants | SPE-28 child | Multi-system |
| Full merchant / cashflow simulator | — | Explicit non-goal |

## Sibling slices (do not regress)

| Slice | Issue | Notes |
| --- | --- | --- |
| Weekly inventory holding cost | [SPE-2320](https://linear.app/spectranoir/issue/SPE-2320) | Cash at week-close; shortage is bundle penalty at listing build |
| Delayed fulfillment | [SPE-2319](https://linear.app/spectranoir/issue/SPE-2319) | `placeDelayedMarketOrder` unchanged |
| Favor exchange | SPE-28 (merged) | Access vs budget separation |
| Weekly operating cost | SPE-28 (merged) | Budget blocker path unchanged |

## Validation

- `npm run test:run -- src/test/market.shortagePressure.test.ts src/features/market/marketView.test.ts src/domain/funding.test.ts src/test/sim.advanceWeek.test.ts`
- `npm run lint`
