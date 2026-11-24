# SPE-1332 — Ritual component data schema (slice 1)

The slice records authored fictional ritual components and compares variants. It leaves `GameState`, persistence, the shared procedure schema, live execution, activation, binding, and countermeasures with their existing owners.

- `src/domain/ritualComponentSchema.ts` defines the component kinds, certainty states, validation, normalization, lookup, frame grouping, and variant comparison.
- `src/test/ritualComponentSchema.test.ts` covers ward, offering, and binding records, two fictional cure variants, and a multi-channel omen-triggered set. It also checks invalid records, ambiguous slots, and deterministic results.
- `scripts/test-execution-completeness/test-file-inventory.v1.json` registers the new suite for CI discovery.

Records can share a `frameId`. To compare two variants of that frame, authors add a `variantId` and a `slotId` to each participating component. The slot lines up corresponding components even when their labels or certainty differ. A variant can claim a slot once, and the slot's kind is consistent across variants in a frame.

`compareRitualVariants` returns rows sorted by slot. A `null` side means that variant has no record for the slot. Explicit `unknown` and `disputed` records retain their labels and certainty. Owning rules still determine any requirement or effect. `componentsByFrame` returns only valid records, and `validateRitualComponents` reports malformed or ambiguous input.

Lane B branch `codex/spe-1332-ritual-component-repair` starts from main `78b7be15dda2b4a736e37c1c31e104e930cb9ff1`. The first three commits replay `0c5ee714`, `229d114a`, and `a9e991f7` with their original authorship. The test inventory comes from that main revision with one sorted addition.
