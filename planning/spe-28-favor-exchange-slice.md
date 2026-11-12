# SPE-28 — faction favor exchange (umbrella slice)

**Linear:** [SPE-28](https://linear.app/spectranoir/issue/SPE-28/funding-pressure-and-procurement-availability)  
**Branch:** `spe-28-favor-exchange-procurement`  
**Base:** `main` @ post-PR-2502

## Goal

Wire one rare asset acquisition through a **constrained faction-favor exchange** rather than ordinary cash purchase — player-visible in market listings and redeemable deterministically.

## Acceptance (this slice)

- [x] Rare asset (`containment_staff`) blocked for cash buy even with surplus funding
- [x] Same asset acquirable via open `corporate_supply` salvage favor without spending funding
- [x] Tests keep access-blocker vs budget-blocker paths separate

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Barter / recovery channel variants | SPE-28 parent | Favor exchange is smallest constrained path |
| Non-cash leverage rewards (service boons) | SPE-28 parent | Separate acceptance criterion |
| Delayed arrival / capacity-blocked fulfillment | SPE-28 parent | Out of favor-exchange boundary |

## Validation

- `npm run test:run -- src/test/sim.market.test.ts` (targeted favor-exchange cases)
- `npm run lint`
