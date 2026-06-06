# SPE-28 — callable obligations as non-cash procurement leverage (child slice)

**Linear:** [SPE-2323](https://linear.app/spectranoir/issue/SPE-2323/spe-28-callable-obligations-as-non-cash-procurement-leverage)  
**Parent:** [SPE-28](https://linear.app/spectranoir/issue/SPE-28/funding-pressure-and-procurement-availability) (stays **Backlog** until sibling deferred items ship)  
**Branch:** `spe-28-service-boon`  
**Base:** `main` @ `b1a86089`

## Goal

One deterministic acquisition path where an open favor/obligation from `availableFavors` substitutes cash on a **cash-allowed** roster listing — not the favor-exchange listing path (`gear:containment_staff`), not merchant sim. Read-time assessment + single action hook.

Satisfies parent acceptance: *at least one resource or reward enters as favor, service access, or other non-cash leverage instead of direct currency.*

## Acceptance (this slice)

- [x] Only `material:occult_reagents` receives callable-obligation substitution
- [x] Open `institutions` research lab boon substitutes cash when funding insufficient
- [x] Procurement outcome changes: inventory granted without funding deduction; obligation consumed
- [x] Deterministic, no new persistence fields
- [x] Market copy distinguishes callable obligation from favor exchange, shortage, corruption routing, holding cost
- [x] Sibling slices regression-clean
- [x] Tests + lint clean

## Implementation notes

| Area | Anchor |
| --- | --- |
| Calibration | `FUNDING_CALIBRATION.procurementCallableObligation` in `src/domain/sim/calibration.ts` |
| Domain rules | `CALLABLE_OBLIGATION_PROCUREMENT_RULES`, `assessCallableObligationProcurement` in `src/domain/market.ts` |
| Action hook | `callCallableObligationProcurement` in `src/domain/sim/market.ts` |
| Faction seed | `institutions.availableFavors` in `src/domain/factions.ts` |
| Pressure / UX | `assessFundingPressure` reason `callable-obligation-procurement-leverage`; `src/features/market/marketView.ts` |
| Tests | `src/test/market.callableObligation.test.ts`, `src/features/market/marketView.test.ts` |

Obligation call requires budget-blocked state (`totalPrice > funding`). Cash purchase remains the path when funding is sufficient.

## Out of scope

- Favor-exchange listing path (`gear:containment_staff`, `redeemFactionFavorProcurement`)
- Corruption routing, shortage pressure, holding cost, delayed fulfillment
- New persisted market state or price multipliers
- Full merchant / cashflow simulator

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Barter / recovery channel variants | SPE-28 child | Multi-system |
| MarketPage CTA for obligation call | — | Shipped in babysit pass |
| Full merchant / cashflow simulator | — | Explicit non-goal |

## Sibling slices (do not regress)

| Slice | Issue | Notes |
| --- | --- | --- |
| Favor exchange | SPE-28 (merged) | Access vs budget separation on `gear:containment_staff` |
| Vendor shortage pressure | [SPE-2321](https://linear.app/spectranoir/issue/SPE-2321) | `material:medical_supplies` |
| Corruption routing | [SPE-2322](https://linear.app/spectranoir/issue/SPE-2322) | `material:electronic_parts` |
| Weekly inventory holding cost | [SPE-2320](https://linear.app/spectranoir/issue/SPE-2320) | Cash at week-close |
| Delayed fulfillment | [SPE-2319](https://linear.app/spectranoir/issue/SPE-2319) | `placeDelayedMarketOrder` unchanged |

## Validation

- `npm run test:run -- src/test/market.callableObligation.test.ts src/features/market/marketView.test.ts src/test/market.corruptionRouting.test.ts src/test/market.shortagePressure.test.ts src/test/sim.market.test.ts`
- `npm run lint`
