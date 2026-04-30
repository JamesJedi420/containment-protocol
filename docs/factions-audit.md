# Factions Audit — Standing, Reputation, Pressure, Influence, Contacts, and Recruit Unlocks

> Design note and architectural reference for `src/domain/factions.ts`.

---

## 1. Overview

The faction system tracks six named factions and computes their real-time standing, pressure, reputation tier, influence modifiers, opportunities, and internal stability state. Faction state feeds directly into case generation weighting, mission reward modifiers, spawn thresholds, and recruit unlock eligibility.

All faction state is **derived** at read time from `GameState` via `buildFactionStates`. No persistent write lock is required; the authoritative store is the event log and the `factions` runtime record.

---

## 2. Faction Definitions

Six factions are defined in `FACTION_DEFINITIONS`. Each has an `id`, `category`, and a `tags` array used for case-tag overlap matching:

| Faction ID | Name | Category | Representative tags |
| --- | --- | --- | --- |
| `threshold_court` | Threshold Court | `anomaly_polity` | anomaly, protocol, threshold, court, etiquette |
| `oversight` | Oversight Bureau | `government` | containment, critical, infrastructure, perimeter, breach |
| `institutions` | Academic Institutions | `institution` | archive, campus, research, analysis, witness |
| `occult_networks` | Occult Networks | `occult` | occult, ritual, cult, spirit, anomaly |
| `corporate_supply` | Corporate Supply Chains | `corporate` | chemical, biological, hazmat, signal, logistics |
| `black_budget` | Black Budget Programs | `covert` | cyber, information, relay, classified, tech |

`threshold_court` is the only faction with the `anomaly_polity` category. It has additional protocol-specific fields: `protocolType`, `statusSensitivity`, `favorLogic`, and `symbolicOffenseThreshold`. These drive etiquette interaction rules handled separately from standard standing.

---

## 3. Standing System

Standing represents mission-outcome history with a faction. It is bounded `[-20, +20]` via `STANDING_MIN`/`STANDING_MAX`.

### Source of truth

Standing is accumulated from `GameState.events`:

1. **Primary path**: If `faction.standing_changed` events are present in `game.events`, standing is derived solely from those events
2. **Fallback path**: If no standing-change events exist, `buildStandingMapFromRewardEvents` sums `factionStanding` deltas embedded in `case.resolved`, `case.partially_resolved`, `case.failed`, and `case.escalated` reward payloads

Each faction starts at `0`. All deltas are clamped to `[-20, +20]` per accumulation step.

---

## 4. Reputation System

Reputation is separate from standing and tracks longer-term relationship history. It is stored in `FactionRuntimeState.reputation` and bounded `[-100, +100]`.

### Reputation tiers

| Tier | Reputation threshold |
| --- | --- |
| `allied` | ≥ 75 |
| `friendly` | ≥ 35 |
| `neutral` | between -14 and 34 |
| `unfriendly` | ≤ -15 |
| `hostile` | ≤ -50 |

`getFactionReputationTier(reputation)` evaluates from top (allied) downward.

---

## 5. Pressure Score

Pressure represents urgency and threat level for a faction, computed as:

```text
pressureScore =
  Σ( caseStage × 12 + (raid ? +18 : 0) + max(0, 3 − deadlineRemaining) × 8 + (in_progress ? +4 : 0) )
  + marketPressureFactor
  + unresolvedMomentum × 2
```

**Market pressure factor**:

| Market pressure | Adjustment |
| --- | --- |
| `tight` | +8 |
| `discounted` | -4 |
| `stable` | 0 |

**Unresolved momentum**: sum of `unresolvedTriggers.length + failedCases.length` from the last 3 reports.

Only open cases (status ≠ `resolved`) whose tags overlap the faction's tags contribute to the sum.

---

## 6. Influence Modifiers

`buildFactionInfluenceModifiers(standing, pressureScore)` derives three modifiers:

### `caseGenerationWeight`

Biases how heavily this faction's case templates are weighted during ambient generation:

| Standing | Bias |
| --- | --- |
| ≥ 8 | -0.10 |
| ≥ 4 | -0.05 |
| ≤ -8 | +0.14 |
| ≤ -4 | +0.08 |

Pressure adds a further +0.04 (≥90) or +0.08 (≥160) bonus. Result is clamped to `[0.85, 1.30]`.

### `rewardModifier`

Adjusts mission reward scores:

| Standing | Bias |
| --- | --- |
| ≥ 8 | +0.12 |
| ≥ 4 | +0.07 |
| ≤ -8 | -0.12 |
| ≤ -4 | -0.07 |

High pressure reduces reward: -0.015 (≥90) or -0.04 (≥160). Result is clamped to `[-0.16, +0.16]`.

### `opportunityAccess`

Determines whether a faction exposes an opportunity window:

- Access ≥ 2 → positive opportunity pushed
- Pressure ≥ 90 or standing ≤ -4 → negative pressure-spike opportunity pushed

