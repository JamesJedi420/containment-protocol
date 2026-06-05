# SPE-28 — weekly operating cost (umbrella slice)

**Linear:** [SPE-28](https://linear.app/spectranoir/issue/SPE-28/funding-pressure-and-procurement-availability)  
**Branch:** `spe-28-weekly-operating-cost-pressure`  
**Base:** `main` @ `752d81ef`

## Goal

Wire one deterministic weekly operating-cost deduction (payroll + facility upkeep spike) on `advanceWeek` so cash drops through `assessFundingPressure` / market affordability without a finance simulator.

## Shipped (this slice)

- `FUNDING_CALIBRATION.weeklyOperatingCost` in `src/domain/sim/calibration.ts`
- `computeWeeklyOperatingCost`, `hasWeeklyOperatingCostForWeek`, `applyWeeklyOperatingCostToFundingState` in `src/domain/funding.ts`
- Week-close charge in `updateAgencyMetrics` (`src/domain/sim/advanceWeek.ts`) with idempotent `operating_cost` history (`sourceId: weekly-operating-cost`)
- `assessFundingPressure` reason code `weekly-operating-cost` when recent charge tightens procurement headroom
- Market budget summary copy when that reason is active (`src/features/market/marketView.ts`)

## Acceptance (this slice)

- [x] Ongoing operating cost constrains procurement timing (post-week funding can block listings that were affordable pre-week)
- [x] Deterministic, single charge per closed week (no double-apply on replay when history already records the week)

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Full payroll / contractor / legal-cost matrix | SPE-28 parent | Umbrella scope; this slice is one bounded weekly deduction |
| Merchant / cashflow simulator | SPE-28 parent | Explicit out of scope |
| Non-cash / favor acquisition paths | SPE-28 parent | Separate acceptance criteria |

## Validation

- `npm run test:run -- src/domain/funding.test.ts src/test/economy.test.ts src/test/sim.advanceWeek.test.ts` (targeted)
- `npm run lint`
