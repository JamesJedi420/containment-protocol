# Review Packet

Generated: 2026-04-28T11:24:53.792Z
Issues: SPE-514, SPE-126, SPE-129, SPE-417, SPE-749, SPE-790, SPE-574, SPE-655, SPE-296, SPE-269, SPE-258

## SPE-514 - Corpse-chain possession and escalation
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, core-loop, system
- Created: 2026-04-22T09:29:24.204Z
- Updated: 2026-04-26T10:30:58.035Z

### Description
Goal:
Implement a bounded escalation layer so a higher anomaly can repeatedly possess newly available corpses, sustaining combat through host replacement rather than a single body.

Scope:

* support corpse-triggered manifestation of a higher entity
* allow repeated host hopping as new bodies become available
* let cumulative chance or room-specific conditions raise the likelihood of manifestation over time
* connect the layer to ritual kill spaces, undead families, and identity-overwrite systems where relevant

Constraints:

* deterministic only
* no universal necromancy simulator
* no assumption that one boss equals one body for the whole encounter
* prefer compact corpse-chain rules over sprawling resurrection logic

Acceptance criteria:

* at least one entity can jump from one corpse host to another during a fight or ritual sequence
* at least one cumulative or room-specific factor increases manifestation likelihood over time
* targeted tests or validation examples cover deterministic corpse-chain possession behavior

### Relations
_No relations_

### Comments
- 2026-04-26T10:30:58.042Z
Reconciliation update

Implementation emphasis:

* a disembodied hostile should be able to occupy only valid host classes inside a bounded radius, such as nearby corpses but not living bodies, with that radius granted or extended by a dedicated vessel artifact
* controller interruption or forced expulsion should create a brief minion-disruption window in which dependent undead or constructs stall, lose coordination, or become temporarily vulnerable before reassertion
* recognizable victims slain by a source attack may convert into stronger minion types, preserving identity shock for nearby allies and bystanders

This keeps vessel-limited corpse possession, control-disruption windows, and kill-method conversion inside the corpse-chain possession boundary.

- 2026-04-26T06:03:45.603Z
Reconciliation update

Implementation emphasis:

* failed body-transfer or immortality attempts may leave a residue intelligence that later occupies the nearest viable corpse or shell after a delay rather than animating immediately
* dormant shells should remain preemptively destructible, allowing players to avert the later manifestation if they correctly identify and neutralize the future host early

This keeps delayed host animation and preemptive shell destruction inside the corpse-transfer escalation boundary.

- 2026-04-24T23:49:29.534Z
Reconciliation update

Implementation emphasis:

* body-takeover ghosts may kill on failed possession, erode identity traits before full transfer, and use carried items or nearby objects as temporary anchors rather than relying on one stable host body only
* carried-object habitation and portable-anchor movement should remain valid ghost tactics that let the threat travel with the party or escape one scene into the next without full corporeal manifestation

This concept stays inside that issue’s boundary.

- 2026-04-24T16:30:26.021Z
Reconciliation update

Implementation emphasis:

* possession and attachment should remain varied across body takeover, carried-object habitation, corpse-chain hopping, escort ghosts, and co-occupant states rather than one flat possession family
* memory drain, portable anchors, and body replacement pressure should therefore remain valid ghost tactics even when the entity is not trying to win through direct harm

This concept stays inside that issue’s boundary.

- 2026-04-22T09:29:26.733Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/520). All replies are displayed in both locations.

---

## SPE-126 - Identity-overwrite traps and possession escalation
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-18T03:07:34.923Z
- Updated: 2026-04-28T11:04:08.550Z

### Description
Goal:  
Implement the identity-trap layer so mirrors, pools, vats, and similar surfaces can overwrite apparent identity, entrap consciousness, or escalate into possession instead of acting like ordinary hazards.

Scope:

* support cosmetic overwrite, idealized reflection, blended memory state, body-state replacement, and possession escalation as bounded identity effects
* support subtle transformation states that remain partially deniable or misread instead of always broadcasting themselves perfectly
* support long-duration consciousness entrapment where the mind remains aware but cannot leave except through bounded transfer or possession logic
* support apparent-form changes that alter authorization, hostility, ceremony, invitation, or social handling downstream
* support controller/body mismatch states where observed body identity and true controller identity diverge, altering authorization, hostility, and social handling outcomes
* support layered host/monster identity stacks within a single possession chain, plus office-grade impersonation and full-role replacement, without collapsing them into ordinary disguise
* preserve clear distinction between truth-state, apparent form, and possession state for debugging and later consequence handling

Constraints:

