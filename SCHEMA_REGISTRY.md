# Event Schema Registry

## Overview

Documents versioning strategy for OperationEvent types to ensure backward compatibility and safe migrations.

## Current Schema Version

- **Version**: 2
- **Target**: 1 | 2 union type
- **Compatibility**: Valid V1 events auto-convert to V2; invalid payloads are rejected at migration

## Migration Path

- V1 → V2: No breaking shape changes; valid V1 events remain valid
- Invalid or missing payloads are dropped during migration so canonical runtime history contains only schema-valid OperationEvents
- All new events created with V2 schema
- Legacy V1 events automatically migrated on load

## Versioning Conventions

- Schema versions in OperationEvent.schemaVersion as discriminated union
- Migration functions in eventMigration.ts
- No event payload changes between versions

## Implementation

See `src/domain/events/eventMigration.ts` for migration utilities.

---

## IncidentImpact Schema (spe-820.v1)

Documents the canonical typed vocabulary for incident consequence data (SPE-820).

**Current version**: `spe-820.v1` — discriminant on `IncidentImpact.schemaVersion`

**Location**: `src/domain/templates/incidentImpact.ts`

### Standard metric fields

Ten canonical fields with typed denominator semantics:

| Field                | Denominator kinds                        |
| -------------------- | ---------------------------------------- |
| `affectedPopulation` | `people`                                 |
| `fatalities`         | `people`                                 |
| `rescueDemand`       | `people`                                 |
| `shelterDemand`      | `people`, `households`                   |
| `outages`            | `customers`, `households`, `services`    |
| `facilityImpact`     | `facilities`                             |
| `serviceDisruption`  | `customers`, `services`, `organizations` |
| `hazmatExposure`     | `people`, `distance_km`                  |
| `organizationImpact` | `organizations`                          |
| `jurisdictionImpact` | `jurisdictions`                          |

All fields are optional. Each metric carries optional `denominator`, `uncertainty` (level + basis), and `note`.

### Extension fields

Non-standard metrics go under `extensions: Record<string, IncidentImpactExtensionField>`. Extension fields are isolated from canonical fields and do not affect standard metric reads.

### Clone safety

`cloneIncidentImpact()` produces a deep copy — all metric `denominator` and `uncertainty` objects are cloned. Runtime mutations cannot leak back into authored template or `IncidentState` data.

### Versioning

- No migration path defined yet (single version)
- If a breaking field change is needed, bump the discriminant string and add a migration function alongside `eventMigration.ts`

---

## PersistedStore Schema

Documents the versioned serialization format for the full game store state.

**Current version**: `GAME_STORE_VERSION = 6`

**Location**: `src/app/store/runTransfer.ts`

**Migration**: `migratePersistedStore(raw, version)` — handles incremental upgrades from older versions to version 6.

### Notes

