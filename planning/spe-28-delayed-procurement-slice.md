# SPE-2319 — delayed supplier fulfillment (SPE-28 follow-up)

**Linear:** [SPE-2319](https://linear.app/spectranoir/issue/SPE-2319) (child of [SPE-28](https://linear.app/spectranoir/issue/SPE-28))  
**Branch:** `spe-28-delayed-procurement`  
**Base:** `main` @ `09186564`

## Goal

Wire `gear:field_plate` to **delayed supplier acquisition** via `FundingState.procurementBacklog`: pay at order, inventory arrives after `procurementDelayedFulfillmentWeeks` on week-close. Satisfies SPE-28 acceptance: *at least one acquisition path is delayed, capacity-blocked, or restores lost capability without creating net expansion.*

## Acceptance (this slice)

- [x] `placeDelayedMarketOrder` creates pending backlog entry, deducts funding once, no immediate inventory
- [x] `advanceWeek` fulfills after delay idempotently; inventory increments; status → `fulfilled`
- [x] Field plate listing shows order CTA + backlog ETA; instant buy blocked
- [x] Immediate-buy listings and favor-exchange path unchanged
- [x] Tests + lint clean

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Service-boon / callable-obligation rewards | SPE-28 parent | Separate acceptance criterion |
| Holding cost, shortage pressure, corruption routing | SPE-28 parent | Out of delayed-fulfillment boundary |
| Barter / recovery channel variants | SPE-28 parent | Smallest path is supplier backlog |
| Full merchant / cashflow simulator | — | Explicit non-goal |

## Validation

- `npm run test:run -- src/test/sim.market.test.ts src/features/market/marketView.test.ts`
- `npm run lint`
