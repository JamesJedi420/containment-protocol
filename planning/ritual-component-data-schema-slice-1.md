# SPE-1332 — Ritual component data schema (slice 1)

Bounded schema only. No GameState, live ritual execution, activation engine, or countermeasure system.

- `src/domain/ritualComponentSchema.ts`: component id, kind, label, certainty (known/disputed/unknown), optional frame id, validation, normalization, lookup, and frame grouping.
- `src/test/ritualComponentSchema.test.ts`: fixture acceptance, duplicate/unknown/malformed rejection, order-independent lookup, and frame-based variant grouping.

Certainty and necessity remain with owning rules. Frame ids support component-by-component comparison of variants without assuming shared steps are required. This is schema evidence only; live procedure integration remains outside slice 1.
