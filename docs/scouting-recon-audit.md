# Scouting and Recon Audit — Pre-Deployment Intel, Case Recon, Candidate Scouting

> Design note and architectural reference for `src/domain/recon.ts`, `src/domain/scoutingResolution.ts`, and `src/domain/sim/recruitmentScouting.ts`.

---

## 1. Overview

Three systems share the scouting/recon domain:

1. **Case recon** (`recon.ts → evaluateTeamCaseRecon`) — evaluates how much hidden case modifier information a pre-deployment team can surface, adjusting mission score and probability
2. **Contested scouting resolution** (`scoutingResolution.ts → resolveScouting`) — resolves a direct scouting contest between team capability and anomaly concealment using the bounded modifier stack
3. **Recruitment scouting** (`recon.ts → evaluateRecruitmentScoutSupport` + `sim/recruitmentScouting.ts`) — scores the agency's scouting bench to drive candidate reveal quality and cost discounts

All three are read-only or produce pure output objects. No system writes directly to `GameState` except `scoutCandidate`, which returns a new state.

---

## 2. Case Recon (`evaluateTeamCaseRecon`)

### Inputs

- `agents: Agent[]` — the pre-deployment team
- `caseData: CaseInstance` — the target case
- `context: TeamReconContext` — optional `supportTags`, `teamTags`, `leaderId`, `protocolState`, `mapLayer`

### Hidden Modifier Construction

`buildCaseHiddenModifiers` identifies which hidden factors are active based on case tag overlap:

| Modifier ID | Keywords (any match activates) | Reveal threshold | Uncertainty |
| --- | --- | --- | --- |
| `trace-signature` | evidence, analysis, archive, forensics | 22 | 0.8 |
| `witness-noise` | witness, interview, civilian, social, negotiation | 22 | 0.7 |
| `environmental-drift` | hazmat, biological, chemical, toxin, plague, environmental | 25 | 1.0 |
| `signal-distortion` | signal, relay, cyber, information, intel, memory | 26 | 1.2 |
| `occult-resonance` | occult, ritual, spirit, anomaly, psionic, containment | 28 | 1.3 |
| `pathing-disruption` | field, breach, combat, raid, perimeter, outbreak | 24 | 0.9 |

Additional modifiers are injected dynamically:

- **Ingress modifiers** from `caseData.spatialFlags` — one of four ingress types (maintenance\_shaft, storm\_drain, floodgate, service\_door), each with its own threshold (22–26) and uncertainty
- **Map layer modifiers** from `context.mapLayer` — hidden symbols (threshold 23–27) and occupier-unknown routes (threshold 32); `map-metadata-first` authoring mode adds a depth modifier (threshold 22)
- **Unknown variable window** — added when `caseData.mode === 'probability'`; threshold `30 + max(0, stage-1) × 2`
- **Escalation volatility** — added when `caseData.stage >= 4`; threshold 34
- **Terrain ambiguity** — fallback when no tags match and `weights.investigation >= 0.3`; threshold 22

### Recon Score

Each agent's recon contribution is computed from:

```text
baselineScore = investigation × 0.34 + equipment × 0.24 + awareness × 0.24 + analysis × 0.18
roleMultiplier = 1.28 (field_recon) | 0.92 (investigator/tech) | 0.55 (other)
tagBonus = matchingReconTags × 2 + (field_recon? +8 : 0)
equipmentBonus = matchingReconItems × 3 + min(6, specializedItems × 2) + matchingReconItemTags
agentScore = clamp(round(baselineScore/5.75 × roleMultiplier + tagBonus + equipmentBonus), 0, 46)
```

Agent tags that count: `recon`, `field_recon`, `surveillance`, `pathfinding`, `field-kit`, `signal-hunter`, `fieldcraft`.

Item tags that count: `recon`, `surveillance`, `signal`, `analysis`, `anomaly`, `field-kit`, `pathfinding`, `environmental`.

