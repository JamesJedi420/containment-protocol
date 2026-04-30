# Spawn Rules Audit — Child Spawn Contract, ID Derivation, Double-Escalation Invariant

> Design note and architectural reference for `src/domain/spawnRules.ts` and `src/domain/sim/spawn.ts`.

---

## 1. Overview

Spawn is the mechanism by which one case produces new child cases. Two triggers exist:

| Trigger                            | Function               | Source rule field            |
| ---------------------------------- | ---------------------- | ---------------------------- |
| Mission failure                    | `spawnFromFailures`    | `CaseInstance.onFail`        |
| Case unresolved (deadline expired) | `spawnFromEscalations` | `CaseInstance.onUnresolved`  |

These are the **only** two legitimate spawn triggers for child cases. Spawn never fires on case success.

---

## 2. The Spawn Contract — What `sim/spawn.ts` May and May Not Do

**`sim/spawn.ts` is allowed to:**

- Add new `CaseInstance` objects to `state.cases`
- Read from `state.templates` to select a child template
- Mutate the **parent** case's `stage`, `status`, `assignedTeamIds`, `weeksRemaining`, and `deadlineRemaining` inside `applySpawnRule` — but only as part of constructing the escalated parent copy returned as `mutated`. This copy is returned to the caller; the original `state.cases` entry is **not** directly mutated.
- Record `SpawnedCaseRecord` entries describing what was spawned and why

**`sim/spawn.ts` is NOT allowed to:**

