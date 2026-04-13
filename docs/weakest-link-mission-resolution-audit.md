# Weakest-Link Mission Resolution Audit (Design Note)

> Scope: documentation-only support note for weakest-link mission resolution behavior in Containment Protocol.
>
> Objective: define deterministic, bounded weakest-link logic that remains explainable across mission resolution, readiness, and recovery systems.

## 1) Resolution categories

Use a compact set of categories so weakest-link behavior remains predictable and testable.

- **Clean Success**
  - Mission objectives achieved with no meaningful weakest-link degradation.
  - Weakest-link penalties either absent or fully offset by team resilience.

- **Strained Success**
  - Mission succeeds, but weakest-link penalties materially increase injuries/fatigue/recovery tail.
  - Useful when score clears success threshold but operational debt is non-trivial.

- **Partial Success**
  - Core objective is mixed: some progress achieved, but unresolved risk remains.
  - Weakest-link contribution is significant and should be surfaced in reasons.

- **Failure**
  - Mission objective not achieved.
  - Weakest-link pressure contributes to failure margin and post-mission fallout.

- **Failure with Recovery Pressure**
  - Failure plus elevated recovery burden (injury/fatality risk, deployment lock pressure, backlog impact).
  - Should be treated as an escalation-sensitive terminal state for planning.

Recommended: keep outcome labels stable while using structured reason codes for finer detail.

## 2) Recommended canonical resolution state and result fields

Keep weakest-link outputs explicit and source-attributable.

### Resolution result envelope

- `missionId`
- `week`
- `outcomeCategory` (`clean_success | strained_success | partial | failure | failure_recovery_pressure`)
- `resultKind` (`success | partial | fail`) for compatibility with existing summary surfaces
- `baseScore`
- `requiredScore`
- `finalDelta`

### Weakest-link breakdown fields

- `weakestLinkTotalPenalty`
- `weakestLinkPenaltyBuckets[]` with compact records:
  - `code` (e.g., `missing-coverage`, `low-min-readiness`, `fragile-cohesion`, `loadout-gate-miss`, `training-lock-pressure`)
  - `weight`
  - `rawSignal`
  - `appliedPenalty`
- `weakestLinkContributors[]` (agent/team IDs or role bucket IDs)
- `weakestLinkNarrativeReasonCodes[]`

### Post-resolution pressure fields

- `injuryRiskDelta`
- `fatalityRiskDelta`
- `expectedRecoveryWeeksDelta`
- `recoveryPressureBand` (`low | moderate | high | severe`)
- `deploymentDebtSignals[]` (e.g., `capacity-locked`, `recovery-required`, `no-eligible-teams`)

### Optional debug/overlay fields

- `penaltyComputationVersion`
- `orderedPenaltyApplication[]` (deterministic order trace)
- `cappedPenalties[]` (for transparency when clamps applied)

## 3) Weakest-link penalty sources and deterministic weighting guidance

Penalty sources should be finite, additive, and capped.

### Recommended source families

- **Coverage gaps**
  - Missing required mission roles/capability buckets.
- **Minimum member readiness floor**
  - Lowest deployable readiness drives reliability drag.
- **Cohesion fragility**
  - Fragile/unstable cohesion introduces execution volatility.
- **Training lock pressure**
  - Critical members unavailable due to training/recovery lock states.
- **Loadout/cert gate misses**
  - Required tags/cert/loadout constraints unmet.
- **Fatigue concentration**
  - One or more high-fatigue members creating failure-prone weak points.

### Deterministic weighting guidance

Use ordered, bounded additive weights:

$$
P_{weak} = \operatorname{clamp}\left(\sum_i w_i \cdot s_i,\;0,\;P_{max}\right)
$$

Where:

- $s_i$ = normalized source signal in $[0,1]$
- $w_i$ = fixed source weight from config/policy
- $P_{max}$ = global cap to prevent runaway penalties

Recommended policy constraints:

- Fixed source order (e.g., coverage -> readiness floor -> cohesion -> training/loadout/cert -> fatigue)
- Per-source cap + global cap
- No random contribution in weakest-link computation
- Stable tie-break rules when multiple contributors share same severity (lexical ID order)

