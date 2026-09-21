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
- Optional `GameState.equipmentInstances` (SPE-2828 / SPE-2842 / SPE-2843 / SPE-2846 / SPE-2848 / SPE-2849 / SPE-2850 / SPE-2851 / SPE-2856 / SPE-2857 / SPE-2860 / SPE-2861 / SPE-2862 / SPE-2864 / SPE-877 interlock child / SPE-877 mutation-stations child) is keyed by immutable prototype-safe instance ID and stores a known equipment definition, authoritative stored/equipped location, operational/damaged condition, an optional safe resource payload with exact integer `0 <= remaining <= capacity` bounds, and an optional fabricated-lot provenance snapshot (`fabricationOrigin`) for identities materialized from SPE-2846 ordinary lots or SPE-2849 Combat Stim lots. Aggregate `inventory` remains authority for uninstantiated quantities; instance creation decrements it once, while relocation and instance-backed unequip/replacement/transfer never credit or duplicate stock. The explicit ordinary-instance destruction command accepts only safe, stored, payload-free, non-Combat-Stim, recovery-unclaimed identities, deletes only the selected registry key, and emits `equipment.instance_destroyed` without crediting stock. Its guarded inverse, ordinary-instance re-aggregation, additionally requires operational condition, absent fabricated provenance, and safe aggregate-inventory capacity, deletes the selected key, credits its definition aggregate inventory exactly once, and emits `equipment.instance_reaggregated` with the exact ID, canonical definition ID/name, operational condition, and `manual_untracking` reason. SPE-2848 adds provenance-preserving fabricated return-to-lot: fabricated-origin identities fail closed on catalog re-aggregation, and the dedicated return command deletes the identity, credits aggregate inventory once, decrements the source lot `trackedInstanceUnits` by one without mutating immutable lot `quantity`, and emits `equipment.instance_reaggregated` with reason `fabricated_lot_return` plus an all-or-none fabrication snapshot. SPE-2849 allows Combat Stim identities to retain `fabricationOrigin` together with a canonical `combat_stim_dose` payload (capacity 2); lot materialization increments `trackedInstanceUnits` like ordinary lots, catalog Combat Stim materialization omits provenance, SPE-2845 catalog re-aggregation fails closed when provenance is present, and `equipment.instance_materialized` may carry both 2/2 resource fields and all-or-none fabrication fields for Combat Stim only. SPE-2850 adds provenance-preserving fabricated Combat Stim return-to-lot: the dedicated return command deletes the identity, credits aggregate inventory once, decrements the source lot `trackedInstanceUnits` by one without mutating immutable lot `quantity`, and emits `equipment.combat_stim_reaggregated` with reason `fabricated_lot_return`, required 2/2 resource fields, and an all-or-none fabrication snapshot. SPE-2851 adds stored-instance condition repair: a stored damaged ordinary or Combat Stim identity can be flipped to `operational` via `applyEquipmentInstanceTransition` without mutating inventory, lots, `damagedEquipmentQueue`, payload/dose, or recovery; the command emits `equipment.instance_condition_repaired` with reason `manual_condition_repair`. Existing catalog re-aggregation and fabricated return remain fail-closed on damaged copies until repaired. SPE-2860 adds optional `containmentIntegrity` (`classId: 'blast_door' | 'pressure_seal' | 'interlock'`, last-inspection week, cycleCount, deficiency `none` / `hard_stop` / `compensating_continue` with the class-authored control `secondary_interlock_watch`, `backup_gasket_watch`, or `dual_circuit_watch`), distinct from `condition`; mixed class/control pairings and unknown or malformed class records fail closed (`airlock` remains the unknown-class sentinel); deficiency writes emit `equipment.containment_class_deficiency_recorded`. SPE-2864 added `pressure_seal` and the SPE-877 interlock child added `interlock` to that union without changing the persisted field shape. SPE-2861 gates SPE-2851 stored repair for `blast_door` identities with named command-argument part `blast_door_hinge_seal`; it does not persist a new field, consume inventory, or clear sticky hard-stop. Ordinary identities without containment class remain ungated. SPE-2862 adds technician stabilization: `stabilizeContainmentClassDeficiency` relieves sticky hard-stop into compensating continue or clears compensating continue to `none`, increments `cycleCount` by 1, and emits `equipment.containment_class_stabilized` with reason `technician_stabilization`; inspection and generic transitions still reject hard-stop overwrite. SPE-2869 exposes that existing writer through Zustand store and the Equipment stored-instance surface; it does not persist a new field. SPE-2886 adds the mid-week inspect command on the existing week-close resolver. The SPE-877 extra-class technician-stabilization child opens that same writer to parsed `pressure_seal` and `interlock` identities using each class's authored compensating control; omitted/unknown class and mixed class/control pairings fail closed. SPE-2876 recouples the authored membrane after successful stabilize from the new deficiency (`technicianRelief`): `none` omits that zone's `flow_restraint`; recorded `zone_breach` stays sticky. Stabilize still does not debit SPE-1027 stock. Starting-state seeds authored identities `equipment-instance-blast-door-workshop` (`ward_seals`, stored, blast-door `containmentIntegrity` with `none`), `equipment-instance-pressure-seal-workshop` (pressure-seal `none`), and `equipment-instance-interlock-workshop` (interlock `none`) for SPE-2866 live workshop mapping without debiting aggregate inventory. Hydration preserves those IDs when present; legacy omit of the registry remains `{}` and still fail-closes missing-instance `poor`. Ordinary destroy and catalog re-aggregation fail closed for those three IDs (`authored_workshop_identity_protected`) without crediting aggregate inventory. SPE-2879 skips those IDs in mission-fatality and mission-injury equipped loss (`takeEquippedInstancesLostOnMissionResolution`). SPE-2881 fail-closes any new equipped location for those IDs (`authored_workshop_identity_protected`); return to stored and a same-slot equipped no-op stay legal. Catalog `equipAgentItem` transfer skips those IDs. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change. The SPE-877 mutation-stations child adds optional `stationMutation` (`stationId` `blast_door_integrity_bench`, `pressure_seal_integrity_bench`, or `interlock_integrity_bench`, `appliedWeek`); `applyBlastDoorIntegrityLabor` stamps a stored `blast_door` identity, `applyPressureSealIntegrityLabor` stamps a stored `pressure_seal` identity, and `applyInterlockIntegrityLabor` stamps a stored `interlock` identity; each increments `cycleCount` by 1 and leaves `condition` and deficiency unchanged; generic transitions cannot invent or rewrite the stamp; hydration and transitions fail closed unless the stamp's authored class matches `containmentIntegrity.classId` (`blast_door` ↔ `blast_door_integrity_bench`, `pressure_seal` ↔ `pressure_seal_integrity_bench`, `interlock` ↔ `interlock_integrity_bench`); mixed pairing and unknown station ids drop as `malformed_station_mutation`; catalog re-aggregation and fabricated ordinary return-to-lot fail closed with `station_mutation_reaggregation_unsupported` so rematerialize cannot spawn a new UUID; successful labor hydrates as `equipment.instance_station_mutated` with reason `integrity_labor` (`hard_stop` requires `inService: false`; `none` and compensating continue require `inService: true`). Week-close last-inspection auto-advance (SPE-877 child) stamps `lastInspectionWeek` to the closing week when freshness is `due` or `overdue`, applies frozen compensating continue / hard-stop, and emits `equipment.containment_class_inspected` with reason `week_close_auto_advance`; sticky hard-stop is preserved and still stamped. SPE-2886 adds mid-week `inspectContainmentClassIntegrity` for one stored identity using the same resolver; it emits `equipment.containment_class_inspected` with reason `mid_week_player_inspect` and does not call the week-close batch; persist stays never-downgrade without technician-relief. Neither ordinary lifecycle command mutates damaged aggregate, recovery, loadout, or material authorities or persists a tombstone; stale repeats are no-ops without duplicate credits or events. SPE-2856 adds mission-fatality equipped-instance loss: after mission resolution marks an assigned agent `dead`, equipped ordinary identities are deleted with `equipment.instance_destroyed` reason `mission_loss` and equipped Combat Stim identities with canonical payloads are deleted with `equipment.combat_stim_disposed` reason `mission_loss`; instance-backed slot projections clear; inventory and lot receipts stay unchanged; recovery-claimed identities are skipped. SPE-2857 adds mission-injury equipped-instance loss: after mission resolution marks an assigned agent `injured` (not `dead`), equipped ordinary identities are deleted with `equipment.instance_destroyed` reason `mission_injury` and equipped Combat Stim identities with canonical payloads and no live overdrive/recovery provenance are deleted with `equipment.combat_stim_disposed` reason `mission_injury`; instance-backed slot projections clear; inventory and lot receipts stay unchanged; recovery-claimed identities are skipped; Combat Stim copies with live overdrive or recovery debt, and noncanonical Combat Stim payloads, stay on the living carrier. Resignation does not use this path. The reason unions remain additive; old `manual_disposal` events still hydrate. Hydration defaults legacy saves to `{}`, validates key/ID agreement, definitions, agents, allowed slots, condition, payload, and provenance (Combat Stim may combine canonical dose payload with matching lot origin; ordinary payload+provenance remains reject), processes IDs deterministically, stores later conflicting equipped claims, and lets the first valid instance claim override the definition-only slot projection. Valid destruction, re-aggregation, condition-repair, containment-class deficiency, technician-stabilization, integrity-labor, and week-close inspect events hydrate as history without recreating absent identities or replaying inventory mutations; malformed siblings are dropped without invention. The optional registry and lifecycle events do not change `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, or the operation-event schema version.
- Optional `GameState.facilityStockpile` ([SPE-2887](https://linear.app/spectranoir/issue/SPE-2887/named-part-facility-stockpile-consume-helper) / [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 consume helper) is a keyed map of frozen SPE-2861 spare-part IDs (`blast_door_hinge_seal` this slice) to positive integers. It is not catalog `GameState.inventory`. Legacy omit and malformed non-records hydrate empty. Unknown, integer-index, prototype-unsafe, negative, non-integer, and zero siblings drop independently. `consumeFacilityStock` decrements exactly one unit and omits a key at 0; missing or zero fail-closes without mutation; hydration does not re-debit. Starting state does not seed production stock. SPE-2870 calls this helper from successful SPE-2851 stored `blast_door` repair; missing or zero stock fail-closes the repair with no condition flip and no `equipment.instance_condition_repaired`. Ordinary identities stay ungated. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.departmentLocalStaging` ([SPE-2889](https://linear.app/spectranoir/issue/SPE-2889/persist-department-local-staging-and-feed-week-close-workshop-tick) / SPE-1027 local staging) is a keyed map of known SPE-2083 department ids to `{ inputStaging, outputStaging }` of `adjacent` / `remote`. It is a sibling of `facilityStockpile`, not mixed into spare-part qty, and is not catalog `GameState.inventory`. Legacy omit and malformed non-records hydrate empty. Unknown, integer-index, prototype-unsafe, partial-axis, and `'nearby'` siblings drop independently; valid siblings insert in code-unit order. Production week-close passes the parsed map as the 4th argument to SPE-2775 `processDepartmentWorkshopTick`; adjacent both axes advances two work units for that department; omit, remote, mixed axes, and dropped siblings stay the one-unit baseline. Starting state does not seed staging. Hydration does not mutate staging or re-apply throughput. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityStockPlacement` ([SPE-2890](https://linear.app/spectranoir/issue/SPE-2890/access-controlled-storage-class-clearance-and-wrong-zone-handle) / SPE-1027 access-controlled class) is a keyed map of authored storage class ids (`weapons_locker` this slice) to storage zone ids (`weapons_locker` / `mundane_supplies`). It is a sibling of `facilityStockpile`, not mixed into spare-part qty, and is not catalog `GameState.inventory`. Legacy omit and malformed non-records hydrate empty. Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently. `handleAccessControlledStock` fail-closes unknown class (`invalid_class`), below-floor caller-owned staff clearance (`clearance_denied`, floor `2`), and destination other than the class allowed zone (`wrong_zone`); success stamps `weapons_locker` → `weapons_locker`. It does not debit `facilityStockpile` or gate SPE-2887 / SPE-2870 spare-part consume. Starting state does not seed placement. Hydration does not re-run handle. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityStockCondition` ([SPE-2891](https://linear.app/spectranoir/issue/SPE-2891/incorrect-storage-degrade-and-nearby-contamination-for-one-perishable) / SPE-1027 incorrect-storage spoilage) is a keyed map of authored spoilage stock ids (`cold_storage_reagent`, `mundane_supplies`) to `intact` / `degraded` / `contaminated`. It is a sibling of `facilityStockpile`, not mixed into spare-part qty or `facilityStockPlacement`, and is not catalog `GameState.inventory`. Legacy omit and malformed non-records hydrate empty. Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently. `applyIncorrectStorageSpoilage` fail-closes unknown or neighbor-as-primary stock (`invalid_stock`) and zones other than `cold_storage` / `mundane_supplies` (`invalid_zone`); allowed zone stamps reagent `intact` without clearing an existing neighbor `contaminated` stamp; incorrect zone stamps reagent `degraded` and neighbor `contaminated`. It does not debit `facilityStockpile` or gate SPE-2887 / SPE-2870 spare-part consume, and does not recode SPE-2890 `handleAccessControlledStock` or extend SPE-2890 `STORAGE_ZONE_IDS`. Starting state does not seed condition. Hydration does not re-run apply. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityEmergencyCaches` ([SPE-2892](https://linear.app/spectranoir/issue/SPE-2892/emergency-cache-improves-live-incident-response-timing) / SPE-1027 emergency cache) is a keyed map of authored cache ids (`salt_cache` this slice) to cache zone ids (`containment_danger_zone` / `remote_storage`). It is a sibling of `facilityStockpile`, not mixed into spare-part qty, `facilityStockPlacement`, or `facilityStockCondition`, and is not catalog `GameState.inventory`. Legacy omit and malformed non-records hydrate empty. Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently. `stageFacilityEmergencyCache` fail-closes unknown cache (`invalid_cache`) and zones other than `containment_danger_zone` / `remote_storage` (`invalid_zone`); danger and remote are both legal stage destinations. `resolveLiveIncidentResponse` fail-closes unknown incident (`invalid_incident`); `salt_cache` at `containment_danger_zone` for `containment_breach` returns `improved`; omit, absent, or `remote_storage` returns `delayed`. Resolve is read-only and does not stamp timing or debit `facilityStockpile`. It does not recode SPE-2890 `handleAccessControlledStock` or SPE-2891 `applyIncorrectStorageSpoilage`, and does not extend SPE-2890 `STORAGE_ZONE_IDS` or SPE-2891 `SPOILAGE_ZONE_IDS`. It does not implement SPE-1473 portable caches or SPE-1474 backstock search, and does not wire SPE-956 `responseTiming` or `majorIncidents.ts`. Starting state does not seed caches. Hydration does not re-run stage or resolve. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityStockOverflow` ([SPE-2895](https://linear.app/spectranoir/issue/SPE-2895/authored-evidence-cage-overflow-blocks-access-parent-ac5) / SPE-1027 overflow access penalty) is a keyed map of authored overflow node ids (`evidence_cage` this slice) to status `overflowing`. It is a sibling of `facilityStockpile`, not mixed into spare-part qty, `facilityStockPlacement`, `facilityStockCondition`, or `facilityEmergencyCaches`, and is not catalog `GameState.inventory`. Legacy omit and malformed non-records hydrate empty. Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently. `recordFacilityOverflow` fail-closes unknown node (`invalid_node`) and stamps `evidence_cage` → `overflowing` on success. `resolveFacilityOverflowPenalty` fail-closes unknown node (`invalid_node`); overflowing returns `blocked`; omit or absent returns `clear`. Resolve is read-only and does not stamp penalty or debit `facilityStockpile`. It does not recode SPE-2890 `handleAccessControlledStock`, SPE-2891 `applyIncorrectStorageSpoilage`, or SPE-2892 cache helpers, and does not extend SPE-2890 `STORAGE_ZONE_IDS` or SPE-2891 `SPOILAGE_ZONE_IDS`. Starting state does not seed overflow. Hydration does not re-run record or resolve. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityStockPreparedness` ([SPE-2896](https://linear.app/spectranoir/issue/SPE-2896) / SPE-1027 stock-vs-flow pressure) is a keyed map of authored preparedness stock ids (`facility_salt` this slice) to `{ quantity, reserve, recentOutflow }` safe non-negative integers. It is a sibling of `facilityStockpile`, not its quantity authority, is not mixed into placement, condition, caches, or overflow, and is not catalog `GameState.inventory`. Legacy omit, malformed non-records, and maps empty after sanitizing hydrate as omitted. Only own enumerable string-key entries participate; inherited, non-enumerable, and symbol siblings do not enter the persisted snapshot. Unknown, integer-index, prototype-unsafe, partial, negative, non-integer, and unsafe-integer siblings drop independently. `stampFacilityStockPreparedness` fail-closes unknown stock (`invalid_stock`) and malformed snapshot fields (`invalid_snapshot`) with the original state reference; success immutably stamps the snapshot without debiting `facilityStockpile` or catalog inventory. `resolveFacilityStockoutPressure` fail-closes unknown stock (`invalid_stock`); omit or absent returns `unknown`; `quantity < reserve` or `quantity <= recentOutflow` returns `stockout`; otherwise it returns `prepared`. The same quantity can therefore resolve differently when reserve or recent outflow changes. Resolve is read-only, spare-part consume stays ungated, omitted persisted input does not inherit fallback preparedness, starting state does not seed preparedness, and hydration does not re-run stamp or resolve. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityProtectionGoods` ([SPE-2897](https://linear.app/spectranoir/issue/SPE-2897/counterfeit-respirator-filter-causes-safety-failure-and-false) / SPE-1027 counterfeit protection goods) is a keyed map of authored protection-good ids (`respirator_filter` this slice) to the sole persisted status `counterfeit`. It is a sibling of `facilityStockpile`, is not mixed into preparedness, spoilage/condition, placement/access, caches, or overflow, and is not catalog `GameState.inventory`. Legacy omit, malformed non-records, and maps empty after sanitizing hydrate as omitted. Only own enumerable authored string-key entries participate; inherited, non-enumerable, symbol, unknown, integer-index, prototype-unsafe, and invalid-status siblings drop independently. `recordCounterfeitProtectionGood` requires an own enumerable authored `itemId`, fail-closes invalid input as `invalid_item` with the original state reference, and immutably stamps a frozen `respirator_filter` → `counterfeit` snapshot. `resolveFacilityProtectionGoodOutcome` applies the same fail-closed item validation; omit or absent returns `protection: 'unknown'` and `assurance: 'unknown'`, while `counterfeit` returns `protection: 'failed'`, `assurance: 'false_reassurance'`, and the persisted status. Resolve is read-only, real stock consume stays ungated, omitted persisted input does not inherit fallback protection goods, starting state does not seed protection goods, and hydration does not replay record or resolve. No trust damage, appraisal/verification, mitigation, inventory debit, events, or `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityRestrictedObjectRelease` ([SPE-2911](https://linear.app/spectranoir/issue/SPE-2911/restricted-object-component-set-custody-and-mode-specific-release) / SPE-1027 restricted-object component-set custody) is a keyed map of authored set ids (`reliquary_key_set` this slice) to `{ mode, components }` snapshots. Modes are `stored` | `inspection` | `testing`. Components are the exact numbered membership `reliquary_key_set_1`, `reliquary_key_set_2`. It is a sibling of `facilityStockpile` and `facilityProtectionGoods`, is not mixed into preparedness, spoilage/condition, placement/access, caches, overflow, or protection goods, and is not catalog `GameState.inventory`. Legacy omit, malformed non-records, and maps empty after sanitizing hydrate as omitted. Only own enumerable authored string-key entries participate; inherited, non-enumerable, symbol, unknown, integer-index, prototype-unsafe, malformed-mode, and malformed-component siblings drop independently. Valid entries rebuild in authored set-id order with components rebuilt in authored order. `recordRestrictedObjectStored` requires an own enumerable authored `setId` plus exact membership and immutably stamps `stored`; invalid set input fail-closes `invalid_set`, incomplete/malformed membership fail-closes `incomplete_set`, and failures return the original state reference. `transitionRestrictedObjectRelease` requires exact membership and a legal current mode: `stored` → `inspection` is physical removal and does not authorize testing; `stored` → `testing` fail-closes `illegal_transition`; `inspection` → `testing` is the restricted operational release. `resolveRestrictedObjectRelease` applies the same fail-closed set validation; omit or absent returns `mode: 'unknown'`. Resolve is read-only, real stock consume stays ungated, omitted persisted input does not inherit fallback release state, starting state does not seed release state, and hydration does not replay record or transition. No player UI, events, week-close automation, trust damage, appraisal/verification, SPE-2890 recode, SPE-1027 AC9 secured-node threat, or `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilitySecuredNodes` ([SPE-2933](https://linear.app/spectranoir/issue/SPE-2933/secured-node-stored-content-threat-attraction-and-theft-exposure) / SPE-1027 secured-node stored-content threat) is a keyed map of authored node ids (`relic_vault` this slice) to compact stored-content ids (`mundane_records` | `anomalous_relic`). It is a sibling of `facilityStockpile`, `facilityProtectionGoods`, and `facilityRestrictedObjectRelease`, is not mixed into preparedness, spoilage/condition, placement/access, caches, overflow, protection goods, or restricted-object release, and is not catalog `GameState.inventory`. Legacy omit, malformed non-records, and maps empty after sanitizing hydrate as omitted. Only own enumerable authored string-key entries participate; inherited, non-enumerable, symbol, unknown, integer-index, prototype-unsafe, and invalid-content siblings drop independently. Valid entries rebuild in authored node-id order. `stampSecuredNodeContents` requires an own enumerable authored `nodeId` plus authored `contentId` and immutably stamps the content; invalid node input fail-closes `invalid_node`, invalid content fail-closes `invalid_content`, and failures return the original state reference. `resolveSecuredNodeThreat` applies the same fail-closed node validation; omit or absent returns `threatAttraction` / `theftExposure` / `accessRisk` as `unknown`; `mundane_records` returns `low` on all three bands; `anomalous_relic` returns `elevated` on all three bands. Resolve is read-only, real stock consume stays ungated, omitted persisted input does not inherit fallback node contents, starting state does not seed secured nodes, and hydration does not replay stamp or resolve. No player UI, events, week-close automation, warehouse capacity model, SPE-2890 recode, SPE-2911 recode, or `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityStockQuarantine` ([SPE-2934](https://linear.app/spectranoir/issue/SPE-2934/authored-cursed-object-quarantine-keeps-contaminated-stock-separate) / SPE-1027 quarantine separation) is a keyed map of authored node ids (`cursed_object_quarantine` this slice) to compact isolation ids (`quarantined` | `clean`). It is a sibling of `facilityStockpile`, `facilityStockCondition`, and `facilitySecuredNodes`, is not mixed into spare-part qty, placement/access, spoilage/condition, caches, overflow, preparedness, protection goods, restricted-object release, or secured-node maps, and is not catalog `GameState.inventory`. Legacy omit, malformed non-records, and maps empty after sanitizing hydrate as omitted. Only own enumerable authored string-key entries participate; inherited, non-enumerable, symbol, unknown, integer-index, prototype-unsafe, and invalid-isolation siblings drop independently. Valid entries rebuild in authored node-id order. `stampFacilityQuarantine` requires an own enumerable authored `nodeId` plus authored `isolation` and immutably stamps the isolation; invalid node input fail-closes `invalid_node`, invalid isolation fail-closes `invalid_isolation`, stamping the opposite isolation onto an already-stamped node fail-closes `mix_mismatch`, and failures return the original state reference. `resolveFacilityQuarantineSeparation` applies the same fail-closed node and isolation validation; omit or absent returns `separation: 'unknown'` (not mixed and not clean); matching isolation returns `separated`; opposite isolation fail-closes `mix_mismatch`. Resolve is read-only, real stock consume stays ungated, omitted persisted input does not inherit fallback quarantine isolation, starting state does not seed quarantine, and hydration does not replay stamp or resolve. SPE-2891 contamination/spoilage is inspect-only and is not recoded. No player UI, events, week-close automation, hauling, lots, typed overflow/loss, capacity-as-warehouse, or `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.facilityHaulingLabor` ([SPE-2935](https://linear.app/spectranoir/issue/SPE-2935/authored-hauling-labor-bottleneck-so-body-transfers-require-handlers) / SPE-1027 hauling labor bottleneck) is a keyed map of authored cargo ids (`body_transfer` this slice) to compact labor ids (`handlers_available`). It is a sibling of `facilityStockpile`, `facilityEmergencyCaches`, and `facilityStockQuarantine`, is not mixed into spare-part qty, placement/access, spoilage/condition, caches, overflow, preparedness, protection goods, restricted-object release, secured-node maps, or quarantine isolation, and is not catalog `GameState.inventory`. Legacy omit, malformed non-records, and maps empty after sanitizing hydrate as omitted. Only own enumerable authored string-key entries participate; inherited, non-enumerable, symbol, unknown, integer-index, prototype-unsafe, and invalid-labor siblings drop independently. Valid entries rebuild in authored cargo-id order. `stampFacilityHaulingLabor` requires an own enumerable authored `cargoId` plus authored `labor` and immutably stamps the labor; invalid cargo input fail-closes `invalid_cargo`, invalid labor fail-closes `invalid_labor`, and failures return the original state reference. `resolveFacilityHaulBottleneck` applies the same fail-closed cargo and labor validation; omit or absent returns `outcome: 'bottlenecked'` (not moved and not instant teleport); matching present labor returns `moved`. Resolve is read-only, real stock consume stays ungated, omitted persisted input does not inherit fallback hauling labor, starting state does not seed hauling labor, and hydration does not replay stamp or resolve. SPE-2892 emergency-cache timing is inspect-only and is not recoded. No player UI, events, week-close automation, lots, typed overflow/loss, misfile events, capacity-as-warehouse, SPE-1456 carrier/route simulator, or `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.volatileActionHoldRecords` ([SPE-2902](https://linear.app/spectranoir/issue/SPE-2902/held-aborted-or-delayed-actions-keyed-for-saveload) / SPE-62 hold/abort/delay) is a keyed map of encounter/procedure instance ids to append-only ledgers (`instanceId`, `encounterId`, `entries[]` of `hold_aim` / `abort` / `delayed_emission`). It is not mixed into SPE-54 priority, SPE-2900/SPE-2901 pipeline evidence, or catalog inventory. Legacy omit, malformed non-records, and maps empty after sanitizing hydrate as omitted. Integer-index, prototype-unsafe, key/id mismatch, empty-entry, sequence-gap, and malformed siblings drop independently. Valid ledgers insert in code-unit key order. `recordVolatileActionHold` fail-closes missing/unsafe instance or encounter ids by throw; a second stamp on the same key appends a correction and does not silent-overwrite prior entries; existing encounterId must keep matching. `readVolatileActionHold` fail-closes blank/unsafe lookup keys by throw; absent ledger returns `{ kind: 'none' }`. Pipeline `hold` is explicit and never inferred from array order. Hydration does not re-run pipeline or stamp. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
- Optional `GameState.containmentBarrierIntegrity` (SPE-877 barrier-integrity coupling + [SPE-2868](https://linear.app/spectranoir/issue/SPE-2868/extra-class-barrier-zones-pressure-seal-interlock-membranes) extra-class membranes) is a keyed SPE-1387 / SPE-471 registry (`blast_door_membrane`, `pressure_seal_membrane`, `interlock_membrane`; `flow_restraint` / `zone_breach`). Legacy omit hydrates as intact. Legacy singular blast-door `{ zoneId: 'blast_door_membrane', status, sourceInstanceId, sourceDeficiencyKind }` hydrates into the keyed shape. Singular extra-class records are not a persisted shape and drop. Malformed siblings drop independently (key must match `record.zoneId`). `applyContainmentClassDeficiency` and week-close inspect advance share `persistContainmentBarrierCoupling`: `blast_door` writes `blast_door_membrane`, `pressure_seal` writes `pressure_seal_membrane`, `interlock` writes `interlock_membrane`. Extra-class deficiency never writes `blast_door_membrane`. Mixed class/zone pairings fail closed. `hard_stop` → `zone_breach`, `compensating_continue` → `flow_restraint` (`barrier_integrity_watch`) without opening a full breach. Recorded `zone_breach` never downgrades on SPE-2862 / SPE-2876 relief, SPE-2851 repair, compensating continue, week-close inspect, or SPE-2867 integrity labor. SPE-2876 technician-relief persist may omit that zone's `flow_restraint` when deficiency becomes `none` and `existing.sourceInstanceId` matches the stabilizing instance ([SPE-2878](https://linear.app/spectranoir/issue/SPE-2878/preserve-sibling-sourced-flow-restraint-on-technician-relief)); a sibling-sourced restraint stays. When that omit would drop the zone, persist recouples from a remaining same-class `compensating_continue` or `hard_stop` identity ([SPE-2885](https://linear.app/spectranoir/issue/SPE-2885/remaining-same-class-deficiency-recompute-on-technician-relief)). Omit still drops when no remaining live source exists. Omit does not emit `equipment.containment_barrier_integrity_changed`. Valid `equipment.containment_barrier_integrity_changed` events (`classId`/`zoneId` blast-door, pressure-seal, or interlock pairing) hydrate as history without replaying the mutation. No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` change.
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
