# SPE-3356 — Terrain-based build modifier registry (slice 1)

Bounded deterministic registry only. No construction workflow, facility assets, GameState persistence, or legal ownership.

- `src/domain/terrainBasedBuildModifierRegistry.ts`: buildability outputs, terrain conditions, construction support classes, validation, normalization, lookup, and support-implication helper.
- `src/test/terrainBasedBuildModifierRegistry.test.ts`: fixtures for open/contaminated/improved/unstable, rejection of unknown values, order-independent normalize, support implication, and separation from ownership fields.

Legal/ownership permission remains with SPE-3355 / SPE-3354. Downstream facility consumption and map projection are outside this slice.
