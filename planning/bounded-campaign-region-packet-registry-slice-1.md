# SPE-2227 — Bounded campaign region packet registry (slice 1)

Bounded schema only. No GameState, map traversal, or live region simulation.

- `src/domain/boundedCampaignRegionPacket.ts`: region kind, explicit boundary refs, instability hooks, optional dossier fields, validation, and deterministic lookup.
- `src/test/boundedCampaignRegionPacket.test.ts`: fixture with dossier fields, missing boundaries, unknown hooks, and order-independent lookup.

Boundaries must be explicit. Parent SPE-154 remains the campaign geography umbrella.

Shipping repair covers the current SPE-2227 dossier scope: optional text for premise, authority structure, recurring-incident pressure, resource scarcity, social pressure, entry/exit state and ecology/history/lifecycle; optional text lists for sites, unsafe routes, local hazards, hostile actors, unresolved contradictions and operating laws. These are authored metadata, not simulation state or executable rules. Omitted fields and empty lists are legal; present text and list entries must be nonblank strings. Normalization trims all accepted tokens and preserves dossier fields; output packets and nested lists are frozen copies. No gameplay use, persistence or map integration is claimed by this schema-only slice.
