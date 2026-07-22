# SPE-2663 — Align hydrate reconcileMarketTotalPrice with producer unitPrice*quantity

**Linear:** [SPE-2663](https://linear.app/spectranoir/issue/SPE-2663/align-hydrate-reconcilemarkettotalprice-with-producer)  
**Branch:** `jamesdyedbq/spe-2663-align-hydrate-reconcilemarkettotalprice-with-producer`  
**Status:** In progress

## Goal

Align hydrate `reconcileMarketTotalPrice` with producer semantics so multi-bundle `market.transaction_recorded` rows are not rewritten using `unitPrice * quantity * bundleCount`.

## Scope

- Fix `reconcileMarketTotalPrice` in `src/app/store/runTransfer.ts` to match producers: expected total ≈ `unitPrice * quantity` with integer-cent drift `|round(total*100) - round(unit*qty*100)| <= max(1, bundleCount)` (SPE-2662 validate policy)
- Preserve cent `unitPrice` on hydrate (do not integer-truncate before reconcile)
- Update hydrate case 512 / mismatch tests for multi-bundle + cent unitPrice
- Keep validate harden from SPE-2662 unchanged

## Out of scope

- Catalog membership on `production.queue_*`
- Allocation / listing-resource-status validate bounds
- UI / feed
- SCHEMA_REGISTRY expansion

## Acceptance

- Hydrate preserves producer-valid multi-bundle + cent-rounded totals (does not rewrite 30→90 or 75→truncated product)
- Case 512 still forces positive qty/bundle and reconciles grossly mismatched totals
- Targeted hydrate tests; no SCHEMA_REGISTRY expansion

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Catalog membership on `production.queue_*` recipeId | follow-on if needed | Alternate SPE-2661/2662 Deferred; production schemas remain opaque-id tolerant. |
| Allocation priority/delayWeeks + listing resource available/capacity at validate | follow-on if needed | Hydrate already clamps (SPE-2551/2552); out of this hydrate-formula slice. |