- Apply persistent parent-stage mutations directly to `state.cases` (that is `advanceWeek.ts`'s responsibility)
- Spawn children on the success path
- Generate IDs with `Math.random()` — all IDs must come from seeded RNG + `usedIds` guard (see §4)
- Import from `src/features/**`

**Why this matters — the double-escalation invariant:**

`advanceWeek.ts` owns all persistent parent-state changes (stage increments, deadline changes, raid conversion at the campaign level). `spawn.ts` only adds children to state and returns an updated-state snapshot. If spawn were also mutating `state.cases[parentId].stage` directly, the parent would be escalated twice — once by spawn and once by advanceWeek. This is the double-escalation bug the contract prevents.

---

## 3. `SpawnRule` — The Authored Rule Shape

Defined in `src/domain/models.ts`. Both `CaseTemplate` and `CaseInstance` carry two rules:

```ts
onFail: SpawnRule      // fired when the assigned team fails the mission
onUnresolved: SpawnRule // fired when deadlineRemaining reaches 0 with no assignment
```

### `SpawnRule` fields

| Field | Type | Default (normalized) | Meaning |
| --- | --- | --- | --- |
| `stageDelta` | `number` | `0` | Stage increase applied to the parent copy inside `applySpawnRule` |
| `deadlineResetWeeks` | `number \| undefined` | `parent.deadlineWeeks` | Resets parent's `deadlineRemaining` after escalation |
| `spawnCount` | `{ min, max }` | `{ min: 0, max: 0 }` | How many child cases to spawn |
| `spawnTemplateIds` | `string[]` | `[]` | Template IDs to draw children from (empty = full pool) |
| `convertToRaidAtStage` | `number \| undefined` | — | If parent stage reaches/exceeds this after `stageDelta`, parent converts to `kind: 'raid'` |
| `type` | `string \| undefined` | — | Legacy discriminator from older fixtures; ignored in current logic |

---

## 4. `spawnRules.ts` — Normalization Layer

`src/domain/spawnRules.ts` exposes `normalizeSpawnRule(rule)` which fills all optional fields with safe defaults before any resolution logic runs. This prevents null-checks scattered through the spawn paths.

```ts
normalizeSpawnRule(rule) → NormalizedSpawnRule
// stageDelta defaults to 0
// spawnCount defaults to { min: 0, max: 0 }
// spawnTemplateIds defaults to []
```

`normalizeSpawnRule` is called at the start of every `applySpawnRule` execution. Always normalize before reading rule fields.

---

## 5. Deterministic ID Derivation

```ts
function nextId(usedIds: Set<string>, rng: () => number): string {
  let id = ''
  do {
    id = `case-spawned-${randInt(rng, 1000, 999999999)}`
  } while (usedIds.has(id))
  usedIds.add(id)
  return id
}
```

Key properties:

- IDs are prefixed `case-spawned-` followed by a seeded random integer
- `usedIds` starts as `new Set(Object.keys(state.cases))` — all currently live case IDs
- The loop retries until no collision is found; with a range of ~999M values, collisions are astronomically unlikely but the guard is required for correctness
- **Never use `Math.random()`** in any ID generation path — doing so breaks deterministic replay

`instantiateFromTemplate` accepts an optional `usedIds` set. Callers building multiple children in sequence must pass the same set so IDs stay unique across the batch.

---

## 6. `instantiateFromTemplate` — What It Sets vs. What Remains Authored

`instantiateFromTemplate(template, rng, usedIds, week)` produces a `CaseInstance` from a `CaseTemplate`. It:

**Sets deterministically:**

- `id` — via `nextId` (seeded RNG + usedIds guard)
- `status: 'open'`
- `stage: 1`
- `assignedTeamIds: []`
- `deadlineRemaining` — copied from `template.deadlineWeeks`
- `factionId` — from `template.factionId` or inferred via `inferFactionIdFromCaseTags`
- `pressureValue` — from `template.pressureValue` or inferred via `inferCasePressureValue`
- `regionTag` — from `template.regionTag` or inferred via `inferCaseRegionTag`
- Intel state — via `createMissionIntelState(week)`
- Site generation — via `applySiteGenerationToCase`

**Copies directly from template (authored values):**

- `title`, `description`, `mode`, `kind`, `difficulty`, `weights`, `tags`, `requiredTags`, `requiredRoles`, `preferredTags`, `durationWeeks`, `deadlineWeeks`, `onFail`, `onUnresolved`, `raid`, `contactId`, `templateId`

**Does not set:**

- `stage` above 1 — callers that need a higher starting stage must override after instantiation (as `spawnCase` and `spawnFromCaseRule` do)

---

## 7. Template Selection — `pickTemplateWithPatrolDistortion`

Template selection from a pool is handled by `pickTemplateWithPatrolDistortion`. This function:

1. Builds a base pool from `requestedTemplateIds` if non-empty; otherwise uses all templates in `state.templates`
2. If no active `CompromisedAuthorityState` with `'patrol'` in `distortedCategories` is present, selects uniformly at random using seeded RNG
3. If patrol distortion is active, applies `applyPatrolWeightDistortion` which duplicates anti-faction-intel templates less and investigator-harassment templates more in the selection pool, then picks using seeded RNG

The distortion is deterministic given the same RNG state and authority configuration. The pool-duplication approach preserves seeded-RNG determinism without branching logic.

---

## 8. `SpawnedCaseRecord` — The Return Shape

```ts
interface SpawnedCaseRecord {
  caseId: string
  trigger: 'failure' | 'unresolved' | 'raid_pressure' | 'world_activity' | 'faction_offer' | 'faction_pressure' | 'pressure_threshold'
  parentCaseId?: string
  factionId?: string
  factionLabel?: string
  sourceReason?: string
  evidenceRoutingOutcome?: 'retained' | 'suppress' | 'misroute' | 'forward_to_faction'
}
```

`SpawnedCaseRecord` is the audit trail flowing back to `advanceWeek.ts`. It is used to:

- Register new case IDs in the weekly execution context
- Generate event drafts (`appendSpawnedCaseEventDrafts`) for the weekly report
- Record evidence-routing outcomes for compromised-authority tracing (SPE-867 seam)

---

## 9. Pressure Calibration — Second-Escalation Band Reduction

During the second escalation band (defined by `PRESSURE_CALIBRATION.secondEscalationBandStartWeek` / `secondEscalationBandEndWeek`), `spawnFromCaseRule` applies a spawn-count reduction of `PRESSURE_CALIBRATION.secondEscalationFollowUpSpawnReduction` (currently `2`) to both `min` and `max`, clamped to `0`. This prevents snowball pressure accumulation in mid-campaign.

---

## 10. Slot Limiting — `limitSpawnResultToAvailableSlots`

`advanceWeek.ts` wraps both `spawnFromFailures` and `spawnFromEscalations` with `limitSpawnResultToAvailableSlots` before merging results into state. This caps the total number of cases in state and discards excess spawned cases (and their records) before they are committed.

---

## 11. Integration Points

| Caller / Consumer | Role |
| --- | --- |
| `sim/advanceWeek.ts` | The **only** legitimate caller of `spawnFromFailures` and `spawnFromEscalations`; owns parent-stage escalation separately |
| `src/domain/spawnRules.ts` | Normalization; called at the top of every `applySpawnRule` |
| `src/domain/caseGeneration.ts` | Reads `onFail`/`onUnresolved` to build `CaseEscalationPreview` for the front desk |
| `src/domain/caseGenerationPolicy.ts` | Governs template diversity weighting upstream of spawn |
| `sim/compromisedAuthority.ts` | Provides patrol distortion and evidence routing inputs |
| `sim/calibration.ts` | Provides pressure-band constants controlling follow-up spawn reduction |
| `sim/eventNoteBuilders.ts` | Consumes `SpawnedCaseRecord` to generate weekly report notes |

---

## 12. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Spawning a child on the success path | Unearned escalation pressure | `spawnFromFailures` and `spawnFromEscalations` each filter to `context.failedSpawnSources` / `context.unresolvedTriggers` — cases not in those sets are skipped |
| Mutating `state.cases[parentId].stage` inside `spawn.ts` | Double-escalation | `applySpawnRule` returns a `mutated` copy; it does not write to `state.cases` directly |
| Using `Math.random()` for ID generation | Non-deterministic replay | `nextId` uses `randInt(rng, ...)` exclusively |
| Passing a fresh `usedIds` set per child | ID collision within the same spawn batch | Pass a single shared `usedIds` across all children in a batch |
| Empty `spawnTemplateIds` when a specific template is required | Random template selected from full pool | Author must explicitly set `spawnTemplateIds` on the rule if a specific follow-on template is intended |
| Forgetting `limitSpawnResultToAvailableSlots` on a new spawn call site | State can exceed the case-count cap | Always wrap new spawn call sites in `advanceWeek.ts` with the limit helper |
