# SPE-3356 Terrain-based build modifier registry (slice 1)

Bounded deterministic registry of terrain/condition → buildability modifiers.

- Source of truth for compact buildability classes and support capabilities.
- Does not implement construction, facility placement, or land-claim state (SPE-3355 remains authoritative for legal permission).
- Downstream SPE-1052 facility/base systems may consume `resolveBuildability`.

## Outputs

- `buildable` / `improved` / `contaminated` / `unstable` / `obstructed` / etc.
- Support capability implication: heavier classes satisfy lighter requirements without a global hierarchy engine.
- Cost multiplier and clearance flags.

## Tests

`src/domain/terrainBuildModifierRegistry.test.ts` covers lookup, positive/negative modifiers, capability implication, unknown fail-closed, and separation from claim state.