* deterministic only
* no unrestricted body-hopping sandbox and no multi-body cohort identity modeling (routed to [SPE-924](https://linear.app/spectranoir/issue/SPE-924/engineered-anomaly-populations-with-shared-cognition-drift))
* no universal instant identity rewrite for every reflective surface
* prefer a small number of explicit trap patterns over sprawling metamorphosis logic
* keep identity truth and apparent form inspectable enough for long-horizon fallout

Acceptance criteria:

* at least one pool or mirror can overwrite apparent identity without immediately forcing full possession
* at least one path escalates from cosmetic change into possession or blended memory state
* at least one consciousness-entrapment case persists until a bounded escape condition is met
* apparent form changes at least one downstream authorization, hostility, or social outcome
* targeted tests cover deterministic overwrite, possession escalation, subtle-state surfacing, and long-duration entrapment behavior

### Relations
- related: SPE-924 Engineered anomaly populations with shared cognition drift

### Comments
- 2026-04-28T10:26:31.463Z
Fold-in audit: Reconciliation updates discuss community-scale identity trap effects, hidden transformation populations, and false-recovery patterns.

Suggested description expansion:
- Add: "support hiddenly transformed settlements that conceal synchronized transformation ecologies beneath ordinary civic presentation"
- Add: "support renewed monster slots through transformed victims rather than one fixed monster body"
- Add: "support false-recovery hostile conversion that presents as normal recovery before full hostile revelation"

Note: Multi-body engineered cohorts with distributed identity are properly routed to SPE-924 per routing note.

- 2026-04-28T02:52:18.725Z
Routing note

* keep this issue focused on single-entity identity displacement triggered by external trap mechanics: cosmetic overwrite, blended memory state, consciousness entrapment, possession escalation, and apparent-form changes affecting authorization or social handling
* the subject here is one mind, one possession chain, and one truth-state / apparent-form / possession-state split
* route shared identity distributed across several manufactured bodies to [SPE-924](https://linear.app/spectranoir/issue/SPE-924/engineered-anomaly-populations-with-shared-cognition-drift)
* route implicit behavioral coordination across an engineered cohort to [SPE-924](https://linear.app/spectranoir/issue/SPE-924/engineered-anomaly-populations-with-shared-cognition-drift)
* route population-level drift where several instances share one self-model or continuity claim to [SPE-924](https://linear.app/spectranoir/issue/SPE-924/engineered-anomaly-populations-with-shared-cognition-drift)
* route recursive continuation in an engineered population after oversight failure to [SPE-924](https://linear.app/spectranoir/issue/SPE-924/engineered-anomaly-populations-with-shared-cognition-drift)

If implementation work turns into "how does this apply to several synchronized bodies," stop and route to [SPE-924](https://linear.app/spectranoir/issue/SPE-924/engineered-anomaly-populations-with-shared-cognition-drift). If it stays at "how does one entity's identity get displaced by a trap," it remains here.

- 2026-04-28T00:52:33.124Z
Reconciliation update

Implementation emphasis:

* identity should remain separable from body not only in one possession chain but across several engineered or synchronized instances, where more than one body may share one self-model or continuity claim at the same time
* fabricated family structures, embedded childhood covers, and outwardly ordinary social presentation should therefore remain valid identity wrappers around a nonordinary controlling truth
* if current identity handling still assumes one identity maps cleanly to one body at a time, that should be treated as a contradiction

This keeps distributed selfhood, fabricated identity embedding, and the contradiction check inside the identity-overwrite boundary.

- 2026-04-28T00:50:10.014Z
Reconciliation update

Implementation emphasis:

* body-transfer cases should preserve the split between visible body, true controller, and downstream trust or authority effects, especially where observers continue to trust the body they recognize
* role access, social handling, and threat classification should therefore remain vulnerable to controller/body mismatch rather than collapsing identity into one stable actor slot
* if current identity handling still assumes body equals controller by default, that should be treated as a contradiction

This keeps body-transfer identity displacement and the contradiction check inside the identity-overwrite boundary.

- 2026-04-22T09:35:14.199Z
Reconciliation update

Fold hiddenly transformed settlements, transformed-prisoner boss slots, and false-recovery hostile conversion presentation into this issue.

Implementation emphasis:

* some communities may conceal synchronized hidden transformation ecologies beneath ordinary civic presentation
* prisons or arenas may feed renewed monster slots through transformed victims rather than one fixed monster body
* postmortem conversion may pass briefly through an apparent recovery or normal state before full hostile revelation

This keeps hidden transformation populations, renewable transformed-prisoner roles, and false-recovery conversion inside the identity-overwrite and transformed-community boundary.

- 2026-04-18T03:07:36.198Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/126). All replies are displayed in both locations.

---

## SPE-129 - Identity-Overwrite Pools & Possession Traps
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Duplicate
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-18T03:13:37.266Z
- Updated: 2026-04-22T09:47:19.366Z

### Description
Goal:
Implement a bounded identity-trap layer so pools, mirrors, vats, and similar environments can overwrite appearance, trap consciousness, or enable possession with blended memory state instead of resolving as ordinary damage hazards.

Scope:

* support layered identity effects that begin with cosmetic overwrite or idealized reflection and may escalate into possession, blended memory, or body-state replacement
* support subtle transformation states that may be mistaken for stress, confusion, or ordinary strain rather than broadcasting themselves perfectly
* support long-duration consciousness entrapment where a mind remains aware but cannot leave except through bounded transfer or possession mechanics
* support downstream authorization, hostility, and social handling reacting to apparent form when relevant rather than only to underlying hidden identity
* connect the layer to existing hidden-state, knowledge, relic, and anomaly systems where appropriate

Constraints:

* deterministic only
* no unrestricted body-hopping sandbox
* no instant identity rewrite on every reflective surface
* prefer a small number of explicit trap patterns over sprawling freeform metamorphosis logic
* keep identity truth, apparent form, and possession state inspectable enough for debugging and later consequence handling

Acceptance criteria:

* at least one pool or mirror can overwrite apparent identity without immediately forcing full possession
* at least one path escalates from cosmetic transformation into possession or blended memory state
* at least one consciousness-entrapment case persists until a bounded transfer or possession escape condition is met
* apparent form changes at least one downstream authorization, hostility, or social outcome
* targeted tests cover deterministic overwrite, possession escalation, subtle state surfacing, and long-duration entrapment behavior

### Relations
- duplicate: SPE-126 Identity-overwrite traps and possession escalation

### Comments
- 2026-04-22T09:28:45.051Z
Reconciliation update

Fold faction-tagged combat modifiers, progression-gated faction utility, possession artifact host-transfer behavior, compatibility shock on first contact, long-horizon identity drift, and item-set synergy into this issue.

Implementation emphasis:

* affiliations may grant targeted bonuses against explicitly tagged enemy classes, trap families, or supernatural lineages rather than universal buffs
* faction utility trees can unlock communication, command, transformation, and summoning powers tied to one favored creature family
* possession artifacts may embed physically, alter alignment or ideology, and transfer across hosts after death on a delayed schedule
* strong relic sets may provide standalone value per piece while unlocking larger combined effects over time
* prolonged possession or simultaneous use may slowly rewrite identity or alignment on a long-horizon track

This keeps faction-tagged modifiers, faction utility progression, possession transfer, compatibility shock, long-horizon identity drift, and multi-item synergy inside the relic and possession boundary.

- 2026-04-18T03:13:41.402Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/128). All replies are displayed in both locations.

---

## SPE-417 - Identity-discontinuity survival model
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, core-loop, system
- Created: 2026-04-22T05:58:16.493Z
- Updated: 2026-04-24T16:19:30.550Z

### Description
Goal:
Implement a bounded continuity layer so some NPCs can survive catastrophe through transformed embodiment, transfer, splitting, or other discontinuous identity states.

Scope:

* support survival states where visible body and continuity of self no longer match ordinary assumptions
* distinguish identity-discontinuity from simple disguise, undeath, or injury alone
* let post-incident condition affect encounter reading, trust, and control logic
* connect the layer to succession, transformation, and advisor systems where relevant

Constraints:

* deterministic only
* no universal body-horror sandbox
* no assumption that survival always preserves ordinary embodiment
* prefer compact continuity-state rules over sprawling metaphysics

Acceptance criteria:

* at least one NPC survives through a discontinuous identity state rather than ordinary bodily continuity
* at least one downstream encounter or trust outcome changes because of that discontinuity
* targeted tests or validation examples cover deterministic identity-discontinuity behavior

### Relations
_No relations_

### Comments
- 2026-04-24T16:19:30.558Z
Reconciliation update

Implementation emphasis:

* catastrophic defeat should remain able to continue play through body replacement rather than final death, provided continuity-bearing substrate survives and a hostile or clinical recovery pipeline exists
* identity persistence may anchor to preserved cognitive substrate while visible body, social treatment, and operational capabilities change radically
* downstream trust, panic, and self-recognition should therefore read from continuity-versus-body mismatch instead of assuming body continuity is the only survival model

This concept stays inside that issue’s boundary.

- 2026-04-22T05:58:17.539Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/418). All replies are displayed in both locations.

---

## SPE-749 - Misembodied entity adaptation and false self-model
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, core-loop, system
- Created: 2026-04-26T06:04:12.420Z
- Updated: 2026-04-26T06:04:12.420Z

### Description
Goal:
Implement a bounded embodiment-confusion layer so a newly animated or transferred intelligence can initially act from the wrong body model before adapting to its actual host.

Scope:

* support transferred or reanimated intelligences that expect abilities their current body does not possess
* support wasted opening actions, false confidence, and later adaptation once feedback corrects the self-model
* distinguish embodiment confusion from low-intelligence AI or ordinary panic behavior
* support prevention or mitigation when players destroy the dormant host before activation
* connect the layer to delayed host transfer, dormant threat preemption, and transformed-body systems where relevant

Constraints:

* deterministic only
* no broad consciousness simulator
* no assumption that every awakened entity immediately understands its host body's limits
* prefer compact adaptation states over sprawling cognition prose
* keep the initial confusion window explicit and testable

Acceptance criteria:

* at least one transferred entity wastes early turns trying unavailable abilities
* at least one later state transition updates behavior after failed attempts reveal the true body model
* at least one dormant host can be destroyed preemptively to prevent the later confused manifestation
* targeted tests cover deterministic false self-model behavior, adaptation timing, and prevention routing

### Relations
_No relations_

### Comments
- 2026-04-26T06:04:13.656Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/753). All replies are displayed in both locations.

---

## SPE-790 - Post-death identity persistence and merge pressure
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-26T11:46:21.105Z
- Updated: 2026-04-26T11:46:21.105Z

### Description
Goal:
Implement a bounded post-death persistence layer so dead or transformed people can continue as realm-bound, partially remembered, assimilating, or exceptional-return entities rather than clean removal.

Scope:

* support post-death states with varying memory loss, retained mannerisms, personality drift, and role change
* support merge or assimilation pressure into a realm, sponsor, hive, or field rather than full independence forever
* support devotion-depth or loyalty-depth modifiers that change persistence and assimilation outcomes
* support rare exceptions for return, communication, regained flesh, or special release from the usual post-death path
* distinguish post-death persistence from ordinary ghosts, zombies, or one-step resurrection alone
* connect the layer to cosmological influence, site-authority, and sponsor systems where appropriate

Constraints:

* deterministic only
* no universal afterlife simulator
* no assumption that death is simply removal or full intact continuation
* prefer compact persistence classes over sprawling theology prose
* keep current identity retention, merge pressure, and exception state legible enough for debugging and planning

Acceptance criteria:

* at least one post-death state retains partial mannerisms or personality while losing other memory content
* at least one persistence class includes an active urge to merge or assimilate into a larger authority or realm
* at least one exceptional return or communication path exists outside the default merge outcome
* targeted tests or validation examples cover deterministic persistence, merge pressure, and exception behavior

### Relations
_No relations_

### Comments
- 2026-04-26T11:46:22.452Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/794). All replies are displayed in both locations.

---

## SPE-574 - Anchored mind-body separation with restoration rules
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, core-loop, system
- Created: 2026-04-23T06:08:28.479Z
- Updated: 2026-04-26T00:37:46.470Z

### Description
Goal:  
Implement a bounded mind-body separation system so an actor's mind and body can persist apart under protected suspension, anchored imprisonment, and explicit restoration rules.

Scope:

* support separation states where body and mind persist as distinct runtime surfaces
* support protected body suspension with reduced environmental vulnerability while separation remains active
* support external anchors or devices that maintain, extend, or gate release from the separated state
* support actor-qualified or rule-qualified release conditions instead of universal recovery by contact alone
* support restoration paths that return the mind, clear embedded domination or insanity, and preserve the target rather than harming it
* connect the layer to cognition, medical restoration, and sentient-object systems where appropriate

Constraints:

* deterministic only
* no universal astral-sandbox simulation
* no assumption that all separation states self-resolve on timer expiry alone
* prefer compact separation, anchor, and restoration rules over sprawling metaphysical ontologies
* keep body state, mind state, and release path inspectable enough for debugging and counterplay

Acceptance criteria:

* at least one actor can enter a state where body and mind are mechanically distinct
* at least one external anchor maintains or gates that state
* at least one restoration path returns the mind and clears at least one embedded mental-control condition
* targeted tests cover deterministic separation, anchor maintenance, qualified release, and restoration behavior

### Relations
_No relations_

### Comments
- 2026-04-25T09:59:12.610Z
Contradiction check

Implementation emphasis:

* apex encounters should not overcommit the true body if the intended frame expects reduced-power projection shells, disposable hosts, or remote reserves to carry early contact risk instead
* if current apex-threat design still exposes the core body too often when projection logic would better fit, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:59:12.576Z
Reconciliation update

Implementation emphasis:

* some apex antagonists should project through reduced-power disposable shells during unstable conditions rather than risking their true body in early encounters
* shell defeat should therefore remain distinct from core neutralization, preserving remote reserves, offsite spell resources, and later reentry into stronger forms
* threat logic may still allow a local artifact or carried object to make that reduced shell more dangerous to face despite the projection limit

This concept stays inside that issue’s boundary.

- 2026-04-25T09:27:59.802Z
Reconciliation update

Implementation emphasis:

* restoration should be able to return a target to functional life without fully repairing the original fatal wound, preserving visible corpse damage or anatomical wrongness even when operational capacity returns
* recovery outputs should therefore separate revived function from wound closure or cosmetic restoration instead of assuming one complete reset state

This concept stays inside that issue’s boundary.

- 2026-04-25T09:27:59.590Z
Reconciliation update

Implementation emphasis:

* anchored body possession should support an external vessel that holds the invader's continuity while disposable host bodies are entered, abandoned, and replaced under pressure
* the host side of possession may remain experientially active as a prison-like interior state rather than collapsing to a generic stunned or dominated flag
* possession should therefore distinguish anchor safety, current host exposure, and trapped-host subjective state instead of treating takeover as one flat control effect
* warding and target resistance should continue to stack as separate permission checks for invasive transfer

This concept stays inside that issue’s boundary.

- 2026-04-23T06:08:29.865Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/574). All replies are displayed in both locations.

---

## SPE-655 - Post-defeat continuation through body conversion
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 0
- Labels: simulation, core-loop, system
- Created: 2026-04-24T16:19:30.979Z
- Updated: 2026-04-25T20:31:52.450Z

### Description
Goal:  
Implement a bounded continuation layer so catastrophic capture or bodily destruction can convert the player into a replacement chassis and continue play instead of forcing final death.

Scope:

* support post-defeat continuation through brain or continuity-substrate transfer into a newly built body
* support replacement-chassis packages that materially change strength, resilience, vulnerabilities, social access, and class friction
* support continuity-preserving transformation where the player keeps identity and allegiance while external classification shifts toward monstrosity or fear
* support hostile medical or experimental actors as the source of the conversion, making continuation a coercive outcome rather than a clean resurrection reward
* distinguish this from ordinary healing, undeath, or cosmetic polymorph
* connect the layer to identity discontinuity, transformation, and rescue or captivity systems where relevant

Constraints:

* deterministic only
* no assumption that defeat must resolve to ordinary death or jail only
* no universal body-swap sandbox for every encounter
* prefer compact conversion states over sprawling surgical simulation
* keep continuity, body class, and downstream consequences legible enough for authoring review

Acceptance criteria:

* at least one defeat path preserves player continuity through involuntary body conversion
* at least one replacement chassis grants both meaningful benefits and meaningful operational losses
* at least one downstream social or trust surface changes because the player now reads as monstrous or altered
* targeted tests cover deterministic conversion trigger, continuity persistence, and replacement-body consequences

### Relations
_No relations_

### Comments
- 2026-04-25T14:48:59.130Z
Reconciliation update

Implementation emphasis:

* very long-horizon apex evolution can move from body-bound immortal states into post-body forms when obsession and neglect of the shell continue long enough
* these late forms may largely cease normal territorial play, interacting with the world mainly through tightly bounded resting-place defense, rare abstraction-level interventions, or sparse manifestations

This concept stays inside that issue’s boundary.

- 2026-04-25T14:36:15.798Z
Reconciliation update

Implementation emphasis:

* some apex evolution paths should progress from full body-bound lich states into very-long-horizon post-body forms when obsession and neglect of the physical shell continue long enough
* these late forms may cease normal territorial play almost entirely, interacting with the world mainly through local defense of the resting place, rare abstraction-level interventions, or tightly bounded manifestations

This concept stays inside that issue’s boundary.

- 2026-04-24T16:21:04.378Z
Reconciliation update

Implementation emphasis:

* catastrophic defeat should remain able to continue play through coerced body replacement when continuity-bearing substrate survives, instead of defaulting straight to final death
* the new body class may preserve mind and allegiance while radically changing external classification, class function, and social treatment
* body-conversion continuation should therefore remain a valid mid-scenario ruleset shift rather than a narrative-only rescue

This concept stays inside that issue’s boundary.

- 2026-04-24T16:19:32.061Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/656). All replies are displayed in both locations.

