# Team Composition & Cohesion Audit (Design Note)

> Scope: documentation-only support note for Team Composition & Cohesion behavior in Containment Protocol.
>
> Objective: define a deterministic, bounded team composition and cohesion model for the core operations loop.

## 1) Team categories and role coverage expectations

Use compact team archetypes with explicit role coverage expectations, not freeform buildcraft.

### Recommended team categories

- **Containment Strike Team**
  - Priority: containment + tactical reliability.
  - Typical roles: `hunter`, `occultist`, `tech`, `medic`.

- **Investigation Cell**
  - Priority: evidence throughput + anomaly interpretation.
  - Typical roles: `investigator`, `field_recon`, `tech`, `medium`.

- **Liaison & Stabilization Unit**
  - Priority: social control + civilian/system stability.
  - Typical roles: `negotiator`, `medic`, `medium`, `investigator`.

- **Balanced Rapid Response Team**
  - Priority: broad minimum-viable coverage across all domains.
  - Typical roles: one tactical anchor + one investigation anchor + one support anchor + flex.

### Role coverage expectations (deterministic)

At minimum, each deployable team should satisfy explicit coverage buckets:

- **Containment capability** (occult/stability/technical anomaly handling)
- **Investigation capability** (analysis/evidence progression)
- **Tactical capability** (threat handling and response tempo)
- **Support capability** (medical/social/recovery support)

Recommended: expose “coverage met/missing” as booleans and IDs for validation/debug.

## 2) Recommended team state fields

Keep team state compact, inspectable, and persistence-safe.

### Team composition fields

- `teamId`
- `teamName`
- `category` (optional authored or derived label)
- `memberIds[]`
- `leaderId?`
- `reserveMemberIds[]` (optional if benching/rotation exists)
- `assignedCaseId?`
- `status` (`ready | deployed | resolving | recovering`)

### Composition-validation fields (derived or cached)

- `requiredCoverageRoles[]`
- `coveredRoles[]`
- `missingRoles[]`
- `compositionValid` (boolean)
- `validationIssues[]` (bounded code list)

### Cohesion fields (deterministic summary)

- `cohesionScore` (normalized bounded score)
- `cohesionBand` (`fragile | unstable | steady | strong`)
- `chemistryScore`
- `coordinationScore`
- `trustScore`
- `fatiguePenalty`
- `cohesionFlags[]` (e.g., `low-trust-pair`, `leader-gap`, `fatigue-overload`)

## 3) Cohesion dimensions and scoring ideas

Use additive bounded dimensions with explicit caps.

### Suggested dimensions

- **Chemistry**
  - Based on pairwise relationship values and trained-bond depth.
- **Coordination**
  - Based on team drills, repeated co-deploy history, role complementarity.
- **Trust/Stability**
  - Based on betrayal/disciplinary markers, conflict history, recovery integrity.
- **Strain Penalty**
  - Fatigue load, recent casualties, unresolved conflict markers.

### Example scoring structure (deterministic)

$$
\text{cohesionScore} = \operatorname{clamp}(\text{chemistry} + \text{coordination} + \text{trust} - \text{strainPenalty},\;0,\;100)
$$

Where each component is itself clamped and derived from explicit sources only.

### Guidance

- Prefer piecewise-linear functions over opaque heuristics.
- Keep pairwise contribution symmetric and deterministic.
- Cap per-pair and per-week effects to avoid runaway feedback loops.

## 4) Deterministic composition and validation rules

Validation should return structured outcomes, not booleans alone.

### Recommended validation checks

- Empty team / no active members.
- Missing required coverage buckets.
- Too many unavailable members (`training`, `recovering`, `dead`, etc.).
- Leader invalidity (leader not in team, leader unavailable).
- Duplicate agent across teams (if disallowed by model).
- Team-level lock violations (e.g., attempting deploy while blocked by training states).

### Suggested result shape

- `valid`
- `requiredRoles[]`
- `coveredRoles[]`
- `missingRoles[]`
- `activeMemberIds[]`
- `inactiveMemberIds[]`
- `trainingMemberIds[]`
- `issues[]` (`code`, `detail`)

### Deterministic tie-breaking

When selecting best available team:

1. Higher validation completeness.
2. Higher cohesion score.
3. Lower fatigue burden.
4. Stable lexical tie-break (`teamId`).

## 5) Readiness and weakest-link implications

### Readiness implications

- Team readiness should include both composition validity and cohesion integrity.
- A composition-valid team can still be readiness-risky if cohesion is fragile.

### Weakest-link implications

- Mission success should remain sensitive to weakest-link constraints.
- Suggested bounded penalty model:
  - missing coverage role -> explicit penalty bucket
  - low minimum member readiness -> explicit penalty bucket
  - cohesion fragile band -> explicit penalty bucket

Keep weakest-link penalties explicit in output explanations to preserve debuggability.

## 6) Integration guidance

### Recruitment

- Candidate funnel outcomes should help fill known coverage gaps (advisory surface).
- Hiring should trigger deterministic recomputation of team composition opportunities.

### Training

- Team drills should improve coordination/chemistry dimensions in bounded steps.
- Certification can satisfy specific role coverage gates for advanced operations.

### Loadouts

- Role/certification-gated loadouts should influence readiness/cohesion indirectly (through readiness and reliability), not via hidden modifiers.
- Surface “missing cert for critical loadout” as explicit readiness issue.

### Deployment

- Deployment gating must combine composition validity + availability + readiness/cohesion thresholds.
- No silent auto-reassignment when deployment fails validation.

### Mission resolution

- Composition and cohesion should appear as explicit deterministic modifiers in score breakdowns.
- Preserve fixed modifier order for reproducibility.

### Attrition and replacement pressure

- Attrition should explicitly degrade role coverage and cohesion dimensions.
- Replacement planning should surface “coverage debt” and “cohesion debt” separately.

### Save/load

- Persist canonical team membership and core relationship/training/cert sources.
- Derived cohesion summaries may be recomputed; if persisted, validate and clamp on hydrate.
- Never silently fabricate missing relationship/cert records.

### Overlay/debug visibility

Expose compact team diagnostics:

- coverage satisfied/missing
- cohesion band + component scores
- blocked reasons and weakest-link contributors
- top risk pairs/flags

### Stability checks

Recommended invariants:

- team references unknown member IDs
- leader not in team
- duplicate membership conflicts (if prohibited)
- impossible status combinations (`deployed` with no assigned case)
- cohesion summary inconsistent with source state (if cached)
- expired certifications still counted toward coverage gates

## 7) Common pitfalls

- **Over-coupled scoring**
  - Composition and cohesion entangled into one opaque number; hard to debug.

- **Unbounded pair effects**
  - Repeated team drills inflate chemistry without clamp controls.

- **Hidden auto-corrections**
  - Silent role substitutions or auto-leader swaps hide state errors.

- **Coverage oversimplification**
  - Treating “any high stat” as full role coverage can break operational identity.

- **Stale derived snapshots**
  - Cached readiness/cohesion not refreshed after roster/training/loadout changes.

- **Persistence drift**
  - Save-load restores teams but not supporting state needed to validate cohesion/readiness.

## 8) Open questions

- Should team category be authored, derived, or hybrid?
- What minimum deployable team size should be hard-gated per operation kind?
- Should cohesion decay passively when teams are idle/rotated, or only via explicit events?
- How strongly should certification count toward role coverage vs being a separate gate?
- Should weakest-link penalties cap per operation to prevent deterministic over-punishment?
- Should duplicate agent membership across teams be hard-invalid or soft-warning in MVP?
- Which cohesion details are persisted vs recomputed on load for best stability/performance?