- On load, the persisted payload version is checked against `GAME_STORE_VERSION`
- Older payloads are migrated forward via `migratePersistedStore`
- Missing or unrecognised version causes fallback to a fresh store
- Optional `MissionRewardBreakdown.agencyStanding` on case-outcome event payloads and weekly `caseSnapshots` is sanitized by `sanitizeMissionRewardBreakdownSnapshot` / `sanitizeAgencyStandingAward` (SPE-2696 / SPE-2697); missing awards stay legacy-compatible
- Optional `ResearchState.lastHiddenCellRollbackWeek` / `lastHiddenCellRollbackProjectId` / `lastHiddenCellRollbackAmount` (SPE-2706) are sanitized in `sanitizeResearchState`; missing markers stay legacy-compatible (no rollback applied for that load)
- Optional `GameState.lastHiddenCellPanicAmplificationWeek` / `lastHiddenCellPanicAmplificationAmount` (SPE-2707) are sanitized with global pressure scalars; incomplete pairs are dropped so a week cannot lock without a matching applied amount
- Optional `AgencyState.lastHiddenCellInfrastructureCompromiseWeek` / `lastHiddenCellInfrastructureCompromiseAmount` (SPE-2710) are sanitized in `sanitizeAgencyState`; incomplete pairs are dropped so a week cannot lock without a matching applied amount
- Optional `AgencyState.hiddenCellCovertGrowthLevel` / `hiddenCellDetectionNarrowing` / `lastHiddenCellCovertGrowthWeek` / `lastHiddenCellCovertGrowthAmount` / `lastHiddenCellDetectionNarrowingAmount` (SPE-2714) are sanitized in `sanitizeAgencyState`; week markers require at least one positive applied amount so a week cannot lock without a matching note
- Optional `AgencyState.lastStatusUpkeepWeek` / `lastStatusUpkeepBand` / `lastStatusUpkeepFundingBefore` / `lastStatusUpkeepOperatingCost` (SPE-2718) are sanitized in `sanitizeAgencyState`; incomplete marker sets are dropped so adequacy cannot hydrate without the pre-cost funding snapshot
- Optional `LegitimacyState.operationalCoverLevel` (`open` / `deniable` / `compromised`, SPE-2719) is sanitized with the existing legitimacy state. Missing legacy values are derived at read time (`covert` → `deniable`; otherwise `open`), so existing `sanctionLevel` values require no migration.
- Optional `GameState.authorityGraphState` (SPE-2720) is sanitized by `sanitizeAuthorityGraphState`; missing or malformed state becomes an empty graph/history foundation. Valid state persists the graph, including optional sorted `linkedUnitIds` on nodes (SPE-2088), at most 52 mutation-history entries, and a `lastMutationWeek` reconciled to the newest retained history week. Week-close rejects same-week/stale reapplication, selects one eligible edge in deterministic code-unit ID order, and clamps its consequence-driven strength delta to five points. SPE-2088 handoff decisions remain pure return records rather than a new persisted handoff collection.
- Optional `GameState.rivalExpeditionProgressPackets` and `GameState.rivalExpeditionClues` (SPE-2741) hydrate to empty registries for legacy saves. Packet hydration revalidates immutable definitions plus elapsed-week-reachable phase/counter/personnel/terminal-week invariants, requires active packets to align with the last closed campaign week, rejects future departure or advancement timelines and integer-index IDs that cannot retain code-unit object-key order, drops malformed or key-mismatched siblings independently, and stores valid packets in stable expedition-ID order. Clue hydration validates deterministic clue identity, own-key packet ownership, a clue week within its packet's departure/advancement timeline, transition or terminal evidence consistent with the current packet, collectively ordered single transition clues, and casualty-clue counts bounded by cumulative casualties, then stores deduplicated signals in expedition/week/kind order. Authoritative week-close advances nonterminal packets for the closing `GameState.week` from own explicit per-expedition conditions using prototype-safe packet accumulation; production currently supplies deterministic zero-casualty/zero-penalty conditions. Same/past-week and terminal replays are no-ops. These field-level additions do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.
- Optional `GameState.departmentWorkshopWorkOrders` and `GameState.departmentWorkshopSnapshots` (SPE-2747) hydrate through `readDepartmentWorkshopState` to fresh empty maps for new and legacy state. Work orders are keyed by embedded work-order ID; snapshots are keyed by embedded department ID. Hydration reuses the SPE-2745 contracts and static SPE-2083 registry, rejects integer-index keys, key/ID mismatches, missing departments, unsupported tasks, malformed capacity/progress, duplicate lane membership, and foreign-department references, drops malformed siblings independently, and inserts valid keys in deterministic code-unit order. Missing fields never inherit workshop records from the hydration fallback, inputs are not mutated or aliased, and static department definitions are not persisted. No processing or week-close hook is registered, and `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` remain unchanged.
- Optional `GameState.caseScopedPrerequisiteProcessingOrders` (SPE-2757) is keyed by workshop work-order ID and carries a real open case owner, recipe/material declaration, workshop routing, and direct prerequisite IDs. Hydration uses a plain-record, unsafe-key-rejecting sanitizer; malformed, closed-case, duplicate, cyclic, or key/ID-mismatched records are dropped, followed by recursive removal of dependents whose prerequisites no longer exist.
- Optional `GameState.caseScopedPrerequisiteProcessingReservations` (SPE-2758) is keyed by envelope/workshop work-order ID and records the owning open case plus the exact input quantities already deducted from inventory. Hydration rejects unsafe keys, key/ID mismatches, closed or invalid case owners, and invalid material quantities, inserts valid siblings in code-unit order, and defaults legacy saves to an empty registry. Reservation and workshop enqueue commit atomically; canonical completed workshop receipts credit the envelope output and remove the active reservation once. SPE-2759 allows explicit successor activation only when every declared prerequisite has matching durable work-order and completed-receipt case/department/task provenance whose completion week is not in the future. SPE-2760 runs the same activation seam at week close after output credit, selecting at most one ready successor per case by stable case/work-order order; existing reservation and completion records make replay/save-load a no-op. Same-case workshop orders outside all lanes are exempt from the workload gate only with such canonical chronological completion proof. These additions do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.
- Optional `GameState.caseScopedPrerequisiteProcessingTerminalSignals` (SPE-2761) is keyed by prerequisite work-order ID and records explicit `failed` or `cancelled` proof with case, department, task, and terminal-week provenance. Hydration rejects unsafe or mismatched keys, malformed reasons/weeks, and future proof, preserves valid siblings in deterministic code-unit order, and defaults legacy saves to an empty registry. Registration derives provenance from the canonical open-case envelope, exact reservation, and workshop work order and rejects completed or conflicting records. At week close, completion/output reconciliation runs first; remaining canonically terminalled reservations then refund their exact input list atomically and are removed before successor activation. The durable terminal ledger is retained to make replay/save-load a no-op and to prevent reactivation. Workshop registries, cases, operation events, and global queues are unchanged, and `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` remain unchanged.
- Optional `GameState.departmentWorkshopCompletionOutcomes` (SPE-2754 / SPE-2768 / SPE-2781 / SPE-2782 / SPE-2783 / unsafe-processing safety) hydrates through `sanitizeDepartmentWorkshopCompletionOutcomes`. Legacy omit of `quality`/`safety` becomes `nominal`/`safe`; `degraded`/`unsafe` require valid reasons. SPE-2781 adds `poor_dependency_condition`, SPE-2782 adds `poor_equipment_condition`, and SPE-2783 adds `poor_reagent_grade` to the valid degraded-quality reasons without persisting the transient conditions or changing the receipt shape. Existing receipts win on register. Optional `GameState.departmentWorkshopUnsafeSecondaryIncidents` (SPE-1028 unsafe secondary-incident child) hydrates through `sanitizeDepartmentWorkshopUnsafeSecondaryIncidents` as a work-order → spawned-case ID map; malformed or integer-index keys are dropped; legacy omit is `{}`. Week-close spawns at most one parent-linked follow-up per `safety: 'unsafe'` receipt via `instantiateFromTemplate` and records the marker for replay/save-load idempotency. These field-level additions do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.
- Optional `CaseInstance.departmentWorkshopCompletionWorkOrderIds` (SPE-2755) hydrates through `normalizeCaseInstance` as a trimmed, deduplicated, code-unit-sorted work-order ID ledger; missing or malformed values are omitted without fallback backfill. It records only receipts whose durable work order still matches the authored case, department, and task type. The legacy default is no ledger, and `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` remain unchanged.
- Optional `CaseInstance.departmentWorkshopFinalizationRequest` / `departmentWorkshopFinalizationHandoff` (SPE-2765) and `departmentWorkshopFinalizationFabricationQueueId` (SPE-2766) hydrate through `normalizeCaseInstance`. Request/handoff fields keep SPE-2765 fail-closed trimming and integer-index rejection. Fabrication queue ids use the same safe non-integer string id contract; malformed markers are dropped without fallback backfill. SPE-2766 week-close enqueue consumes a valid handoff at most once via `queueFabrication` and stores the created queue entry id as the consume marker. Legacy saves omit these fields. `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` remain unchanged.
- Optional `ExternalSupportAsset.lastAuthorityConsequenceWeek` (SPE-2722) is sanitized with external support assets. Valid positive integers no later than the hydrated campaign week prevent duplicate authority-backed faction consequences for the same asset/week; missing, malformed, and future markers are dropped for legacy compatibility.
- `Agent.equipmentEffectScales` (SPE-2797) stores the shipped catalog-derived positive-integer equipment effect-scale snapshots for slotted items. Hydration performs a one-way migration from the former `Agent.equipment` map when the renamed field is absent, drops stale or unknown item IDs through the existing agent normalization path, and new save exports emit only `equipmentEffectScales`. This legacy numeric scale remains separate from independently authored `EquipmentRarity` and from equipment condition/integrity; it is not canonical equipment grade. No canonical grade contract is persisted in this slice, and the field rename does not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.
- Optional `GameState.equipmentInstances` (SPE-2828 / SPE-2842 / SPE-2843 / SPE-2846 / SPE-2848) is keyed by immutable prototype-safe instance ID and stores a known equipment definition, authoritative stored/equipped location, operational/damaged condition, an optional safe resource payload with exact integer `0 <= remaining <= capacity` bounds, and an optional fabricated-lot provenance snapshot (`fabricationOrigin`) for identities materialized from SPE-2846 lots. Aggregate `inventory` remains authority for uninstantiated quantities; instance creation decrements it once, while relocation and instance-backed unequip/replacement/transfer never credit or duplicate stock. The explicit ordinary-instance destruction command accepts only safe, stored, payload-free, non-Combat-Stim, recovery-unclaimed identities, deletes only the selected registry key, and emits `equipment.instance_destroyed` without crediting stock. Its guarded inverse, ordinary-instance re-aggregation, additionally requires operational condition, absent fabricated provenance, and safe aggregate-inventory capacity, deletes the selected key, credits its definition aggregate inventory exactly once, and emits `equipment.instance_reaggregated` with the exact ID, canonical definition ID/name, operational condition, and `manual_untracking` reason. SPE-2848 adds provenance-preserving fabricated return-to-lot: fabricated-origin identities fail closed on catalog re-aggregation, and the dedicated return command deletes the identity, credits aggregate inventory once, decrements the source lot `trackedInstanceUnits` by one without mutating immutable lot `quantity`, and emits `equipment.instance_reaggregated` with reason `fabricated_lot_return` plus an all-or-none fabrication snapshot. Neither lifecycle command mutates damaged aggregate, recovery, loadout, or material authorities or persists a tombstone; stale repeats are no-ops without duplicate credits or events. Hydration defaults legacy saves to `{}`, validates key/ID agreement, definitions, agents, allowed slots, condition, payload, and provenance, processes IDs deterministically, stores later conflicting equipped claims, and lets the first valid instance claim override the definition-only slot projection. Valid destruction and re-aggregation events hydrate as history without recreating absent identities or replaying inventory mutations; malformed siblings are dropped without invention. The optional registry and lifecycle events do not change `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, or the operation-event schema version.
- SPE-2829 governs `combat_stims` instance payloads as `combat_stim_dose` with exact capacity 2 and
  initial remaining 2. Generic transitions cannot change that payload; activation alone decrements
  it. Optional `AgentOverdriveState.source` stores strict `combat_stim` activation,
  equipment-instance, and case IDs while legacy/stress overdrive remains valid without provenance.
  Semantically noncanonical but generically bounded Combat Stim payloads remain durable and
  activation-blocked. The V2 event union adds strict materialization, activation, and
  overdrive-expiration payloads. Event, game-save, and store schema versions remain unchanged.
- The canonical equipment-grade contract (SPE-2798) is a non-persistent domain registry ordered from `grade_1` / Grade I through `grade_5` / Grade V. Authoritative participation is graded or ungraded; unknown is a hidden-safe projection state and is never stored as equipment truth. SPE-2798 adds no `GameState`, `Agent`, `EquipmentDefinition`, catalog, event, or save-envelope field and does not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`. Grade remains distinct from `EquipmentRarity`, condition/integrity, `legacyEffectScale`, and rarity-based readiness `gearTier`.
- `EquipmentDefinition.gradeProfile` (SPE-2751) is static catalog authoring metadata, not persisted game state. Every supported definition declares a validated catalog participation state, origin, functional class, and catalog segment; graded/hidden definitions use the canonical SPE-2798 identifier and construction-maturity basis. Existing saves retain inventory and loadout item IDs, which resolve the current definition-owned grade after hydration without rewriting identity. No grade metadata is emitted in saves, and `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` remain unchanged.
- `ProductionQueueEntry.outputGradeId`, `outputGradeVisibility`, and `outputGradeExplanationCodes` plus optional `GameState.fabricatedEquipmentLots` (SPE-2750) persist deterministic canonical fabrication outcomes. A complete, canonical queue snapshot is trusted as historical queue truth and is not re-resolved against the current recipe or catalog; this preserves an in-flight job across later authoring changes. Legacy queue entries that omit all grade snapshot fields are backfilled from the validated current recipe and output catalog definition; partial or malformed snapshots are dropped with their queue entry. Legacy lot omission becomes `{}`. Lot hydration rejects prototype-sensitive/unsafe/integer-index keys, key/queue mismatches, unknown recipe/output pairs, invalid quantities, unknown grade IDs, and future completion weeks while preserving valid siblings in code-unit order; hydrated queue IDs are made unique against completed lot IDs. Aggregate `inventory` remains the quantity authority. Production completion creates at most one exactly matching lot per queue ID; a conflicting lot fails closed without completing or discarding the live job, and production events carry the canonical grade ID. These optional fields do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.
- Optional `GameState.equipmentDeconstructionQueue` and `GameState.equipmentRecoveryOutcomes` (SPE-2748) persist grade-aware recovery snapshots and immutable completion receipts. Queue hydration requires known canonical equipment, grade, path, condition, material snapshots, duration, and unique explanation codes; valid IDs are made unique against completed receipt IDs. Receipt hydration rejects unsafe/key-mismatched IDs, non-equipment item IDs, unknown grades or paths, malformed material quantities, and future completion weeks while preserving valid siblings. Legacy omission becomes `[]` and `{}`. Aggregate `inventory` remains stock authority. Queueing removes one inventory unit and stale damaged-recovery membership atomically; completion credits material quantities and records at most one exactly matching receipt. A conflicting receipt retains the live job. SPE-2748 originally excluded fabricated-lot item IDs; SPE-2800 now supplies explicit per-copy source selection without allowing catalog grade to replace fabricated provenance. These optional fields and the `equipment.recovery_started` / `equipment.recovery_completed` events do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.
- Optional `GameState.equipmentAutoScrapPolicy` (SPE-2799) persists either disabled state or an enabled canonical `thresholdGradeId`; missing, malformed, display-string, and unexpected-field values hydrate disabled. Week close evaluates aggregate equipment stock in code-unit item-ID order after fabrication and before recovery advancement, excludes hidden/ungraded/deferred/fabricated-lot/recovery-restricted entries, and routes included copies only through the canonical SPE-2748 queue command. Same-week `equipment.auto_scrap_routed` proof makes replay a no-op; disabling does not cancel existing recovery jobs. Policy-change and routing events retain only canonical thresholds, bounded counts, queue IDs, and hidden-safe reason codes. No unsupported favorite, lock, quest, unique, evidence, custody, legal, or anomaly-review state is persisted. This optional field and its events do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.
- Optional `EquipmentDeconstructionQueueEntry.sourceFabricationQueueId`, `EquipmentRecoveryOutcome.sourceFabricationQueueId`, and matching recovery-event payload fields (SPE-2800) retain an explicitly selected fabricated batch without mutating `fabricatedEquipmentLots`. Live queues plus completed outcomes count consumed lot units; completed claims hydrate first by completion week/queue ID, then active claims by start week/queue ID. Unsafe, missing, item/grade-mismatched, and over-capacity claims are dropped without becoming catalog history. Legacy omission remains valid catalog-source history because the prior runtime blocked every fabricated-lot item ID. Aggregate inventory remains quantity authority, Auto-Scrap does not choose batch provenance, and `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` remain unchanged.
- Optional `sourceEquipmentInstanceId` on recovery queues, outcomes, and matching events (SPE-2830 / SPE-2841) retains an explicitly selected stored identity. Eligible ordinary mixed-source profiles use the ID alone; `itemId`, `sourceGradeId`, and `sourceCondition` retain the remaining immutable snapshot, and payload-bearing ordinary instances fail closed. Combat Stim recovery continues to supply `sourceEquipmentInstanceResourceId`, `sourceEquipmentInstanceCapacity`, and `sourceEquipmentInstanceRemaining` together with the ID only for a canonical stored depleted snapshot (`combat_stim_dose`, capacity 2, remaining 0). Queueing removes the selected identity without changing aggregate inventory or damaged aggregate state and cannot combine instance and fabrication provenance. Hydration accepts completed claims before active claims, rejects unsafe IDs, partial resource fields, unsupported profiles, item/grade mismatches, mixed provenance, and duplicate claims, and removes a conflicting live registry identity only for an accepted claim. Legacy recovery records omit these fields. Auto-Scrap remains aggregate-only and never selects instance provenance. `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` remain unchanged.

