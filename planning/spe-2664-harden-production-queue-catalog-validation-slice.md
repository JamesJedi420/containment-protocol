# SPE-2664 — Harden production.queue_* catalog membership for recipeId (+ output id↔name)

**Linear:** [SPE-2664](https://linear.app/spectranoir/issue/SPE-2664/harden-productionqueue-started-queue-completed-catalog-membership-for)  
**Branch:** `jamesdyedbq/spe-2664-harden-productionqueue_started-queue_completed-catalog`

## Goal

Reject unknown `production.queue_started` / `production.queue_completed` payloads at the operation-event validation boundary when `recipeId` is not in `productionCatalog`, or when `outputId` / `outputName` do not match the catalog product fields for a known recipe.

## Scope

- Harden `productionQueueStartedSchema` / `productionQueueCompletedSchema` in `src/domain/events/eventValidation.ts`
- Reuse SPE-2661 membership via `sanitizeFeaturedRecipeId` + `getProductionRecipe` for catalog output fields
- Producer contract: `outputId` = `outputItemId`, `outputName` = `outputItemName` (not recipe id / recipe name)
- Intentional fixture update: minimal queue payloads use catalog `ward-seals` / `ward_seals` / `Ward Seals` (not opaque `recipe-min`)
- Targeted validation tests; hydrate opaque-id reconcile unchanged (reconcile-before-validate)

## Out of scope

- Hydrate rewrite policy / `reconcileProductionEventRecipeOutput` changes
- `market.transaction_*` / `market.shifted`
- UI / feed rendering
- Allocation priority/delayWeeks + listing resource available/capacity at validate
- SCHEMA_REGISTRY expansion

## Acceptance

- Reject unknown `recipeId` (not in `productionCatalog`)
- When `recipeId` is catalog-known: reject `outputId` / `outputName` that do not match catalog `outputItemId` / `outputItemName`
- Accept catalog-valid queue_started / queue_completed payloads (trimmed `outputName` allowed)
- Hydrate still preserves / reconciles opaque recipe ids as today
- Minimal/producer fixtures pass after intentional fixture update

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Allocation priority/delayWeeks + listing resource available/capacity at validate | follow-on if needed | Hydrate already clamps (SPE-2551/2552); out of this production-queue catalog slice. |
| Hydrate rewrite of opaque production queue recipe ids | keep current | This slice is validate-only; hydrate reconcile stays opaque-id tolerant. |
