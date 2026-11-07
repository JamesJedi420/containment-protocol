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

## Implemented compact contract (SPE-382)

`src/domain/compactCards.ts` exports `CompactCardRecord`, `validateCompactCard` and `projectCompactCard`. Actors, anomalies, items, vehicles, locations and effects share qualified name/reference/hook, bounded source tags and ordered operational fields. Browse and inspect are separate sections: consumers retain the browse identity when showing inspect details. Authored field order is preserved; source/provenance sets use deterministic code-unit ordering. Actor personnel summaries use a fixed order and are optional; non-actor cards reject actor modes and personnel data.

Sources supply already-authorized public projections, including safe IDs, labels, tags and record references. This layer is not a clearance engine and cannot verify a source's historical authenticity. Each value retains known, estimated, redacted or unavailable state; suppressed values discard any attached payload and provenance. Estimated values retain their explicit state and optional confidence. Projection copies and freezes admitted public data, never looks up live entities, and returns error codes for malformed input.

Actors explicitly select live, historical, memorial/former, or unavailable modes. Historical and memorial records require a week, public record reference and snapshot/versioned reconstruction qualifier. Former personnel use memorial mode with the appropriate supplied personnel-status field; memorial does not imply death. Unavailable legacy/missing records allow identity metadata but reject operational fields, hooks and personnel summaries. A caller must not combine current personnel values with an archived record; snapshot generation and dossier persistence belong to their existing owners.

`src/test/compactCards.test.ts` demonstrates actor/item/anomaly variation, an equipment card with power, estimated range and a provenance hook, redaction, deterministic copies and archived/live separation. These are constructed contract fixtures, not observed gameplay. SPE-2736 owns quick-reference interaction and screen integration; SPE-2095 owns dossier helpers. No overlay, input, simulation calculation, save schema, card economy or utility-card implementation is introduced here.
