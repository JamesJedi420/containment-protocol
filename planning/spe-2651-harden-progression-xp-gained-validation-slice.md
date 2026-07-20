# SPE-2651 — Harden progression.xp_gained event validation

**Linear:** [SPE-2651](https://linear.app/spectranoir/issue/SPE-2651/harden-progressionxp-gained-event-validation)  
**Branch:** `jamesdyedbq/spe-2651-harden-progressionxp_gained-event-validation`

## Goal

Reject inconsistent `progression.xp_gained` payloads at the operation-event validation boundary so XP totals and derived levels cannot drift past producers.

## Scope

- Harden `progressionXpGainedSchema` in `src/domain/events/eventValidation.ts`
- Align level/`levelsGained` checks with `getLevelForXp` (same policy as hydration reconciliation)
- Update minimal fixture consistency
- Add targeted validation tests

## Out of scope

- Changing hydration rewrite behavior in `reconcileProgressionXpGainedFields`
- Broader event-schema hardening for other progression/agent events

## Acceptance

- Finite nonnegative integer `xpAmount` / `totalXp` with `totalXp >= xpAmount`
- `level === getLevelForXp(totalXp)`
- `levelsGained` equals derived level delta across the gain
- Trimmed nonblank `reason`
- Invalid cases fail; valid XP events and minimal/producer fixtures pass

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| — | — | None this slice |
