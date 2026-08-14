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

## Deconstruction and recovery adoption

SPE-2748 adds two explicit recovery paths over the canonical contract. Component reclamation uses
authored yield thresholds; ritual disassembly uses handling thresholds that can extend careful
processing without increasing material output. Grade therefore affects only the authored recovery axis and
never acts as a universal value, rarity, condition, or potency multiplier.

Queue entries snapshot a known canonical source grade and resolved outcome. Hidden participation
is unavailable and projects identically for every grade. Damage is a separate condition input that
may add waste but cannot change grade.

SPE-2800 adds explicit catalog versus fabricated-lot source selection for manual recovery. A lot
selection claims one unit from an immutable fabrication receipt and snapshots its production queue
ID through the recovery queue, completed outcome, and events. Catalog stock is available only
beyond all outstanding lot units. Live recovery queues plus completed outcomes are the durable
claim ledger; the production lot itself is never decremented or rewritten.

SPE-2801 expands component reclamation to seven additional technological definitions using the
existing Grade II electronic-parts threshold. Grade I yields one part and 2 waste; Grade II and
III yield two parts and 1 waste, with no higher-grade multiplier. Fourteen definitions are now
eligible and nine remain explicitly deferred under SPE-1055.

Optional recovery queues and immutable outcome receipts preserve the snapshot through save/load
without changing inventory's quantity authority or either save version.

## Auto-Scrap adoption

SPE-2799 adds an optional disabled-by-default policy containing only a canonical at-or-below grade
identifier. Preview and weekly execution first consume the existing recovery preview, then compare
known graded participation through the canonical ordering helper. Hidden, unknown, ungraded,
deferred, fabricated-lot-ambiguous, and unavailable recovery stock is excluded. Fabricated-lot
ambiguity retains its existing authoritative reason; any unsupported or deferred authority
restriction collapses to generic recovery-unavailable and is neither evaluated nor reported as
authority truth by this slice. Candidate order is stable item-ID order, never grade order, so
sorting and diagnostics cannot leak hidden grade.

Enabled policies route all currently safe aggregate copies through the normal deconstruction
command after fabrication and before recovery advancement at week close. They do not create a
destruction shortcut, alternate yield semantics, or Auto-Scrap-owned protection flags. Equipped
copies and active-process copies remain outside aggregate stock. Auto-Scrap does not make the
explicit provenance choice introduced by SPE-2800, so it continues to block an item while any lot
unit is outstanding. Fully claimed historical lots no longer block later catalog stock.

Broader custody/contamination/relic recovery, equipment-linked evidence and legal restrictions,
identification workflows, favorite/lock/quest/unique state, processed-material quality, and
automated fabricated-lot selection remain owned by downstream prerequisites.
