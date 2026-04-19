# Containment Protocol — Rumor Template

## Purpose

This template defines how rumors and low-confidence leads should be authored for Containment Protocol.

Rumors are not just flavor text.
They are a bounded information surface that helps the player:

- discover opportunities
- infer hidden pressure
- notice faction or district movement
- weigh uncertain commitments
- navigate partial information

A rumor should feel like information from the world, not from an omniscient narrator.

It should:

- be suggestive but useful
- preserve uncertainty
- imply possible action
- remain operationally relevant
- fit the game’s restrained institutional tone

This template is for:

- writers
- designers
- content implementers
- system integrators
- QA validating rumor quality

---

## 1. Authoring goals

A rumor should do five things:

1. communicate a possibly meaningful signal
2. preserve uncertainty or source filtering
3. imply a possible action, opportunity, or risk
4. reflect the world’s social or informational texture
5. remain short and high-signal

A good rumor lets the player ask:

- what might be happening?
- how reliable is this?
- is this worth acting on now?
- what kind of problem or opportunity might it point toward?
- who is saying this, and why?

---

## 2. What a rumor is

A rumor is a surfaced information fragment.

It may be:

- accurate
- incomplete
- biased
- delayed
- socially filtered
- distorted
- misleading in a bounded deterministic way

A rumor is not:

- a full incident writeup
- a report note
- an omniscient truth dump
- pure atmospheric filler with no strategic use

Rumors should feel like signals the player interprets, not answers the game gives away.

---

## 3. Rumor template overview

```md
## Title
[Short surfaced label]

## Rumor text
[1–3 sentence rumor text]

## Source profile
[Who or what is surfacing this]

## Reliability level
[clear / partial / misleading]

## Implied opportunity or risk
- ...
- ...

## Suggested tags
- ...
- ...

## Optional hidden truth
[Internal-only note]
```

## 4. Required authoring fields

### 4.1 Title

#### Purpose — Title

Provides a short, scan-friendly label for lists and hub views.

#### Rules — Title

- 3–8 words
- should imply signal, not certainty
- should be readable in compact UI
- avoid overdramatic naming

#### Good examples — Title

- Night Traffic Avoiding Old Bridge
- Archive Staff Seen After Closure
- District Broker Cancels Evening Calls
- Repeated Utility Complaints Near Foundry
- Port Inspectors Quietly Withdrawing

#### Bad examples — Title

- Dark Secrets in the Night
- Terrible Horror on the Bridge
- Something Strange Is Happening Again

### 4.2 Rumor text

#### Purpose — Rumor text

The player-facing content of the rumor.

#### Rules — Rumor text

- 1–3 sentences
- should sound source-filtered
- should imply uncertainty unless reliability is explicitly high
- should contain at least one concrete detail
- should avoid full resolution or explicit system explanation
- should imply a possible follow-up action or concern

#### Recommended structure — Rumor text

- surfaced claim or observed behavior
- one concrete detail
- one uncertainty, bias, or implication

#### Good example — Rumor text

Several market carriers are quietly avoiding the old bridge route after dusk. Most describe “machinery” in the fog, though no transit blockage has been formally logged.

##### Why it works — Rumor text

- source-feeling language
- concrete detail
- uncertainty
- clear implied operational value

#### Bad example — Rumor text

There may be a mysterious force haunting the bridge.

##### Why it fails — Rumor text

- generic
- low signal
- little routing value

### 4.3 Source profile

#### Purpose — Source profile

Defines where the rumor is coming from.

#### Rules — Source profile

- write this as structured authoring data even if not always shown directly
- source should help explain reliability and bias
- source should be socially plausible

#### Common source profiles

- local residents
- market carriers
- municipal workers
- clinic staff
- brokers
- faction contacts
- informal law enforcement
- service employees
- rival observers
- survivors
- district gossip cluster
- internal monitoring anomaly

##### Why this matters — Source profile

Rumors feel better when the player senses:

