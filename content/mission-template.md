# Containment Protocol — Mission Template

## Purpose

This template defines how missions should be authored for Containment Protocol.

A mission is a bounded operational response to:

- an incident
- a lead
- a contract
- a faction request
- a hub-generated opportunity
- a strategic intervention path

A mission is not the same as the underlying problem.
The incident is the problem.
The mission is the chosen response path.

This template ensures that missions:

- are operationally legible
- support deterministic routing and resolution
- make player commitment clear
- express risk and expected value
- connect cleanly into mission resolution and reporting systems

This template is for:

- designers
- writers
- implementers
- system integrators
- QA reviewing mission quality

---

## 1. Authoring goals

A mission should do five things:

1. define what the agency is trying to do
2. identify the primary constraint or risk
3. imply what kind of team/preparation is needed
4. clarify what success, partial success, or failure likely means
5. create a meaningful deployment choice

A strong mission lets the player answer:

- what is the objective?
- why commit now?
- what makes this difficult?
- what happens if it goes poorly?
- what kind of preparation does it reward?

---

## 2. Mission template overview

```md
## Title
[Short operational mission title]

## Objective
[1–2 sentence directive]

## Situation
[2–4 sentence mission framing]

## Primary task
- ...
- ...

## Key constraints
- ...
- ...

## Likely requirements
- ...
- ...

## Success implications
- ...
- ...

## Failure / partial implications
- ...
- ...

## Suggested tags
- ...
- ...
```

Not all of this must be visible in the same UI view, but all of it should exist in authored form.

# 3. Required authoring fields

### 3.1 Title

#### 3.1.1 Purpose
Provides the mission’s scan-friendly operational label.

#### 3.1.2 Rules

- 4–10 words
- should describe the response, not just restate the incident
- should read clearly in mission lists and reports
- avoid vague action verbs

#### 3.1.3 Good examples

- Secure Freight Archive Interior
- Extract Missing Reservoir Surveyors
- Isolate District Relay Failure
- Recover Compromised Clinic Records
- Contain Bridge Route Distortion

#### 3.1.4 Bad examples

- Investigate the Situation
- Deal With the Warehouse
- Strange Problem Response
- Go Inside

### 3.2 Objective

#### 3.2.1 Purpose
Defines the mission’s main operational directive.

#### 3.2.2 Rules

- 1–2 sentences
- should tell the player what success is trying to accomplish
- should use direct, bounded verbs
- should avoid decorative prose

#### 3.2.3 Good examples

- Enter the archive, identify surviving staff, and secure any records driving continued disturbance.
- Establish perimeter control, confirm the source of the relay failure, and prevent further civilian entry.

#### 3.2.4 Bad examples

- Discover the truth of the site and do what must be done.
- Solve the mystery before it is too late.

### 3.3 Situation

#### 3.3.1 Purpose
Provides the mission-specific framing that sits between incident intake and deployment.

#### 3.3.2 Rules

- 2–4 sentences
- should translate the broader incident into a concrete operational response context
- should identify why this mission is difficult or time-sensitive
- may include visibility, resistance, support, or environmental pressure

#### 3.3.3 Recommended structure

- current operating condition
- what changed since intake or why action is being taken now
- what complicates the mission
- what pressure exists if delayed or mishandled

#### 3.3.4 Example

Ground access remains open, but district traffic control is beginning to redirect civilians around the site. Archive systems are still active, and repeated interior movement signatures suggest the disturbance remains unresolved. Clean extraction is possible now, but public visibility and record loss risk will rise if the operation slips.

### 3.4 Primary task

#### 3.4.1 Purpose
Breaks the objective into clear operational tasks.

#### 3.4.2 Rules

- 2–4 bullets
- use concrete verbs
- keep tasks bounded and actionable
- tasks should reflect intended resolution shape

#### 3.4.3 Good examples

- secure site entry without widening visibility
- locate and recover any surviving personnel
- identify the active source of distortion
- stabilize records or systems needed for clean withdrawal

#### 3.4.4 Why this matters
This helps:

- route the mission
- imply relevant roles/gear
- support clearer report writing later

### 3.5 Key constraints

#### 3.5.1 Purpose
Defines what makes the mission hard.

#### 3.5.2 Rules

- 2–5 bullets
- constraints should be specific
- they can be tactical, informational, institutional, social, or temporal
- they should connect to actual systems when possible

#### 3.5.3 Good examples

- recon quality is incomplete
- support follow-through is strained this week
- site visibility is rising
- medical recovery window is narrow
- industrial layout reduces clean movement
- faction attention is likely if the perimeter expands

#### 3.5.4 Bad examples

- things may go wrong
- the mission is dangerous
- many unknowns remain

### 3.6 Likely requirements

#### 3.6.1 Purpose
Signals what kind of preparation the player should value.

#### 3.6.2 Rules

- 2–4 bullets
- identify likely readiness, gear, role, support, or specialist needs
- should imply but not fully solve the mission

#### 3.6.3 Good examples

- strong recon improves clean entry
- certification coverage reduces avoidable exposure
- support availability improves post-contact follow-through
- maintenance recovery backlog may reduce gear readiness
- medical stabilization capacity may matter if recovery is part of the objective

#### 3.6.4 Why this matters
This is where the mission starts to teach the player how the system thinks.

### 3.7 Success implications

#### 3.7.1 Purpose
Defines what a good outcome produces.

#### 3.7.2 Rules

- identify concrete benefits
- can include mission-local and campaign-level consequences
- should stay bounded

