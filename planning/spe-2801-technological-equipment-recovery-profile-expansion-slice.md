# SPE-2801 — Technological Equipment Recovery Profile Expansion

| Field      | Value                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| **Status** | **Recently shipped**                                                                                         |
| **Linear** | [SPE-2801](https://linear.app/spectranoir/issue/SPE-2801/technological-equipment-recovery-profile-expansion) |
| **Parent** | [SPE-1055](https://linear.app/spectranoir/issue/SPE-1055/salvage-recycling-and-anomalous-material-recovery)  |
| **Branch** | `jamesdyedbq/spe-2801-technological-equipment-recovery-profile-expansion`                                    |

## Boundary

This slice expands the exhaustive equipment-deconstruction registry from seven to fourteen
eligible definitions. Environmental Sampler, Encrypted Field Tablet, Advanced Recon Suite,
Signal Intercept Kit, Analysis Goggles, Tactical Radio, and Breach Visor reuse the existing
technological component-reclamation authority. No fallback profile is inferred for other items.

All seven rules reclaim one `electronic_parts`, produce 2 waste, and take one week. At Grade II
or above, the authored threshold adds one `electronic_parts` and reduces waste by one. The rule
does not scale again at Grade III: Tactical Radio (Grade I) yields one part and 2 waste, while the
Grade II and III additions yield two parts and 1 waste.

## Existing contracts preserved

Manual recovery and Auto-Scrap consume the expanded registry through their existing resolvers.
Hidden grades remain unavailable, aggregate inventory remains quantity authority, and SPE-2800
catalog/fabricated-lot selection and immutable provenance claims are unchanged. Existing queue
snapshots, completion receipts, events, ordering, and Equipment UI require no new public API or
bespoke presentation logic.

This slice adds no persisted field, schema migration, spreadsheet authority, or save/store version
change. The TypeScript recovery registry remains authoritative.

## Deferred

Nine definitions remain explicit `recovery_profile_not_authored` entries: Diplomatic Kit, Anomaly
Scanner, Spectral EM Array, Occult Detection Array, Field Plate, Containment Staff, Hazmat Suit,
Trauma Kit, and Combat Stims. Their ordinary, magical, hybrid-material, medical, custody,
evidence, authorization, contamination, and repair-versus-recycle decisions remain with future
SPE-1055 children. SPE-2749 also remains Backlog for its unsupported protection authorities.

## Validation

- exact fourteen-eligible/nine-deferred registry coverage and exact technological rules;
- Grade I, II, and III yield, waste, duration, and threshold-boundary outcomes;
- canonical grade and threshold independence from rarity, value, condition, provenance, and legacy
  effect scale, while preserving the existing independent damage-to-waste adjustment;
- canonical manual queueing and preservation of fabricated-lot provenance behavior;
- Auto-Scrap threshold, deferred, hidden, and outstanding-lot protections in item-ID order;
- existing accessible Equipment UI preview, confirmation, and queue presentation;
- focused tests, lint, repository verifiers, formatting, diff check, and full CI-mode tests.
