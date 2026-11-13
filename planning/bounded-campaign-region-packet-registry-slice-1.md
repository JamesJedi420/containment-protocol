# SPE-2227 — Bounded campaign region packet registry (slice 1)

Bounded schema only. No GameState, map traversal, or live region simulation.

- `src/domain/boundedCampaignRegionPacket.ts`: region kind, explicit boundary refs, instability hooks, optional dossier fields, validation, and deterministic lookup.
- `src/test/boundedCampaignRegionPacket.test.ts`: fixture with dossier fields, missing boundaries, unknown hooks, and order-independent lookup.

Boundaries must be explicit. Parent SPE-154 remains the campaign geography umbrella.
