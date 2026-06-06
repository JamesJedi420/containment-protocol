# SPE-28 — weekly inventory holding cost (child slice)

**Linear:** [SPE-2320](https://linear.app/spectranoir/issue/SPE-2320/spe-28-weekly-inventory-holding-cost-constrains-procurement-headroom)  
**Parent:** [SPE-28](https://linear.app/spectranoir/issue/SPE-28/funding-pressure-and-procurement-availability)  
**Branch:** `spe-28-inventory-holding-cost`  
**Base:** `main` @ `a38f5b23`

## Goal

Add a deterministic weekly inventory holding fee at week-close so stocked units (or liquidation-value band) materially tighten procurement headroom — satisfying parent acceptance: *at least one procurement outcome changes because of holding cost, shortage pressure, corruption routing, or funding-source legitimacy rather than price alone* (holding-cost path only; no merchant sim).

## Acceptance (this slice)

- [x] `computeWeeklyInventoryHoldingCost` is deterministic from inventory stock / liquidation metrics
- [x] `applyWeeklyInventoryHoldingCostToFundingState` deducts once per closed week via `applyFundingExpense` + idempotent `sourceId` week key (mirror `operating_cost` pattern)
- [x] `advanceWeek` calls holding-cost apply after operating cost in `updateAgencyMetrics`; funding clamped `Math.max(0, …)` unchanged
- [x] `assessFundingPressure` surfaces holding-cost reason code when high stock tightens procurement timing
- [x] Market budget summary copy reflects holding-cost pressure (access vs budget blockers stay separate)
- [x] Empty inventory → fee 0, no history row
- [x] Tests + lint clean

## Implementation notes

| Area | Anchor |
| --- | --- |
| Calibration | `FUNDING_CALIBRATION.weeklyInventoryHoldingCost` in `src/domain/sim/calibration.ts` |
| Domain | `computeWeeklyInventoryHoldingCost`, `hasWeeklyInventoryHoldingCostForWeek`, `applyWeeklyInventoryHoldingCostToFundingState` in `src/domain/funding.ts` |
| Fee basis | `sumInventoryStock` in `funding.ts`; billable stock above `billableStockThreshold` in calibration |
| Week-close hook | `updateAgencyMetrics` in `src/domain/sim/advanceWeek.ts` (post operating cost, ordering aligned with SPE-2319) |
| Pressure / UX | `assessFundingPressure.reasonCodes`, `src/features/market/marketView.ts` budget summary |
| History reason | `inventory_holding_cost` (new `FundingHistoryReason`) |
| Tests | Mirror `src/domain/funding.test.ts`, `src/test/sim.advanceWeek.test.ts`, `src/features/market/marketView.test.ts` operating-cost patterns |

## Out of scope

- Shortage-pressure vendor stock sim
- Corruption routing (`compromisedAuthority` procurement bridge)
- Service-boon / callable-obligation rewards
- Barter / recovery channel variants
- Merchant / cashflow simulator
- `ProcurementPage.tsx` legacy surface
- Retuning `pendingBacklogThreshold` without test evidence

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Shortage pressure (vendor-managed stock distortion) | [SPE-2321](https://linear.app/spectranoir/issue/SPE-2321) | Shipped as read-time roster listing penalty (sibling slice) |
| Corruption routing on procurement outcomes | SPE-28 child | `compromisedAuthority.ts` is patrol/custody-focused; needs procurement bridge |
| Service-boon / callable-obligation rewards | SPE-28 child | `availableFavors` exists but obligation semantics + UI are larger |
| Barter / recovery channel variants | SPE-28 child | Multi-system: missions → inventory → market |
| Full merchant / cashflow simulator | — | Explicit non-goal |

## Sibling slices (do not regress)

| Slice | Issue | Notes |
| --- | --- | --- |
| Weekly operating cost | SPE-28 (merged) | Separate `sourceId`; no double-charge same week |
| Favor exchange | SPE-28 (merged) | Access vs budget separation |
| Delayed fulfillment | [SPE-2319](https://linear.app/spectranoir/issue/SPE-2319) | `placeDelayedMarketOrder` / backlog fulfill unchanged |

## Validation

- `npm run test:run -- src/domain/funding.test.ts src/test/sim.advanceWeek.test.ts src/features/market/marketView.test.ts`
- `npm run lint`