---

## SPE-296 - Staged necromantic control and host command
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, core-loop, system
- Created: 2026-04-22T01:00:38.491Z
- Updated: 2026-04-26T00:40:07.440Z

### Description
Goal:  
Implement a bounded necromantic control layer so disguise, transport, host occupation, construct fabrication, and undead command progress as linked operational stages rather than isolated one-off effects.

Scope:

* support staged necromantic capabilities from concealment and movement through possession and command
* support corpse-host or body-maintenance states where relevant
* support construct-undead fabrication and later command-hierarchy growth
* connect the layer to covert organizations, artifact use, and long-term faction operations where relevant

Constraints:

* deterministic only
* no unrestricted necromancy sandbox
* no assumption that necromancy is only encounter-local damage or summon output
* prefer compact stage packages over sprawling spell-tree simulation

Acceptance criteria:

* at least one necromantic path escalates through more than one operational stage
* at least one organization or long-horizon actor can sustain that control layer over time
* targeted tests or validation examples cover deterministic staged necromantic behavior

### Relations
_No relations_

### Comments
- 2026-04-26T00:40:07.449Z
Reconciliation update

Implementation emphasis:

* possession handling should remain layered, distinguishing full override, subtle cohabitation, and brief emergency seizure rather than one binary dominated state
* body-hopping or misery-fed possessors may also obey opportunistic nearest-host rules instead of always choosing optimal targets, preserving a difference between predatory intelligence and host-acquisition logic
* worship- or adoration-fed dormancy should likewise remain able to keep a corpse or avatar asleep until ritual maintenance fails, at which point the same entity wakes as a controller-scale threat

