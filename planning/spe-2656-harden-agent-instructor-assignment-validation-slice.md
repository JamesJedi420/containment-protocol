# SPE-2656 — Harden agent.instructor_assigned / instructor_unassigned bonus+specialty validation

**Linear:** [SPE-2656](https://linear.app/spectranoir/issue/SPE-2656/harden-agentinstructor-assigned-instructor-unassigned-bonusspecialty)  
**Branch:** `jamesdyedbq/spe-2656-harden-agentinstructor_assigned-instructor_unassigned`

## Goal

Reject inconsistent `agent.instructor_assigned` / `agent.instructor_unassigned` payloads at the operation-event validation boundary so `bonus` and `instructorSpecialty` cannot drift past producers.

## Scope

- Harden shared instructor assignment schema in `src/domain/events/eventValidation.ts`
- Shared `reconcileAgentInstructorAssignmentFields` (SPE-2655 pattern); hydrate + agent-history sanitize reconcile before validate
- Add targeted validation + history preservation tests

## Out of scope

- `agent.relationship_changed` / `agent.betrayed` / `agent.promoted` / `progression.xp_gained` (SPE-2651 / 2652 / 2654 / 2655 — shipped)
- Training events (separate slice)
- Broader event-schema hardening for unrelated types
- UI / feed rendering

## Acceptance

- Finite nonnegative integer `bonus` (reject non-finite / negative / fractional)
- `instructorSpecialty` StatKey allowlist (`combat` | `investigation` | `utility` | `social`)
- Assigned and unassigned schemas stay aligned (shared fields schema)
- Invalid cases fail; valid instructor and minimal/producer fixtures pass
- Legacy history/hydrate instructor events preserved when reconcile runs first

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| — | — | None this slice |
