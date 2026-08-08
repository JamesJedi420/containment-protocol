# Canonical Equipment-Grade Contract

SPE-2798 establishes equipment grade as baseline construction and operational quality. The
canonical ordered scale is `grade_1` through `grade_5`, displayed as Grade I through Grade V,
with Grade I lowest and Grade V highest. The registry in `src/domain/equipmentGrade.ts` is the
only source of grade identifiers, order, labels, and localization keys.

## Participation and visibility

Authoritative participation is either `graded` with one canonical grade ID or `ungraded`.
`unknown` is never authoritative equipment data: it is the fail-closed projection returned when
grade visibility is hidden. A hidden graded item and a hidden ungraded item produce the same
projection, which contains no authoritative ID, rank, grade-specific key, or grade-specific label.

Known projections provide stable visible text, localization keys, accessibility text, and debug
text without relying on hover behavior. Hidden projections retain the `unknown` state, generic
`Grade unknown` label, `equipment.grade.unknown` key, accessibility text, and debug text; none of
these generic fields reveals the authoritative grade.

## Coexistence rules

Canonical grade is independent from:

- `EquipmentRarity` (`basic | uncommon | rare | epic | legendary`);
- equipment condition, integrity, damage, and durability;
- `legacyEffectScale` and persisted `Agent.equipmentEffectScales` snapshots;
- price, potency, provenance, provider reliability, fabrication complexity, and salvage yield;
- deployable-readiness `gearTier`, which continues to mean rarity.

No conversion, inference, or fallback is allowed between these axes. Consumers must import the
canonical registry and resolver instead of defining private grade tables.

## Catalog adoption

SPE-2751 adds an explicit `gradeProfile` to every supported `EquipmentDefinition`. The profile
records a catalog participation state plus origin, functional class, and catalog segment. Graded
and hidden-until-identified profiles also record one canonical grade ID and its construction-
maturity authoring basis. Intentionally ungraded, taxonomy-excluded, and design-review-held
profiles record a non-empty reason instead of a grade ID.

The catalog adapter converts authored profiles to the SPE-2798 authoritative graded/ungraded
contract and visibility-safe projection. Hidden-until-identified and design-review-held profiles
always project as `Grade unknown`, even if a caller requests known visibility. Distribution
reporting includes their participation and dimension totals but excludes their authoritative grade
from grade buckets, so diagnostics cannot distinguish hidden Grade I from hidden Grade V.
Player-facing consumers must use the projection resolver.

Catalog grade remains definition-owned. Inventory, loadouts, procurement, and recovery continue to
carry stable item IDs, so catalog adoption itself requires no persisted grade field.

## Fabrication adoption

SPE-2750 adds explicit fixed, catalog, bounded-catalog, and minimum-catalog grade-output rules to
the production recipe contract. All rules resolve through this canonical registry and the output
definition's catalog participation; they cannot define display strings or a parallel grade order.
Queue entries snapshot the authoritative grade, visibility, and stable explanation codes so an
in-flight outcome cannot change when recipe authoring changes.

Completion retains aggregate inventory quantities and adds one durable fabricated-equipment lot
per queue ID containing batch identity, item, quantity, canonical grade, and completion week. The
lot is production provenance, not rarity, condition, material quality, provider reliability,
workshop completion quality, or legacy effect scale. Preview and active-queue surfaces resolve the
snapshot through the hidden-safe projection contract.

Recovery effects, Auto-Scrap, identification workflows, and per-copy inventory selection remain
owned by their downstream slices.