## 4) Partial success / failure / recovery-pressure outcome rules

Map weakest-link severity into outcome semantics explicitly.

### Partial success rules

- Trigger when final score misses full success but remains above failure floor.
- Require at least one unresolved mission objective or persistent risk marker.
- Always include weakest-link reason codes if $P_{weak} > 0$.

### Failure rules

- Trigger when final score falls below failure threshold.
- Attribute failure margin into:
  - `base deficit`
  - `weakest-link contribution`
- Avoid opaque “failed due to low score” summaries; require structured cause split.

### Recovery-pressure rules

Promote failure to `failure_recovery_pressure` when any hold:

- `injuryRiskDelta` or `fatalityRiskDelta` exceeds configured high-risk band
- expected recovery tail exceeds configured threshold
- post-resolution availability projects capacity lock for critical missions

Recommended pressure classification:

- `low`: routine post-op recovery
- `moderate`: noticeable deployment drag
- `high`: multi-week operational debt
- `severe`: escalatory readiness crisis potential

## 5) Integration guidance

### Readiness

- Consume readiness category and hard-blocker surfaces as weakest-link inputs.
- Do not duplicate eligibility logic; reference canonical readiness outputs.

### Team cohesion

- Treat fragile/unstable cohesion as explicit penalty sources, not hidden multipliers.
- Keep cohesion-to-penalty mapping bounded and explainable.

### Training

- Training lock and cert progression states should be explicit contributor codes.
- Completed training/cert events should trigger deterministic recomputation.

### Loadouts

- Required loadout/cert tag misses should map to hard or heavy weakest-link penalties.
- Preserve slot/role/prerequisite validation outputs as source evidence.

### Mission routing

- Candidate ranking should include weakest-link penalty as a deterministic tie-break dimension.
- Routing blockers and resolution weakest-link reasons should share code vocabulary where possible.

### Escalation

- Failure + high recovery pressure should feed escalation risk notes directly.
- Avoid hidden escalation jumps not backed by structured pressure signals.

### Recovery

- Convert pressure signals into expected recovery tail deltas explicitly.
- No silent “auto-heal” transitions to ready; require thresholded recovery pass.

### Save/load

- Persist canonical source state (not only derived weakest-link totals).
- If derived fields are persisted, validate/clamp/recompute on hydrate.

### Overlay/debug

Expose compact weakest-link diagnostics:

- total penalty
- penalty buckets with weights/signals
- top contributors
- outcome category + pressure band
- recovery tail deltas

### Stability checks

Recommended invariants:

- weakest-link penalty present but no source buckets
- outcome category inconsistent with final delta/pressure fields
- invalid/negative penalty weights after hydrate
- recovery-pressure category without elevated pressure signals
- stale contributor IDs in persisted weakest-link records

## 6) Common pitfalls

- **Opaque blended scoring**
  - Weakest-link effects disappear inside one monolithic score.

- **Double-counting penalties**
  - Same source applied in readiness, routing, and resolution without caps.

- **Randomized weakest-link behavior**
  - Nondeterministic penalties break reproducibility and tests.

- **Unbounded fatigue amplification**
  - High-fatigue weak member causes runaway collapse without clamps.

- **Inconsistent source vocabularies**
  - Different blocker/penalty code systems across modules reduce debuggability.

- **Persistence drift**
  - Stored weakest-link summaries no longer match canonical source state after load.

- **Silent recovery pressure promotion**
  - Failure escalates to severe without explicit pressure evidence.

## 7) Open questions

- Should weakest-link be computed at agent-granularity only, or include team-level synthetic contributors?
- What global cap should apply to weakest-link penalties relative to base mission delta?
- Should strained success be first-class in player-facing UI, or debug-only while outcome remains `success`?
- Which source families are hard-gating vs penalty-only in MVP?
- How should multi-team raids aggregate weakest-link contributors (min-team, weighted-average, or mixed policy)?
- Should weakest-link traces be persisted for QA reproducibility, or recomputed-only diagnostics?
- Do we want static policy weights or configurable per mission category/kind?