---

## SaveFile Envelope Schema

Documents the versioned envelope wrapping persisted save files.

**Current version**: `GAME_SAVE_VERSION = 1`

**Location**: `src/app/store/saveSystem.ts`

### Notes

- Save files with `version > GAME_SAVE_VERSION` are rejected (written by a newer build)
- Save files with `version < GAME_SAVE_VERSION` may still be loaded if the inner store migration handles them
- No explicit migration function at the envelope level; version guard is rejection-only

---

## ProcedureDefinition Schema (spe-1274.v1)

Documents the canonical schema for procedure definitions covering anomalous actions, countermeasures, rituals, devices, and learned effects (SPE-1274).

**Current version**: `spe-1274.v1` — discriminant on `ProcedureDefinition.schemaVersion`

**Location**: `src/domain/procedureDefinition.ts`

**Exported constant**: `PROCEDURE_DEFINITION_SCHEMA_VERSION = 'spe-1274.v1'`

### Top-level fields

| Field              | Type                    | Notes                                                                   |
| ------------------ | ----------------------- | ----------------------------------------------------------------------- |
| `schemaVersion`    | `'spe-1274.v1'`         | Discriminant; always stamped by `validateProcedureDefinition`           |
| `procedureId`      | `string`                | Trimmed and validated; must be non-empty                                |
| `canonicalName`    | `string`                | Trimmed and validated; must be non-empty                                |
| `aliases`          | `string[]`              | Zero or more alternate identifiers                                      |
| `taxonomy`         | `ProcedureTaxonomy`     | Intent × effectDomain × executionMethod × originTradition               |
| `tier`             | `1–5`                   | Capability tier; values outside range are rejected                      |
| `requirements`     | `RequirementPacket`     | Speech, gesture, tool tags, reagents, diagram, device tags, environment |
| `activationTiming` | `ActivationTiming`      | `instant` → `ritual_days`                                               |
| `targeting`        | `TargetingPacket`       | Geometry, range, resistance handling, cover sensitivity                 |
| `persistence`      | `PersistencePacket`     | Duration, dismissibility, expiry state                                  |
| `restrictions`     | `ProcedureRestrictions` | Forbidden roles, certifications, specialist access, usage cap           |
| `provenance`       | `ProcedureProvenance`   | Source system, research gate, faction restriction                       |
| `availability`     | `BoundedAvailability`   | Rating, source count, access friction                                   |
| `entityPayload`    | `EntityPayload?`        | Required when `taxonomy.intent === 'summoning'`                         |