Agents with `dead` or `resigned` status contribute 0.

The **team recon score** sums contributions, adds a niche modifier delta × 3, and clamps to `[0, 100]`.

### Output Fields (`CaseReconSummary`)

| Field | Description |
| --- | --- |
| `reconScore` | Final clamped team recon score (0–100) |
| `operativeCount` | Agents with positive recon contribution |
| `hiddenModifierCount` | Total active hidden modifiers for this case |
| `revealedModifierCount` | Modifiers with `reconScore >= revealThreshold` |
| `revealedModifierLabels` | Display labels of revealed modifiers |
| `intelConfidence` | `clamp(0.22 + score/115 + coverage×0.18 − uncertainty×0.03, 0.18, 0.98)` |
| `uncertaintyBefore` | Sum of uncertainty across all active hidden modifiers |
| `uncertaintyAfter` | Remaining uncertainty after reveals and recon dampening |
| `unknownVariablePressure` | Normalized (0–1) pressure from hidden count, probability mode, and stage |
| `unknownVariableCoverage` | Normalized (0–1) coverage from modifier reveal rate and recon score |
| `scoreAdjustment` | Additive mission score bonus from revealed modifiers and recon coverage (capped 5.5) |
| `probabilityBonus` | Additive probability bonus for probability-mode cases (capped 0.08) |

---

## 3. Contested Scouting Resolution (`resolveScouting`)

`resolveScouting` resolves a direct scouting contest using the bounded modifier stack:

### Spatial Context Effects on Concealment

| Context field | Value | Effect |
| --- | --- | --- |
| `visibilityState` | `'obstructed'` | +1 concealment |
| `visibilityState` | `'exposed'` | -1 concealment |
| `siteLayer` | `'transition'` | +1 concealment |
| `siteLayer` | `'interior'` | +0.5 concealment |
| `transitionType` | `'chokepoint'` | +1 concealment |
| `transitionType` | `'threshold'` | +0.5 concealment |
| `containerType` | `'sealed'` | +2 concealment |
| `containerType` | `'open'` | -1 concealment |

### Modifier Stack

After spatial context is applied, sources are aggregated with `aggregateModifiers`:

- `base`: `teamCapability − adjustedConcealment`
- `niche:recon-fit`: niche modifier delta (from `evaluateTagNicheFit`)
- `tag:scout`: +1 if `scout` tag and niche delta is 0
- `tag:shapeshifter`: +1 if anomaly has shapeshifter tag
- `gear:thermal-vision`: +1 if gear includes thermal-vision
- `condition:fatigued`: -1 if team conditions include fatigued
- `condition:alerted`: +1 if anomaly conditions include alerted
- `countermeasure:deception`: +1 if any deception countermeasure is present in team/gear tags

Result is capped via `MODIFIER_CAP` `[-3, +3]`. Outcome bands: `strong`/`success` → `revealed=true`, `fail`/`catastrophic` → `withheld=true`.

---

## 4. Recruitment Scout Support (`evaluateRecruitmentScoutSupport`)

Evaluates the whole agency roster for its collective scouting strength used to discount and improve candidate scouting:

Each agent's contribution uses similar stat weights to case recon (`investigation × 0.36 + equipment × 0.26 + awareness × 0.26 + analysis × 0.12`) but with:

- Role multipliers: `field_recon` core=1.35, `investigator` core=0.58, `tech` core=0.48, other core=0.14
- **Availability multiplier**: dead/resigned=0, recovering/recovery=0.1, injured=0.35; assigned-to-mission × 0.2; training × 0.5; fatigue≥60 × 0.45, fatigue≥40 × 0.7
- Top 3 contributors are summed (capped 100)
- Recon niche modifier adds `delta × 4` to support score

**Output fields** (`RecruitmentScoutSupport`):