This concept stays inside that issue’s boundary.

- 2026-04-25T20:42:09.346Z
Reconciliation update

Implementation emphasis:

* possession should remain layered, distinguishing full override, subtle cohabitation, and brief emergency seizure rather than one binary dominated state
* body-hopping or misery-fed possessors may also obey opportunistic nearest-host rules instead of always choosing optimal targets, preserving a difference between predatory intelligence and possession acquisition logic
* worship- or adoration-fed dormancy should remain able to keep a corpse or avatar asleep until maintenance falters, at which point the same entity wakes as a controller-scale threat

This concept stays inside that issue’s boundary.

- 2026-04-25T20:26:44.897Z
Reconciliation update

Implementation emphasis:

* cult initiation may use blood-oath bonds that create remote tracking and punishment channels, with ceremonies exposing interruption vulnerabilities before the recruit understands the full trap
* host body theft can also route through fetish-like tools plus stolen personal objects, with the victim soul warehoused in a bespoke receptacle after displacement
* bargains and control pacts should be enforced literally and subverted in spirit, keeping wording itself as a trap surface rather than flavor text

This concept stays inside that issue’s boundary.

- 2026-04-25T15:06:50.381Z
Reconciliation update

Implementation emphasis:

* high-tier dead entities should be able to command subordinate cadres, deliberately create servants through explicit procedures, and retain selected prior-life skills or offices as part of their authority profile
* command ecosystems should stay broader than combat screens, including guardian layers, ritual servants, local collaborators, and role-bound controllers whose authority may attach to title, lineage, or carried object rather than one living master only
* breaking a control link should not imply neutralization if the released entity can revert to its own motive packet afterward

