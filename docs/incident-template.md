# Containment Protocol — Incident Template

## Purpose

This template defines how incidents should be authored for Containment Protocol.


Incidents are one of the main drivers of the weekly campaign loop. They create:

- triage pressure
- mission-routing decisions
- escalation risk
- information uncertainty
- strategic tradeoffs


A good incident gives the player a meaningful problem to interpret and respond to.

It should:

- be operationally legible
- support deterministic systems
- preserve bounded uncertainty
- imply consequences clearly
- avoid overexplaining hidden truth


This template is for:

- designers
- writers
- content implementers
- system integrators
- QA reviewing authored incident quality

---

# 1. Authoring goals

An incident should do five things:

1. establish the operational problem
2. communicate urgency or pressure
3. imply the likely response challenge
4. preserve some uncertainty where appropriate
5. connect cleanly into routing, deployment, and resolution systems


A strong incident helps the player answer:

- what is happening?
- why does it matter now?
- what kind of response does this require?
- what is unknown?
- what gets worse if ignored?

---

# 2. Incident template overview

Use this template as the baseline structure.

```md
## Title
[Short operational title]

## Summary
[2–5 sentence incident description]

## Observable problem
- ...
- ...

## Immediate stakes
- ...
- ...

## Uncertainty / anomalies
- ...
- ...

## Operational implications
- ...
- ...

## Suggested tags
- ...
- ...

## Escalation if delayed
- ...
```

Not every implementation needs all of these as visible fields, but every authored incident should define them.

# 3. Required authoring fields

## 3.1 Title

**Purpose**

Provides a short, scan-friendly operational label.

**Rules**

- 4–10 words
- should identify the problem, not explain everything
- should read clearly in a list
- avoid excessive flavor wording
- avoid vague titles that do not imply action

**Good examples**

- Unresponsive Warehouse Perimeter
- Distorted Transit Tunnel Collapse
- Missing Survey Team at Reservoir
- Repeating Fire Suppression Failure
- Unlicensed Clinic Memory Drift Reports

**Bad examples**

- A Darkness in the Night
- Something Strange Is Happening
- The Whisper Beneath the City
- The Situation

## 3.2 Summary

**Purpose**

Provides the core player-facing incident description.

**Rules**

- 2–5 sentences
- start with observable facts
- establish stakes quickly
- include one or two useful specifics
- imply operational challenge
- do not fully reveal hidden truth unless the design requires it
- avoid lore dumping

**Recommended structure**

- visible disruption or problem
- local stakes
- bounded uncertainty or anomaly
- why action matters now


### Good example

A warehouse in the river district lost power during a routine inventory transfer and has remained sealed from the inside for six hours. Two responders entered and withdrew without usable testimony. Nearby traffic is being rerouted, and civilian attention is rising.

**Why it works:**

- visible problem
- social/operational stakes
- uncertainty
- time sensitivity

## 3.3 Observable problem

**Purpose**

Defines what the agency can directly know at intake.

**Rules**

- use concrete, externalized facts
- write what is seen, reported, measured, or failing
- avoid hidden-cause narration unless known
- 2–5 bullets


### Examples

- district power failure localized to one structure
- missing personnel last confirmed on site
- conflicting responder testimony
- sealed entrances with internal movement signatures
- repeated emergency call dropouts


**Why this matters:**

This supports:

- triage
- knowledge-state logic
- rumor/information filtering
- early routing decisions

## 3.4 Immediate stakes

**Purpose**

Defines what is at risk if the player delays or misroutes the incident.

**Rules**

- identify at least one meaningful consequence
- keep stakes bounded and actionable
- can include operational, social, political, or containment consequences
- avoid abstract doom language


### Good examples

- civilian visibility is increasing
- site access may be lost if local authorities secure the block
- missing personnel may no longer be recoverable intact
- infrastructure damage could spread to adjacent service corridors
- faction attention is likely if the event remains public


### Bad examples

- the world may end
- reality itself is in danger
- unspeakable evil is spreading

## 3.5 Uncertainty / anomalies

**Purpose**

Defines what is unclear, misleading, or unusual about the incident.

**Rules**

- 1–3 bullets
- preserve bounded ambiguity
- connect uncertainty to gameplay, not just atmosphere
- identify what the player does not know yet


### Examples

- witness descriptions are mutually inconsistent
- heat signatures suggest movement, but no confirmed bodies are visible
- utility failure does not explain synchronized equipment shutdowns
- local rumor attributes the event to gang activity, but evidence is weak
- prior site records are incomplete or redacted


**Why this matters:**

This drives:

- recon value
- risk estimation
- partial-information play
- content credibility

## 3.6 Operational implications

**Purpose**

Defines what kind of response challenge the incident creates.

**Rules**

- explain what the agency will likely need to solve
- tie to actual gameplay systems where possible
- 2–4 bullets


### Examples

- likely requires controlled entry rather than open response
- weak recon will increase exposure risk
- medical stabilization may matter if survivors are present
- support strain may degrade clean follow-through
- route is time-sensitive due to local authority activity


**Why this matters:**

This helps:

- mission routing
- team selection
- gear/loadout choices
- support and specialist planning

## 3.7 Suggested tags

**Purpose**

Provides content/system labels used for routing, generation, and domain matching.

**Rules**

- use canonical tags only
- prefer a small, meaningful set
- tags should help systems and content, not replace description


### Example categories

- anomaly
- infrastructure
- civilian-risk
- time-sensitive
- low-visibility
- faction-sensitive
- medical
- containment-risk
- industrial-site
- urban


### Good tag set

- anomaly
- time-sensitive
- civilian-risk
- industrial-site
- low-visibility

## 3.8 Escalation if delayed

**Purpose**

