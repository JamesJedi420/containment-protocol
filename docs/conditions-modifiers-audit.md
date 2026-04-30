# Conditions and Modifiers Audit — Tag System, Conditions, Resistance Profiles, Runtime Modifiers

> Design note and architectural reference for `src/domain/shared/tags.ts`, `src/domain/shared/modifiers.ts`, `src/domain/modifierRuntime.ts`, `src/domain/conditions.ts`, and `src/domain/modifiers.ts`.

---

## 1. Overview

The conditions and modifiers system provides three tightly coupled but distinct concerns:

1. **Tags** — canonical string labels attached to entities (agents, cases, gear) that drive weighting, filtering, and matching across all systems
2. **Conditions** — typed, enum-keyed status effects attached to agents, teams, anomalies, incidents, or intel
3. **Modifiers** — numeric stacking values (bounded to `[-3, +3]`) drawn from multiple named sources, plus runtime multiplier structures used during mission resolution

All three are defined in `src/domain/shared/` and re-exported via thin shim files at `src/domain/conditions.ts` and `src/domain/modifiers.ts`.

---

## 2. Tag System (`shared/tags.ts`)

### Tag Families

Tags are organized into 14 families:

| Family | Examples |
| --- | --- |
| `role` | recon-specialist, medic, engineer, psychologist |
| `capability` | (extended in agent models) |
| `gear` | biohazard-suit, thermal-vision, signal-jammer, neural-shield |
| `asset` | (extended in asset models) |
| `anomaly` | shapeshifter, psychic-distortion |
| `behavior` | (extended in behavior models) |
| `mission` | containment-protocol, hazmat-protocol |
| `requirement` | hazardous-materials |
| `environment` | low-visibility, unstable-terrain |
| `hazard` | biohazard |
| `incident` | containment-breach |
| `system-hook` | intel-source |
| `distortion` | fragmented, misleading |
| `state` | unreliable |

### Tag Utilities

| Function | Purpose |
| --- | --- |
| `createTagSet(...sources)` | Merges multiple tag sources (arrays, Sets, or objects with `.tags`) into a single `Set<string>` |
| `hasTag(source, tag)` | Checks if a single tag is present |
| `hasAnyTag(source, tags[])` | True if any of the listed tags is present |
| `hasAllTags(source, tags[])` | True if all listed tags are present |
| `mergeTags(...sources)` | Returns a deduplicated merged `string[]` |
| `appendUniqueTags(existing, tagKeys)` | Adds tags without duplicates |
| `getTagsByFamily(family)` | Filters `TAGS` by family |
| `isValidTagKey(key)` | Checks against the canonical `TAGS` registry |
| `attachTags(entity, tagKeys)` | Mutates entity in-place, adding valid tags not already present |

`createTagSet` accepts heterogeneous sources: raw `string[]`, `Set<string>`, or an object with a `.tags` property. Falsy sources are skipped. **Always use `createTagSet` when building a union of entity tags** — never do manual array concatenation.

---

## 3. Conditions (`shared/tags.ts` — condition section)

### Condition Keys

```text
ConditionKey = 'fatigued' | 'wounded' | 'exposed' | 'alerted' | 'contained' | 'fragmented' | 'escalating'
```

### Condition Definitions

| Key | Allowed carriers | Effect |
| --- | --- | --- |
| `fatigued` | agent, team | `-1` modifier to all actions; cannot stack |
| `wounded` | agent, team | `-2` modifier to physical actions; cannot stack |
| `exposed` | agent, team, anomaly | Increases detection/targeting risk |
| `alerted` | agent, team, anomaly, incident | May trigger preemptive or defensive actions |
| `contained` | anomaly, incident | Limits spread; reduces outgoing effects |
| `fragmented` | intel, incident | Reduces reliability of information |
| `escalating` | incident, anomaly | Increases risk/severity over time |

### Condition Utilities

`attachCondition(entity, key, carrier)` mutates `entity.conditions[]` in place. It:

- Silently no-ops if the condition is not allowed for the carrier type
- Deduplicates — a condition can only appear once on an entity

`getCondition(key)` returns the full `ConditionDefinition` for a key.

`isConditionAllowedFor(key, carrier)` checks the `allowedCarriers` list.

---

## 4. Numeric Modifiers (`shared/modifiers.ts`)

### Cap

All modifier stacks are bounded: `MODIFIER_CAP = { min: -3, max: 3 }`. Individual sources can push the raw total outside the cap, but the capped value returned by `aggregateModifiers` respects the bounds.

### Core Types

```text
ModifierSource = { source: string, value: number }
ModifierResult = { total: number, capped: number, cap: ModifierCap, sources: ModifierSource[] }
```

### Core Functions

| Function | Purpose |
| --- | --- |
| `aggregateModifiers(sources, cap?)` | Sums all source values; returns total, capped, cap, and sources |
| `explainModifiers(result)` | Returns a human-readable string of all sources |
| `applyBoundedDelta(current, delta, bounds)` | Applies a delta and clamps to `[min, max]` |
| `applyResistanceDelta(current, delta, max?)` | Bounded delta clamped to `[0, max]` (defaults max=100) |

