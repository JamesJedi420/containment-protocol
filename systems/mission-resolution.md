# Containment Protocol — Mission Resolution Spec

## Purpose

This document defines the mission resolution system for Containment Protocol.

Mission resolution is the deterministic process that converts:

- incident state
- team composition
- readiness
- gear
- support condition
- specialist bottlenecks
- knowledge/intel quality
- escalation
- other relevant campaign pressures

into:

- operational outcomes
- follow-through quality
- fallout
- recovery burden
- campaign consequences
- surfaced report explanations

This spec is intended to guide:

- implementation
- tuning
- UI surfacing
- test planning
- content authoring boundaries

---

## Design goals

Mission resolution should:

- be deterministic
- remain bounded and legible
- reflect campaign preparation, not just mission-local inputs
- reward good institutional setup
- expose bottlenecks clearly
- support partial success and meaningful fallout
- preserve consequence continuity between weeks

Mission resolution should not:

- become a full tactical combat game
- rely on opaque randomness as primary drama
- duplicate logic in UI or reports
- collapse all outcomes into simple pass/fail
- require constant manual micro-resolution for each sub-step

---

## What a mission is

A mission is a bounded operational response to an incident or opportunity.

A mission is not:

- the incident itself
- the whole week
- a freeform tactical encounter sim
- a pure narrative vignette

A mission is the game’s operational execution unit.

---

## Resolution philosophy

Containment Protocol should use **deterministic graded resolution**.

**Weakest-link resolution (SPE-18)** is the **canonical bounded mission-outcome mechanism** wired into the weekly simulation loop. Mission types share this surface instead of bespoke per-template resolution silos; differences express through inputs, tags, and consequence ladders — not alternate outcome engines.

That means:

- outcomes are caused by state, not primarily by random rolls
- weak preparation produces predictable degradation
- strong preparation produces predictable improvement
- outcomes should be interpretable after the fact

**Canonical player-facing resolution** uses **four states** — `clean`, `degraded`, `partial`, `failed` — defined under **§3.1 Mission outcome** (resolution state mapping). Pipeline stages may still use `result` + `followThrough`; the four states are the stable contract for fallout selection, reports, and tuning crosswalks to `tuning/escalation-and-fallout.md` §4.

The game becomes interesting because:

- capacity is limited
- information is partial
- risks compete
- weak points matter
- every week carries forward consequences

---

# 1. Mission resolution inputs

## 1.1 Incident inputs

Mission resolution reads incident-side state such as:

- severity
- escalation level
- threat category
- site/location traits
- time pressure
- tags/conditions
- whether intel is partial or misleading
- any special domain flags

These define what kind of problem the team is attempting to answer.

---

## 1.2 Team inputs

Mission resolution reads team-side state such as:

- assigned team
- team cohesion
- effective readiness
- role coverage
- certifications
- injuries / trauma / fatigue
- responder energy reserve and exertion debt
- current deployment burden if relevant

These define whether the field unit can execute the mission reliably.

---

## 1.3 Operative inputs

If resolution looks below the team level, it should do so through bounded aggregate logic.

Examples:

- weakest readiness among required roles
- missing certification coverage
- critical loadout gap
- injury penalty on a required role
- overdrawn responder energy converting into physical fatigue burden

The system should avoid broad per-person action scripting.

---

## 1.4 Equipment inputs

Mission resolution may consider:

- role-specific loadouts
- required gear presence/absence
- degraded or unavailable gear
- large asset or platform availability
- hidden-state / special-domain tools

Equipment should matter as a real capability gate or modifier, not just as flavor.

---

## 1.5 Support and specialist inputs

Mission resolution should read institutional non-field state where appropriate:

- support capacity
- support shortage
- maintenance bottlenecks where relevant
- future command coordination friction
- specialist bottlenecks tied to the mission domain

This preserves the agency-first design:
field outcomes are partly shaped by whether the institution can sustain them.

---

## 1.6 Knowledge and intel inputs

Mission resolution should account for:

- known vs unknown threat state
- recon/scouting quality
- confidence level of available intel
- misinformation / partial knowledge
- visibility constraints

This is how pre-mission information affects outcome quality.

---

## 1.7 Global pressure inputs

Mission resolution may also read:

- overall overload
- time pressure
- faction pressure
- legitimacy constraints
- unresolved incident load
- recent losses or recovery backlog if they affect readiness/follow-through