This concept stays inside that issue’s boundary.

- 2026-04-25T14:48:59.060Z
Contradiction check

Implementation emphasis:

* servant systems should not remain too combat-narrow if the intended frame expects surveillance, logistics, delegated research, magical subcommand, and coerced elite hierarchy as much as direct fighting
* if current minion ecosystems still underuse those noncombat roles, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T14:48:58.947Z
Reconciliation update

Implementation emphasis:

* apex servant ecosystems should remain broader than combat bodies, combining remote sensing through undead meshes, delegated standing orders, magical officer cadres, living disciples, and structurally coerced subliches or equivalent elite dependents
* subordinate ascension may occur under bondage terms where the superior retains the subordinate’s continuity anchor, preserving both obedience and rebellion pressure inside the same hierarchy
* companion or familiar essence may also be bundled into the same anchor architecture while still allowing instinct drift or disloyal spikes under stress

This concept stays inside that issue’s boundary.

- 2026-04-25T14:36:15.737Z
Contradiction check

Implementation emphasis:

* servant systems should not remain too combat-narrow if the intended frame expects surveillance, logistics, delegated research, magical command, and coerced elite hierarchy as much as direct fighting
* if current minion ecosystems still underuse those noncombat functions, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T14:36:15.700Z
Reconciliation update

