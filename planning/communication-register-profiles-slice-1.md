# SPE-2238 — Communication register profiles and deterministic pool selector (slice 1)

Bounded pure-domain registry only. No UI, GameState, live dialogue, or global slang table.

- `src/domain/communicationRegisterProfile.ts`: profile schema, validation (rejects global replacement), deterministic context-keyed pool selector with seed, reliability flags, and phrase-trigger seed keys.
- `src/test/communicationRegisterProfile.test.ts`: validation, same-seed stability, surveillance-band change, negative cases, and activity-context boundary.

Parent SPE-1034 owns durable logging and fluency. This slice is fixtures and pure selection only.
