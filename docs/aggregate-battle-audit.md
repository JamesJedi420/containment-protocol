# Aggregate Battle Audit — Units, Phase Loop, Morale, and Outcome Tables

> Design note and architectural reference for `src/domain/aggregateBattle.ts`.

---

## 1. Overview

The aggregate battle layer resolves large-scale engagements between two sides through an ordered multi-phase loop. It abstracts away individual combatant accounting, representing forces as aggregate units whose `strengthSteps × aggregationScale` equals represented body count.

The resolver is fully deterministic — no random input. All outcomes derive from factor tables, spatial context flags, commander overlays, and supply/morale state.

---

## 2. Unit Families

Five families are defined in `AGGREGATE_BATTLE_FAMILY_PROFILES`:

| Family | Label | Aggregation scale | Default occupancy | Default frontage | Default movement | Missile cadence | Special hits to break |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `line_company` | Line Company | 40 | 2 | 2 | 1 | 1 | 0 |
| `mounted_wing` | Mounted Wing | 15 | 1 | 1 | 2 | 1 | 0 |
| `horde_mass` | Horde Mass | 60 | 3 | 3 | 1 | 1 | 0 |
| `artillery_section` | Artillery Section | 4 | 1 | 1 | 1 | 2 | 0 |
| `special_creature` | Special Creature | 1 | 2 | 2 | 1 | 1 | 3 |

`missileCadence: 2` means the unit fires every other round (round 1, 3, 5…). `meleeLocksMissiles: true` (all families) locks out missile fire for 1 round after entering melee. `specialHitsToBreak > 0` enables the durability track — unit ignores step losses until hits reach the threshold.

---

## 3. Area Graph

Battles take place across a small graph of named `AggregateBattleArea` nodes:

| Field | Description |
| --- | --- |
| `id` / `label` | Area identifier and display name |
| `kind` | `approach` \| `line` \| `reserve` \| `support` |
| `occupancyCapacity` | Maximum total occupancy weight that can be in this area |
| `frontageCapacity` | Maximum total frontage that can engage in melee simultaneously |
| `adjacent` | List of adjacent area IDs |

Each side supplies `reserveAreaId` (mandatory) and optional `supportAreaId` where routed units fall back to.

---

## 4. Battle Phase Loop

Each round runs five phases in order: `movement → missile → melee → morale → rally`.

### 4.1 Pre-round

Before phase 1:

1. Round 1 only: `applySupernaturalReadinessPenalty` — drains readiness for all affected units
2. Every round: `applySupernaturalMoraleDrain` — drains morale per round for all affected units
3. `ensureReinforcementsArrive` — places off-map units into their entry area on the specified round
4. `revealRoundTriggeredHiddenUnits` — reveals units whose `revealCondition.kind === 'round'` matches current round

### 4.2 Movement

`resolveMovementPhase` handles:

- **Routed withdrawal**: routed units auto-retreat toward `supportAreaId ?? reserveAreaId` via BFS path, incrementing `routedRounds`
- **Ordered movement**: units with `order !== 'hold'` and a `plannedPath` attempt up to `movement` area hops

Movement denial reasons:

| Reason | Condition |
| --- | --- |
| `missing_area` | Next area ID is not in area map |
| `not_adjacent` | Next area is not adjacent to current |
| `occupancy_full` | Moving in would exceed `occupancyCapacity` |
| `hostile_control_chain` | Unit entered a hostile-controlled area and cannot chain further |

After movement, `revealAreaTriggeredHiddenUnits` reveals hidden units whose area now contains an enemy.

### 4.3 Missile

Each eligible unit selects a target in its own area or an adjacent area, then looks up a `CombatTableCell` from `MISSILE_RESULT_TABLE`.

Eligibility requirements:

- Has an area, is not destroyed
- `moraleState` is neither `routed` nor `retreating`
- `missileFactor > 0`
- No missile lockout active (`missileLockoutRounds === 0`)
- Cadence check: `(round - 1) % missileCadence === 0`

Target selection: same area > adjacent area; largest remaining `strengthSteps`; stable sort by id.

### 4.4 Melee (mutual resolution)

`buildMeleePairs` creates ordered pairs of opposing units sharing an area or adjacent areas. Pairs are formed greedily by highest-strength unit first. Both units resolve simultaneously using `MELEE_RESULT_TABLE`. After melee, both units receive a 1-round missile lockout.

Frontage limits how many units can engage per area — units whose frontage would overflow `frontageCapacity` are skipped.

### 4.5 Morale

Each non-destroyed unit receives a `moraleScore`:

```text
moraleScore = morale + readiness/2 + overlayMoraleBonus + supportBonus + authorityBonus
              − currentStatePenalty − lossPenalty − shockPenalty − controlPenalty − coordinationPenalty
```

| Factor | Value |
| --- | --- |
| `supportBonus` | secure +6 / strained 0 / cut -6 |
| `authorityBonus` | sanctioned +2 / covert 0 / tolerated -1 / other -2 |
| `currentStatePenalty` | shaken 4 / retreating 10 / routed 18 |
| `lossPenalty` | `roundStepLosses × 14 + roundSpecialHits × 16` |
| `shockPenalty` | `roundShock × 6` |
| `controlPenalty` | hostile control in current area +4 |
| `coordinationPenalty` | coordinationFriction +5 |

Morale state thresholds: `score ≥ 80` → steady; `≥ 60` → shaken; `≥ 42` → retreating; `< 42` → routed. Routed units cannot recover through the morale phase — only the rally phase can begin reversing it.

### 4.6 Rally

Each non-steady, non-destroyed unit receives a `rallyScore`:

```text
rallyScore = readiness + morale/2 + overlayRallyBonus + supportBonus + authorityBonus
             − controlPenalty − routedPenalty − coordinationPenalty
```

| Factor | Value |
| --- | --- |
| `supportBonus` | secure +8 / strained +2 / cut -4 |
| `routedPenalty` | `routedRounds × 8` |
| `controlPenalty` | hostile control +4 |
| `coordinationPenalty` | coordinationFriction +4 |

Recovery thresholds by starting state:

| From state | To state | Condition |
| --- | --- | --- |
| `routed` | `retreating` | score ≥ 92 AND `order === 'rally'` |
| `retreating` | `shaken` | score ≥ 80 |
| `shaken` | `steady` | score ≥ 86 |

---

## 5. Combat Tables

Both `MISSILE_RESULT_TABLE` and `MELEE_RESULT_TABLE` are 5×5 indexed by attack band and defense band:

```text
attackBand: 0 = [0–2], 1 = [3–4], 2 = [5–6], 3 = [7–8], 4 = [9+]
```

Each cell contains: `{ stepHits, moraleShock, specialHits }`.

Melee is more decisive than missile at equal factors (higher `moraleShock` and `stepHits` entries). Both tables return the zero cell at band `[0][*]` — a factor of 0 always yields no result.

---

## 6. Attack and Defense Values

### Missile attack value

```text
value = missileFactor + overlayAttackBonus
        − 1 if coordinationFriction
        − 1 if supplyState === 'cut'
        − 1 if visibilityState === 'obstructed'
        + 1 if visibilityState === 'exposed'
        − 1 if moraleState === 'shaken'
→ clamped [0, 12]
```

### Melee attack value

```text
value = meleeFactor + overlayAttackBonus
        − 1 if coordinationFriction
        + 1 if transitionType === 'chokepoint'
        + ingressCombatModifiers[ingressFlag].attackMeleeMod (non-institutional-defender only)
        + 1 if spatialFlags includes 'construction.incomplete'
        + harvestedLoadout.meleeMod
        − 1 if moraleState === 'shaken'
→ clamped [0, 12]
```

### Defense value

```text
value = defenseFactor + overlayDefenseBonus
        + 1 if supplyState === 'secure'
        + 1 if mode === 'missile' AND siteLayer === 'interior'
        + 1 if mode === 'melee' AND transitionType === 'chokepoint'
        + ingressCombatModifiers[ingressFlag].defenseVs{Mode}Mod
        − 1 if 'construction.incomplete' AND isInstitutionalDefender
        + restrictedAnchorCount if isExplicitInstitutionalDefender (requires defenderSideId set)
        + harvestedLoadout.defenseMod
        − 1 if moraleState === 'retreating'
        − 2 if moraleState === 'routed'
→ clamped [0, 12]
```

---

## 7. Ingress Spatial Flag Modifiers

Applied when `context.spatialFlags` contains a flag matching `ingress:<type>`:

| Flag | attackMeleeMod | defenseVsMeleeMod | defenseVsMissileMod |
| --- | --- | --- | --- |
| `ingress:floodgate` | 0 | +1 | 0 |
| `ingress:maintenance_shaft` | -1 | 0 | +1 |
| `ingress:service_door` | 0 | 0 | 0 |
| `ingress:storm_drain` | -1 | 0 | +1 |

`attackMeleeMod` is applied only to the invading side — units on `defenderSideId` are exempt. Defense modifiers apply to all defenders regardless.

---

## 8. Commander Overlays

`AggregateBattleCommandOverlay` applies bonuses to units in the same area as the overlay (or the area of `anchorUnitId` if set):

