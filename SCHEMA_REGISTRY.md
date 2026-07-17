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

| Field                               | Evaluator           | Notes                                                                                                                                                                              |
| ----------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spe947PlatformRecords`             | SPE-2568 / SPE-2569 | Unified platform reach + operation fields; optional `viewCount` / `anomalyReach` runtime metrics; optional SPE-2577 `weeklyViewDelta` / `weeklyUptimeState` / `lastWeeklyTickWeek` |
| `spe947OperationRecords`            | SPE-2569            | Operation requests keyed by operation id                                                                                                                                           |
| `spe947ContentArtifacts`            | SPE-2571            | Footage/post artifacts keyed by artifact id                                                                                                                                        |
| `spe947CounterMemeticPlans`         | SPE-2570            | Counter-memetic plans keyed by plan id; optional SPE-2577 `lastWeeklyTickWeek`                                                                                                     |
| `spe947ContentOwners`               | SPE-2572            | Content owners keyed by owner id                                                                                                                                                   |
| `spe947PostCaseMediaCases`          | SPE-2573 / SPE-2606 | Post-case media inputs keyed by case id (`hazardous_content` \| `mirror` \| `derivative` \| `adaptation` \| `commercialization`)                                                   |
| `spe947FootageExposureBindings`     | SPE-2571            | Optional baseline bindings keyed by artifact id                                                                                                                                    |
| `spe947TakedownResistanceBindings`  | SPE-2572            | Threshold bindings keyed by owner id                                                                                                                                               |
| `spe947VisualTriggerHazardBindings` | SPE-2602            | Authored `entityKind` + `entityId` → `visualTriggerHazardId`; read/compose only against `visualTriggerHazardRecords`                                                               |
| `spe947MediaEconomyWeights` | SPE-2609 / SPE-2610 / SPE-2617 | Authored continuity weights (`continuityFactor` + optional incentive peers); optional SPE-2617 `weeklyContinuityFactorDelta`; sanitize in `spe947MediaEconomyContinuity.ts` |
| `spe947MediaEconomyContinuityBindings` | SPE-2609 / SPE-2610 / SPE-2617 | Authored case → economy-weight bindings (optional `mediaArtifactId`); optional SPE-2617 `weeklyEconomyWeightId`; week-close apply in `spe947MediaEconomyWeeklyOrchestration.ts` |
| `spe947MediaEconomyCommercializationActors` | SPE-2611–2615 / SPE-2616 | Authored commercialization actors keyed by actor id; sanitize in `spe947MediaEconomySimulator.ts` |
| `spe947MediaEconomyLastWeeklyTickWeek` | SPE-2615 / SPE-2616 | Week-close idempotency stamp for media-economy orchestration tick |

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

Documents compact GameState map for authored SPE-956 propagation graphs (SPE-2621 slice 2).
Compose helper wires persisted graph + spe947* maps via `composeSpe956PropagationGraphFromGameState`.
No week-close tick; no evaluator contract changes.

**Current version**: `spe-956-propagation-graph.v1` — exported as `SPE_956_PROPAGATION_GRAPH_PERSISTENCE_SCHEMA_VERSION`

**Location**: `src/domain/spe956PropagationGraphPersistence.ts` (pure compose: `src/domain/spe956PropagationGraph.ts`)

### GameState fields

| Field                           | Notes                                                                 |
| ------------------------------- | --------------------------------------------------------------------- |
| `spe956PropagationGraphRecords` | Authored graph id + nested nodes/edges; keyed by graph id             |

### Hydration

- Sanitize via `sanitizeSpe956PropagationGraphRecords` in `spe956PropagationGraphPersistence.ts`
- Wired in `hydrateGame` (`src/app/store/runTransfer.ts`)
- Invalid graphs, duplicate ids, unknown node kinds, dangling edges, and missing seed nodes are dropped without throw
- Default starting state: empty `{}` map in `createStartingState`

### Versioning

- No migration path defined yet (single version)
- If a breaking field change is needed, bump the discriminant string (e.g. `spe-956-propagation-graph.v2`) and add hydration defaults alongside `runTransfer.ts`