These should be bounded and explicit, not diffuse hidden penalties.

---

# 2. Resolution stages

Mission resolution should be treated as a staged deterministic pipeline.

## Stage A — Mission eligibility / routing validity

Check whether the mission can meaningfully proceed.

Example checks:

- team assigned
- minimum readiness threshold met
- mandatory role or certification present
- route/site not blocked by missing access
- required asset available

If this stage fails:

- mission may not deploy
- or it may auto-deploy with severe degradation if explicitly allowed

Output:

- valid
- invalid
- deployable under degraded conditions

**UI pre-resolution posture:** The five deployment commitment postures in `ux/deployment-flow.md` §7 map onto these three outputs; use that table as the canonical crosswalk.

---

## Stage B — Operational strength evaluation

Estimate the mission’s effective execution quality.

This should combine:

- team readiness
- role coverage
- gear adequacy
- intel quality
- support quality
- specialist contributions
- domain modifiers
- pressure penalties

The evaluation should remain explainable.

The result does not have to be shown as a raw score to the player, but the game should be able to explain what mattered.

---

## Stage C — Weakest-link / bottleneck check

Containment Protocol already points toward weakest-link logic. Treat this stage as the **primary bounded resolution surface** integrated with readiness, intel, pressure, and attrition — not an optional flavor layer.

This stage identifies whether one limiting factor drags the mission down.

Common bottlenecks:

- missing role
- low readiness operative in a critical slot
- absent equipment requirement
- support shortfall
- coordination overload
- unrecovered key asset
- inadequate intel

This stage should matter heavily enough that institutional neglect is felt, but not so heavily that every mission becomes binary.

---

## Stage D — Outcome band selection

Based on the evaluated mission condition, assign the mission to an outcome band (`result`: success / partial / fail) and derive the **canonical four-state** `resolutionState` (see **§3.1** resolution mapping).

Also track where applicable:

- clean vs degraded follow-through (`followThrough`)
- on **`failed`**, **`escalationActive: boolean`** — `false` = failure with containment (tuning §4.4), `true` = escalating failure (tuning §4.5); omit or ignore when not `failed`
- low vs high fallout (density tags)

This keeps **five fallout-quality profiles** in tuning mapped from **four resolution states** plus one boolean, without a fifth top-level resolution enum.

**Deterministic defaults for `escalationActive` when `result === 'fail'`:** set `escalationActive = true` if any of: post-resolution incident escalation band increases; unresolved spillover or chain flags set; district visibility or legitimacy crosses a configured “public breach” threshold; coordinated multi-system pressure flags from weekly aggregation. Otherwise `escalationActive = false`. Exact thresholds live with escalation and pressure tuning; the rule is **the same weekly inputs yield the same boolean**.

---

## Stage E — Follow-through evaluation

Follow-through is separate from initial success.

A team might:

- succeed but fail to fully stabilize the situation
- partially succeed and leave a degraded containment state
- fail cleanly without catastrophe
- fail badly and escalate pressure

This is the right place for:

- support shortage effects
- specialist bottlenecks
- future coordination friction
- delayed recovery burdens
- collateral or time-cost amplification

---

## Stage F — Fallout application

Mission fallout should update campaign state.

### Collateral, spillover, and self-failure (SPE-55)

Dangerous or high-energy procedures can open **collateral channels** (bystanders, allies, structures, ecosystems) and **self-failure channels** (operator harm, tool destruction, containment breach) that are not reducible to “missed the primary target.” Model **direct-plus-collateral hazard footprints**, situational modifiers for spillover severity, **public deniability cost**, and durable **ecological or infrastructural aftermath** when outputs are large enough to matter.

Possible fallout domains:

- operative injury / trauma
- equipment damage
- time loss
- incident escalation
- collateral risk
- legitimacy damage
- faction reaction
- support strain
- recovery queue burden
- future opportunity changes

Not every mission should create fallout, but fallout should be common enough that “barely succeeded” feels materially different from “clean success.”

---

## Stage G — Surface explanation output

After outcome and fallout are determined, the game should produce player-facing explanation. Explanations are **computed on demand** from canonical mission + weekly state via domain helpers and projections (see `docs/visibility-layer-audit.md`, SPE-24); they are **not** a second persisted narrative ledger.

Examples:

- weak certification coverage degraded mission follow-through
- support shortage delayed clean containment
- coordination overload reduced operational coherence
- incomplete recon caused avoidable exposure
- maintenance bottleneck delayed post-mission recovery

