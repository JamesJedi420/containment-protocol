# Agency Progression Audit — Unlock Definitions and Template Expansion

> Design note and architectural reference for `src/domain/agencyProgression.ts`.

---

## 1. Overview

Agency progression manages a set of named unlock definitions that expand available major incident templates and contract template IDs. Unlocks are stored as a string ID array in `GameState.agency.progressionUnlockIds` and are read-only at query time.

The system has no state mutation logic — it only reads and filters.

---

## 2. Unlock Definitions

Five unlocks are defined in `AGENCY_PROGRESSION_UNLOCK_DEFINITIONS`:

| Unlock ID | Label | Major incident templates | Contract templates |
| --- | --- | --- | --- |
| `containment-liturgy` | Containment Liturgy | occult-007 | institutions-liturgy-expedition |
| `fracture-anchor-protocol` | Fracture Anchor Protocol | anomaly-raid-001 | oversight-anchor-restoration |
| `counter-cult-dossier` | Counter-Cult Dossier | extraction-raid-001 | black-budget-cult-burn |
| `stormgrid-telemetry` | Stormgrid Telemetry | cyber-raid-001, psi-005 | black-budget-stormgrid-burn |
| `blacksite-retrofit` | Blacksite Retrofit | ops-009 | oversight-blacksite-retrofit |

Each unlock maps to:

- `majorIncidentTemplateIds`: template IDs injected into the major incident pressure template pool
- `contractTemplateIds`: contract template IDs made available when the unlock is held

---

## 3. Public API

| Function | Purpose |
| --- | --- |
| `getAgencyProgressionUnlockDefinition(unlockId)` | Returns the full `AgencyProgressionUnlockDefinition` or `undefined` |
| `getAgencyProgressionUnlockLabel(unlockId)` | Returns display label, falling back to the raw ID |
| `getAgencyProgressionUnlockIds(game)` | Returns deduplicated, non-empty string IDs from `agency.progressionUnlockIds` |
| `hasAgencyProgressionUnlock(game, unlockId)` | Boolean check for a specific unlock |
| `getAgencyProgressionPressureTemplateIds(game, baseTemplateIds?)` | Merges base template IDs with all major incident template IDs from active unlocks |

---

## 4. Integration Points

| Consumer | Usage |
| --- | --- |
| Case generation / spawn | Calls `getAgencyProgressionPressureTemplateIds` to expand which major incident templates can appear |
| Contract system | Uses `contractTemplateIds` from unlock definitions to gate available contract offers |
| `src/features/` | Reads `hasAgencyProgressionUnlock` to conditionally render unlocked content |

---

## 5. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Reading `agency.progressionUnlockIds` directly without calling `getAgencyProgressionUnlockIds` | May include duplicates or non-string entries | Always use `getAgencyProgressionUnlockIds` — it deduplicates and type-guards |
| Assuming `getAgencyProgressionUnlockDefinition` throws on unknown IDs | It returns `undefined` | Guard callers with a null check or use `getAgencyProgressionUnlockLabel` for safe fallback display |
| Adding a new unlock ID to game state without a matching definition entry | `getAgencyProgressionUnlockDefinition` returns `undefined`; template expansion silently yields nothing | Always add the definition to `AGENCY_PROGRESSION_UNLOCK_DEFINITIONS` before granting the ID |
