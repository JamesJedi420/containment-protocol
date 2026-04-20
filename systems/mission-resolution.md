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

That means:

- outcomes are caused by state, not primarily by random rolls
- weak preparation produces predictable degradation
- strong preparation produces predictable improvement
- outcomes should be interpretable after the fact

Preferred resolution pattern:

- success
- partial success
- failure
- success or partial success with fallout
- failure with containment
- failure with escalation

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

Containment Protocol already points toward weakest-link logic.

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

Based on the evaluated mission condition, assign the mission to an outcome band:

- success
- partial
- fail

Optionally also track:

- clean vs degraded follow-through
- contained vs escalated failure
- low vs high fallout

This lets the game produce campaign texture without requiring tactical combat simulation.

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

After outcome and fallout are determined, the game should produce player-facing explanation.

Examples:

- weak certification coverage degraded mission follow-through
- support shortage delayed clean containment
- coordination overload reduced operational coherence
- incomplete recon caused avoidable exposure
- maintenance bottleneck delayed post-mission recovery

Reports and UI should surface these from precomputed state or domain events, not recompute them.

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
  primaryReason?: string
  falloutTags?: string[]
}
```

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
  = fail or fail with escalation

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

Preferred failure classes:

- Clean failure
  The mission fails, but the agency remains stable enough to respond again.

- Degraded failure
  The mission fails and creates recovery burden, incident drift, or future weakness.

- Escalating failure
  The mission fails in a way that worsens the broader campaign state.

- Contained failure
  The mission fails but prevents the worst-case outcome.

This allows loss to create interesting next states instead of only hard dead ends.

# 8. Partial success design

Partial success is essential to the game.

Partial outcomes should be common when:

- the team is plausible but imperfect
- intel is incomplete
- support is strained
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
