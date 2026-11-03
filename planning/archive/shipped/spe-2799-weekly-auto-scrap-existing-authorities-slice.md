# SPE-2799 — Weekly Auto-Scrap Using Existing Authoritative Eligibility

| Field      | Value                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Shipped**                                                                                                          |
| **Linear** | [SPE-2799](https://linear.app/spectranoir/issue/SPE-2799/weekly-auto-scrap-using-existing-authoritative-eligibility) |
| **Parent** | [SPE-2749](https://linear.app/spectranoir/issue/SPE-2749/grade-threshold-auto-scrap-routing)                         |
| **Branch** | `jamesdyedbq/spe-2799-weekly-auto-scrap-using-existing-authoritative-eligibility`                                    |

## Implemented boundary

This bounded child adds a disabled-by-default canonical-grade Auto-Scrap policy. The player
selects an at-or-below Grade I–V threshold, reviews the current aggregate-stock preview, and
explicitly confirms activation. Each week close recomputes that preview from current authoritative
state and routes every included copy through the existing SPE-2748 deconstruction command.

Auto-Scrap does not create a destruction shortcut or private eligibility state. It consumes the
catalog grade profile, hidden-safe grade projection, explicit recovery profile, aggregate
inventory, damaged-equipment queue, fabricated-lot ledger, and recovery resolver already owned by
their respective domains. Item IDs are evaluated in code-unit order; grade is used only for the
at-or-below comparison.

## Policy, projection, and persistence

`GameState.equipmentAutoScrapPolicy` is either disabled or enabled with one canonical
`thresholdGradeId`. Missing, malformed, display-string, and unexpected-field policies hydrate to
disabled. The field is optional for legacy compatibility, so `GAME_STORE_VERSION` and
`GAME_SAVE_VERSION` remain unchanged.

Preview entries report quantity, include/exclude decision, hidden-safe grade projection, and
stable reason codes. Hidden and ungraded values use the generic grade-unavailable decision; no
authoritative ID, rank, label, or grade-specific localization key is exposed. Above-threshold,
deferred-profile, fabricated-lot, and generic recovery-unavailable outcomes remain separate
reasons. Deferred authority concepts are neither evaluated nor reported as authority truth.

Week-close execution runs after fabrication advancement and before deconstruction advancement.
Freshly completed fabricated equipment is therefore protected by its lot ledger, while new
Auto-Scrap jobs use the same duration and completion rules as manual jobs. One routing event per
enabled campaign week records bounded counts and generic exclusion reasons; an existing same-week
routing event makes replay a no-op. Disabling prevents later batches without cancelling queued
recovery work.

## Existing authorities consumed

| Protection                     | Authority                                              | Behavior in this slice                                                              |
| ------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Canonical grade and visibility | SPE-2798 / SPE-2751                                    | Known graded values compare by canonical rank; hidden and ungraded exclude          |
| Equipped copies                | Agent equipment slots / aggregate inventory separation | Equipped copies are not aggregate stock and cannot be consumed                      |
| Active recovery                | SPE-2748 queue                                         | Already-queued copies remain isolated; available stock is evaluated independently   |
| Fabricated batches             | SPE-2750 / SPE-2800                                    | Outstanding lot units block the item; fully claimed historical lots no longer block |
| Damage                         | SPE-2544 queue and SPE-2748 resolver                   | Existing damage/recovery semantics are preserved without grade inference            |
| Existing reservations          | Production/workshop inventory deductions               | Only already-authoritative isolated or deducted quantities are respected            |

## Deferred

These categories are not treated as unrestricted and receive no temporary Auto-Scrap fields or
semantics. SPE-2749 remains Backlog until authoritative equipment-linked owners exist and are
integrated.

| Protection                                                         | Owner or prerequisite                                       | Missing boundary                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Storage, custody, evidence, legal holds, destruction authorization | SPE-1027, SPE-867, SPE-1055                                 | Equipment-linked persisted restriction state and canonical recovery input       |
| Identification and anomalous review                                | SPE-1631, SPE-1312; SPE-2104 records are currently separate | Authoritative link from equipment copies to identification/review records       |
| Per-instance artifact approval                                     | SPE-1766                                                    | Equipment-instance identity and approval projection                             |
| Favorite, player lock, quest-bound, unique copy                    | owner reconciliation / create inventory-state child         | No authoritative owner or runtime state currently exists                        |
| Automated fabricated-lot selection                                 | SPE-2749                                                    | SPE-2800 ships explicit manual selection; automation does not choose provenance |
| Automated equipment-instance selection                             | SPE-2749                                                    | SPE-2830 keeps depleted Combat Stim recovery explicitly manual                  |
| Remaining recovery profiles                                        | SPE-1055                                                    | SPE-2830 raises eligibility to sixteen; seven definitions remain deferred       |

## Validation

- policy validation and fail-closed hydration;
- canonical ordering, hidden Grade I/V identity, and ungraded exclusion;
- deterministic item-ID sorting and stable reason codes;
- all-safe-stock routing, fabricated-lot exclusion, equipped/active-copy preservation, and replay;
- week-close ordering, queue completion, event migration, save round trip, cancellation, and UI confirmation;
- focused tests, lint, backlog verification, diff check, and the full non-watch suite.
