# SPE-2192 — Effect delivery geometry and scaling-cost registry

## Approved boundary and provenance

Existing owner: [SPE-2192](https://linear.app/spectranoir/issue/SPE-2192), parent [SPE-1033](https://linear.app/spectranoir/issue/SPE-1033). Codex continues the author's November 14 review/repair handoff from `grok/spe-2192-effect-delivery-geometry-registry` at `8248bdb795f04584f3594655e413dad779df2399`, integrating main `957ae4b7558fe9ca7c57e26475dbed5df699b23a` on `codex/spe-2192-delivery-geometry-repair`.

The July 27 fold-in and October 28 lifecycle audit on SPE-2192 retain SPE-2213's origin/shape/route/barrier metadata and SPE-2215's actor-anchor/radius-band/movement-following validation. Those children remain canceled; no separate systems or issues are introduced. The current Linear boundary and comments govern acceptance, not terminal child statuses.

## Contract

- Cone, line, touch, remote, zone and radius-anchor fixtures use finite nonnegative base cost and finite area scaling in `[0, 10]`. Scaled cost is `baseCost * (1 + areaScaleFactor)`; overflow fails validation and projection returns null.
- Touch and remote delivery require an explicit non-`none` willingness policy. This is metadata, not consent or resistance resolution.
- Area delivery declares an origin square, a matching spread shape, an authored line/route of effect starting at that origin, and mandatory solid-barrier blocking. Route identifiers must be nonempty and unique after trimming. This validates the declaration; live origin existence, adjacency, barrier intersection and line of sight remain runtime-owner concerns.
- Radius-anchor delivery also requires a nonempty actor reference, a known radius band and `followsMovement: true`. `local` and `extended` are relative authoring categories; they assign no world distance, duration or tick behavior.
- Projection returns a normalized, frozen copy, including nested route/anchor data, without modifying caller input. Each record and nested metadata packet is read once per parse.

`src/domain/persistentAreaShapes.ts` remains the separate SPE-408 shape/surface consumer; its cloud/wall/sphere/field families are not delivery kinds. Effect lifecycle, duration and stacking stay with their existing owners. No runtime import, GameState field, schema migration, targeting, propagation execution, effect ticking or UI is added.

## Acceptance evidence

`src/test/effectDeliveryGeometryRegistry.test.ts` covers all six fixtures, inclusive scale bounds, malformed/nonfinite/overflow inputs, willingness policy, origin legality within this symbolic contract, shape spread declarations, malformed/duplicate routes, mandatory barrier policy, missing/unknown mobile-anchor fields, movement following, deterministic projection, input preservation and immutable snapshots. The reviewed test-file inventory includes this suite.

Validation uses Node 22, the targeted suite first, then SPE-3348's requirements-selected checks and the full CI-shaped suite/completeness guard. Actual command outcomes and reviewed/merged revisions belong in the PR and Linear evidence; this document does not attest an unperformed check or a merge.

Gameplay reachability, live simulation connection, player observability, persistence and end-to-end gameplay are not acceptance claims for this explicitly registry-only slice. Fixtures and metadata tests establish the declared contract, not playable effects. SPE-1033 remains open until its own broader acceptance is verified.

Six-pass audit: scope and accepted fold-ins; malformed/nonfinite/duplicate inputs; deterministic immutable projection; nearby registry/shape ownership; test inventory and slice documentation; full diff and unused-code cleanup. The read-only session preflight was ready on the clean synchronized main before implementation. Hermes checkpoints use bounded direct verification because this assignment prohibits external dispatch; no delegated or independent review is claimed from that self-audit.