- who is talking
- why they may be wrong
- why they may be right

### 4.4 Reliability level

#### Purpose — Reliability level

Defines how the rumor should be understood by the systems and by content authors.

#### Allowed values — Reliability level

- clear
- partial
- misleading

#### Meaning — Reliability level

##### Clear

Write with confidence, but still as surfaced information.

Example:

District utility records now show repeated failures tied to one service corridor.

##### Partial

Write with confidence on observed details, uncertainty on meaning.

Example:

The service corridor keeps failing after midnight, but no one agrees on whether the source is mechanical or human.

##### Misleading

Write plausibly, not absurdly.

Example:

Most locals now attribute the corridor failures to scavenger crews, though no theft pattern has been confirmed.

Misleading rumors should:

- be believable
- point toward the wrong interpretation cleanly
- still fit the world state

#### Rules — Reliability level

- most rumors should be partial
- use clear sparingly
- use misleading intentionally, not randomly
- a misleading rumor should still feel plausible

### 4.5 Implied opportunity or risk

#### Purpose — Implied opportunity or risk

Defines what the rumor may lead to.

#### Rules — Implied opportunity or risk

- 1–3 bullets
- should identify a likely player-facing implication
- can point toward:
  - incident
  - contract
  - social opportunity
  - faction movement
  - district danger
  - false or low-yield lead

#### Good examples — Implied opportunity or risk

- may indicate a low-visibility incident in the bridge district
- suggests transport access may be degrading after dark
- could be a faction-filtered distortion of a real site hazard
- may justify recon rather than immediate direct deployment

### 4.6 Suggested tags

#### Purpose — Suggested tags

Supports filtering, generation, and downstream routing.

#### Rules — Suggested tags

- keep tags compact
- use canonical project tags
- tags should support content/system logic

#### Example tags — Suggested tags

- rumor
- low-visibility
- urban
- faction-sensitive
- infrastructure
- anomaly-adjacent
- socially-filtered
- possible-false-lead
- recon-worthy
- district-pressure

## 5. Optional authoring fields

### 5.1 District / node

Where the rumor is attached:

- river district
- foundry quarter
- old bridge
- broker lane
- clinic ward
- port authority office

#### Why useful — District / node

Supports place-bound rumor behavior and hub variation.

### 5.2 Linked faction

If the rumor is influenced by or relevant to a faction.

#### Why useful — Linked faction

Supports faction presence, access, and bias shaping.

### 5.3 Visibility state

How public or niche the rumor is:

- private
- local
- district-wide
- public enough to affect legitimacy

### 5.4 Suggested response lane

Internal authoring suggestion:

- ignore safely
- recon-first
- convert to lead
- route as incident
- monitor for escalation

### 5.5 Hidden truth

Internal-only note describing what the rumor actually corresponds to.

#### Rules — Hidden truth

- should never read like player-facing text
- should support deterministic generation logic
- should explain the difference between rumor and world truth

## 6. Full template

### Template Title
[Short surfaced label]

### Template Rumor text
[1–3 sentence player-facing rumor]

### Template Source profile
[source type]

### Template Reliability level
[clear / partial / misleading]

### Template Implied opportunity or risk

- [implication]
- [implication]

### Template Suggested tags

- [tag]
- [tag]
- [tag]

### Template Optional fields

- District / Node: [location]
- Linked faction: [faction]
- Visibility state: [state]
- Suggested response lane: [lane]
- Hidden truth: [internal-only]

## 7. Example completed rumor

### Example Title
Night Traffic Avoiding Old Bridge

### Example Rumor text
Several market carriers are quietly avoiding the old bridge route after dusk. Most describe “machinery” in the fog, though no transit blockage has been formally logged.

### Example Source profile
market carriers

### Example Reliability level
partial

### Example Implied opportunity or risk

- may indicate a low-visibility infrastructure-adjacent anomaly
- may justify recon before the route becomes a broader logistics issue
- may also reflect socially amplified district fear rather than direct physical danger

