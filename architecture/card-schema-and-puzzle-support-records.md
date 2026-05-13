# Card schema and puzzle-support records

## Source

Synced from Linear Containment Protocol project resource (2026-05-12). Git is canonical for ongoing edits. Original: [Linear doc](https://linear.app/spectranoir/document/card-schema-and-puzzle-support-records-3840378a58d4).

## Scope

Covers compact card schemas, utility card types, collection numbering, and closely related puzzle-support record structures.

## Included issue boundaries

- SPE-382
- SPE-383
- SPE-384
- SPE-404

## Shared card grammar

- Actor, anomaly, item, vehicle, and similar cards may share one compact presentation grammar while preserving category-specific operational fields.
- Cards should support a browse-facing identity surface and an inspect-facing rules surface rather than one monolithic block.
- Compact hooks, provenance, ecology, or logistics notes should coexist with operational stats.
- Named unique actors and generic reusable entities should coexist in one registry without separate schemas.

## Utility card support

- Not every card must represent a person, thing, or vehicle. The same framework can support checklists, prep aids, unit references, and other utility records.
- Utility cards should remain lightweight, collection-compatible, and optimized for field-use or table-use scanability.
- Blank prefab templates should be supported so user-authored entries preserve the same structural layout as authored entries.
- Large-battle quick-reference cards, compact rule modules, and infiltration or incident reference layers should all be supportable inside the same grammar.

## Collection numbering and browsing

- Libraries may use stable human-readable collection identifiers distinct from runtime UUIDs or issue identifiers.
- Numbering should support lookup, completion tracking, missing-entry detection, and curated subset browsing.
- Stable numbering should reinforce pairing between visual recognition and operational metadata, not exist as cosmetic cataloging only.

## Spell and effect media normalization

- Structured effect cards may normalize fields such as school, range, components, duration, casting time, area, save behavior, startup cost, upkeep cost, preparation time, prerequisites, critical upside, and critical downside.
- Learned-magic media may depend on physical storage constraints such as page limits, copying time, medium-specific capacity, and bounded variable page consumption per inscribed effect.
- Standard books, traveling books, and limited media may use different capacity ceilings and portability premiums.
- Protective wards or security pages may consume the same finite storage pool as active effects.
- Fixed-power media such as scrolls, wands, staves, or rings may execute at internal tiers independent of the current user.

## Distinctions to preserve

- Cross-category compact cards are not collectible-game abstractions.
- Utility cards are not entity cards with missing stats.
- Stable collection numbers are not runtime identifiers.
- Spellbook/storage economics are not the same as generic inventory weight or flat spell-slot models.

## Non-goals

- No collectible-economy simulator.
- No separate card framework per category.
- No productivity-suite buildout.
- No publishing-economy simulator.

## Expected use

Use this doc when defining any compact carded representation, utility-reference layer, numbered collection, learned-media storage format, or shared schema family intended to stay readable across multiple asset categories.
