# SPE-2660 — Harden market.shifted numeric + pressure/multiplier consistency validation

**Linear:** [SPE-2660](https://linear.app/spectranoir/issue/SPE-2660/harden-marketshifted-numeric-pressuremultiplier-consistency-validation)  
**Branch:** `jamesdyedbq/spe-2660-harden-marketshifted-numeric-pressuremultiplier-consistency`

## Goal

Reject inconsistent `market.shifted` payloads at the operation-event validation boundary so `costMultiplier` cannot drift from the stated `pressure` band (canonical multipliers).

## Scope

- Harden `marketShiftedSchema` in `src/domain/events/eventValidation.ts`
- Shared `reconcileMarketShiftedFields` in `src/domain/market.ts` (SPE-2651–2659 reconcile-before-validate); hydrate sanitize reconciles before validate
- Add targeted validation + hydrate preservation tests

## Out of scope

- `production.queue_*` / `agent.training_*` / instructor / relationship / betrayal / promoted / progression (SPE-2651–2659 — shipped)
- Broader `market.transaction_*` schemas
- UI / feed rendering
- Catalog membership at validate (SPE-2657/2659 deferred — optional/low priority)

## Acceptance

- Finite nonnegative `costMultiplier`
- `costMultiplier` equals canonical multiplier for `pressure` (`tight` → 1.15, `stable` → 1, `discounted` → 0.9)
- Reject non-finite / negative / out-of-band / pressure-inconsistent multipliers
- Invalid cases fail; valid market.shifted and minimal/producer fixtures pass
- Legacy hydrate market.shifted events preserved/reconciled when reconcile runs first (same policy as today)

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Catalog membership / featuredRecipeId↔name consistency at validate | [SPE-2661](https://linear.app/spectranoir/issue/SPE-2661/harden-marketshifted-catalog-membership-featuredrecipeidname) | Deferred from SPE-2660 numerics slice; follow-on owns strict membership + id↔name at validate. |
| Broader `market.transaction_*` schema hardening | follow-on if needed | Out of slice boundary; backlog primary remains none. |
