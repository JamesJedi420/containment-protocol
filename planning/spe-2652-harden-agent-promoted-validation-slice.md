# SPE-2652 — Harden agent.promoted event validation

**Linear:** [SPE-2652](https://linear.app/spectranoir/issue/SPE-2652/harden-agentpromoted-event-validation)  
**Branch:** `jamesdyedbq/spe-2652-harden-agentpromoted-event-validation`

## Goal

Reject inconsistent `agent.promoted` payloads at the operation-event validation boundary so level and skill-point fields cannot drift past producers.

## Scope

- Harden `agentPromotedSchema` in `src/domain/events/eventValidation.ts`
- Shared `reconcileAgentPromotedFields` (SPE-2651 pattern); hydrate + agent-history sanitize reconcile before validate
- Add targeted validation + history preservation tests

## Out of scope

- Progression XP schema (SPE-2651)
- Broader event-schema hardening for unrelated types
- UI / feed rendering

## Acceptance

- Finite nonnegative integer `levelsGained` / `skillPointsGranted`; levels are finite ints ≥ 1
- `newLevel >= previousLevel` and `levelsGained === newLevel - previousLevel`
- Trimmed nonblank `newRole`
- Invalid cases fail; valid promotions and minimal/producer fixtures pass
- Legacy history/hydrate promoted events preserved when reconcile runs first

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| — | — | None this slice |
