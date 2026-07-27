# SPE-2665 — Harden market.transaction_recorded allocation + listing resource numeric bounds at validate

**Linear:** [SPE-2665](https://linear.app/spectranoir/issue/SPE-2665/harden-markettransaction-recorded-allocation-prioritydelayweeks)  
**Branch:** `jamesdyedbq/spe-2665-harden-markettransaction_recorded-allocation`

## Goal

Reject out-of-bounds `market.transaction_recorded` allocation and listing-resource-status numerics at the operation-event validation boundary so priority/delayWeeks and available/capacity cannot drift past hydrate clamp maxima (SPE-2551/2552).

## Scope

- Harden `procurementAllocationSchema` and `marketTransactionListingResourceStatusSchema` in `src/domain/events/eventValidation.ts`
- Finite nonnegative ints for allocation `priority` / `delayWeeks` within hydrate clamp maxima (`priority` 0–10, `delayWeeks` 0–52)
- Finite nonnegative ints for listing resource `available` / `capacity`; when both present, `available <= capacity`
- Keep hydrate SPE-2551/2552 clamps unchanged (validate-only; no sanitize rewrite policy change)
- Targeted validation tests; fixture update only if needed
- Update SPE-2662/2663/2664 Deferred owners to this issue

## Out of scope

- Hydrate clamp rewrite policy / sanitize changes
- `production.queue_*` catalog membership (SPE-2664 shipped)
- Opaque production hydrate rewrite (separate deferred on SPE-2664)
- UI / feed rendering
- SCHEMA_REGISTRY expansion

## Acceptance

- Reject non-finite, negative, fractional, and above-max `priority` / `delayWeeks`
- Reject non-finite, negative, fractional `available` / `capacity`; reject `available > capacity` when both present
- Accept hydrate-aligned valid rows (including available without capacity; clamp-edge priority/delayWeeks)
- Do not break zero-price favor / obligation paths
- Hydrate clamps remain unchanged

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Hydrate rewrite of opaque production queue recipe ids | keep current (SPE-2664 Deferred) | Validate-only; hydrate reconcile stays opaque-id tolerant. |