The `sources` array in `ModifierResult` is preserved for UI explainability — always store source labels.

---

## 5. Resistance Profiles (`shared/modifiers.ts`)

Six threat families each have a `ResistanceProfile` defining which countermeasure tags neutralize the threat:

| Family | Countermeasures |
| --- | --- |
| `deception` | thermal-vision, intel-source, truth-serum |
| `disruption` | engineer, containment-specialist, signal-jammer |
| `containment` | containment-specialist, biohazard-suit, hazmat-protocol |
| `biological` | biohazard-suit, medic, antiviral-agent |
| `psychological` | psychologist, morale-booster, neural-shield |
| `technological` | engineer, firewall, emp-device |

All `base` resistance values are `0` — resistance only activates when countermeasure tags are present on the team or gear loadout.

### Countermeasure Utilities

| Function | Purpose |
| --- | --- |
| `getResistanceProfile(family)` | Returns the `ResistanceProfile` for a family |
| `getEffectiveCountermeasures({ family, presentTags })` | Returns which countermeasure tags from the profile are in `presentTags` |
| `hasEffectiveCountermeasure(check)` | True if any countermeasure is present |
| `explainCountermeasures(check)` | Human-readable countermeasure explanation |

---

## 6. Runtime Modifier System (`modifierRuntime.ts`)

Runtime modifiers are used during mission evaluation and recovery phases. They aggregate trait-level stat deltas, effectiveness multipliers, stress multipliers, and morale recovery deltas.

### `RuntimeModifierResult`

```text
{
  statModifiers: Partial<Record<AgentTraitModifierKey, number>>
  effectivenessMultiplier: number   // default: 1.0
  stressImpactMultiplier: number    // default: 1.0
  moraleRecoveryDelta: number       // default: 0
}
```

### `RuntimeModifierContext`

Context passed to trait/gear modifier evaluations:

```text
{
  agent: Agent
  caseData?: CaseInstance
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  phase: 'evaluation' | 'recovery'
  triggerEvent?: string
  stressGain?: number
}
```

### Context Helpers

| Function | Returns true when... |
| --- | --- |
| `hasCaseRuntimeContext(ctx)` | `caseData` is present |
| `hasLongAssignmentRuntimeContext(ctx)` | `durationWeeks ≥ 3` or `weeksRemaining ≥ 3` |
| `hasWitnessInterviewRuntimeContext(ctx)` | Tags include witness/interview/civilian/negotiation/social/psionic OR `weights.social ≥ 0.2` |
| `hasAnomalyExposureRuntimeContext(ctx)` | Tags include occult/anomaly/psionic/ritual/spirit/hybrid/seal |
| `isLeaderRuntimeContext(ctx)` | `leaderId` is non-null and matches `agent.id` |

### Aggregation

`aggregateRuntimeModifierResults(effects[])` reduces multiple `RuntimeModifierResult` entries:

- `statModifiers`: merged with `mergeRuntimeModifierMaps` (additive per key)
- `effectivenessMultiplier`: multiplicative product
- `stressImpactMultiplier`: multiplicative product
- `moraleRecoveryDelta`: additive sum

`createRuntimeModifierResult(overrides?)` produces a neutral baseline (`effectivenessMultiplier=1`, `stressImpactMultiplier=1`, `moraleRecoveryDelta=0`, `statModifiers={}`).

---

## 7. Integration Points

| Caller / Consumer | Role |
| --- | --- |
| `src/domain/agent/` | Reads `ConditionKey`, trait modifier keys, and `RuntimeModifierContext` |
| `sim/aggregateBattle.ts` | Reads resistance profiles and runtime modifier aggregation for combat resolution |
| `missionResults.ts` | Applies effectiveness and stress multipliers from runtime modifiers |
| `src/domain/shared/distortion.ts` | References `ConditionKey` for distortion effects |
| `src/features/` | Reads `CONDITIONS`, `TAGS`, `RESISTANCE_PROFILES` for display |

---

## 8. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Using `hasAnyTag` on a raw string array without calling `createTagSet` first | Works but is implicit — `hasAnyTag` accepts a `TagSource` union | Always call via `hasAnyTag(createTagSet(...), tags)` for multi-source unions |
| Mutating `entity.conditions` directly instead of via `attachCondition` | Conditions may be attached to invalid carriers | `attachCondition` enforces `allowedCarriers` check |
| Summing modifier sources and reading `total` instead of `capped` | Values outside `[-3, +3]` get applied | Always read `ModifierResult.capped` for gameplay effect |
| Adding a new `ConditionKey` without updating `ConditionDefinition` | Condition exists in code but has no description or carrier rules | Extend `CONDITIONS` array and `ConditionKey` union together |
| Forgetting to include `supportTags` and `teamTags` in `RuntimeModifierContext` | Trait conditions referencing team composition miss context | Always pass all available tag arrays when building context |
| Treating `effectivenessMultiplier` as additive | Produces wrong aggregate when chaining multiple effects | It is **multiplicative** — `aggregateRuntimeModifierResults` multiplies, does not sum |
