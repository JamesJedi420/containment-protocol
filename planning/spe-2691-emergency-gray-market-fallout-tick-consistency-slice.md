# SPE-2691 — Emergency gray-market fallout tick consistency

**Linear:** [SPE-2691](https://linear.app/spectranoir/issue/SPE-2691/validate-emergency-gray-market-fallout-tick-consistency)  
**Branch:** `spe-2691-fallout-tick-consistency`

## Goal

Keep emergency gray-market fallout tick records internally consistent with the canonical two-phase fallout lifecycle and precedent-pressure policy.

## Scope

- Require `escalated_pending_oversight` to record `risk → costly`.
- Require `resolved_closed` to record `costly → none`.
- Require finite, nonnegative funding and containment before/after values.
- Require positive funding and containment to decrease on a penalty tick; zero remains zero.
- Derive the persisted multiplier from precedent count using the named capped policy: `1 + 0.06 × min(count - 1, 6)`, rounded to three decimals.
- Require a normalized, nonblank institution audit key.
- Reconcile older loose records during hydration to the canonical risk transition, non-increasing metrics, bounded precedent count, derived multiplier, and normalized institution key.

## Boundary

- No changes to waiver eligibility, fallout probability, penalty magnitudes, procurement access, or UI behavior.
- No changes to unrelated market event schemas.
- No schema-version bump; event hydration already canonicalizes persisted fallout tick fields.

## Acceptance

- Risk/outcome mismatches fail validation.
- Funding or containment increases fail validation.
- Negative or non-finite funding/containment fail validation.
- A multiplier inconsistent with precedent count fails validation.
- Invalid institution keys fail validation.
- Producer-aligned fallout ticks pass validation.

## Deferred

None.
