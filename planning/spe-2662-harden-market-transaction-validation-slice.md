# SPE-2662 — Harden market.transaction_* numeric + consistency validation

**Linear:** [SPE-2662](https://linear.app/spectranoir/issue/SPE-2662/harden-markettransaction-numeric-consistency-validation)  
**Branch:** `jamesdyedbq/spe-2662-harden-markettransaction-numeric-consistency-validation`

## Goal

Reject inconsistent `market.transaction_recorded` payloads at the operation-event validation boundary so quantity / bundle / price numerics cannot drift past producers, and `totalPrice` cannot disagree with `unitPrice * quantity * bundleCount`.

## Scope

- Harden `marketTransactionRecordedSchema` in `src/domain/events/eventValidation.ts`
- Finite positive ints for `quantity` / `bundleCount`; finite nonnegative ints for `unitPrice` / `totalPrice` / `remainingAvailability`
- `superRefine` consistency: `totalPrice === unitPrice * quantity * bundleCount` (matches hydrate `reconcileMarketTotalPrice` product)
- Keep hydrate reconcile-before-validate; do not change sanitize rewrite policy
- Targeted validation tests; hydrate runTransfer case 512 (zero qty/bundle + mismatched total) remains unchanged

## Out of scope

- Catalog membership on `production.queue_*` recipeId
- Broader allocation / listing-resource-status numeric bounds at validate (hydrate SPE-2551/2552 already clamp)
- Production / training / agent event types
- UI / feed rendering
- SPE-2658-style history sanitize (already shipped)

## Acceptance

- Reject non-finite, negative, zero-quantity/bundle, and fractional transaction numerics
- Reject `totalPrice` that does not equal `unitPrice * quantity * bundleCount`
- Accept producer-valid / minimal fixture payloads (including zero-price favor / obligation rows)
- Hydrate still reconciles zero/mismatched totals before validate (runTransfer case 512 policy preserved)
- Do not break minimal/producer fixtures without intentional fixture update

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Catalog membership on `production.queue_*` recipeId | follow-on if needed | Alternate SPE-2661 Deferred; production schemas remain opaque-id tolerant. |
| Allocation priority/delayWeeks + listing resource available/capacity at validate | follow-on if needed | Hydrate already clamps (SPE-2551/2552); out of this numeric/consistency slice. |