Reports and UI should surface these from **domain events and deterministic helpers**, not ad hoc string generation in components.

Canonical surfacing for this layer should flow through the shared rules
substrate and report-note helpers:

- shared outcome, consequence, modifier, and distortion interpretation belongs
  in `src/domain/shared/**`
- report-note and outcome-band wording belongs in `src/domain/reportNotes.ts`
- strategic cadence, threshold, and pressure summaries belong in
  `src/domain/strategicState.ts`
- report and UI surfaces should render those outputs rather than restating the
  same logic locally

---

# 3. Canonical outputs

Mission resolution should produce or update the following canonical outputs:

## 3.1 Mission outcome

Example conceptual shape:

```ts
interface MissionOutcome {
  result: 'success' | 'partial' | 'fail'
  followThrough: 'clean' | 'degraded' | 'broken'
  /** Canonical four-state resolution for fallout + UI (derive from result + followThrough; see §3.1 mapping). */
  resolutionState: 'clean' | 'degraded' | 'partial' | 'failed'
  /** Meaningful only when resolutionState === 'failed' (or result === 'fail'): escalating vs contained failure. */
  escalationActive?: boolean
  primaryReason?: string
  falloutTags?: string[]
}
```

#### Canonical four-state resolution and fallout bucket mapping

**Four resolution states** (no fifth enum at this layer):

| `resolutionState` | Typical source (`result` / `followThrough`) |
| --- | --- |
| `clean` | `success` + `clean` |
| `degraded` | `success` + `degraded` or `broken` (primary objective still met; institution paid) |
| `partial` | `partial` (+ any follow-through) |
| `failed` | `fail` (+ any follow-through) |

**Fallout tier mapping (four states + boolean → five tuning buckets in `tuning/escalation-and-fallout.md` §4):**

| `resolutionState` | `escalationActive` (when `failed`) | Fallout tier |
| --- | --- | --- |
| `clean` | — | §4.1 Clean success |
| `degraded` | — | §4.2 Success with cost |
| `partial` | — | §4.3 Partial success |
| `failed` | `false` | §4.4 Failure with containment |
| `failed` | `true` | §4.5 Escalating failure |

Fallout selection rules read **`resolutionState` + `escalationActive`** (and bottleneck tags), not parallel ad-hoc enums.

3.2 Mission-local fallout

Examples:

- injury
- damage
- time slip
- escalation
- panic
- legitimacy loss

  3.3 Incident update

The linked incident may become:

- resolved
- partially contained
- escalated
- deferred but worsened

  3.4 Team / operative update

Examples:

- readiness changes
- recovery burden
- trauma increase
- attrition / loss
- cohesion hit

  3.5 Domain events

Mission resolution should emit events suitable for:

- reports
- debugging
- replay-style inspection
- test assertions

# 4. Core outcome model

Preferred minimal model

The recommended minimal deterministic model:

- validate mission
- evaluate effective mission condition
- identify strongest bottleneck if any
- assign outcome band
- apply follow-through degradation where applicable
- apply fallout

This gives enough complexity for rich outcomes without tactical oversimulation.

Example conceptual logic

Readiness good

- role coverage complete
- required gear present
- recon adequate
- support available
  = likely success

Readiness adequate

- missing intel
- support strained
  = partial success with degraded follow-through

Readiness weak

- role gap
- escalation high
  = `failed`; set `escalationActive` per §2 Stage D defaults (contained vs escalating)

# 5. Bounded modifiers

Mission resolution should prefer bounded, named modifiers over diffuse hidden math.

Good bounded modifiers:

- missing critical role
- weak recon
- support shortage
- specialist bottleneck
- coordination friction
- overload
- severe escalation
- legitimacy constraint
- damaged asset dependency

Avoid large clouds of tiny invisible penalties.

# 6. Resolution subdomains

The issue set implies mission resolution is extensible.

Base resolution should support plugging in domain-specific layers such as:

- fortified breach
- hidden-state / counter-detection
- pursuit / transit hazard
- large asset strike/capture
- medical stabilization
- platform / fire control operations
- reserve reinforcement timing
- site occupancy / roaming pressure
- dramatic reversal / momentum systems
- anomaly-specific hazard domains

These subdomains should plug into the same bounded mission resolution architecture rather than creating separate games.

# 7. Failure design

Failures should be meaningful and recoverable.

