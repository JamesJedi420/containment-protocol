# Mission Intake, Triage, & Routing Audit (Design Note)

> Scope: documentation-only support note for mission intake, triage, and routing behavior in Containment Protocol.
>
> Objective: define deterministic, bounded intake-to-deployment flow suitable for the core operations loop.

## 0) Canonical simulation state (SPE-16)

**Mission intake, triage, and routing are canonical simulation state**, not a disposable UI wizard. Priority scores, routing blockers, deferred queues, and assignment decisions are persisted (or safely derivable) inputs to the same weekly machine as escalation, scheduling, and outcome registration.

Front-end flows may _edit_ that state, but they do not _own_ it. Any architecture doc that still frames intake as “front-end orchestration” understates how tightly intake feeds **escalation pressure**, **scheduler cadence**, and **post-mission outcome bookkeeping**.

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

### Persisted authority mission-access boundary (SPE-2725)

A faction-linked, unassigned mission may consume one sanitized persisted authority edge after
candidate ranking:

- resolve the case faction through an authority node/alias or an explicit linked faction ID that
  has a live faction record
- consider explicit `mission_access` edges in deterministic code-unit ID order
- map the first eligible existing `deny` consequence to `blocked`
- map the first eligible existing `delay` consequence to `deferred`
- surface `authority-mission-access-restricted` without changing candidate scores, validity, or
  order
- prefer that mission-wide authority consequence over the generic no-eligible-team route when
  every ranked candidate is independently invalid

Missing/legacy graphs, missing faction or node references, positive grants, unrevealed hidden
claims, contradicted claims, resolved missions, and already-assigned missions retain the existing
route. The read seam is pure: persisted routing changes only through existing normalization or
recompute boundaries. At week-close, routing is recomputed after the authority graph mutation so
the next-week route agrees with the persisted post-mutation graph.

### Department capability ownership boundary (SPE-2083)

`resolveMissionIntakeDepartments` is a separate advisory read seam over the canonical case. It
derives a mission category with `deriveMissionCategory`, combines authored, required, and
preferred case tags, and delegates to the pure `departmentCapabilities.ts` registry/resolver:

- a primary owner must declare both the required capability and matching task type
- `support_only` and `denied` capability limits cannot silently become primary eligibility
- exact doctrine-tag fit ranks before reputation and funding; equal candidates use code-unit
  department ID order
- supporting departments cover secondary capabilities, then use doctrine, reputation, funding,
  and code-unit ID as deterministic ordering keys
- a capability gap produces an explicit authored fallback route with `lowPriority: true` and
  `capability-misfit` stigma instead of assigning an ineligible generic primary

The registry validates department IDs, capability/task/review vocabularies, numeric bands,
limits, fallback references, and authority identity conflicts. When an authority graph is
provided, department node IDs, aliases, and linked department IDs may resolve the same authored
definition; ambiguous aliases or multiple authored definitions for one authority node fail
closed. Missing legacy authority nodes do not invalidate an otherwise self-contained authored
pack.

This seam does not persist the ownership result and does not insert department fit into mission
triage, routing state, team readiness, or candidate scores/order. It also does not grant the
department-to-unit permission owned by SPE-2088.

### Cross-department coordination boundary (SPE-2084)

`evaluateMissionIntakeDepartmentCoordination` composes the SPE-2083 advisory assignment with
caller-owned ordered queue/capacity snapshots and delegates to the pure
`departmentCoordination.ts` evaluator:

- every assigned or fallback department requires exactly one valid snapshot with ordered,
  duplicate-free case IDs and non-negative integer weekly capacity
- custom fallback aliases and linked IDs are revalidated with the same authority graph used by
  SPE-2083 assignment resolution
- zero capacity, missing/malformed snapshots, duplicate department assignments, or unresolved
  authored definitions fail closed as `blocked`
- if the evaluated case is already queued, its existing position is used; otherwise it is
  evaluated as the next queue item
- departments work in parallel, so the maximum wait is the queue delay; equal bottlenecks use
  code-unit department ID order
- the exported `DEPARTMENT_DOCTRINE_CONFLICT_PAIRS` table is the bounded policy for which authored
  biases conflict; any matching pair produces `disputed`
- queue saturation, cooperation below the exported reputation threshold, or an explicit SPE-2083
  fallback adds delay; when no doctrine conflict exists, the outcome is `delayed`, while compatible
  work with available capacity is `aligned`
- structured reason codes and immutable inputs/results keep replay independent of caller ordering

This is a read seam, not a new queue owner. SPE-1028 owns any future durable department workshop
queues, enqueue/dequeue policy, capacity progression, and week-close advancement. SPE-1200 owns
interdisciplinary scientific model conflict, synthesis, and persisted case policy; SPE-2084 only
reports conflicts already implied by authored department doctrine. The evaluator does not read or
write the global case queue, mission routing state, team ranking, SPE-2088 authorization, or
SPE-95's global `coordinationFrictionActive` outcome-downgrade lane, so callers must not add the
SPE-2084 delay to SPE-95 as a second global penalty.

### Department-to-specialist-unit authorization boundary (SPE-2088)

`authorizeDepartmentUnitHandoff` composes the existing authority and specialist-unit owners
without inserting unit fit into canonical team candidate ranking:

- resolve one department authority node by node ID, alias, or linked department registry ID
- resolve one specialist-unit authority node by node ID, alias, or linked unit registry ID
- consume the first applicable sanitized `permission` edge in deterministic code-unit ID order
- require an active explicit grant plus `provenance.recorderId` as the approver
- derive the mission-fit packet from the canonical case plus validated unit registry
  (mission category, required tags, registry-recognized hazard/environment tags, region,
  departmental command, department authority tier, and required handoff), rejecting any
  mismatched caller assertion
- after the grant and approver are confirmed, clear only the satisfied handoff prerequisite
  and validate the target against the full specialist-unit mission-fit/lifecycle registry
- return an immutable audit record with mission scope, clearance, department, unit, approver,
  window, and permission-edge evidence

Missing or legacy graphs, missing references, invalid unit registries, hidden or contradicted
permission, denial, missing approver provenance, fractional or expired windows, mission-fit
assertion mismatch, and unavailable units fail closed. Contradiction is evaluated per edge so a
historical contradicted claim cannot suppress a separate current grant. The result is a pure
handoff decision, not a persisted handoff ledger: it does not change mission routing,
team-readiness math, candidate validity, scores, or ranking. Week changes are observed only
through the existing campaign week boundary.

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
- `authority-mission-access-restricted`
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
