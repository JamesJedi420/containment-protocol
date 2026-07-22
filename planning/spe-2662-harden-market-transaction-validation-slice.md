# SPE-2662 — Harden market.transaction_* numeric + consistency validation

**Linear:** [SPE-2662](https://linear.app/spectranoir/issue/SPE-2662/harden-markettransaction-numeric-consistency-validation)  
**Branch:** `jamesdyedbq/spe-2662-harden-markettransaction-numeric-consistency-validation`

## Goal

Reject inconsistent `market.transaction_recorded` payloads at the operation-event validation boundary so quantity / bundle / price numerics cannot drift past producers, and `totalPrice` cannot disagree with producer semantics (`unitPrice * quantity` within 1 cent).

## Scope

- Harden `marketTransactionRecordedSchema` in `src/domain/events/eventValidation.ts`
- Finite positive ints for `quantity` / `bundleCount`; finite nonnegative for `unitPrice` / `totalPrice` (cents allowed); finite nonnegative int for `remainingAvailability`
- `superRefine` consistency: integer-cent drift `|round(totalPrice*100) - round(unitPrice*quantity*100)| <= bundleCount` (quantity already includes bundles; ~1¢/bundle rounding)
- Keep hydrate reconcile-before-validate; do not change sanitize rewrite policy this slice
- Targeted validation tests (multi-bundle, cent unitPrice, zero-price favor/obligation)

## Deferred note on hydrate

Hydrate `reconcileMarketTotalPrice` still uses `unitPrice * quantity * bundleCount`. That can disagree with multi-bundle producers; fixing hydrate formula is out of this validate-only slice.

## Out of scope

- Catalog membership on `production.queue_*` recipeId
- Broader allocation / listing-resource-status numeric bounds at validate (hydrate SPE-2551/2552 already clamp)
- Production / training / agent event types
- UI / feed rendering
- SPE-2658-style history sanitize (already shipped)

## Acceptance

- Reject non-finite, negative, zero-quantity/bundle, and fractional qty/bundle/remainingAvailability
- Reject `totalPrice` outside `bundleCount` cents of `unitPrice * quantity` (integer-cent compare)
- Accept producer-valid multi-bundle and cent-`unitPrice` payloads; zero-price favor / obligation rows
- Hydrate still runs before validate (runTransfer case 512 policy preserved this slice)
- Do not break minimal/producer fixtures without intentional fixture update

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Align hydrate `reconcileMarketTotalPrice` with producer `unitPrice * quantity` | follow-on if needed | Validate-only slice; hydrate rewrite policy unchanged. |
| Catalog membership on `production.queue_*` recipeId | follow-on if needed | Alternate SPE-2661 Deferred; production schemas remain opaque-id tolerant. |
| Allocation priority/delayWeeks + listing resource available/capacity at validate | follow-on if needed | Hydrate already clamps (SPE-2551/2552); out of this numeric/consistency slice. |
