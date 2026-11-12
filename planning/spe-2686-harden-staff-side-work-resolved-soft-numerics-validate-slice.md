# SPE-2686 — Harden staff.side_work.resolved soft numerics at validate

**Linear:** [SPE-2686](https://linear.app/spectranoir/issue/SPE-2686/harden-staffside-workresolved-soft-numerics-at-validate)  
**Branch:** `jamesdyedbq/spe-2686-harden-staffside_workresolved-soft-numerics-at-validate`

> Note: Handoff named this follow-on SPE-2670; that id is already a canceled unrelated issue (Adventurer hover cards). This slice is SPE-2686.

## Goal

Reject non-finite / below-floor soft numerics on `staff.side_work.resolved` at the validation boundary, matching hydrate sanitize floors without changing hydrate rewrite policy.

Follow-on from SPE-2669 Deferred (`staff.side_work.resolved` / infiltration soft numerics).

## Scope

- Harden `staff.side_work.resolved` schema in `src/domain/events/eventValidation.ts`
- `fundingDelta` — finite signed with hydrate min `-10_000`
- `fatigueDelta` — finite signed with hydrate min `-100`
- Do **not** change hydrate sanitize rewrite (`runTransfer.ts` case ~8485–8505)
- Targeted validation tests; fixture update only if needed

## Out of scope

- Hydrate sanitize / reconcile rewrite policy
- Infiltration probe soft numerics (separate follow-on if prioritized)
- `staff.coping.*` / concealment events
- Already-hardened agency / market / production validate events (SPE-2659–2669)
- UI / feed rendering
- SCHEMA_REGISTRY expansion
- SPE-2667 delayed market order hydration (separate open PR #3245)

## Acceptance

- Reject non-finite `fundingDelta` / `fatigueDelta` (NaN, Infinity)
- Reject deltas below hydrate floors (`fundingDelta` < -10_000, `fatigueDelta` < -100)
- Accept producer-aligned fixtures including negative deltas
- Leave unrelated staff / agency / infiltration events alone
- Hydrate rewrite policy unchanged

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Infiltration probe soft numerics at validate | follow-on (unnamed) | Out of this slice; same validate-harden pattern when prioritized. |
| Opaque production hydrate rewrite of queue recipe ids | keep current (SPE-2664 Deferred) | Validate-only; hydrate reconcile stays opaque-id tolerant. |
