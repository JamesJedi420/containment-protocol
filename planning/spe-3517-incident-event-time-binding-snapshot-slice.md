# SPE-3517 — Incident event-time binding snapshot and historical-reference contract (slice 1)

Pure domain contract only. No GameState, persistence, chronology engine, or live mutation.

- `src/domain/incidentEventTimeBinding.ts`: immutable binding identity, minimal participant/object/location/topology references, frozen context capture, fail-closed validation, and pure later resolution that always prefers the recorded event-time snapshot.
- `src/test/incidentEventTimeBinding.test.ts`: coverage for live-move still uses frozen, destroyed/missing fails closed, malformed rejection, and idempotence.

Parent SPE-822 remains the chronology/overlap owner. Full persistence/hydration and schema migration are deferred to a subsequent slice if required by implementation inspection; this slice establishes the bounded pure contract.
