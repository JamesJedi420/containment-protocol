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

| Field | Denominator kinds |
| --- | --- |
| `affectedPopulation` | `people` |
| `fatalities` | `people` |
| `rescueDemand` | `people` |
| `shelterDemand` | `people`, `households` |
| `outages` | `customers`, `households`, `services` |
| `facilityImpact` | `facilities` |
| `serviceDisruption` | `customers`, `services`, `organizations` |
| `hazmatExposure` | `people`, `distance_km` |
| `organizationImpact` | `organizations` |
| `jurisdictionImpact` | `jurisdictions` |

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

| Field | Type | Notes |
| --- | --- | --- |
| `schemaVersion` | `'spe-1274.v1'` | Discriminant; always stamped by `validateProcedureDefinition` |
| `procedureId` | `string` | Trimmed and validated; must be non-empty |
| `canonicalName` | `string` | Trimmed and validated; must be non-empty |
| `aliases` | `string[]` | Zero or more alternate identifiers |
| `taxonomy` | `ProcedureTaxonomy` | Intent × effectDomain × executionMethod × originTradition |
| `tier` | `1–5` | Capability tier; values outside range are rejected |
| `requirements` | `RequirementPacket` | Speech, gesture, tool tags, reagents, diagram, device tags, environment |
| `activationTiming` | `ActivationTiming` | `instant` → `ritual_days` |
| `targeting` | `TargetingPacket` | Geometry, range, resistance handling, cover sensitivity |
| `persistence` | `PersistencePacket` | Duration, dismissibility, expiry state |
| `restrictions` | `ProcedureRestrictions` | Forbidden roles, certifications, specialist access, usage cap |
| `provenance` | `ProcedureProvenance` | Source system, research gate, faction restriction |
| `availability` | `BoundedAvailability` | Rating, source count, access friction |
| `entityPayload` | `EntityPayload?` | Required when `taxonomy.intent === 'summoning'` |

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

**Current version**: `spe-947-evaluator.v1` — exported as `SPE_947_EVALUATOR_PERSISTENCE_SCHEMA_VERSION`

**Location**: `src/domain/spe947EvaluatorPersistence.ts`

### GameState fields

| Field | Evaluator | Notes |
| --- | --- | --- |
| `spe947PlatformRecords` | SPE-2568 / SPE-2569 | Unified platform reach + operation fields; optional `viewCount` / `anomalyReach` runtime metrics; optional SPE-2577 `weeklyViewDelta` / `weeklyUptimeState` / `lastWeeklyTickWeek` |
| `spe947OperationRecords` | SPE-2569 | Operation requests keyed by operation id |
| `spe947ContentArtifacts` | SPE-2571 | Footage/post artifacts keyed by artifact id |
| `spe947CounterMemeticPlans` | SPE-2570 | Counter-memetic plans keyed by plan id; optional SPE-2577 `lastWeeklyTickWeek` |
| `spe947ContentOwners` | SPE-2572 | Content owners keyed by owner id |
| `spe947PostCaseMediaCases` | SPE-2573 | Post-case media inputs keyed by case id |
| `spe947FootageExposureBindings` | SPE-2571 | Optional baseline bindings keyed by artifact id |
| `spe947TakedownResistanceBindings` | SPE-2572 | Threshold bindings keyed by owner id |
| `spe947VisualTriggerHazardBindings` | SPE-2602 | Authored `entityKind` + `entityId` → `visualTriggerHazardId`; read/compose only against `visualTriggerHazardRecords` |

### Hydration

- Sanitize via `sanitizeSpe947*` helpers in `spe947EvaluatorPersistence.ts`
- Wired in `hydrateGame` (`src/app/store/runTransfer.ts`)
- Invalid, duplicate-id, and mismatched-key entries are dropped without throw
- Default starting state: empty `{}` maps in `createStartingState`

### Workflow and public contract

Use `extractSpe947EvaluatorPersistenceMaps(game)` when a caller needs a complete, defaulted bundle of SPE-947 maps. The helper keeps empty maps empty; an empty bundle is a no-op and does not satisfy the SPE-947 parent acceptance bar.

Week-close handling lives in `src/domain/spe947EvaluatorWeeklyOrchestration.ts` and runs from `advanceWeek` after the output week is known. Only two authored inputs can mutate during the weekly tick:

- `spe947CounterMemeticPlans`: crafted plans with a non-empty `distributorId` increment `elapsedPropagationWeeks` once per week and stamp `lastWeeklyTickWeek`.
- `spe947PlatformRecords`: authored `weeklyViewDelta` and `weeklyUptimeState` apply once per week and stamp `lastWeeklyTickWeek`. Missing `viewCount` behaves as `0` when a view delta is authored.

Weekly report notes are read-only projections of the pre-tick and post-tick maps. `buildWeeklySpe947EvaluatorTransitionReportNotes` emits `spe947_evaluator.weekly_transition` notes only when a plan elapsed-week, platform view-count, or platform uptime value changed.

The planning mirror is read-only. `getSpe947EvaluatorMirrorView` displays hydrated platform, plan, owner, and media-case rows without calling the SPE-2568 through SPE-2573 evaluators or writing to store state.

SPE-2111 linkage is id-only. `spe947VisualTriggerHazardBindings` points a SPE-947 entity to a `visualTriggerHazardRecords` id, and `composeSpe947VisualTriggerHazardLinks` resolves labels and statuses without copying registry fields or mutating either map. Unknown registry ids return `missing_registry`; known registry ids with missing SPE-947 entities return `missing_entity`.

### Agent checks

- Do not add mid-week mutations for these maps. Week-close changes belong in `applyWeeklySpe947EvaluatorTick`.
- Do not duplicate SPE-2111 registry fields onto `spe947VisualTriggerHazardBindings`; bindings hold ids only.
- Do not treat empty maps, missing bindings, or missing registry links as parent acceptance evidence.
- Focused validation for this contract: `npm run test:run -- src/test/spe947EvaluatorPersistence.test.ts src/test/spe947EvaluatorWeeklyOrchestration.test.ts src/test/spe947EvaluatorSurfacing.test.ts src/test/spe947VisualTriggerHazardLinkage.test.ts src/test/advanceWeek.spe947Evaluator.integration.test.ts src/test/reportNoteTypeAudit.test.ts`

### Versioning

- No migration path defined yet (single version)
- If a breaking field change is needed, bump the discriminant string (e.g. `spe-947-evaluator.v2`) and add hydration defaults alongside `runTransfer.ts`