#### 3.7.3 Good examples

- site is stabilized before civilian visibility spikes
- survivors and records are recovered
- escalation pressure is reduced
- faction attention is avoided
- the agency gains cleaner intel for follow-on actions

#### Important
Success does not need to mean perfect cleanliness.
Some missions should allow success with cost.

### 3.8 Failure / partial implications

#### 3.8.1 Purpose
Defines the likely cost of imperfect execution.

#### 3.8.2 Rules

- include at least one partial-success implication
- include at least one failure implication
- consequences should connect to real systems
- avoid all-or-nothing apocalyptic wording

#### 3.8.3 Good examples

- partial success leaves the site contained but unstable
- survivors are recovered, but records are lost
- failure increases district visibility and local authority pressure
- delay worsens recovery viability
- poor follow-through leaves future incidents more likely

#### 3.8.4 Why this matters
This keeps mission choice from feeling fake.
The player should know what kind of damage they are risking.

### 3.9 Suggested tags

#### 3.9.1 Purpose

Provides mission-side routing and resolution tags.

#### 3.9.2 Rules

- keep the set compact
- tags should support systems and content filtering
- use canonical tags only

#### 3.9.3 Example tags

- containment
- extraction
- recon-sensitive
- industrial
- medical-risk
- low-visibility
- support-sensitive
- time-critical
- faction-sensitive
- recovery-sensitive

## 4. Optional authoring fields

### 4.1 Source

Where the mission came from:

- incident routing
- contract board
- hub lead
- rumor conversion
- faction contact
- emergency response
- follow-up operation

### 4.2 Linked incident

The incident this mission answers, if any.

### 4.3 Response lane

The intended operational posture:

- recon-first
- direct containment
- extraction
- perimeter control
- rescue / stabilization
- surgical disruption
- delay and monitor

### 4.4 Expected visible pressure

What the player should feel:

- support-sensitive
- overload-sensitive
- escalation-sensitive
- legitimacy-sensitive
- specialist-gated

### 4.5 Internal resolution note

Design-only explanation of what systems are expected to dominate outcome.

Use this to help implementation and QA, not as player-facing text.

## 5. Full template

### Mission Title
[Short operational mission title]

### Mission Objective
[1–2 sentence directive]

### Mission Situation
[2–4 sentence mission framing]

### Primary task

- [task]
- [task]
- [task]

### Key constraints

- [constraint]
- [constraint]
- [constraint]

### Likely requirements

- [requirement]
- [requirement]
- [requirement]

### Success implications

- [positive outcome]
- [positive outcome]

### Failure / partial implications

- [partial consequence]
- [failure consequence]

### Suggested tags

- [tag]
- [tag]
- [tag]

### Optional fields

- Source: [source]
- Linked incident: [incident]
- Response lane: [lane]
- Expected visible pressure: [pressure]
- Internal resolution note: [design-only]

## 6. Example completed mission

### Example Title
Secure Freight Archive Interior

### Example Objective
Enter the freight archive, identify any surviving staff, and stop the active distortion source before public visibility forces external containment.

### Example Situation
The site remains accessible, but district activity is increasing and nearby businesses are beginning to route around the block. Internal movement signatures remain active, and the archive machinery is still running without clear operator control. The longer the site remains unstable, the harder clean recovery becomes.

### Example Primary task

- secure controlled entry
- identify and recover survivors if present
- locate the active distortion source
- withdraw with any recoverable records tied to continued propagation

### Example Key constraints

- recon is incomplete
- public visibility is rising
- interior layout is dense and industrial
- support follow-through may be strained this week

### Example Likely requirements

- strong recon improves clean entry and withdrawal
- certification coverage reduces avoidable exposure
- support availability improves clean follow-through after contact
- medical recovery capacity may matter if survivors are unstable

### Example Success implications

- site is stabilized before legitimacy cost spikes
- survivors or records are recovered cleanly
- escalation pressure in the district is reduced

### Example Failure / partial implications

- partial success stabilizes the site but leaves critical records behind
- failure increases civilian visibility and worsens future containment options
- degraded follow-through may create support or recovery burden next week

### Example Suggested tags

- containment
- extraction
- industrial
- low-visibility
- support-sensitive

### Example Optional fields

- Source: incident routing
- Linked incident: Unresponsive Freight Archive
- Response lane: direct containment
- Expected visible pressure: support-sensitive, escalation-sensitive
- Internal resolution note: weak recon + support shortage should produce a plausible partial with degraded follow-through

## 9. Mission vs incident guidance

### Guidance Incident

Answers:

- what problem exists?

### Guidance Mission

Answers:

- what are we going to do about it?

A strong mission transforms intake into response.

Example:

### Guidance Incident Example

Communications failed at the river archive. Interior movement continues.

### Guidance Mission Example

Secure entry, recover survivors, and stop the active distortion source before district visibility rises.

Do not author missions that are merely relabeled incidents.

## 10. Integration notes for implementation

Each mission should be mappable to:

- one objective shape
- one or more likely bottlenecks
- one expected routing lane
- readiness implications
- possible support/specialist sensitivity
- likely report-note causes
- deterministic partial/failure pathways

If the mission cannot be connected to systems cleanly, revise it.

## 11. Summary

A good Containment Protocol mission is:

- concrete
- bounded
- operationally meaningful
- consequence-aware
- system-compatible
- easy to route
- easy to explain after resolution

The player should read a mission and immediately understand:

what must be done, why it is difficult, what preparation matters, and what kind of damage failure may leave behind.
