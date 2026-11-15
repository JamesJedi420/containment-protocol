# SPE-2097 — Anomalous population registry (slice 1)

Bounded pure deterministic registry for anomalous populations.

- `src/domain/anomalousPopulationRegistry.ts`: PopulationKind, AnomalousPopulationRecord, IdentityDivergencePacket, validation, projection, revision append.
- `src/test/anomalousPopulationRegistry.test.ts`: hidden requires divergence, faction collapse warning, deterministic projection/redaction, revision append, duplicate name warning.

No GameState, UI, or biological tick. Population distinct from faction/civilization/settlement.
