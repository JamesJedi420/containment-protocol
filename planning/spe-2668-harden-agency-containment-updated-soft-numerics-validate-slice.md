# SPE-2668 — Harden agency.containment_updated soft numerics at validate

**Linear:** [SPE-2668](https://linear.app/spectranoir/issue/SPE-2668/harden-agencycontainment-updated-soft-numerics-at-validate)  
**Branch:** `jamesdyedbq/spe-2668-harden-agencycontainment_updated-soft-numerics-at-validate`

> Note: User request named this follow-on SPE-2667; that id was already assigned to delayed market order hydration. This slice is SPE-2668.

## Goal

Reject non-finite / invalid soft numerics on `agency.containment_updated` at the validation boundary, matching hydrate sanitize floors without changing hydrate rewrite policy.

## Scope

- Harden `agencyContainmentUpdatedSchema` in `src/domain/events/eventValidation.ts`
- `containmentRatingBefore` / `containmentRatingAfter` / `containmentDelta` / `fundingBefore` / `fundingAfter` / `fundingDelta`: finite numerics (reject NaN/Infinity; signed deltas remain valid)
- `clearanceLevelBefore` / `clearanceLevelAfter`: finite nonnegative ints (hydrate `sanitizeInteger` / `reconcileBeforeAfterDelta`)
- Do **not** change hydrate sanitize/reconcile rewrite (`runTransfer.ts` `agency.containment_updated` case)
- Do **not** require `delta == after − before` beyond what hydrate already reconciles
- Targeted validation tests; fixture update only if needed

## Out of scope

- Hydrate sanitize / reconcile rewrite policy
- Related agency front-business / academy events (not scoped in)
- `market.transaction_*` / `market.shifted` / `market.emergency_gray_market_*` / `production.queue_*` (already hardened SPE-2659–2666)
- Opaque production hydrate rewrite (SPE-2664 Deferred keep-current)
- UI / feed rendering
- SCHEMA_REGISTRY expansion

## Acceptance

- Reject non-finite containment/funding/delta fields (NaN, Infinity)
- Reject non-finite / invalid clearanceLevel* (NaN, Infinity, negative, fractional)
- Accept producer-aligned valid before/after/delta payloads (including negative funding/containment deltas)
- Do not break related agency front-business / academy events in this pass
- Hydrate rewrite policy unchanged

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Opaque production hydrate rewrite of queue recipe ids | keep current (SPE-2664 Deferred) | Validate-only; hydrate reconcile stays opaque-id tolerant. |
| Agency front-business / academy soft numerics at validate | follow-on (unnamed) | Out of this slice; same validate-harden pattern when prioritized. |