Implementation emphasis:

* apex servant ecology should remain broader than combat bodies, combining remote sensing through undead meshes, delegated order packets, magical officer classes, living disciples, and structurally coerced subliches or equivalent elite subordinates
* subordinate ascension may also be granted under bondage terms where the superior retains control over the continuity anchor, creating rebellion pressure without removing obedience entirely
* companion entities can share or partially cohabit the same anchor architecture, preserving loyalty while allowing instinct drift and moments of dangerous deviation

This concept stays inside that issue’s boundary.

- 2026-04-25T09:44:09.114Z
Contradiction check

Implementation emphasis:

* conversion systems should not remain too individually modeled if the intended frame expects transformed servants to function as linked networks under one master rather than as disconnected brutes
* if current servant-conversion handling still underuses mesh obedience and shared command state, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:44:09.081Z
Reconciliation update

Implementation emphasis:

* some transformed servant classes should operate as telepathic mesh populations under one master, sharing obedience and limited awareness through the controlling nexus rather than as purely individual brutes
* master-linked conversions should therefore remain distinct from isolated transformation outcomes, especially where a faction depends on synchronized servant behavior

This concept stays inside that issue’s boundary.

- 2026-04-25T09:26:58.517Z
Contradiction check

Implementation emphasis:

* charisma should not remain too appearance-centric for transformed or undead bodies if command presence, domination, and force of will are intended to do the real social work
* if current charismatic value still overweights attractiveness where ontology makes that secondary, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:26:58.486Z
Reconciliation update

Implementation emphasis:

* command-oriented social presence should remain able to matter more than beauty for undead or monstrous bodies, with authority over lesser undead, domination bandwidth, and force of will reading as primary charisma surfaces where ordinary attractiveness is no longer central
* autonomous undead may also sit uneasily between controller and commanded populations, so command presence should support intimidation, hierarchy, and unstable obedience rather than social charm alone

This concept stays inside that issue’s boundary.

- 2026-04-22T01:00:40.737Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/296). All replies are displayed in both locations.

---

## SPE-269 - Staged parasitic host conversion
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-19T22:32:29.841Z
- Updated: 2026-04-27T12:24:33.464Z

### Description
Goal:  
Implement staged parasitic host conversion so implanted anomaly cores rewrite hosts through visible, deterministic progression instead of one-step curse logic.

Scope:

* support implanted or attached anomaly cores that progressively rewrite a host body and capability profile
* let the process advance through visible stages before full conversion
* support delayed attribute drain, cure windows, and later loss of control or actor replacement
* connect progression to body-plan reveal, cognition loss, new actor emergence, transformation, possession, and hidden-state systems
* preserve inspectable stage state suitable for intervention and long-horizon consequence handling

Constraints:

* deterministic only
* no instant-transform default for all parasitic effects
* no need for full biological simulation
* prefer compact staged lifecycle rules over sprawling infection trees
* keep cure timing and stage progression legible enough for players to act on them

Acceptance criteria:

* at least one host conversion advances through more than one stage
* at least one stage changes the host before full replacement
* at least one cure window matters before the hard end state
* targeted tests cover deterministic staged host conversion, drain progression, and cure timing

### Relations
_No relations_

### Comments
- 2026-04-27T12:24:33.532Z
Contradiction check

Implementation emphasis:

* internal-threat handling should not assume that extraction is the safe default treatment if some parasites kill the host when forcibly removed
* infection logic should also not assume that additional infestation always worsens the host in one linear direction, since antagonistic co-infection may sometimes destroy the parasite pair instead

This keeps extraction-as-default-treatment and linear infection-escalation contradiction checks visible inside the staged parasitic host-conversion boundary.

- 2026-04-27T12:24:33.484Z
Reconciliation update

Implementation emphasis:

* parasitic infections should support nonobvious neural lodging such as deep-brain anchor sites rather than only obvious spine, chest, or surface cavities
* host behavior may be overwritten through neurochemical modulation, with aggression, panic, or homicidal impulse driven by the parasite's manipulation of the host body instead of pure possession theater
* visible subdermal movement, migrating neck swellings, and similar live body-surface clues should remain valid early signals before full confirmation
* some parasite classes should remain operationally catastrophic even at one surviving specimen if they can self-reproduce, hide inside the last trusted survivor, and continue the cycle from a tiny host pool

This keeps neural lodging, neurochemical overwrite, live infestation cues, self-reproduction, and last-carrier reversal inside the staged parasitic host-conversion boundary.

- 2026-04-25T20:26:44.808Z
Reconciliation update

Implementation emphasis:

* hostile extradimensional infiltrators should be able to enter through moral resonance with a compromised host, progress by staged body and moral rewrite, and complete replacement only after repeated vice-aligned acts harden the link
* early reversal should remain possible through expulsion or major good acts, while late intervention may displace, deform, or kill the host instead of restoring them cleanly
* voluntary summoning, host resonance, and later body theft should stay distinct ingress paths rather than one generic possession model

This concept stays inside that issue’s boundary.

- 2026-04-21T01:33:33.041Z
Contradiction check

The current project should not collapse hostile soldier states into simple alive-or-dead handling.

Implementation emphasis:

* if enemy lifecycles still underweight infection, feral conditioning, poison selection, rage states, cure chains, and elite upgrade lines, that should be treated as a contradiction in hostile-state modeling

This keeps the contradiction check visible inside the staged host-conversion boundary.

- 2026-04-20T03:59:08.745Z
Reconciliation update

Fold parasitic incubation with delayed attribute drain into this issue.

Implementation emphasis:

* some implanted infections should incubate over time and progressively drain specific attributes or core capacities before death rather than resolving as immediate poison or ordinary damage only
* curative timing should therefore matter, with late intervention preserving a meaningful delayed-threat profile

This keeps parasitic incubation and delayed stat-drain behavior inside the staged host-conversion boundary.

- 2026-04-19T22:33:01.013Z
Contradiction check

The current project should not default transformation to instant curse logic.

Implementation emphasis:

* if transformation and replacement systems still lean too heavily toward one-step conversion rather than staged core-driven rewrite where appropriate, that should be treated as a contradiction

This keeps the contradiction check visible inside the staged parasitic host-conversion boundary.

- 2026-04-19T22:32:31.017Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/271). All replies are displayed in both locations.

---

## SPE-258 - Delayed death-conversion with staged cure windows
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-19T22:10:32.167Z
- Updated: 2026-04-25T20:28:48.337Z

### Description
Goal:  
Implement delayed postmortem conversion so consumables, baths, bites, or similar effects can provide short-horizon benefit while planting a later death-triggered transformation state.

Scope:

* support consumables, immersion effects, or contact vectors that apply delayed postmortem conversion state
* allow immediate living benefits and later corpse conversion to coexist in one authored packet
* support visible staged progression, delayed attribute drain, cure windows, and eventual hostile or transformed emergence
* scale conversion result or progression severity by victim tier, class, or biology where relevant
* connect the layer to attrition, corpse handling, undead and transformed actor systems, and cure logic
* preserve inspectable delay and stage state suitable for player planning and debugging

Constraints:

* deterministic only
* no assumption that all death conversion happens instantly on exposure
* no single uniform converted result for all targets by default
* prefer compact delayed-state and conversion tables over sprawling undead ontologies
* keep cure timing and stage progression legible enough for intervention play

Acceptance criteria:

* at least one consumable, bath, or contact vector applies a delayed death-trigger conversion state
* at least one conversion result or progression path scales by target tier or class
* at least one cure window closes partway through the progression
* targeted tests cover deterministic delayed trigger, death conversion, cure timing, and tier-scaling behavior

### Relations
_No relations_

### Comments
- 2026-04-25T20:28:48.344Z
Reconciliation update

Implementation emphasis:

* plague packets should be able to function as ritual-world prerequisites as well as public-health crises, with staged decline moving through weakness, breathing trouble, sores, motor failure, and death rather than one flat sick state
* epidemic pressure should also drive civic expulsion, quarantine, and street-population changes rather than remaining isolated to bedside treatment

This concept stays inside that issue’s boundary.

- 2026-04-25T15:09:54.490Z
Reconciliation update

Implementation emphasis:

* transmitted conditions may scale infection risk by accumulated damage dealt rather than binary hit/no-hit events only
* suppression consumables may temporarily stall full progression for a few days without curing the underlying condition, preserving delay as bypass rather than removal

This concept stays inside that issue’s boundary.

- 2026-04-25T15:06:50.268Z
Reconciliation update

Implementation emphasis:

* contact afflictions should support delayed onset, source-obscured attribution, and family-specific payload variance, so one touch channel may deliver rot, convulsion, blindness, hemorrhage, dehydration, or other authored outcomes rather than one default disease only
* some conditions should explicitly suppress natural and magical healing until a target-specific cure path is met, preserving a distinction between restoration denial and ordinary damage
* delayed release of the worst symptoms should remain an authorable hostile choice where relevant, increasing diagnosis pressure and allowing apparent recovery to collapse later