### Validation invariants

- `martial` execution with `speech: 'required'` → `invalid_taxonomy_combination`
- `summoning` intent without `entityPayload` → `missing_entity_payload`
- Reagent quantities must be ≥ 0; range meters must be ≥ 0 or `null`; `sourceCount` must be ≥ 0

### Versioning

- No migration path defined yet (single version)
- If a breaking field change is needed, bump the discriminant string (e.g. `spe-1274.v2`) and add a migration alongside `eventMigration.ts`

---

## Structured definition grammar governance (SPE-47)

**SPE-47** is the **parent shell** for shared structured-definition work: contracts, naming discipline, extension points, and **child routing only**. It must not absorb unlimited record-detail sprawl.

Route concrete schema work to bounded children:

- **SPE-741** — compact actor, anomaly, and hazard record shapes.
- **SPE-742** — reusable trigger, modifier, and backlash entry grammar.
- **SPE-743** — structured support-asset and reward hook schema.

New schema efforts should prefer **adding or tightening a child spec** over rebroadening the parent umbrella.

---

## SPE-947 evaluator persistence (spe-947-evaluator.v1)

Documents compact GameState maps for shipped SPE-2568–2573 pure evaluator inputs (SPE-2576).
Optional SPE-2577 week-close fields: `weeklyViewDelta`, `weeklyUptimeState`, `lastWeeklyTickWeek`.
Weekly tick: `src/domain/spe947EvaluatorWeeklyOrchestration.ts` (wired from `advanceWeek`).
Optional SPE-2602 SPE-2111 registry bindings: `spe947VisualTriggerHazardBindings` (id-only links; compose in `spe947VisualTriggerHazardLinkage.ts`).
Optional SPE-2610 media-economy continuity maps: `spe947MediaEconomyWeights` / `spe947MediaEconomyContinuityBindings` (sanitize in `spe947MediaEconomyContinuity.ts`; optional SPE-2617 `weeklyContinuityFactorDelta` / `weeklyEconomyWeightId`; week-close apply via `spe947MediaEconomyWeeklyOrchestration.ts`).
Optional SPE-2616 commercialization-actor map: `spe947MediaEconomyCommercializationActors` + `spe947MediaEconomyLastWeeklyTickWeek` (sanitize in `spe947MediaEconomySimulator.ts`; week-close tick via `advanceWeek`).

