# Major Incidents Audit — Archetypes, Stages, Difficulty Scaling, and Boss Entities

> Design note and architectural reference for `src/domain/majorIncidents.ts`.

---

## 1. Overview

Major incidents are a special classification layer applied on top of standard `CaseInstance` data when a case meets a minimum scale threshold. They add an archetype-driven stage system, scaled difficulty, modifiers, special mechanics, and optional boss entities.

The system is **read-only at runtime**: `buildMajorIncidentProfile` derives all major incident state from a `CaseInstance` without writing back to the game state. Difficulty scaling is applied to a derived `effectiveCase` copy that is passed to mission resolution.

---

## 2. Eligibility

`isMajorIncidentCase(currentCase)` returns `true` when any of these conditions hold:

- `kind === 'raid'` (always qualifies)
- `stage >= 4`
- `stage >= 3` AND `deadlineRemaining <= 1`

If eligibility is not met, `buildMajorIncidentProfile` returns `null` and the case is resolved as a normal mission.

---

## 3. Incident Scale

```text
incidentScale =
  raid?  stage + 2
  other: stage
```

Scale drives stage selection — a higher scale activates later and more severe stage definitions.

---

## 4. Archetypes

Five archetypes are defined in `MAJOR_INCIDENT_ARCHETYPES`. Archetype selection uses the first match by case tag overlap:

| Archetype ID | Label | Matching tags |
| --- | --- | --- |
| `possession_outbreak` | Possession outbreak | possession, medium, spirit, haunt, haunting |
| `dimensional_breach` | Dimensional breach | breach, perimeter, containment, rift, classified, infrastructure |
| `coordinated_cult_operation` | Coordinated cult operation | cult, ritual, occult, seal, holy, archive |
| `anomaly_storm` | Anomaly storm | anomaly, signal, relay, psionic, cyber, weather |
| `containment_cascade` | Containment cascade | (empty tag list — acts as default fallback) |

Tag matching checks `case.tags + case.requiredTags + case.preferredTags`. If no archetype tag overlaps, `containment_cascade` is selected as the final fallback.

---

## 5. Stage Structure

Each archetype has exactly 3 stage definitions:

| Field | Type | Purpose |
| --- | --- | --- |
| `index` | 1–3 | Stage ordinal |
| `label` | string | Display name |
| `minimumScale` | 3, 4, or 5 | Minimum `incidentScale` required to reach this stage |
| `difficultyMultiplier` | float | Multiplied against all difficulty stat values |
| `difficultyPressure` | `Partial<StatBlock>` | Flat additive bonus applied per stat after multiplication |
| `recommendedTeams` | integer | Guidance for how many teams should cover this incident |
| `enforcedRaidTeamFloor` | integer | Minimum raid `minTeams` when this stage is active |
| `modifiers` | array | Narrative pressure modifiers shown to the player |
| `specialMechanics` | array | Gameplay mechanics that apply at this stage |
| `bossEntity?` | optional | Only present at stage 3 for 4 of 5 archetypes |

Stage selection: stages are scanned in reverse order; the first stage where `incidentScale >= minimumScale` is selected.

---

## 6. Stage Difficulty Scaling

`scaleDifficulty(currentCase, stage)` computes the effective difficulty for all four stats:

```text
effectiveStat = round(baseStat × difficultyMultiplier + difficultyPressure.stat, 2)
```

`difficultyPressure` is `Partial<StatBlock>` — unset stats default to `0`.

### Multiplier and pressure values by archetype

**Possession outbreak**:

| Stage | Multiplier | Pressure |
| --- | --- | --- |
| 1 (scale 3) | 1.12 | utility+8, social+6 |
| 2 (scale 4) | 1.26 | combat+6, investigation+4, utility+12, social+10 |
| 3 (scale 5) | 1.42 | combat+10, investigation+6, utility+16, social+12 |

**Dimensional breach**:

| Stage | Multiplier | Pressure |
| --- | --- | --- |
| 1 (scale 3) | 1.15 | combat+6, utility+10, investigation+4 |
| 2 (scale 4) | 1.30 | combat+10, investigation+6, utility+14, social+2 |
| 3 (scale 5) | 1.48 | combat+14, investigation+8, utility+18, social+4 |

**Coordinated cult operation**:

| Stage | Multiplier | Pressure |
| --- | --- | --- |
| 1 (scale 3) | 1.10 | investigation+10, utility+6, social+6 |
| 2 (scale 4) | 1.24 | combat+6, investigation+12, utility+10, social+8 |
| 3 (scale 5) | 1.38 | combat+10, investigation+14, utility+12, social+10 |

**Anomaly storm**:

| Stage | Multiplier | Pressure |
| --- | --- | --- |
| 1 (scale 3) | 1.12 | investigation+6, utility+10, social+4 |
| 2 (scale 4) | 1.26 | combat+4, investigation+8, utility+14, social+4 |
| 3 (scale 5) | 1.40 | combat+8, investigation+10, utility+18, social+6 |

**Containment cascade**:

| Stage | Multiplier | Pressure |
| --- | --- | --- |
| 1 (scale 3) | 1.10 | combat+6, investigation+4, utility+8, social+2 |
| 2 (scale 4) | 1.22 | combat+8, investigation+6, utility+12, social+4 |
| 3 (scale 5) | 1.34 | combat+10, investigation+8, utility+14, social+6 |

---

## 7. Boss Entities

Stages 3 of four archetypes include a boss entity. `containment_cascade` has a boss entity too:

| Archetype | Boss name | Threat label |
| --- | --- | --- |
| `possession_outbreak` | Choir Vessel | Mass-possession nexus |
| `dimensional_breach` | Threshold Archon | Breach sovereign |
| `coordinated_cult_operation` | Hierophant Prime | Cult command node |
| `anomaly_storm` | Tempest Core | Anomaly storm nexus |
| `containment_cascade` | Cascade Prime | Failure orchestrator |

Boss entities are surfaced in `MajorIncidentProfile.bossEntity` for display and encounter mechanics. All five archetypes expose a boss at stage 3.

---

## 8. Raid Team Floor Enforcement

When the case is a raid, `buildMajorIncidentProfile` overrides the raid's `minTeams` to enforce `enforcedRaidTeamFloor`:

```text
effectiveRaid.minTeams = min(raid.maxTeams, max(raid.minTeams, stage.enforcedRaidTeamFloor))
effectiveRaid.maxTeams = raid.maxTeams ?? stage.recommendedTeams
```

This ensures that high-stage major incidents cannot be executed with fewer teams than the stage demands.

---

## 9. Progression Tracking

`createProgression` maps all stages to `MajorIncidentProgressionEntry[]` with status:

- `'cleared'` — stage index < currentStageIndex
- `'active'` — stage index === currentStageIndex
- `'locked'` — stage index > currentStageIndex

Progression is a display artifact. It is not stored in game state.

---

## 10. Public API

| Function | Purpose |
| --- | --- |
| `isMajorIncidentCase(currentCase)` | Check eligibility — returns bool |
| `buildMajorIncidentProfile(currentCase)` | Full profile or `null` if not eligible |
| `buildMajorIncidentOperationalCase(currentCase)` | Returns `effectiveCase` with scaled difficulty, or the original case if not a major incident |
| `getMajorIncidentDifficultyPressure(currentCase)` | Returns `Partial<StatBlock>` pressure for the active stage |

---

## 11. Integration Points

| Consumer | Usage |
| --- | --- |
| `missionResults.ts` | Calls `buildMajorIncidentOperationalCase` to get scaled difficulty before resolution |
| `src/features/operations/` | Calls `buildMajorIncidentProfile` to render incident panel, stages, modifiers, boss |
| `aggregateBattle.ts` | Receives `effectiveCase` with scaled difficulty — no direct import |
| `spawn.ts` | Checks `isMajorIncidentCase` to suppress standard spawn rules for raid-scale cases |

---

## 12. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Passing original `currentCase` to encounter resolution for major incidents | Normal (un-scaled) difficulty applied | Always call `buildMajorIncidentOperationalCase` at the dispatch boundary |
| Assuming `containment_cascade` only appears as a fallback | It can also match any case with no recognized tags | Check archetype ID explicitly if behavior needs to differ for cascade |
| Expecting all 5 archetypes to have non-empty `tags` | `containment_cascade.tags` is `[]` | Fallback logic relies on order — never re-sort `MAJOR_INCIDENT_ARCHETYPES` |
| Reading `currentStage.recommendedTeams` as a hard minimum | It is guidance — raid floor is enforced via `enforcedRaidTeamFloor` | Use `profile.recommendedTeams` (which takes max of both) for display |
| Calling `buildMajorIncidentProfile` on every case render | Redundant work for non-major cases | Gate with `isMajorIncidentCase` first |
