# Legacy procurement UI (SPE-34 prototype)

**Owner decision (2026-05):** superseded by the routed market surface.

| Surface | Route | Implementation |
| ------- | ----- | -------------- |
| **Canonical player procurement** | `/markets-suppliers` | `MarketPage`, `marketView.ts`, `src/domain/market.ts` |
| **This folder** | *(no App route)* | `ProcurementPage` + `procurementView.ts` — early three-column prototype |

Do not wire `ProcurementPage` as a second route or merge it into `MarketPage` without an explicit product slice. Domain procurement (backlog, listings, emergency waivers) already lives under `src/domain/market.ts`, `src/domain/funding.ts`, and related modules.

Removal is blocked only by `ProcurementPage.test.tsx` and any harvest references; delete this folder when those tests are retired or redirected to `MarketPage` tests.

## Legacy stylesheet (problem 163)

`ProcurementPage.css` retains hex category/affordability colors from the SPE-34 mock. **Recommendation:** archive with this folder; canonical styling is on `MarketPage` + shared tokens. Do not copy these hex values into new surfaces.