All structural failures surface as **`resolutionState: failed`**. **`escalationActive`** (optional boolean; meaningful only here) splits tuning **§4.4 Failure with containment** vs **§4.5 Escalating failure** without adding a fifth resolution enum:

- **`escalationActive: false`** — worst-case trajectory avoided or bounded; fallout and pressure may still be meaningful (recovery burden, localized containment cost).
- **`escalationActive: true`** — campaign-facing worsening is authorized: escalation bands, spillover flags, or cross-system pressure move per the deterministic Stage D rule set.

Narrative labels such as “clean failure” vs “degraded failure” are **density variants** inside `failed` + `escalationActive: false`, carried by **`falloutTags`** and follow-through notes—not parallel top-level resolution states.

# 8. Partial success design

Partial success is essential to the game.

Partial outcomes should be common when:

- the team is plausible but imperfect
- intel is incomplete
- support is **Support strained** (see `tuning/support-and-specialist-capacity.md` §5; use that scoped label in copy when economy bands could be confused)
- time pressure is significant
- follow-through is the real weak point

Partial success is how the game communicates:

“you solved the immediate problem, but not cleanly”
“you avoided collapse, but paid for it”
“the institution held, but the world got messier”

# 9. Integration with major systems

## 9.1 Team management

Mission resolution should reward:

- cohesive teams
- correct role coverage
- trained personnel
- recovery discipline

## 9.2 Support systems

Mission resolution should reflect whether the agency can sustain clean operational execution.

## 9.3 Specialist systems

Specialists should shape throughput, capability, or post-mission handling where relevant.

## 9.4 Knowledge/intel systems

Better information should improve mission quality and reduce avoidable fallout.

## 9.5 Pressure systems

Overload and unresolved campaign strain should measurably worsen clean execution.

## 9.6 Hub and faction systems

Mission outcomes should feed back into:

- new opportunities
- faction posture
- legitimacy
- social filtering of future information

# 10. Surfacing rules

Mission resolution must be visible.

The player should be able to answer:

- what happened?
- why did it happen?
- what was the main bottleneck?
- what should be fixed before next time?

Minimum surfacing:

- result band
- follow-through quality
- top bottleneck or top cause
- major fallout items
- next-step implications where relevant

# 11. Tuning levers

Mission resolution should expose bounded tuning levers such as:

- readiness thresholds
- escalation severity bands
- support shortage penalty intensity
- weakest-link weighting
- fallout thresholds
- role-gap severity
- recon/intel contribution
- specialist multiplier effect
- coordination overload trigger

Keep these centralized and explicit where possible.

# 12. Non-goals

Mission resolution is not:

- freeform tactical movement
- broad combat simulation
- hidden dice drama disguised as system depth
- a second standalone game inside the campaign
- a black box the player cannot learn from

# 13. Example resolution flowchart

[Mission assigned]
->
[Eligibility check]
->
[Evaluate readiness / roles / gear / intel / support]
->
[Identify bottleneck]
->
[Assign outcome band]
->
[Evaluate follow-through]
->
[Apply fallout]
->
[Update incident / team / agency state]
->
[Emit report notes and events]

# 14. Acceptance criteria for the system

Mission resolution is working correctly when:

- outcomes are deterministic from state
- the same state produces the same result
- bottlenecks are visible and explainable
- campaign preparation materially affects mission results
- partial success and fallout occur in understandable ways
- reports surface major causes without duplicating domain logic
- report and explanation surfaces consume canonical shared outputs instead of
  maintaining parallel interpretation logic
- mission outcome updates propagate into the next weekly state

# 15. Testing expectations

Mission resolution tests should cover:

- Core tests
  - strong mission setup -> success
  - weak but viable setup -> partial
  - invalid or heavily degraded setup -> fail

- Bottleneck tests
  - missing critical role
  - support shortage
  - specialist bottleneck
  - poor recon
  - overload/coordination friction

- Consequence tests
  - fallout applied correctly
  - incident state updated correctly
  - operative/team recovery burden updated
  - report notes contain surfaced explanation

- Determinism tests
  - same input state -> same output every time

# 16. Summary

Mission resolution in Containment Protocol should be:

- deterministic
- graded
- bottleneck-sensitive
- campaign-connected
- visibly explained
- bounded enough to remain legible

Its job is not to simulate every action. Its job is to convert institutional condition and operational preparation into meaningful, persistent consequences.
