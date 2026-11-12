# SPE-2687 — Harden infiltration probe soft numerics at validate

**Linear:** [SPE-2687](https://linear.app/spectranoir/issue/SPE-2687/harden-infiltration-probe-soft-numerics-at-validate)  
**Branch:** `jamesdyedbq/spe-2687-harden-infiltration-probe-soft-numerics-at-validate`

## Goal

Reject non-finite optional `infiltrationAwareness` / `infiltrationProbeProgress` on the shared `infiltrationProbeEventSchema` (six `infiltration.*` events) at the validation boundary, without inventing validate rewrite for percent→fraction or clamp.

Follow-on from SPE-2686 Deferred (infiltration probe soft numerics).

## Scope

- Harden `infiltrationProbeEventSchema` in `src/domain/events/eventValidation.ts`
- `infiltrationAwareness` / `infiltrationProbeProgress` — optional `finiteNumberSchema` (reject NaN / ±Infinity when present)
- Applies to: `infiltration.awareness_complication`, `infiltration.escalation_exposed`, `infiltration.escalation_violent`, `infiltration.cover_strain`, `infiltration.weekly_encounter`, `infiltration.leave_behind_tradeoff`
- Do **not** change hydrate sanitize rewrite (`runTransfer.ts` `sanitizeInfiltrationProbeEventPayload` / `sanitizeInfiltrationFraction`)
- Targeted validation tests; fixture update only if needed

## Soft-numeric policy

- **Validate:** when present, values must be finite. Omit is valid. Any finite magnitude (including `>1` and `<0`) is accepted.
- **Hydrate owns rewrite:** non-finite → omit; `>1` → percent `/100`; then clamp `[0, 1]`. Validate does not percent-normalize or clamp.
- Rationale: rejecting `>1` at validate would break percent-encoded historical saves before hydrate can normalize.

## Out of scope

- Hydrate sanitize / percent→fraction / clamp rewrite policy
- `concealment.activated` / `staff.coping.*` soft numerics
- Already-hardened agency / market / production / staff.side_work validate events (SPE-2659–2686)
- UI / feed rendering
- SCHEMA_REGISTRY expansion
- SPE-2667 delayed market order hydration (separate open PR #3245)

## Acceptance

- Reject non-finite `infiltrationAwareness` / `infiltrationProbeProgress` when present (NaN, Infinity)
- Accept producer fixtures with omitted optionals
- Accept finite values including fraction `[0,1]`, percent-style `>1`, and negative (hydrate clamps later)
- Leave unrelated staff / agency / market events alone
- Hydrate rewrite policy unchanged

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Opaque production hydrate rewrite of queue recipe ids | keep current (SPE-2664 Deferred) | Validate-only; hydrate reconcile stays opaque-id tolerant. |
| `concealment.activated` soft numerics at validate | follow-on if prioritized | Out of this slice; optional detectionConfidence still unhardened. |
