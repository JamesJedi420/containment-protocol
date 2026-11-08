# SPE-2100 — Catastrophic scenario-class registry (slice 1)

**Scope authority:** [SPE-2100](https://linear.app/spectranoir/issue/SPE-2100). High-priority, existing CP-core issue. Branch `spe-2100-scenario-class-registry-20261108` from main `b930ddc2251d0dddc2a9d00e352e9df37e2489cb`.

## Implementation

- `src/domain/catastrophicScenarioClassRegistry.ts`: CP-native evidence-backed class metadata, alias normalization with ambiguity rejection, structural/semantic validation, append-only incident-reference backfill, deterministic suggestion-only refinement.
- `src/test/catastrophicScenarioClassRegistry.test.ts`: two class fixtures, field/formal alias convergence, ambiguous alias, forbidden franchise code, missing status and weak evidence, cosmological gate, self-compound rejection, incident idempotency, refinement stability and input immutability.

No existing gameplay authority is replaced. This registry is for scenario planning, **not** subject anomaly classification, objective truth, a catastrophe simulation, or a second GameState ledger. No data from the eight held source-extraction candidates is promoted. No source-specific classification names are inserted.

## Verification and boundaries

Targeted `src/test/catastrophicScenarioClassRegistry.test.ts`; repository lint/format/type/build and CI. The module is pure and unreferenced by campaign state by design: runtime integrations to SPE-1051, SPE-1085, SPE-1343, SPE-562, SPE-471, catalog UI, and persistence are deliberately deferred by SPE-2100.

Do not assert merge, green CI, production readiness, parent closure, or implementation of any deferred owner until separately verified.
