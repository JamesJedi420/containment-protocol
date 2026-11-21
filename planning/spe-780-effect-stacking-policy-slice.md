# SPE-780 — Effect stacking policy schema (slice)

## Boundary

Bounded family-level stacking policies and a pure deterministic resolver.
No GameState, persistence, UI, full effect runtime, or per-pair exception prose.

## Policies covered

- replace-weaker
- reject-duplicate
- extend-duration
- stack-magnitude
- cap-total
- mutual-exclusion / cancel

## Acceptance mapping

- Duplicate family collapses to strongest (replace-weaker).
- Duration extends without magnitude growth.
- Opposing states cancel.
- Cap and stack behave deterministically.
- Stable id tie-break.

## Tests

`src/domain/effectStackingPolicy.test.ts` covers the required cases.

## Distinct from

SPE-3361 duplicate facility stacking (facility output only).
