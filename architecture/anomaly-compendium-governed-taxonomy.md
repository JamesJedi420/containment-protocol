# Anomaly Compendium and Governed Taxonomy (SPE-88)

## Purpose

The **anomaly compendium** is an **internal governed reference** for authoring integrity, simulation consistency, and operational doctrine — **not** a public lore encyclopedia or marketing wiki.

## Record model

- **Canonical family records** — top-level anomaly families with stable IDs and mandatory cross-links to resolution, intel, and equipment tags.
- **Subtype linkage** — tree or DAG of subtypes sharing **shared field semantics** (severity bands, containment classes, evidence types).
- **Functional taxonomies** — orthogonal axes (e.g., mobility, contagion, memetic hazard, structural integrity impact) used for routing and validation, not flavor prose.

## Governance mechanics

- **Consistency checks** — lint-style rules: forbidden tag pairs, missing subtype parents, orphan procedures.
- **Exception handling** — explicit `exceptionApprovedBy` / waiver fields when one-offs break defaults; exceptions remain auditable.
- **Doctrine summaries** — compact operational notes (“default ROE,” “forbidden methods,” “required specialist”) stored as structured bullets, not long narrative.

## Consumer boundaries

- **Player-facing copy** may *derive* from compendium entries but should not expose raw internal keys without translation.
- **Simulation** consumes normalized tags from compendium exports; **do not** fork parallel taxonomies in feature code.

## Integration

- **SCHEMA_REGISTRY / SPE-47** — compendium entries align with structured-definition governance.
- **SPE-82 compounds** — hazard families reference compendium chemical/occult classes.

## Anti-patterns

- Treating the compendium as unstructured markdown-only lore.
- Duplicating taxonomy strings in UI without central registry.

## See also

- `SCHEMA_REGISTRY.md`
- `architecture/compound-specialist-antidote-toxin-lane.md` — SPE-82
- `docs/glossary.md`
