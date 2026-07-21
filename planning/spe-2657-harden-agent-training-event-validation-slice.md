# SPE-2657 — Harden agent training event validation

**Linear:** [SPE-2657](https://linear.app/spectranoir/issue/SPE-2657/harden-agenttraining-started-training-completed-training-cancelled)  
**Branch:** `jamesdyedbq/spe-2657-harden-agenttraining_started-training_completed`

## Goal

Reject inconsistent `agent.training_started` / `agent.training_completed` / `agent.training_cancelled` payloads at the operation-event validation boundary so `etaWeeks` / `fundingCost` / `refund` and training program ids cannot drift past producers.

## Scope

- Harden the three training schemas in `src/domain/events/eventValidation.ts`
- Shared `reconcileTrainingEventProgram` + started/completed/cancelled field helpers (SPE-2651–2656 pattern); hydrate + agent-history sanitize reconcile before validate
- Add targeted validation + history preservation tests

## Out of scope

- `agent.instructor_assigned` / `instructor_unassigned` / `relationship_changed` / `betrayed` / `promoted` / `progression.xp_gained` (SPE-2651 / 2652 / 2654 / 2655 / 2656 — shipped)
- Broader event-schema hardening for unrelated types
- UI / feed rendering

## Acceptance

- Finite positive integer `etaWeeks` (>= 1) on started
- Finite nonnegative integer `fundingCost` on started
- Finite nonnegative integer `refund` on cancelled
- Reject non-finite / negative / fractional numerics
- Program id reconcile preserves unknown/legacy training ids via catalog match (hydrate + history)
- Invalid cases fail; valid training and minimal/producer fixtures pass
- Legacy history/hydrate training events preserved when reconcile runs first

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Catalog membership / id↔name consistency at validate | follow-on if needed | Acceptance is numerics + nonblank ids; hydrate/history reconcile already resolves unknown programs. Producer catalog checks would couple schema to `trainingCatalog`. |
