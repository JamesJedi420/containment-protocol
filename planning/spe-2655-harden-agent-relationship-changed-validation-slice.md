# SPE-2655 — Harden agent.relationship_changed numeric consistency validation

**Linear:** [SPE-2655](https://linear.app/spectranoir/issue/SPE-2655/harden-agentrelationship-changed-numeric-consistency-validation)  
**Branch:** `jamesdyedbq/spe-2655-harden-agentrelationship_changed-numeric-consistency`

## Goal

Reject inconsistent `agent.relationship_changed` payloads at the operation-event validation boundary so `previousValue` / `nextValue` / `delta` cannot drift past producers.

## Scope

- Harden `agentRelationshipChangedSchema` in `src/domain/events/eventValidation.ts`
- Shared `reconcileAgentRelationshipChangedFields` (SPE-2654 pattern); hydrate + agent-history sanitize reconcile before validate
- Add targeted validation + history preservation tests

## Out of scope

- `agent.betrayed` / `agent.promoted` / `progression.xp_gained` (SPE-2651 / 2652 / 2654 — shipped)
- Broader event-schema hardening for unrelated types
- UI / feed rendering

## Acceptance

- Finite chemistry values in range `[-2, 2]` for `previousValue` / `nextValue`
- Finite `delta` with `delta === round(nextValue - previousValue, 2)`
- Invalid cases fail; valid relationship and minimal/producer fixtures pass
- Legacy history/hydrate relationship events preserved when reconcile runs first

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| — | — | None this slice |
