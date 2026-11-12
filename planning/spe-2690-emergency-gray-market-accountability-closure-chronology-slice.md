# SPE-2690 — Emergency gray-market accountability closure chronology

**Linear:** [SPE-2690](https://linear.app/spectranoir/issue/SPE-2690/validate-emergency-gray-market-accountability-closure-chronology)  
**Branch:** `spe-2690-accountability-closure-chronology`

## Goal

Keep emergency gray-market accountability closure records canonical: the closure posts exactly one campaign week after the waiver grant and carries a normalized institution audit key.

## Scope

- Require positive integer `week` and `waiverGrantWeek`.
- Require `week === waiverGrantWeek + 1`.
- Require a nonblank institution key that already matches `normalizeInstitutionKeyForAudit`.
- Preserve the existing producer, which already emits the canonical next-week relationship.
- Reconcile older loose closure records during hydration by setting `waiverGrantWeek` to `week - 1`.
- Drop an impossible closure recorded in campaign week 1 after canonical validation; do not invent a later closure week.
- Add focused validation and hydration tests.

## Boundary

- No waiver eligibility, grant, fallout, procurement-access, or UI behavior changes.
- No changes to unrelated market event schemas.
- No schema-version bump: hydration already performs per-event canonicalization before current-schema validation.

## Acceptance

- Closure before grant, in the grant week, or later than the next-week window fails validation.
- Invalid, blank, or noncanonical institution keys fail validation.
- The canonical next-week closure passes validation.
- Legacy loose grant weeks hydrate to the prior campaign week.

## Deferred

None.