---

## 7. Stance

Each faction is assigned one of three stances from `buildFactionStates`:

| Stance | Condition |
| --- | --- |
| `supportive` | standing ≥ 6 AND pressure < 90 AND containmentRating ≥ 60 |
| `hostile` | standing ≤ -6 OR pressure ≥ 110 |
| `contested` | everything else |

---

## 8. Compact Internal State (SPE-52)

The **anchor faction** (always index 0 in `buildFactionStates`, always `threshold_court`) receives four additional internal metrics:

| Field | Formula |
| --- | --- |
| `cohesion` | `60 + standing × 2 − pressureScore × 0.1` |
| `agendaPressure` | `pressureScore × 0.5` |
| `reliability` | `50 + standing − agendaPressure × 0.2` |
| `distortion` | `agendaPressure × 0.3 + (100 − cohesion) × 0.2` |

**Fracture threshold**: if `agendaPressure > 80` or `distortion > 70`, cohesion drops -12 and distortion rises +10. All four fields are clamped to ≥ 0 (no upper bound unless specified).

Non-anchor factions return `cohesion=0, agendaPressure=0, reliability=0, distortion=0`.

The `reliability` value feeds back into `buildFactionRewardInfluence`: it is mapped from `[0, 100]` to a modifier in `[-0.08, +0.08]` (centered at 50) and added to the reward modifier for raid cases.

---

## 9. Spawn Threshold

`getFactionPressureSpawnThreshold` adjusts the base spawn threshold (`FACTION_PRESSURE_THRESHOLD_BASE = 140`) for a faction:

| Condition | Adjustment |
| --- | --- |
| standing ≤ -8 | -20 |
| standing ≤ -4 | -10 |
| standing ≥ 8 | +15 |
| standing ≥ 4 | +8 |
| pressure ≥ 180 | further -5 |

Lower threshold = faction spawns new cases more aggressively.

---

## 10. Contacts and Recruit Unlocks

Each faction has pre-defined `Contact` entries created via `createContact`. A contact unlocks as a recruit channel when all three conditions are met:

1. `contact.status === 'active'`
2. `contact.relationship >= 15`
3. `reputationTier` is at least `contact.minTier` (defaults to `'friendly'`) and at most `contact.maxTier` (if set)

`getFactionRecruitUnlocks` computes available unlocks across all factions. `diffFactionRecruitUnlocks` returns newly appearing entries by comparing keyed sets.

`getFactionRecruitQualityModifier` sums all `effect === 'recruit_quality'` modifiers on a specific contact, returning a numeric bonus applied to incoming recruit stats.

`applyFactionRecruitInteraction` mutates reputation and contact relationship in a pure fashion (returns new state object), auto-promoting a contact to `'active'` at relationship ≥ 15 or `'hostile'` at ≤ -40.

---

## 11. Case Tag Matching

`inferFactionIdFromCaseTags(template)` picks the best-matching faction by tag overlap count across all three tag arrays (`tags`, `requiredTags`, `preferredTags`). Ties are broken by faction ID string order.

`buildFactionCaseMatches` returns all factions with any overlap, sorted by overlap count then reward modifier.

`buildFactionRewardInfluence` computes the final reward modifier for a case:

- Raid cases: top 2 matching factions (second at half weight)
- Non-raid: top 1 matching faction
- Anchor faction `reliability` applies an additional modifier

---

## 12. Integration Points

| Consumer | Usage |
| --- | --- |
| `caseGeneration.ts` | Reads `caseGenerationWeight` to bias template weighting by faction |
| `spawn.ts` | Reads `getFactionPressureSpawnThreshold` to decide when to spawn new cases |
| `missionResults.ts` | Reads `buildFactionRewardInfluence` to scale mission rewards |
| `buildFactionMissionContext` | Computes `scoreAdjustment` for a specific case's faction at dispatch time |
| `src/features/operations/` | Reads `buildFactionStates` to render faction panel |
| `createInitialFactionState` | Bootstraps `GameState.factions` on new game |

---

## 13. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Reading `FactionRuntimeState.reputation` as standing | They are distinct systems — one event-driven, one persistent | Use `buildFactionStandingMap` for standing; read `faction.reputation` only for tier/contact unlock |
| Checking `caseGenerationWeight` instead of `rewardModifier` for mission reward | Wrong modifier applied | `caseGenerationWeight` is generation-side only; `rewardModifier` is resolution-side |
| Assuming all factions get cohesion/reliability/distortion | Only the anchor faction (first in sorted output) has non-zero compact state | Always check `idx === 0` path in `buildFactionStates` |
| Calling `getFactionRecruitUnlocks` before contacts are activated | Returns empty — contacts must have `status === 'active'` and `relationship >= 15` | Activate contacts via `applyFactionRecruitInteraction` first |
| Treating standing and reputation as equivalent in UI | They update at different rates and represent different histories | Standing is per-session event-driven; reputation is cumulative across the runtime record |
