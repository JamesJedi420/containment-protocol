# SPE-2661 — Harden market.shifted catalog membership + featuredRecipeId↔name consistency

**Linear:** [SPE-2661](https://linear.app/spectranoir/issue/SPE-2661/harden-marketshifted-catalog-membership-featuredrecipeidname)  
**Branch:** `jamesdyedbq/spe-2661-harden-marketshifted-catalog-membership-featuredrecipeidname`

## Goal

Reject inconsistent `market.shifted` payloads at the operation-event validation boundary when `featuredRecipeId` is not in `productionCatalog`, or when `featuredRecipeName` does not match the catalog name for that id.

## Scope

- Harden `marketShiftedSchema` in `src/domain/events/eventValidation.ts` for catalog membership + id↔name consistency
- Reuse `sanitizeFeaturedRecipeId` membership check + `getProductionRecipe` for catalog name
- Intentional fixture update: minimal `market.shifted` uses catalog `ward-seals` (not opaque `recipe-min`)
- Targeted validation tests; hydrate 586 phantom reconcile remains unchanged (reconcile-before-validate)

## Out of scope

- `market.transaction_*` schemas
- Production / training / agent event types
- UI / feed rendering
- Broader catalog enforcement elsewhere

## Acceptance

- Reject unknown `featuredRecipeId` (not in `productionCatalog`)
- Reject id/name mismatch when id is known (`featuredRecipeName.trim()` must equal catalog name)
- Accept catalog-valid `market.shifted` payloads
- Hydrate still reconciles phantoms as today (reconcile runs before validate)
- Minimal/producer fixtures pass after intentional `market.shifted` fixture update

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Broader `market.transaction_*` schema hardening | follow-on if needed | Out of slice boundary; backlog primary remains none. |
| Catalog membership on production.queue_* recipeId | [SPE-2664](https://linear.app/spectranoir/issue/SPE-2664/harden-productionqueue-started-queue-completed-catalog-membership-for) | Out of slice; owned by SPE-2664 validate harden. |