| Field | Effect |
| --- | --- |
| `attackBonus` | Added to missile and melee attack values |
| `defenseBonus` | Added to defense values |
| `moraleBonus` | Added to morale score |
| `rallyBonus` | Added to rally score |
| `authority` | Affects bonus magnitude at creation time |

`createAggregateBattleCommandOverlayFromLeaderBonus` converts a `LeaderBonus` (from agent/operative data) into an overlay. Authority is applied as a flat offset to attack, defense, morale, and rally bonuses at creation. Sanctioned authority is `+1`, covert is `0`, tolerated is `-1`, others are `-2`.

---

## 9. Hostile Control Zones

A unit exerts control over its own area and all adjacent areas if `controlReach > 0`. If `controlAreaIds` is set, those explicit IDs are used instead of adjacency. Hidden and routed units do not project control.

Hostile control:

- Blocks chaining movement through the area (`hostile_control_chain` denial)
- Adds +4 to `controlPenalty` in morale and rally scoring

---

## 10. Special Durability (Large Creatures)

Units with `specialDurability.hitsToBreak > 0` absorb hits via an accumulation track rather than step loss. On each hit record:

- `specialHits > 0` → applied directly; otherwise each `stepHit > 0` contributes 1 durability hit
- When `hitsTaken >= hitsToBreak` the unit's strength drops to 0 (destroyed)
- Until then, no step losses are applied

`special_creature` family defaults to `hitsToBreak: 3`.

---

## 11. Supernatural Pressure

Optional `supernaturalPressure[]` in `AggregateBattleInput`:

- Round 1: `readinessPenalty` applied to all affected-side units
- Every round: `moraleDrainPerRound` applied to all affected-side units

If `affectedSideId` is not set the penalty applies to all sides.

---

## 12. Win Condition

`battleHasDecisiveState` ends the loop early when fewer than 2 sides have non-routed, non-hidden, on-map units with `strengthSteps > 0`.

`resolveWinningSide` scores each side by: `strengthSteps × aggregationScale − moraleStatePenalty + 20 per controlled area`. The side with the higher score wins; ties return `winnerSideId: null`.

---

## 13. Output Structures

| Type | Description |
| --- | --- |
| `AggregateBattleResult` | Raw result: roundsResolved, winnerSideId, controlByArea, phaseLog, movementDenials, summaryTable |
| `AggregateBattleUnitResult` | Per-unit row: start/remaining steps, step losses, representedStrength, moraleState, routedRounds, specialHits |
| `AggregateBattleCampaignSummary` | Formatted for report notes: friendly/hostile routed lists, specialDamage, movementDeniedUnits |
| `AggregateBattleCampaignRollup` | Aggregate across multiple battles: counts for routed, special damage, movement denial |

---

## 14. Integration Points

| Consumer | Usage |
| --- | --- |
| `sim/advanceWeek.ts` | Calls `resolveAggregateBattle` and `buildAggregateBattleCampaignSummary` for large-scale week-end battles |
| `reportNotes.ts` | Reflects `case.aggregate_battle` draft using campaign summary fields |
| `missionResults.ts` | May reference rollup to affect case outcome score |
| `buildAggregateBattleContextFromCase` | Called with CaseInstance to derive context from spatial flags and region |
| `buildAggregateBattleSideState` | Called with legitimacy and supply state to create side descriptors |

---

## 15. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Omitting `defenderSideId` on context | Ingress attack mod applies to defender, construction bonus never granted | Always set `defenderSideId` when a site has an institutional occupant |
| Using `strengthSteps` as a body count | `representedStrength = strengthSteps × aggregationScale` | Always multiply by `aggregationScale` for display |
| Forgetting `missileCadence: 2` for artillery | Artillery fires every other round, not every round | Check `isMissileCadenceReady` gate in tests |
| Treating `routedRounds` as round count since routing | `routedRounds` increments each movement phase while routed — units can be routed for many `routedRounds` before recovering | Rally penalty is `routedRounds × 8`; recovery requires order `'rally'` and score ≥ 92 |
| Adding units with `revealCondition` but no `areaId` | Hidden units with no area never enter battle | Off-map hidden units must use `reinforcement` to place them first |
| Setting `controlAreaIds: []` (empty array) | Treated as explicit empty control zone — overrides adjacency-based reach | Only set `controlAreaIds` if explicit override is intended; omit for default adjacency behavior |
| Constructing overlays with wrong authority | Authority affects bonuses at creation time, not resolution time | Use `createAggregateBattleCommandOverlayFromLeaderBonus` — it correctly maps authority to bonus values |
