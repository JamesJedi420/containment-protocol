# Deployment Readiness & Time-Cost Audit (Design Note)

> Scope: documentation-only support note for deployment readiness and time-cost behavior in Containment Protocol.
>
> Objective: define deterministic, bounded readiness and time-cost rules for assignment-to-resolution operations.

## 1) Deployment readiness categories

Use explicit finite readiness categories to keep assignment outcomes inspectable.

- **Mission-Ready**
  - Team/agent can deploy immediately with no hard blockers.
  - May still carry soft-risk penalties.

- **Conditionally Ready**
  - Deployable, but with explicit degradation (fatigue, cohesion strain, suboptimal loadout).

- **Temporarily Blocked**
  - Non-terminal blocker expected to clear (training lock, short recovery, cooldown lock).

- **Hard Blocked**
  - Cannot deploy due to hard requirements (missing coverage/cert/loadout gate, invalid team state).

- **Recovery Required**
  - Team is operationally unavailable until recovery threshold conditions are met.

Recommended: map category from deterministic state checks, never from opaque heuristics.

## 2) Recommended readiness state fields

Keep readiness state compact, canonical, and deterministic.

### Team-level readiness state

- `teamId`
- `readinessCategory` (`mission_ready | conditional | temporarily_blocked | hard_blocked | recovery_required`)
- `readinessScore` (bounded integer, e.g. 0–100)
- `hardBlockers[]` (code list)
- `softRisks[]` (code list)
- `coverageCompleteness` (required vs covered buckets)
- `cohesionBand`
- `minimumMemberReadiness`
- `averageFatigue`
- `estimatedDeployWeeks` (if staged prep/deploy model exists)
- `estimatedRecoveryWeeks`
- `computedWeek`

### Agent-level readiness snapshot (optional but useful)

- `agentId`
- `deployable` (boolean)
- `availabilityState` (`idle | assigned | training | recovering | unavailable`)
- `fatigue`
- `loadoutReadiness`
- `certificationReadiness`
- `trainingLockReason?`

### Time-cost state (mission-facing)

- `missionId`
- `plannedStartWeek`
- `expectedTravelWeeks` (if used)
- `expectedSetupWeeks`
- `expectedResolutionWeeks`
- `expectedRecoveryWeeks`
- `expectedTotalWeeks`
- `timeCostReasonCodes[]`

## 3) Time-cost dimensions and deterministic progression rules

Time cost should be additive, bounded, and source-attributable.

### Suggested dimensions

- **Travel / Mobilization cost**
  - Region or response posture-dependent.
- **Setup cost**
  - Team prep, loadout/cert readiness, coordination burden.
- **Execution duration**
  - Mission duration model (`durationWeeks`, stage pressure, kind).
- **Recovery tail**
  - Fatigue/stress after action and current attrition policy.

### Deterministic total model

$$
\text{expectedTotalWeeks} = \max(1, W_{travel} + W_{setup} + W_{exec} + W_{recovery})
$$

All components should be integer-clamped and computed from explicit state/config.

### Progression rules

- Recompute time-cost when key sources change:
  - assignment changes
  - team composition/readiness changes
  - mission stage/deadline/escalation changes
  - loadout/cert/training lock changes
- Keep per-week decay/progression deterministic and monotonic where intended.
- Never “skip” weeks through hidden corrections.

## 4) Gating rules for deployment eligibility

Deployment eligibility should return structured outputs, not a boolean only.

### Hard gates (must pass)

- Required coverage buckets satisfied.
- Required tag/cert/loadout gates satisfied.
- Team state compatible with deploy (`ready`/eligible transition).
- No blocking training/recovery status among required members.
- Mission routing state allows assignment/launch.

### Soft gates (allow with penalties)

- Low cohesion band (`unstable`/`fragile`).
- High fatigue burden.
- Weakest-link risks (minimum member readiness below threshold).
- Optional strategic mismatch (e.g., suboptimal category fit).

### Structured eligibility output (recommended)

- `eligible` (boolean)
- `hardBlockers[]`
- `softRisks[]`
- `timeCostSummary`
- `weakestLinkContributors[]`
- `explanationNotes[]`

## 5) Integration guidance

### Recruitment

- Staffing advisories should reference readiness deficits and predicted time-cost pressure.
- Candidate priority can include “time-cost debt relief” opportunities.

### Loadouts

- Loadout readiness contributes to setup weeks and hard blockers.
- Missing gated equipment/certs should surface explicit blocker codes.

### Training

- Training lock states must hard-block deployment where relevant.
- Completion events should trigger readiness/time-cost recomputation.

### Teams

- Team composition/cohesion model should feed readiness category and weakest-link penalties.
- Team FSM state transitions should remain explicit and deterministic.

### Mission routing

- Routing should consume readiness eligibility and time-cost estimates.
- Candidate ranking should include readiness fitness + fatigue/time burden tie-breaks.

### Escalation

- Escalation and deadline pressure should increase urgency and potentially setup burden.
- If deployment blocked under high pressure, emit explicit escalation risk notes.

### Recovery

- Recovery windows should be deterministic outputs of fatigue/stress/attrition policy.
- No silent auto-reset from `recovering` to `ready`; require explicit threshold pass.

### Save/load

- Persist canonical source state (team/agent/mission assignment and relevant readiness sources).
- Derived readiness/time-cost summaries may be recomputed; if persisted, validate/clamp on hydrate.

### Overlay/debug

Expose concise diagnostics:

- readiness category counts
- blocked teams and blocker codes
- average/lowest readiness
- top time-cost missions and reason codes
- expected recovery backlog

### Stability checks

Recommended invariants:

- impossible team status + assignment combinations
- readiness category inconsistent with blocker sets
- missing references in assigned teams/missions
- stale cert/loadout gates still treated as valid
- negative/invalid expected week values
- queue/order instability after restore

## 6) Common pitfalls

- **Opaque readiness score**
  - A single score with no blocker/risk decomposition is hard to debug.

- **Hidden auto-corrections**
  - Silent status flips break determinism and testability.

- **Double-counting fatigue/time cost**
  - Applying both setup and execution penalties for same source without caps.

- **Gate inconsistency across layers**
  - Routing allows assignment that deployment eligibility later rejects.

- **Unbounded penalties**
  - Time-cost inflation spirals if per-week/per-dimension caps are missing.

- **Persistence drift**
  - Restored state uses stale derived readiness not matching canonical sources.

## 7) Open questions

- Should readiness category be team-only, agent-only, or dual with explicit reconciliation rules?
- What hard threshold should distinguish `temporarily_blocked` vs `recovery_required`?
- Should travel/mobilization cost be explicit in current map abstraction or deferred?
- Which soft risks should remain informational versus score-impacting in MVP?
- Should recovery tail be mission-kind dependent (`case` vs `raid`) by default?
- What recomputation cadence is preferred: event-driven only, weekly pass, or hybrid?
- Which readiness/time-cost fields should be persisted vs recomputed on load?
