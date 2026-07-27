# SPE-2666 — Harden market.emergency_gray_market_* soft numerics at validate

**Linear:** [SPE-2666](https://linear.app/spectranoir/issue/SPE-2666/harden-marketemergency-gray-market-soft-numerics-at-validate)  
**Branch:** `jamesdyedbq/spe-2666-harden-marketemergency_gray_market_-soft-numerics-at`

## Goal

Reject non-finite / invalid soft numerics on emergency gray-market waiver and fallout operation events at the validation boundary, matching hydrate sanitize floors without changing hydrate rewrite policy.

## Scope

- Harden `marketEmergencyGrayMarketWaiverGrantedSchema` and `marketEmergencyGrayMarketFalloutTickSchema` in `src/domain/events/eventValidation.ts`
- `crisisPressureScore` on `market.emergency_gray_market_waiver_granted`: finite nonnegative int (hydrate `sanitizeInteger` floor 0)
- `fundingBefore` / `fundingAfter` / `containmentRatingBefore` / `containmentRatingAfter` on `market.emergency_gray_market_fallout_tick`: finite numerics (reject NaN/Infinity; allow after < before when producers emit penalty deltas)
- Keep existing `waiverPrecedentCount` 1–50000 and `precedentPenaltyMultiplier` 1–2 bounds unchanged
- Do **not** change hydrate sanitize/reconcile rewrite (`runTransfer.ts` gray-market cases; `reconcileEmergencyGrayMarketFalloutTickFields`)
- Leave `market.emergency_gray_market_waiver_accountability_closed` unchanged
- Targeted validation tests; fixture update only if needed

## Out of scope

- Hydrate sanitize / reconcile rewrite policy
- `market.transaction_recorded` / `market.shifted` / `production.queue_*` (already hardened SPE-2659–2665)
- Opaque production hydrate rewrite (SPE-2664 Deferred keep-current)
- UI / feed rendering
- SCHEMA_REGISTRY expansion

## Acceptance

- Reject non-finite / invalid `crisisPressureScore` (NaN, Infinity, negative, fractional)
- Reject non-finite fallout `funding*` / `containmentRating*` (NaN, Infinity)
- Accept producer-aligned valid waiver_granted and fallout_tick payloads (including funding/containment after < before)
- Keep `waiverPrecedentCount` / `precedentPenaltyMultiplier` bounds
- Do not break `accountability_closed`
- Hydrate rewrite policy unchanged

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Opaque production hydrate rewrite of queue recipe ids | keep current (SPE-2664 Deferred) | Validate-only; hydrate reconcile stays opaque-id tolerant. |