Defines the deterministic worsening path if the player does not respond effectively.

**Rules**

- describe one bounded escalation pattern
- escalation should be specific
- tie to actual consequences
- avoid generic “gets worse” phrasing


### Good examples

- civilian awareness rises and legitimacy risk increases
- site access narrows after local lockdown
- internal conditions worsen, reducing recoverable survivors
- anomaly spreads into adjacent systems
- rival faction capture/interference becomes possible


### Bad examples

- things spiral out of control
- chaos spreads everywhere
- disaster ensues

# 4. Optional authoring fields


These are optional but recommended for richer implementation.

## 4.1 Source


Where the incident came from:

- contract board
- local authority request
- rumor escalation
- internal detection
- faction contact
- routine monitoring
- survivor report

## 4.2 Region / site


Where the incident is rooted:

- district
- region
- facility type
- specific known site

## 4.3 Visibility state


How public the incident currently is:

- quiet
- locally visible
- publicly unstable
- politically exposed

## 4.4 Response lane suggestion


Useful for design-side planning:

- recon-first
- immediate deployment
- containment-first
- rescue-first
- delay is acceptable
- support-heavy
- specialist-gated

## 4.5 Hidden truth

Internal design-only note for what is actually going on.


### Rules

- never assume this is fully shown to the player
- must still connect to deterministic system consequences
- should explain why visible facts behave the way they do


# 5. Full template

Use this full version in design docs.

```md
## Title
[Short operational title]

## Summary
[2–5 sentence player-facing description]

## Observable problem
- [Directly known fact]
- [Directly known fact]
- [Directly known fact]

## Immediate stakes
- [What is at risk now]
- [What worsens if delayed]

## Uncertainty / anomalies
- [What is unclear or inconsistent]
- [What does not fit the obvious explanation]

## Operational implications
- [What kind of response this pressures]
- [What capability, support, or preparation is likely relevant]

## Suggested tags
- [tag]
- [tag]
- [tag]

## Escalation if delayed
- [Deterministic worsening path]

## Optional fields
- Source: [source]
- Region / Site: [location]
- Visibility state: [state]
- Response lane suggestion: [lane]
- Hidden truth: [internal only]
```


# 6. Example completed incident


## Title
Unresponsive Freight Archive

## Summary
A records warehouse on the freight line has stopped all outbound communication after a minor overnight fire alarm. Recovery crews found the structure unlocked but abandoned at ground level, with active filing machinery still running. Several adjacent businesses have reported hearing voices from inside after closure.

## Observable problem

- all outbound warehouse communications stopped after the alarm
- no confirmed staff remain at ground level
- archive machinery is still active without visible operators
- nearby businesses are reporting after-hours sound bleed

## Immediate stakes

- civilian attention is rising in an active business corridor
- any surviving staff may still be recoverable if entry happens soon
- archive contents may be compromised if the event spreads internally

## Uncertainty / anomalies

- the minor fire alarm does not explain the total loss of staff visibility
- voices continue after the building should be empty
- no confirmed sign of forced entry or external attack is present

## Operational implications

- likely requires controlled entry rather than overt public response
- recon quality will affect exposure risk significantly
- support follow-through may matter if records or survivors must be extracted cleanly

## Suggested tags

- anomaly
- urban
- civilian-risk
- low-visibility
- time-sensitive

## Escalation if delayed

- civilian visibility increases and the district becomes harder to isolate cleanly

## Optional fields

- Source: local authority request
- Region / Site: freight district archive warehouse
- Visibility state: locally visible
- Response lane suggestion: recon-first
- Hidden truth: localized identity bleed across indexed records and staff memory anchors

# 7. Incident quality checklist

Before approving an incident, confirm:


### Clarity

- Can the player understand the problem quickly?
- Does the title scan well in a list?
- Is the summary operationally legible?


### Stakes

- Is there a reason to care now?
- Is at least one consequence of delay visible?


### Uncertainty

- Is there useful ambiguity rather than confusion?
- Does uncertainty create gameplay value?


### Routing value

- Does the incident imply something about response type, risk, or requirements?
- Can the player reasonably compare it to other incidents?


### Boundedness

- Is the scale controlled?
- Does the text imply more simulation depth than the systems can support?


### Tone

- Does it sound like Containment Protocol?
- Is it restrained, procedural, and eerie rather than theatrical?

# 8. Common mistakes


### Mistake 1: Vague spooky writing

Bad:

Workers vanished under strange circumstances and a feeling of dread hangs over the building.

**Why it fails:**

- low operational signal
- weak routing value
- generic tone


### Mistake 2: Full hidden truth exposition

Bad:

An extradimensional memory parasite has entered the filing system and is now replicating through document identity chains.

**Why it fails:**

- overreveals
- removes investigatory pressure
- sounds like internal design notes, not intake text


### Mistake 3: No stakes

Bad:

Some odd noises were reported from a warehouse.

**Why it fails:**

- not urgent
- not clearly consequential
- hard to route meaningfully


### Mistake 4: Overwritten prose

Bad:

The warehouse stood like a tomb of industrial grief, haunted by voices no living throat could carry.

**Why it fails:**

- too literary
- poor institutional tone
- obscures usable information

# 9. Integration notes for implementation

Each incident should be mappable to:
- severity
- escalation pattern
- visibility/public pressure
- site context
- tags/conditions
- likely routing lane
- possible report note causes
- deterministic worsening path

If an incident cannot map to systems cleanly, it needs revision.

# 10. Summary

A good Containment Protocol incident is:
- clear
- tense
- bounded
- operationally useful
- uncertain in the right places
- easy to route
- easy to escalate
- consistent with deterministic campaign play

The player should read an incident and immediately feel:
this is a real problem, I understand why it matters, and I know what I still don’t know.