This concept stays inside that issue’s boundary.

- 2026-04-25T14:47:50.821Z
Contradiction check

Implementation emphasis:

* kill-first doctrine should not be assumed for every infectious mutable state if the intended frame expects root-source dependency, multi-step cure gates, and survivable intervention windows
* if current hostile-response handling still overdefaults to extermination where cure remains viable, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T14:47:50.790Z
Reconciliation update

Implementation emphasis:

* cure logic for transmissive mutable states should remain multi-phase, requiring source elimination, personal restitution or atonement, and a final active-state rite rather than one generic cleanse
* final cure stages may require exact ordering of absolution, disease purge, and curse removal, full conscious endurance through pain, and zero movement during the terminal phase
* failed cure attempts should remain able to snap directly into hostile retransformation and frenzy instead of merely wasting a resource

This concept stays inside that issue’s boundary.

- 2026-04-25T14:45:05.041Z
Contradiction check

Implementation emphasis:

* kill-first doctrine should not be assumed for all infectious mutable states if the intended frame expects meaningful cure chains, source resolution, and survivable intervention windows
* if current hostile-response handling still overdefaults to extermination where cure remains viable, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T14:45:05.001Z
Reconciliation update

Implementation emphasis:

* cure logic for transmissive mutable states should remain multi-phase, requiring source elimination, personal restitution or atonement, and a final active-state ritual rather than one generic cleanse
* stacked infections may need root-selection logic tied to whichever source established the active phenotype, and cure attempts can catastrophically fail back into hostile transformation or frenzy if the ritual chain is broken
* some rituals may also require exact ordering of absolution, disease purge, and curse removal, along with full conscious endurance through the final stage

This concept stays inside that issue’s boundary.

- 2026-04-25T09:47:45.873Z
Contradiction check

Implementation emphasis:

* undead or anomaly infection should not remain too binary if the intended frame expects day-by-day progression, escalating cure thresholds, casting disruption, and triage pressure
* if current infection handling still over-compresses that progression, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:47:45.836Z
Reconciliation update

Implementation emphasis:

* progressive infection should remain day-by-day rather than binary, with staged attribute loss, spellcasting disruption, and cure requirements that scale with elapsed progression instead of one cleanse threshold for all cases
* some conversion outcomes may also depend on how an infected body is finished, so kill method and ritual treatment can determine whether the target becomes one undead class, another, or a stronger upgraded result
* live-body ritual conversion pipelines should therefore remain distinct from ordinary death-trigger transformation

This concept stays inside that issue’s boundary.

- 2026-04-25T09:44:08.663Z
Reconciliation update

Implementation emphasis:

* restoration failure should be able to produce hostile or transformed ontology outcomes rather than simple null results, with the exact converted class reading from target tier, body quality, or other bounded criteria
* failed raise, resurrection, or reincarnation equivalents should therefore remain part of the transformation pipeline, not just a dead-end spell failure state

This concept stays inside that issue’s boundary.

- 2026-04-25T09:27:59.768Z
Contradiction check

Implementation emphasis:

* death handling should not collapse body death, active life state, stored extracted vitality, and final irrecoverable self-state into one binary flag if remote theft, reservoir storage, survivor restoration, and unrecoverable soul loss are all intended to coexist
* if current recovery logic still treats resurrection as identical to full anatomical repair, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T01:10:27.134Z
Reconciliation update

Implementation emphasis:

* transmissive beast-state conditions should keep delayed incubation, early cure windows, and channel-specific exposure rules instead of one binary immediate infection model
* cure logic should vary by origin class, with inherited, transmitted, and curse-derived cases not sharing one uniform treatment path
* temporary infected-operator arcs should remain valid as dramatic short-run pressure, where the problem is investigation, containment, and timing rather than simple combat victory

This concept stays inside that issue’s boundary.

- 2026-04-24T15:32:20.043Z
Reconciliation update

Implementation emphasis:

* life-state handling should continue to support acting below ordinary terminal thresholds during a bounded delay window, while separate fields can suppress healing and regeneration entirely even from items and consumables
* nonbinary survivability should also include forensic replay and precise life-detection support rather than collapsing the whole stack to alive versus dead only

This concept stays inside that issue’s boundary.

- 2026-04-23T06:08:50.398Z
Reconciliation update

Implementation emphasis:

* touch-loaded hazard payloads may transfer a bounded infectious or corruptive state into one target only, then terminate rather than propagating indefinitely
* contact vectors should therefore support explicit onward-spread limits instead of assuming every infection source becomes a chain outbreak

This concept stays inside that issue’s boundary.

- 2026-04-22T05:30:25.867Z
Reconciliation update

Fold delayed bite-borne conversion with staged physical and behavioral progression into this issue.

Implementation emphasis:

* contact afflictions may progress over days through visible stages rather than one instant transformation
* cure windows may close partway through the progression, creating finite intervention timing before a hard hostile end state
* full maturation may lock the target out of ordinary control or taming surfaces

This keeps delayed infection progression, cure-window tracking, and hard no-control end states inside the delayed-conversion boundary.

- 2026-04-19T22:10:33.193Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/256). All replies are displayed in both locations.

---
