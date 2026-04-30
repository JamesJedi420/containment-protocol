# Market and Economy Audit — Procurement Listings, Pricing, Availability, and Transactions

> Design note and architectural reference for `src/domain/market.ts` and `src/data/production`.

---

## 1. Overview

The market system provides a procurement layer for equipment, materials, and production recipes. All listings are derived from a combination of the production catalog, equipment catalog, and game state — no listing data is stored directly in `GameState`.

Pricing, availability, and sell ratios are computed at read time using the current market pressure state and a seeded RNG keyed to the market week.

---

## 2. Listing Sources

Three listing sources exist (`ProcurementListingSource`):

| Source | ID prefix | Items | Bundle quantity |
| --- | --- | --- | --- |
| `recipe` | recipe ID | Production recipe outputs (from `productionCatalog`) | `recipe.outputQuantity` |
| `material` | `material:<id>` | Raw materials (from `productionMaterialCatalog`) | 1 |
| `direct_equipment` | `gear:<id>` | Equipment catalog entries without a recipe | 1 |

Direct equipment excludes any item that already has a recipe in `productionCatalog`.

---

## 3. Market Pressure

`GameState.market.pressure` is one of `'stable' | 'tight' | 'discounted'`. Pressure affects pricing, availability, and sell ratios:

| Pressure | Cost multiplier effect | Availability delta (material) | Availability delta (recipe/direct) | Sell ratio |
| --- | --- | --- | --- | --- |
| `stable` | × `costMultiplier` | 0 | 0 | 0.54 |
| `tight` | × `costMultiplier` (higher) | -2 bundles | -1 bundle | 0.68 |
| `discounted` | × `costMultiplier` (lower) | +2 bundles | +1 bundle | 0.42 |

Sell ratio is capped at 0.80. Featured listings get a +0.04 sell ratio bonus.

---

## 4. Availability

Base bundle availability is determined by source type:

| Source | Base bundles | Spread |
| --- | --- | --- |
| `material` | 5 | 0–4 |
| `recipe` | 2 | 0–2 |
| `direct_equipment` | 1 | 0–2 |

The spread is drawn from a seeded RNG (`createListingRng`) keyed to:

```text
`${rngSeed}:${market.week}:${market.pressure}:${market.featuredRecipeId}:${listingId}`
```

The **featured recipe** gets +1 bundle availability. After applying pressure deltas, the result is clamped to ≥ 0.

`remainingAvailability` subtracts bought quantity and adds sold quantity for the current market week:

```text
remainingAvailability = max(0, totalAvailability − boughtThisWeek + soldThisWeek)
```

Transactions are read from `game.events` filtered to `market.transaction_recorded` events for the current `marketWeek`.

---

## 5. Pricing

### Buy price

| Source | Formula |
| --- | --- |
| Recipe | `getRecipeMarketBuyCost(recipe, market)` (delegated to `production` module) |
| Material | `round(baseUnitPrice × bundleQty × market.costMultiplier)`, clamped ≥ 1 |
| Direct equipment | `round(baseUnitPrice × bundleQty × market.costMultiplier)`, clamped ≥ 1 |

Material base unit prices:

| Material | Base price |
| --- | --- |
| `electronic_parts` | 7 |
| `medical_supplies` | 6 |
| `occult_reagents` | 8 |
| `warding_resin` | 9 |
| `ballistic_supplies` | 5 |

Direct equipment base price:

```text
EQUIPMENT_SLOT_BASE_PRICES[slot] + quality × 4 + premiumTagCount × 2
```

Premium tags: `anti-spirit`, `containment`, `hazmat`, `surveillance`.

Slot base prices:

| Slot | Base price |
| --- | --- |
| `primary` | 30 |
| `secondary` | 24 |
| `armor` | 28 |
| `headgear` | 20 |
| `utility1` | 18 |
| `utility2` | 18 |

### Sell price

```text
sellPrice = max(1, round(buyPrice × sellRatio))
```

### Fabrication cost

Only recipe listings expose a `fabricationCost` (funding cost from `getRecipeFundingCost`). Other sources leave it `undefined`.

---

## 6. Featured Listing

`game.market.featuredRecipeId` identifies which recipe gets extra availability (+1 bundle) and a sell ratio bonus (+0.04). Featured status is a display flag on `ProcurementListing.featured`.

---

## 7. Transactions

`ProcurementTransactionView` mirrors the `market.transaction_recorded` event payload. The view includes:

- `action`: `'buy'` or `'sell'`
- `quantity`, `bundleCount`, `unitPrice`, `totalPrice`
- `remainingAvailability` at time of transaction

`getCurrentMarketTransactions(game, marketWeek?)` filters `game.events` for the given market week and sorts descending by timestamp.

---

## 8. Public API

| Function | Purpose |
| --- | --- |
| `getProcurementListings(game)` | All listings with pricing and availability computed |
| `getProcurementListing(game, listingId)` | Single listing by ID |
| `getCurrentMarketTransactions(game, marketWeek?)` | All transactions for the current or specified market week |
| `getAvailableMarketCategories()` | Static list: `['equipment', 'component', 'material']` |
| `getMarketItemLabel(game, listingId)` | Display name for a listing, falling back to the ID |

---

## 9. Integration Points

| Consumer | Usage |
| --- | --- |
| `src/app/store/gameStore.ts` | Dispatches `market.transaction_recorded` events |
| `src/features/equipment/` | Reads `getProcurementListings` to render the procurement UI |
| Faction system (`factions.ts`) | Reads `market.pressure` to compute faction pressure score adjustment |
| `productionCatalog` / `productionMaterialCatalog` | Source of recipe and material definitions |

---

## 10. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Checking `totalAvailability` instead of `remainingAvailability` for buy eligibility | Ignores purchases already made this week | Use `remainingAvailability` for any gating logic |
| Assuming listings are stable across market weeks | Availability and pricing are re-derived from the seeded RNG each week | Do not cache listing data across week boundaries |
| Using raw `buyPrice × 0.54` for sell price | Ignores pressure adjustment and featured bonus | Always read `ProcurementListing.sellPrice` |
| Adding a new equipment item without checking `recipeOutputItemIds` | Item appears in both a recipe listing and a direct-equipment listing | The filter in `getListingDefinitions` deduplicates — verify `productionCatalog` has the recipe |