**Current version**: `spe-947-evaluator.v1` — exported as `SPE_947_EVALUATOR_PERSISTENCE_SCHEMA_VERSION`

**Location**: `src/domain/spe947EvaluatorPersistence.ts` (media-economy maps: `src/domain/spe947MediaEconomyContinuity.ts`)

### GameState fields

| Field                                       | Evaluator                      | Notes                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spe947PlatformRecords`                     | SPE-2568 / SPE-2569            | Unified platform reach + operation fields; optional `viewCount` / `anomalyReach` runtime metrics; optional SPE-2577 `weeklyViewDelta` / `weeklyUptimeState` / `lastWeeklyTickWeek` |
| `spe947OperationRecords`                    | SPE-2569                       | Operation requests keyed by operation id                                                                                                                                           |
| `spe947ContentArtifacts`                    | SPE-2571                       | Footage/post artifacts keyed by artifact id                                                                                                                                        |
| `spe947CounterMemeticPlans`                 | SPE-2570                       | Counter-memetic plans keyed by plan id; optional SPE-2577 `lastWeeklyTickWeek`                                                                                                     |
| `spe947ContentOwners`                       | SPE-2572                       | Content owners keyed by owner id                                                                                                                                                   |
| `spe947PostCaseMediaCases`                  | SPE-2573 / SPE-2606            | Post-case media inputs keyed by case id (`hazardous_content` \| `mirror` \| `derivative` \| `adaptation` \| `commercialization`)                                                   |
| `spe947FootageExposureBindings`             | SPE-2571                       | Optional baseline bindings keyed by artifact id                                                                                                                                    |
| `spe947TakedownResistanceBindings`          | SPE-2572                       | Threshold bindings keyed by owner id                                                                                                                                               |
| `spe947VisualTriggerHazardBindings`         | SPE-2602                       | Authored `entityKind` + `entityId` → `visualTriggerHazardId`; read/compose only against `visualTriggerHazardRecords`                                                               |
| `spe947MediaEconomyWeights`                 | SPE-2609 / SPE-2610 / SPE-2617 | Authored continuity weights (`continuityFactor` + optional incentive peers); optional SPE-2617 `weeklyContinuityFactorDelta`; sanitize in `spe947MediaEconomyContinuity.ts`        |
| `spe947MediaEconomyContinuityBindings`      | SPE-2609 / SPE-2610 / SPE-2617 | Authored case → economy-weight bindings (optional `mediaArtifactId`); optional SPE-2617 `weeklyEconomyWeightId`; week-close apply in `spe947MediaEconomyWeeklyOrchestration.ts`    |
| `spe947MediaEconomyCommercializationActors` | SPE-2611–2615 / SPE-2616       | Authored commercialization actors keyed by actor id; sanitize in `spe947MediaEconomySimulator.ts`                                                                                  |
| `spe947MediaEconomyLastWeeklyTickWeek`      | SPE-2615 / SPE-2616            | Week-close idempotency stamp for media-economy orchestration tick                                                                                                                  |

### Hydration

- Sanitize via `sanitizeSpe947*` helpers in `spe947EvaluatorPersistence.ts` (media-economy weight/binding sanitizers in `spe947MediaEconomyContinuity.ts`; commercialization-actor sanitizers in `spe947MediaEconomySimulator.ts`)
- Wired in `hydrateGame` (`src/app/store/runTransfer.ts`)
- Invalid and duplicate-id entries are dropped without throw; map keys are re-derived from record ids
- Media-economy maps: an authored plain-record input (including `{}`) is preserved — not replaced by hydrate fallback
- Default starting state: empty `{}` maps in `createStartingState`

### Versioning

- No migration path defined yet (single version)
- If a breaking field change is needed, bump the discriminant string (e.g. `spe-947-evaluator.v2`) and add hydration defaults alongside `runTransfer.ts`

---

## SPE-956 propagation graph persistence (spe-956-propagation-graph.v1)

Documents compact GameState map for authored SPE-956 propagation graphs (SPE-2621 slice 2, SPE-2624 slice 3).
Compose helper wires persisted graph + spe947\* maps via `composeSpe956PropagationGraphFromGameState`.
Optional week-close orchestration fields follow SPE-2577 pattern; no evaluator contract changes.

**Current version**: `spe-956-propagation-graph.v1` — exported as `SPE_956_PROPAGATION_GRAPH_PERSISTENCE_SCHEMA_VERSION`

**Location**: `src/domain/spe956PropagationGraphPersistence.ts` (pure compose: `src/domain/spe956PropagationGraph.ts`; week-close tick: `src/domain/spe956PropagationGraphWeeklyOrchestration.ts`)

### GameState fields

| Field                           | Notes                                                     |
| ------------------------------- | --------------------------------------------------------- |
| `spe956PropagationGraphRecords` | Authored graph id + nested nodes/edges; keyed by graph id |

### Optional weekly orchestration fields (SPE-2624)

On each persisted graph record when explicitly authored:

| Field                     | Notes                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `elapsedPropagationWeeks` | Running counter; defaults to 0 when delta applies; overflow sums clamp to `Number.MAX_VALUE` (SPE-2625) |
| `weeklyElapsedWeeksDelta` | Non-negative additive delta applied once per week on week-close                                         |
| `lastWeeklyTickWeek`      | Idempotency marker; same-week re-tick is a no-op                                                        |

Tick wired from `advanceWeek` via `applyWeeklySpe956PropagationGraphTick`. Graphs without `weeklyElapsedWeeksDelta` are unchanged.

### Hydration

- Sanitize via `sanitizeSpe956PropagationGraphRecords` in `spe956PropagationGraphPersistence.ts`
- Wired in `hydrateGame` (`src/app/store/runTransfer.ts`)
- Invalid graphs, duplicate ids, unknown node kinds, dangling edges, and missing seed nodes are dropped without throw
- Explicit authored `{}` hydrates as empty canonical map (does not fall back to prior graphs); non-record input still uses fallback
- Unsafe graph ids (`__proto__`, `constructor`, `prototype`) are rejected; result map uses null prototype
- `resolvePersistedPropagationGraph` resolves own properties only and rejects unsafe graph ids (SPE-2622, SPE-2625)
- Default starting state: empty `{}` map in `createStartingState`

### Read surfacing (SPE-2626 slice 4)

- Planning mirror projection: `getSpe956PropagationGraphMirrorView` in `src/features/operations/spe956PropagationGraphMirrorView.ts`
- Route: `/propagation-graph` (`Spe956PropagationGraphMirrorPage`); Front Desk quick link
- Surfaces persisted graph structure and weekly orchestration fields only — does not call compose or evaluators from UI

### Versioning

- No migration path defined yet (single version)
- If a breaking field change is needed, bump the discriminant string (e.g. `spe-956-propagation-graph.v2`) and add hydration defaults alongside `runTransfer.ts`

---

## SPE-956 participatory channel persistence (spe-956-participatory-channel.v1)

Documents compact GameState maps for authored SPE-956 participatory channel envelopes
(SPE-2632 slice 1 survivor registry; SPE-2633 slice 2 collective memory channel;
SPE-2634 slice 3 hotline channel; SPE-2635 slice 4 async discussion surface;
SPE-2636 slice 5 community advisory body) plus SPE-2644 incident-lane baseline map.
SPE-2637 read surfacing, SPE-2638 evaluate-from-GameState helpers, SPE-2639/2640
incident-path composition, SPE-2643 week-close tick, SPE-2646 weekly report notes,
and SPE-2647 EXAMPLE incident baseline resolution all read these persisted maps
without changing the evaluator contracts.

**Current version**: `spe-956-participatory-channel.v1` — exported as `SPE_956_PARTICIPATORY_CHANNEL_PERSISTENCE_SCHEMA_VERSION`

**Location**: `src/domain/spe956ParticipatoryChannelPersistence.ts` (evaluator contracts: `survivorInformalRegistry.ts`, `collectiveMemoryStabilization.ts`, `hotlineChannel.ts`, `asyncDiscussionSurface.ts`, `communityAdvisoryDecisionInfluence.ts`; SPE-2638 `evaluate*FromGameState` helpers; SPE-2639 incident path and SPE-2647 EXAMPLE baseline resolution: `spe956ParticipatoryChannelIncidentPath.ts`; SPE-2644 baselines: `spe956IncidentBaselinePersistence.ts`; SPE-2643 tick: `spe956ParticipatoryChannelWeeklyOrchestration.ts`; SPE-2646 notes: `spe956ParticipatoryChannelWeeklyReportNotes.ts` / `spe956ParticipatoryChannelSurfacing.ts`)

### GameState fields

| Field                                   | Notes                                                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spe956SurvivorInformalRegistryRecords` | Authored registry id + recognition/catalog/band/ceiling enums; keyed by registry id                                                                 |
| `spe956CollectiveMemoryChannelRecords`  | Authored channel id + narrative/recall/ceiling/rule enums; keyed by channel id                                                                      |
| `spe956HotlineChannelRecords`           | Authored channel id + unit intervals + boolean + unanswered/anger enums + escalation rules string                                                   |
| `spe956AsyncDiscussionSurfaceRecords`   | Authored surface id + nested participation window + retention/widening enums + memoryStabilization                                                  |
| `spe956CommunityAdvisoryBodyRecords`    | Authored body id + mission/membership/criteria strings + stakeholder string array + scope enums + positive unit-interval influenceThreshold         |
| `spe956IncidentBaselineRecords`         | SPE-2644: authored incident-lane baselines keyed by incident id; optional advisory / hotline / asyncDiscussion / survivorSupport / collectiveMemory |

