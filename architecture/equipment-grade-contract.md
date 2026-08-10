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
may add waste but cannot change grade. Because aggregate inventory cannot select individual copies,
items with fabricated-lot provenance fail closed until a per-copy selection contract exists.

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
copies and active-process copies remain outside aggregate stock; fabricated-lot item IDs remain
blocked wholesale until per-copy selection exists.

### Auto-Scrap operational runbook

Use the Equipment page when checking the shipped Auto-Scrap flow. The UI section is
`Weekly Auto-Scrap` in `src/features/equipment/EquipmentPage.tsx`: pick a Grade I through Grade V
threshold, click **Review activation** or **Review update**, then confirm. The preview and labels come from
`getEquipmentAutoScrapView` in `src/features/equipment/equipmentView.ts`, which uses
`resolveEquipmentAutoScrapPreview` and never derives grade truth in the UI. Disabling the policy
prevents future weekly routing, but it does not cancel recovery jobs that were already queued.

The persisted policy lives at `GameState.equipmentAutoScrapPolicy`. Starting state writes the
disabled policy. Hydration calls `sanitizeEquipmentAutoScrapPolicy`, so missing, malformed,
display-string, or extra-field values fail closed to disabled without a save-version bump. Valid
enabled values must use canonical IDs such as `grade_2`, not display labels such as `Grade II`.

The two durable event records are:

| Event                                 | Meaning                                           | Main fields                                                                                       |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `equipment.auto_scrap_policy_changed` | A player enabled, updated, or disabled the policy | `week`, `action`, optional `thresholdGradeId`, preview counts                                     |
| `equipment.auto_scrap_routed`         | Week close evaluated the enabled policy           | `week`, `thresholdGradeId`, `routedQueueIds`, routed and excluded counts, `exclusionReasonCounts` |

The dashboard event feed renders both event types through `src/features/dashboard/eventFeedView.ts`.
Use those events before assuming the policy failed. A same-week `equipment.auto_scrap_routed` event
also makes replay a no-op.

When an expected item does not route, inspect `resolveEquipmentAutoScrapPreview(state,
thresholdGradeId)` first. The reason codes point to the owning authority:

| Reason code                                       | Usual source to inspect                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `auto_scrap.grade_above_threshold`                | Canonical grade is known but higher than the selected threshold           |
| `auto_scrap.grade_unavailable`                    | Hidden, unknown, ungraded, or invalid grade participation                 |
| `auto_scrap.recovery_profile_unavailable`         | No explicit recovery profile for the item                                 |
| `auto_scrap.fabricated_lot_selection_unavailable` | `fabricatedEquipmentLots` still owns per-copy provenance for that item ID |
| `auto_scrap.recovery_unavailable`                 | Recovery resolver rejected the item for another bounded reason            |

Week-close order matters. Fabrication advances first, Auto-Scrap evaluates the freshly updated
fabricated-lot ledger, then normal equipment recovery advancement runs. A newly fabricated item can
therefore appear in inventory and still remain protected from Auto-Scrap during that same close.

Broader custody/contamination/relic recovery, equipment-linked evidence and legal restrictions,
identification workflows, favorite/lock/quest/unique state, processed-material quality, and
per-copy fabricated-lot selection remain owned by downstream prerequisites.
