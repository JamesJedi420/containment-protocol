# SPE-2654 — Harden agent.betrayed trust-damage event validation

**Linear:** [SPE-2654](https://linear.app/spectranoir/issue/SPE-2654/harden-agentbetrayed-trust-damage-event-validation)  
**Branch:** `jamesdyedbq/spe-2654-harden-agentbetrayed-trust-damage-event-validation`

## Goal

Reject inconsistent `agent.betrayed` payloads at the operation-event validation boundary so `trustDamageDelta` / `trustDamageTotal` cannot drift past producers.

## Scope

- Harden `agentBetrayedSchema` in `src/domain/events/eventValidation.ts`
- Shared `reconcileAgentBetrayedFields` (SPE-2652 pattern); hydrate + agent-history sanitize reconcile before validate
- Add targeted validation + history preservation tests

## Out of scope

- `agent.promoted` / `progression.xp_gained` (SPE-2651 / SPE-2652 — shipped)
- Broader event-schema hardening for unrelated types
- UI / feed rendering

## Acceptance

- Finite nonnegative `trustDamageDelta` / `trustDamageTotal` (fractional damage allowed)
- `trustDamageTotal >= trustDamageDelta`
- Invalid cases fail; valid betrayal and minimal/producer fixtures pass
- Legacy history/hydrate betrayed events preserved when reconcile runs first

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| — | — | None this slice |