### Hydration

- Sanitize via `sanitizeSpe956SurvivorInformalRegistryRecords`, `sanitizeSpe956CollectiveMemoryChannelRecords`, `sanitizeSpe956HotlineChannelRecords`, `sanitizeSpe956AsyncDiscussionSurfaceRecords`, `sanitizeSpe956CommunityAdvisoryBodyRecords`, and `sanitizeSpe956IncidentBaselineRecords`
- Wired in `hydrateGame` (`src/app/store/runTransfer.ts`)
- Invalid entries, duplicate ids, and incomplete enum/field sets are dropped without throw
- Nested `participationWindow` requires non-negative integer `startWeek`/`endWeek` with `startWeek <= endWeek`
- Community advisory bodies require non-empty mission/membership/criteria strings; non-empty trimmed `representedStakeholderClasses` string array; non-empty `authorizedDecisionScopes` enum array (any invalid enum drops the entry); positive unit-interval `influenceThreshold` (`> 0` and `<= 1`)
- Incident baselines (SPE-2644): map key must equal `incidentId`; advisory/hotline lanes require `baseline.incidentId === entry.incidentId`; invalid lanes dropped; entries with zero surviving lanes dropped; uses exported `tryNormalize*Baseline` helpers from evaluator modules
- `SPE_956_EXAMPLE_INCIDENT_ID` is `incident:riverside-site-breach`; `SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS` persists all five EXAMPLE lanes under that incident id
- Explicit authored `{}` hydrates as empty canonical map (does not fall back to prior records); non-record input still uses fallback
- Unsafe ids (`__proto__`, `constructor`, `prototype`) are rejected; maps built from plain-record input use null prototype (non-record input returns the caller `fallback` unchanged)
- `resolvePersistedSurvivorInformalRegistry` / `resolvePersistedCollectiveMemoryChannel` / `resolvePersistedHotlineChannel` / `resolvePersistedAsyncDiscussionSurface` / `resolvePersistedCommunityAdvisoryBody` / `resolveSpe956IncidentBaselines` resolve own properties only and reject unsafe ids
- `buildExampleSpe956IncidentPathInputFromGameState` calls `resolveSpe956IncidentBaselines` first and falls back per lane to authored EXAMPLE fixtures when the map is missing or a lane is omitted
- Default starting state: empty `{}` maps in `createStartingState`

