# SPE-2751 — Supported Equipment Catalog Grade Migration

| Field      | Value                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| **Status** | **Shipped**                                                                                                       |
| **Linear** | [SPE-2751](https://linear.app/spectranoir/issue/SPE-2751/migrate-supported-equipment-catalog-to-canonical-grades) |
| **Parent** | [SPE-2746](https://linear.app/spectranoir/issue/SPE-2746/canonical-equipment-grade-taxonomy)                      |
| **Branch** | `jamesdyedbq/spe-2751-migrate-supported-equipment-catalog-to-canonical-grades`                                    |

## Boundary

Migrate every definition in the supported `EQUIPMENT_CATALOG` to the canonical SPE-2798 grade
contract. Catalog definitions author their participation state, construction-origin category,
functional class, catalog segment, and—when graded—the approved construction-maturity basis.
Existing inventory and loadout saves remain item-ID based; grade is definition-owned and does not
change either save-envelope version.

This slice adds no grade-driven fabrication result, recovery yield, price, sorting, filtering,
Auto-Scrap behavior, identification workflow, or UI. Existing consumers continue to operate on
item IDs and their previous fields.

## Authoring rubric

The rubric describes baseline construction and operational quality only:

| Basis                    | Canonical grade       | Meaning                                                            |
| ------------------------ | --------------------- | ------------------------------------------------------------------ |
| `standard_issue`         | `grade_1` / Grade I   | Repeatable standard construction or supply batch                   |
| `specialized_field`      | `grade_2` / Grade II  | Purpose-built specialist field construction                        |
| `advanced_system`        | `grade_3` / Grade III | Integrated advanced system requiring elevated construction control |
| `experimental_prototype` | `grade_4` / Grade IV  | Explicit experimental or prototype construction                    |
| `singular_masterwork`    | `grade_5` / Grade V   | Explicit singular/masterwork construction                          |

Rarity, `legacyEffectScale`, stat potency, condition, price, provenance, and downstream economics
are prohibited assignment inputs. The validator rejects a grade ID that does not match its authored
basis and rejects unrelated rarity/condition fields inside the grade profile.

## Catalog inventory

| Grade     | Definitions                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grade I   | `combat_stims`, `diplomatic_kit`, `field_plate`, `medkits`, `ritual_components`, `silver_rounds`, `tactical_radio`, `trauma_kit`, `ward_seals`                                                                     |
| Grade II  | `analysis_goggles`, `anomaly_scanner`, `breach_visor`, `containment_staff`, `emf_sensors`, `encrypted_field_tablet`, `environmental_sampler`, `hazmat_suit`, `signal_jammers`, `spectral_em_array`, `warding_kits` |
| Grade III | `advanced_recon_suite`, `occult_detection_array`, `signal_intercept_kit`                                                                                                                                           |
| Grade IV  | none — no supported catalog definition is authored as an experimental prototype                                                                                                                                    |
| Grade V   | none — no supported catalog definition is authored as a singular masterwork                                                                                                                                        |

All 23 live definitions are graded. The supported catalog currently has no intentionally ungraded,
excluded, hidden-until-identified, or design-review-held entry. Those explicit states remain valid,
strictly validated authoring options for later owned catalog additions.

## Distribution checkpoint

- Grade distribution: Grade I 9, Grade II 11, Grade III 3, Grade IV 0, Grade V 0.
- Origin coverage: ordinary 6, magical 4, technological 9, hybrid 4.
- Functional coverage: combat 1, communications 4, containment 4, detection 8, diplomacy 1,
  medical 3, protection 2.
- Segment coverage: craftable 7, direct procurement 14, licensed procurement 2.

`getEquipmentGradeDistributionReport()` returns deterministic per-grade cross-tabs for every
origin, functional class, and catalog segment, including zero-count grades so missing coverage and
clustering remain visible rather than silently omitted. Hidden and design-review-held definitions
contribute only to participation and dimension totals; their authoritative grades are excluded from
all grade buckets so diagnostics cannot disclose them.

## Persistence and compatibility

Inventory quantities, loadout slot assignments, and legacy effect-scale snapshots persist stable
item IDs. Loading an existing save therefore resolves the newly authored catalog grade without
rewriting item identity or adding grade truth to the save. `GAME_STORE_VERSION` and
`GAME_SAVE_VERSION` remain unchanged.

Targeted regression coverage confirms production outputs, procurement listings, damaged-equipment
recovery queues, and save/load keep their prior contracts. Grade metadata is not added to market
listings or serialized saves.

## Deferred

| Item                                                            | Owner                                 | Boundary                                                                                |
| --------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| Grade-driven fabrication outcomes and produced-item persistence | SPE-2750                              | Consume the catalog assignment without redefining grade                                 |
| Grade-driven deconstruction and recovery                        | SPE-2748                              | Apply explicit recovery rules without inferring grade from condition or value           |
| Grade-threshold Auto-Scrap routing                              | SPE-2749                              | Follow catalog and recovery adoption; preserve hidden-grade opacity                     |
| Prototype-specific definitions                                  | SPE-1737                              | Add owned prototype catalog content using the Grade IV rubric where explicitly authored |
| Identification and hidden-grade UI                              | create/assign an identification child | Supply visibility state; do not expose authoritative catalog grade directly             |
