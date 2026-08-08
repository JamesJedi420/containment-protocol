# Canonical Equipment-Grade Contract

SPE-2798 establishes equipment grade as baseline construction and operational quality. The
canonical ordered scale is `grade_1` through `grade_5`, displayed as Grade I through Grade V,
with Grade I lowest and Grade V highest. The registry in `src/domain/equipmentGrade.ts` is the
only source of grade identifiers, order, labels, and localization keys.

## Participation and visibility

Authoritative participation is either `graded` with one canonical grade ID or `ungraded`.
`unknown` is never authoritative equipment data: it is the fail-closed projection returned when
grade visibility is hidden. A hidden graded item and a hidden ungraded item produce the same
projection, which contains no authoritative ID, rank, grade-specific key, or label.

Known projections provide stable visible text, localization keys, accessibility text, and debug
text without relying on hover behavior. Hidden projections provide only `Grade unknown` and the
generic `equipment.grade.unknown` key.

## Coexistence rules

Canonical grade is independent from:

- `EquipmentRarity` (`basic | uncommon | rare | epic | legendary`);
- equipment condition, integrity, damage, and durability;
- `legacyEffectScale` and persisted `Agent.equipmentEffectScales` snapshots;
- price, potency, provenance, provider reliability, fabrication complexity, and salvage yield;
- deployable-readiness `gearTier`, which continues to mean rarity.

No conversion, inference, or fallback is allowed between these axes. Consumers must import the
canonical registry and resolver instead of defining private grade tables.

## Slice boundary

This contract is pure and non-persistent. SPE-2798 does not add grade to `EquipmentDefinition`,
the production catalog, saves, UI, fabrication, recovery, Auto-Scrap, or identification workflows.
Representative ordinary, magical, technological, ungraded, and hidden cases remain test fixtures
until their owning downstream slices adopt the contract.