### Optional weekly orchestration fields (SPE-2643)

| Field                     | Notes                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `elapsedChannelWeeks`     | Running counter; defaults to 0 when delta applies; overflow sums clamp to `Number.MAX_VALUE` |
| `weeklyElapsedWeeksDelta` | Non-negative additive delta applied once per week on week-close                              |
| `lastWeeklyTickWeek`      | Idempotency marker; same-week re-tick is a no-op                                             |

Tick wired from `advanceWeek` via `applyWeeklySpe956ParticipatoryChannelTick` over all five maps. Channels without `weeklyElapsedWeeksDelta` are unchanged. Does **not** reopen SPE-956 AC (parent Done via SPE-2642).

### Read surfacing (SPE-2637 slice 1)

- Planning mirror projection: `getSpe956ParticipatoryChannelMirrorView` in `src/features/operations/spe956ParticipatoryChannelMirrorView.ts`
- Route: `/participatory-channels` (`Spe956ParticipatoryChannelMirrorPage`); Front Desk quick link
- Surfaces hydrated survivor registries, collective memory channels, hotline channels, async discussion surfaces, and community advisory bodies as labels and counts only; it does not run evaluators or incident-path composition from UI
- Mirror rows sort ids by code unit order so repeated builds are byte-stable across runtimes