| Field | Formula |
| --- | --- |
| `supportScore` | Adjusted sum of top-3 contributions (0–100) |
| `reliabilityBonus` | `clamp(supportScore / 420, 0, 0.18)` |
| `costDiscount` | `min(6, round(supportScore / 20))` |
| `revealBoost` | `1` if supportScore ≥ 48, else 0 |
| `fieldReconCount` | Count of `field_recon` contributors |
| `investigatorCount` | Count of `investigator` contributors |
| `techCount` | Count of `tech` contributors |
| `leadRole` | Role of the top-scoring contributor |

---

## 5. Candidate Scouting Pipeline (`sim/recruitmentScouting.ts`)

### Stages

Candidates progress through up to 3 scouting stages. At stage 3, `exactKnown` becomes true and intel is confirmed.

### `assessCandidateScouting`

Returns `CandidateScoutAssessment` with `canScout`, `cost`, `nextStage`, and optional `reason`:

| Block reason | Condition |
| --- | --- |
| `missing_candidate` | Candidate not found in pool |
| `non_agent` | Candidate category is not `agent` |
| `intel_confirmed` | No next stage (already at confirmed) |
| `candidate_unavailable` | `isCandidateScoutable` returns false |
| `insufficient_funding` | `funding < cost` after cost discount |

Effective cost: `max(4, baseCost − scoutSupport.costDiscount)`.

### `scoutCandidate`

Pure state transition:

1. `evaluateRecruitmentScoutSupport` computes support from current agents
2. `revealCandidate(candidate, 1 + revealBoost)` advances reveal level
3. `buildCandidateScoutReport` generates a new scout report (using `reliabilityBonus`)
4. Event draft emitted: `scouting_initiated` (stage 1), `scouting_refined` (stage 2), or `intel_confirmed` (exact known)
5. `funding` decremented by cost; `rngState` advanced

---

## 6. Partial Intel Model

Before recon, all hidden modifiers are opaque. After `evaluateTeamCaseRecon`:

- `revealedModifierLabels` contains names of revealed factors
- `intelConfidence` is a value in `[0.18, 0.98]` — shown in the deployment readiness UI
- `scoreAdjustment` and `probabilityBonus` are only applied if recon was performed

Recon results are not stored in `GameState`. They must be recomputed each time the deployment panel is rendered. They are not persisted between weeks.

---

## 7. Integration Points

| Consumer | Usage |
| --- | --- |
| Deployment readiness / `tacticalAssessment.ts` | Calls `evaluateTeamCaseRecon` to compute pre-deployment intel summary |
| `sim/recruitmentScouting.ts` | Calls `evaluateRecruitmentScoutSupport` for cost discount and reveal boost |
| `recruitment/` | Calls `assessCandidateScouting` and `scoutCandidate` for candidate reveal |
| Encounter resolution (`scoutingResolution.ts`) | Called for direct contested scouting during mission |

---

## 8. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Re-running recon after agents change and discarding previous result | Recon is additive per-deployment — second-pass result should be compared, not overwritten blindly | Cache `CaseReconSummary` until team composition or case changes |
| Forgetting `availabilityMultiplier` when computing recruitment scout contribution | Assigned/fatigued agents inflate scouting estimates | Always route through `getRecruitmentScoutAvailabilityMultiplier` |
| Reading `reconScore` without checking `hiddenModifierCount > 0` | High `reconScore` on a case with no hidden modifiers yields `scoreAdjustment=0` | Always display alongside modifier counts |
| Treating `intelConfidence` as a percent — it is a ratio in `[0.18, 0.98]` | Showing `0.45` as "45%" is correct but `0.18` as "18%" may confuse users | Use a UI label like "Low / Medium / High" mapped from the value range |
| Applying `scoutCandidate` without calling `assessCandidateScouting` first | State mutation proceeds even if funding is insufficient | Gate on `assessment.canScout === true` before calling `scoutCandidate` |
| Assuming `spatialFlags` is always populated | `INGRESS_RECON_MODIFIERS` only match if the flag starts with `ingress:` | Always check flag presence before expecting ingress modifiers |
