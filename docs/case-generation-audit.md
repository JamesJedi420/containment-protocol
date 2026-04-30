# Case Generation Audit — Ambient Spawn, Template Weighting, Diversity Policy

> Design note and architectural reference for `src/domain/caseGeneration.ts` and `src/domain/caseGenerationPolicy.ts`.

---

## 1. Overview

Case generation is the weekly process by which new `CaseInstance` objects enter `state.cases` through ambient world activity or faction pressure. It is distinct from failure/escalation spawning (which is handled by `sim/spawn.ts`). Generation is the **entry point** for the core gameplay loop: cases arrive, get triaged, get assigned, and either succeed, fail, or go unresolved.

The primary export is `generateAmbientCases(state, rng)`, called by `sim/advanceWeek.ts` once per week tick.

---

## 2. Generation Flow

```text
advanceWeek
  └─ generateAmbientCases(state, rng)
       ├─ count open slots  (maxActiveCases - current open cases)
       ├─ elect top pressure faction  (hostile, above threshold)
       ├─ elect top supportive faction  (friendly/allied, supportive stance)
       ├─ evaluate world-activity trigger  (containmentRating ≤ 45 OR unresolvedMomentum ≥ 4)
       ├─ build spawn plans with priorities
       ├─ sort plans by priority, slice to openSlots
       ├─ instantiate each plan → CaseInstance via instantiateFromTemplate
       ├─ apply faction overrides and district schedule tags
       └─ return { state, spawnedCaseIds, spawnedCases }
```

Generation never produces more cases than there are open slots (`state.config.maxActiveCases - openCaseCount`). If there are no open slots, it returns the unmodified state.

---

## 3. Trigger Types — The Three Spawn Paths

| Trigger | Condition | Record trigger value |
| --- | --- | --- |
| `faction_offer` | Top supportive faction elected AND template found | `'faction_offer'` |
| `faction_pressure` | Top hostile faction elected AND threshold exceeded AND template found | `'faction_pressure'` |
| `world_activity` | `containmentRating ≤ 45` OR `unresolvedMomentum ≥ 4` AND template found | `'world_activity'` |

All three paths build a `spawnPlan` entry. Plans are then sorted by priority (highest first) and sliced to fit the open slot count. The three paths are not mutually exclusive — if all three find templates, up to three cases may spawn in a single tick (subject to slot limits).

### Priority Scoring

- `faction_offer`: base 70 + reputation + `opportunityAccess × 8` + `standing × 2`
- `faction_pressure`: base 50 + pressure above threshold + absolute negative reputation
- `world_activity`: base 25 + `max(0, 50 - containmentRating)` + `unresolvedMomentum × 4`

Faction-driven spawns outprioritize world activity unless containment has severely degraded.

---

## 4. Faction Candidate Election

### Top Hostile Faction (pressure path)

The hostile faction is the top-scoring faction that:

- Is **not** in a supportive stance
- Is **not** in `'friendly'` or `'allied'` reputation tier
- Has `pressureScore ≥ getFactionPressureSpawnThreshold(faction)`

Sorted by `pressureScore` descending, then by `reputation` ascending (most hostile reputation goes first). Ties broken by label alphabetically.

Only one hostile faction spawns per tick.

### Top Supportive Faction (offer path)

The supportive faction is the top-scoring faction that:

- Has `reputationTier === 'friendly'` or `'allied'`
- Is in a `'supportive'` stance
- Has `matchingCases < 2` (avoids flooding with the same faction's missions)

Sorted by `reputation` descending, then `opportunityAccess` descending, then `standing` descending.

Only one supportive faction spawns per tick.

---

## 5. Template Selection and Weighting

### Eligible Templates

The ambient template pool (`eligibleTemplates`) contains templates where:

- `templateId` does NOT start with `'followup_'` (follow-up cases are owned by the spawn/escalation path)
- `kind === 'case'`

### Weighting — World Activity Path

`getWorldTemplateWeight(template, game)` computes a base weight:

- Starts at `1`
- Adds `0.75` per matched tag in the top-5 pressure tags (tags most frequently present on open cases)
- Adds `2` if `containmentRating ≤ 45` and template has anomaly/breach/occult/cult/biological/chemical tags
- Adds `1` if market pressure is `'tight'` and template has chemical/biological/signal/hazmat/infrastructure tags
- Adds `1` if `clearanceLevel ≥ 2` and template has cyber/psionic/classified tags
- Adds `1` if `unresolvedMomentum ≥ 4` and the template's `onUnresolved.spawnCount.max > 0`

The base weight is then passed through `applyTemplateDiversityWeight` (see §6).

If a district schedule exists, a `districtBonus` is multiplied in from `getDistrictScheduleWeightBonus`.

### Weighting — Faction Paths

`getFactionTemplateWeight(template, faction, tags, mode)` weights templates by:

- `0` if no faction tags match
- Otherwise: `1 + factionTagMatches × 3` base
- Hostile mode bonuses: +0.5 if template has follow-up spawns; +1 if pressureScore ≥ 180
- Supportive mode bonuses: +0.75 for `kind === 'case'`; +0.5 if no follow-up spawns; +1 for allied, +0.4 for friendly; +`opportunityAccess × 0.25`
- Final weight multiplied by `faction.influenceModifiers.caseGenerationWeight`

The weighted template is selected using `pickWeightedTemplate` (weighted random draw using seeded RNG).

---

## 6. Template Diversity Policy (`caseGenerationPolicy.ts`)

The diversity policy (`DEFAULT_CASE_GENERATION_POLICY`) prevents the same template or template family from spawning repeatedly within a lookback window.

### Policy Fields

| Field | Default | Meaning |
| --- | --- | --- |
| `recentSpawnLookbackWeeks` | `4` | How many past weeks to scan for repeated templates |
| `recentTemplateSuppressionMultiplier` | `0.55` | Per-seen multiplier applied to a recently seen template |
| `familyPenaltyPerRecentSpawn` | `0.12` | Subtracted from weight per family spawn in the window |
| `unseenFamilyBonus` | `0.22` | Added to weight if the family has not appeared in the window |
| `minimumWeightMultiplier` | `0.15` | Floor — templates are never fully suppressed to 0 by diversity |

### Template Family Derivation

`deriveTemplateFamily(templateId)`: splits on `'-'` and returns the prefix before the first dash. If no dash, returns the full ID. Example: `'cult-ritual-01'` → family `'cult'`.

### Suppression Calculation

```text
templateSuppression = 0.55 ^ timesSeenInWindow   (1 if unseen)
familyPenalty = 1 - (familySeenCount × 0.12)     (1.22 if unseen)
multiplier = clamp(templateSuppression × familyPenalty, 0.15, 3)
finalWeight = baseWeight × multiplier
```

Templates seen once in the window have weight reduced by 45%. Templates seen twice are reduced to ~30% of base. Unseen families get a 22% boost.

---

## 7. District Schedule Integration (SPE-109)

When `state.districtScheduleState` exists, the world-activity path selects a random district and time band, then calls `getScheduleSnapshot(...)` to obtain a live traffic snapshot (baseline + additive overlays).

The snapshot contributes:

- `getDistrictScheduleWeightBonus`: adds `0.5` per matching `encounterFamilyTag`, up to a max of `+2.5`; bonus for covert-window or high-witness tags
- Tags added to the instantiated case: `district:{id}`, `timeband:{id}`, `schedule:covert-advantage`, `schedule:witness-{band}`, `schedule-event:{eventId}` (one per applied overlay event)
- A narrative fragment appended to the spawn reason string

If no schedule exists, the district weight bonus is 1 (no effect).

---

## 8. Case Profile — `buildCaseGenerationProfile`

`buildCaseGenerationProfile(case, game)` builds a read-only view of a case for the front desk UI. It includes:

- `encounterType` / `encounterTypeLabel`: one of 9 encounter types derived from semantic tags
- `origin`: a `CaseOriginView` reconstructed from `game.events` (finds the most recent `'case.spawned'` event with matching `caseId`); handles all 6 trigger types plus `'starter_seed'` fallback
- `causeSignals`: deduplicated semantic tags (excluding `site:*` prefixed internal tags), sorted, capped at 8
- `escalation`: two `CaseEscalationPreview` entries (one per trigger: `'failure'`, `'unresolved'`) showing projected next stage, raid conversion, and target templates
- `rewardProfile`: reward preview from `buildMissionRewardPreviewSet`

---

## 9. Encounter Type Classification

`classifyEncounterType(templateOrCase)` maps semantic tags to 9 encounter types. Priority order:

1. `haunting` — haunting, haunt, spirit
2. `possession` — possession, medium
3. `cult_activity` — cult, ritual
4. `cryptid_sighting` — vampire, cryptid, beast, feral
5. `anomalous_breach` — anomaly, breach, containment
6. `biohazard` — biological, chemical, hazmat
7. `cyber_intrusion` — cyber, signal, information, classified, relay
8. `hostile_incursion` — combat, threat, perimeter
9. `investigation` — fallback

---

## 10. Starter Seeds

On campaign start, `starterCaseSeeds` provides the initial open cases. These are not generated by `generateAmbientCases`; they are injected directly. The `buildCaseOrigin` function recognizes them by matching against `starterCaseSeeds[].id` and labels them as `'starter_seed'` / `'Baseline world activity'`.

---

## 11. Integration Points

| Caller / Consumer | Role |
| --- | --- |
| `sim/advanceWeek.ts` | The only caller of `generateAmbientCases`; integrates returned state snapshot |
| `sim/spawn.ts` | `instantiateFromTemplate` — used by case generation to create instances from templates |
| `caseGenerationPolicy.ts` | `applyTemplateDiversityWeight` — called inside `getWorldTemplateWeight` and `getFactionTemplateWeightForState` |
| `factions.ts` | Faction state derivation (`buildFactionStates`), tag lists, pressure thresholds |
| `districtSchedule.ts` | `getScheduleSnapshot` — district/time-band context for weighting and tagging |
| `src/features/operations/FrontDeskPage` | Reads `buildCaseGenerationProfile` to render case details |

---

## 12. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Treating `'followup_'`-prefixed templates as ambient-eligible | Escalation chains re-spawn their own follow-ups from the wrong path | `isAmbientEligibleTemplate` filters them out |
| Adding district tags to faction-spawned cases | Faction missions get incorrect schedule metadata | Only the `world_activity` path adds district/schedule tags |
| Calling `generateAmbientCases` outside of `advanceWeek.ts` | State divergence if called at wrong tick phase | This function is exclusively a week-advance step |
| Forgetting `site:` tag exclusion in `buildCauseSignals` | Internal spatial metadata appears as semantic cause signals in UI | The filter `!tag.startsWith('site:')` must be preserved |
| Modifying `DEFAULT_CASE_GENERATION_POLICY` without testing edge cases | Over-suppression or under-suppression at high spawn rates | Use `minimumWeightMultiplier` floor; never set suppression multiplier to 0 |