### Weekly report notes (SPE-2646)

- `advanceWeek` appends `spe956_participatory_channel.weekly_transition` notes after the SPE-2643 tick when at least one persisted channel's `elapsedChannelWeeks` changes
- Producer: `buildWeeklySpe956ParticipatoryChannelTransitionReportNotes`; formatter: `formatSpe956ParticipatoryChannelWeeklyTransitionNoteContent`
- Payload keys allowed by hydration: `channelKind`, `recordId`, `transitionKinds`, `priorElapsedChannelWeeks`, `nextElapsedChannelWeeks`, `structuredReasons`, `week`
- Empty channel maps, unchanged maps, and same-week re-ticks emit no transition notes

### Out of scope and shipped notes

- Backend file-byte transport remains out of SPE-2542 ledger boundary (slice 2 already shipped)
- UI / planning mirror shipped (SPE-2637); compose helpers shipped (SPE-2638); incident path shipped (SPE-2639/2640); week-close tick shipped (SPE-2643); incident baselines shipped (SPE-2644); weekly report notes shipped (SPE-2646); EXAMPLE baseline resolution shipped (SPE-2647); umbrella Done (SPE-2642)

### Versioning

- No migration path defined yet (single version)
- If a breaking field change is needed, bump the discriminant string (e.g. `spe-956-participatory-channel.v2`) and add hydration defaults alongside `runTransfer.ts`