### Example Suggested tags

- rumor
- urban
- low-visibility
- infrastructure
- recon-worthy

### Example Optional fields

- District / Node: old bridge
- Linked faction: none
- Visibility state: local
- Suggested response lane: recon-first
- Hidden truth: recurring auditory distortion linked to submerged relay infrastructure, intermittently misperceived as moving machinery

## 8. Rumor quality checklist

Before approving a rumor, confirm:

### Signal quality

- Does the rumor contain at least one concrete detail?
- Does it imply something actionable or strategically meaningful?

### Uncertainty quality

- Does it preserve bounded uncertainty?
- Does it avoid sounding like omniscient truth?

### Source credibility

- Does the source make sense?
- Does the rumor sound like something that source would actually say or circulate?

### Tone

- Does it sound restrained and institutional enough for the setting?
- Is it eerie without becoming theatrical?

### Boundedness

- Is it short enough?
- Does it avoid implying an entire invisible novel behind every line?

### Routing value

Could a player plausibly decide whether to:

- ignore
- monitor
- recon
- route

based on this rumor?

## 9. Common mistakes

### Mistake 1: Generic spooky phrasing

Bad:

People say the bridge is cursed.

##### Why it fails

- too vague
- too folkloric by itself
- low decision value

### Mistake 2: Omniscient reveal

Bad:

A submerged relay entity is creating phased acoustic illusions near the bridge.

##### Why it fails

- reveals hidden truth
- sounds like internal notes, not surfaced rumor

### Mistake 3: No concrete detail

Bad:

Something is wrong near the foundry.

##### Why it fails

- too broad
- no route implication
- no informational texture

### Mistake 4: Overwritten prose

Bad:

The bridge groans beneath unseen industry, and those who pass it feel the gears of night grinding under their bones.

##### Why it fails

- wrong tone
- too literary
- poor strategic clarity

## 10. Good rumor patterns

#### Pattern A — Behavioral anomaly

Port inspectors are leaving early and refusing late inspections in the lower docks.

Useful because:

- behavior change is visible
- possible institutional meaning
- implies pressure or hidden cause

#### Pattern B — Source disagreement

Two clinic orderlies describe the same patient transfer differently, and both accounts place the subject in separate wards at the same time.

Useful because:

- contradiction is itself a signal
- invites recon/inquiry

#### Pattern C — Plausible false framing

Residents are blaming utility sabotage for repeated signal failures in the quarter, though outage timing does not match prior disruption patterns.

Useful because:

- includes likely misread
- gives player a reason not to trust first explanation

#### Pattern D — Access signal

A broker who normally takes late visitors has cancelled all evening appointments for the third time this week.

Useful because:

- social/systemic
- suggests pressure without explaining it away
- may connect to faction, legitimacy, or incident flow

## 11. Reliability-writing guidance

### Clear

Write with confidence, but still as surfaced information.
Example:

District utility records now show repeated failures tied to one service corridor.

### Partial

Write with confidence on observed details, uncertainty on meaning.
Example:

The service corridor keeps failing after midnight, but no one agrees on whether the source is mechanical or human.

### Misleading

Write plausibly, not absurdly.
Example:

Most locals now attribute the corridor failures to scavenger crews, though no theft pattern has been confirmed.

Misleading rumors should:

- be believable
- point toward the wrong interpretation cleanly
- still fit the world state

## 12. Integration notes

Each rumor should be mappable to:

- source
- reliability level
- location or node
- likely opportunity/risk conversion
- faction or social filter if relevant
- hidden truth or simulation anchor
- deterministic surfacing conditions

If a rumor cannot support these cleanly, revise it.

## 13. Summary

A good Containment Protocol rumor is:

- short
- concrete
- uncertain in the right way
- socially grounded
- strategically useful
- tonally restrained

The player should read a rumor and think:

this may not be fully true, but it tells me something worth weighing.
