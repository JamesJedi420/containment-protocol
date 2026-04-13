# Mission Intake, Triage, & Routing Audit (Design Note)

> Scope: documentation-only support note for mission intake, triage, and routing behavior in Containment Protocol.
>
> Objective: define deterministic, bounded intake-to-deployment flow suitable for the core operations loop.

## 1) Mission categories

Use a compact finite taxonomy so routing logic remains explicit and debuggable.

- **Containment Breach**
  - Immediate stabilization/containment priority.
  - Often high threat and short deadline windows.

- **Investigation Lead**
  - Evidence chain progression and anomaly source validation.
  - Can convert to breach if unresolved.

- **Civilian/Infrastructure Incident**
  - Social, public-facing, or facility-risk scenarios.
  - May require liaison and support-heavy teams.

- **Faction/Hostile Activity**
  - Adversarial action requiring tactical/information response.
  - Can include raid-style escalation paths.

- **Strategic Opportunity / Optional Contract**
  - Reward-oriented, lower urgency missions.
  - Routed by fit and capacity, not pure urgency.

Recommended: each mission carries `category` and `kind` (`case|raid`) to avoid hidden inference.

## 2) Recommended mission state fields

Keep state compact, canonical, and save/load safe.

### Core mission fields

- `missionId`
- `templateId`
- `category`
- `kind` (`case | raid`)
- `status` (`open | in_progress | resolved`)
- `generatedWeek`
- `deadlineRemaining`
- `durationWeeks`
- `weeksRemaining?`
- `stage`
- `difficulty` (stat block)
- `weights` (stat weight block)
- `requiredRoles[]` (coverage buckets)
- `requiredTags[]`
- `preferredTags[]`
- `assignedTeamIds[]`

### Intake/triage metadata (recommended)

- `intakeSource` (`scripted | escalation | pressure | faction | contract | tutorial`)
- `priority` (`critical | high | normal | low`)
- `priorityReasonCodes[]`
- `triageScore`
- `routingState` (`queued | shortlisted | assigned | deferred | blocked`)
- `routingBlockers[]` (explicit reasons)

### Optional bounded routing audit payload

- `lastTriageWeek?`
- `lastRoutedWeek?`
- `lastCandidateTeamIds[]`
- `lastRejectedTeamIds[]` with compact reasons

## 3) Intake sources and deterministic generation guidance

Intake should be deterministic from explicit inputs, never hidden RNG-only branching.

### Intake sources

- **Authored/scripted intake**
  - Story and one-shot front-desk content.

- **Escalation-driven intake**
  - Existing mission stage/deadline triggers spawn follow-ups.

- **Pressure pipeline intake**
  - Global pressure thresholds add incidents.

- **Faction/contract intake**
  - Availability and standing-based opportunities.

- **System/tutorial intake**
  - Onboarding and checkpoint missions.

### Deterministic generation guidance

- Use seeded RNG only where randomness is intentionally part of design.
- Keep generation as a pure function of:
  - current week
  - current state snapshot
  - seeded random source
  - explicit config thresholds
- Ensure stable ordering of generated mission IDs and queue insertion.
- Return deterministic generation notes/reason codes for debug/reporting.

## 4) Triage priority rules and routing rules

Triage should produce structured, inspectable outputs.

### Suggested triage score dimensions

$$
\text{triageScore} = \operatorname{clamp}(U + T + E + S - C,\;0,\;100)
$$

Where:

- $U$ = urgency (deadline + stage pressure)
- $T$ = threat/severity contribution
- $E$ = escalation risk if delayed
- $S$ = strategic value/reward importance
- $C$ = capacity penalty (team/resource congestion)

### Priority band mapping (example)

- `critical`: score $\ge 80$
- `high`: $60 \le$ score $< 80$
- `normal`: $35 \le$ score $< 60$
- `low`: score $< 35$

### Routing rules

- Mission must pass minimum routing prerequisites before assignment shortlist:
  - required coverage buckets
  - required tags/certs/loadout gates
  - deployable team availability
- Build candidate teams with deterministic ranking tie-breaks:
  1. higher validation completeness
  2. higher cohesion/readiness fitness
  3. lower fatigue/time burden
  4. lexical team ID
- If no candidate is valid:
  - keep mission in queue with explicit blocker codes
  - do not auto-assign or silently mutate constraints

## 5) Team-readiness and time-pressure integration guidance

### Team-readiness integration

Routing should consume explicit readiness surfaces, not inferred hidden scores.

- Composition validity
- Cohesion band and weakest-link penalties
- Training/deployment lock states
- Certification and loadout gate compliance
- Minimum member readiness threshold

### Time-pressure integration

- Deadline and stage should directly influence triage score.
- High-pressure missions should raise routing urgency but still require hard validation.
- If pressure exceeds threshold and no valid routing exists, emit explicit escalation/defer reason.

### Recommended explicit routing blockers

- `missing-coverage`
- `training-blocked`
- `invalid-loadout-gate`
- `missing-certification`
- `fatigue-over-threshold`
- `no-eligible-teams`
- `capacity-locked`

## 6) Integration guidance

### Recruitment

- Intake and triage should surface staffing/role deficits to recruitment advisories.
- Funnel outputs can reduce routing blockers over future weeks.

### Loadouts

- Mission tags/requirements should validate against role/loadout compatibility and cert gates.
- Missing gear/cert should surface as explicit route blockers, not hidden score penalties only.

### Training

- Training-locked agents reduce available team eligibility.
- Triage should account for near-future availability windows deterministically where supported.

### Teams

- Routing consumes team composition/cohesion validation summaries.
- Best-available-team helpers should reuse canonical deterministic tie-breaks.

### Deployment

- Assignment must remain explicit action; no hidden auto-reassignment.
- Team FSM state should remain consistent (`ready/deployed/resolving/recovering`).

### Escalation

- Deferred/unrouted missions should feed escalation logic with explicit unresolved causes.
- Escalation-triggered missions should preserve source linkage for auditability.

### Save/load

- Persist canonical mission queue/order and mission state.
- Derived triage/routing summaries may be recomputed; if stored, validate and clamp.
- Never silently drop unknown references; surface warnings/stability issues.

### Overlay/debug

Expose compact panels for:

- intake source counts
- triage band counts
- blocked route reasons
- candidate team shortlist summaries
- unresolved time-pressure risks

### Stability checks

Recommended invariants:

- stale mission/template references
- impossible status combinations
- assigned teams missing/invalid
- routing blockers inconsistent with current validation state
- expired certifications still treated as valid routing gates
- queue ordering duplicates/instability after restore

## 7) Common pitfalls

- **Priority inflation drift**
  - Too many missions marked critical, collapsing decision quality.

- **Opaque routing heuristics**
  - Hard-to-debug “magic score” without reason codes.

- **Silent fallback assignment**
  - Hidden auto-routing creates inconsistent state and poor traceability.

- **Gate mismatch across systems**
  - Routing ignores cert/loadout/training blockers enforced later at deploy time.

- **Queue instability**
  - Non-deterministic ordering causes flaky outcomes and test drift.

- **Persistence blind spots**
  - Save/load restores missions but loses triage/routing context needed for diagnostics.

## 8) Open questions

- Should triage be recomputed every week for all open missions, or only dirty/changed missions?
- Which blockers are hard gates vs soft penalties at routing time?
- Should near-expiry missions reserve team capacity deterministically?
- How should optional contract missions compete against emergency incidents?
- What is the canonical escalation policy when no team can satisfy required coverage?
- Should routing support a deterministic defer queue with explicit revisit ETA?
- Which triage/routing fields should be persisted vs recomputed on hydrate?
