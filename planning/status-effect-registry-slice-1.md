# SPE-1365 — Status effect registry (slice 1)

Bounded pure domain schema only. No GameState persistence, live effect runtime, combat resolution, or UI.

- `src/domain/statusEffectRegistry.ts`: effect id, scope (actor | environment), family (mundane | anomalous), allowed targets, duration mode, removal paths, optional resistance hook, visibility, validation, and deterministic lookup.
- `src/test/statusEffectRegistry.test.ts`: fixture validity, actor/environment distinction, mundane/anomalous support, duplicate rejection, invalid vs unknown ids, order-independent normalization, and whitespace canonicalization.

Actor conditions and environment/zone conditions remain distinguishable by scope. Duration and removal metadata are explicit. Existing condition and zone-state owners are not duplicated. This is schema evidence only; live application and stacking remain outside slice 1.
