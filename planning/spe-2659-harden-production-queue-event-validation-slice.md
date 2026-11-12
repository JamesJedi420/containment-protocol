# SPE-2659 — Harden production.queue_started / queue_completed numeric consistency validation

**Linear:** [SPE-2659](https://linear.app/spectranoir/issue/SPE-2659/harden-productionqueue-started-queue-completed-numeric-consistency)  
**Branch:** `jamesdyedbq/spe-2659-harden-productionqueue_started-queue_completed-numeric`

## Goal

Reject inconsistent `production.queue_started` / `production.queue_completed` payloads at the operation-event validation boundary so `etaWeeks` / `fundingCost` / `outputQuantity` cannot drift past producers.

## Scope

- Harden the two production queue schemas in `src/domain/events/eventValidation.ts`
- Shared `reconcileProductionQueueStartedFields` / `reconcileProductionQueueCompletedFields` (SPE-2651–2657 pattern); hydrate sanitize reconciles before validate
- Add targeted validation + hydrate preservation tests

## Out of scope

- `agent.training_*` / `instructor_*` / `relationship_changed` / `betrayed` / `promoted` / `progression.xp_gained` (SPE-2651–2657 — shipped)
- Broader event-schema hardening for unrelated types
- UI / feed rendering
- Catalog membership at validate (deferred from SPE-2657 — optional/low priority)

## Acceptance

- Finite positive integer `etaWeeks` (>= 1) on started
- Finite nonnegative integer `fundingCost` on started and completed
- Finite positive integer `outputQuantity` (>= 1) on started and completed
- Reject non-finite / negative / fractional numerics
- Invalid cases fail; valid production and minimal/producer fixtures pass
- Legacy hydrate production events preserved when reconcile runs first (scaled fundingCost not rewritten to catalog/market bands)

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Catalog membership / id↔name consistency at validate | follow-on if needed | Acceptance is numerics; hydrate already reconciles known recipes. Producer catalog checks would couple schema to `productionCatalog`. |
