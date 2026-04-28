# Review Packet

Generated: 2026-04-28T11:39:22.879Z
Issues: SPE-125, SPE-82, SPE-405, SPE-378, SPE-425

## SPE-125 - Cursed life-anchor relics and transfer fallout
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 3
- Labels: simulation, system, core-loop
- Created: 2026-04-18T03:07:34.835Z
- Updated: 2026-04-28T00:26:01.306Z

### Description
Goal:  
Implement a bounded relic layer so certain artifacts can anchor, preserve, transfer, or corrupt a life-state at severe long-term cost instead of functioning as ordinary beneficial items.

Scope:

* support relics that preserve or tether an actor's continued existence through an external anchor object
* allow removal, transfer, or misuse of the anchor to trigger catastrophic outcomes such as death, madness, undeath, progression loss, or body corruption
* support carriers or later holders becoming degraded over time through curse spread, drain, or imposed transformation rather than suffering one instant effect only
* distinguish preserving life, transferring burden, and corrupting the host so not all life-anchor relics behave as simple immortality devices
* connect the layer to existing relic authoring, medical response, identity-state, and bound-entity systems where appropriate

Constraints:

* deterministic only
* no universal resurrection-item sandbox
* no flattening of severe curse state into a small temporary debuff
* prefer a small number of explicit anchor-state patterns over many bespoke phylactery variants
* keep cause and consequence legible enough for player explanation and long-term state review

Acceptance criteria:

* at least one relic can preserve or tether a life-state externally
* at least one direct handling path can kill or catastrophically harm the remover or wearer
* at least one later carrier can accumulate corruption, drain, or transformation over time
* targeted tests cover deterministic anchor persistence, transfer/removal outcomes, and long-horizon curse consequences

### Relations
_No relations_

### Comments
- 2026-04-28T00:26:01.330Z
Reconciliation update

Implementation emphasis:

* anchor identity should remain able to persist at the material level, so a murder-linked object can survive melting, reforging, splitting, and repurposing while still carrying the hostile bind
* gifts and heirlooms should remain valid transfer routes for that danger, letting institutional material become a personal wearable without losing the underlying anchor state
* carried jewelry and other worn objects should therefore be included in sweep logic whenever distributed-anchor material is still unresolved
* if current anchor handling still assumes named-object continuity is required for persistence, that should be treated as a contradiction
* if current anchor handling still assumes one active anchor per entity, that should be treated as a contradiction

This keeps transformed anchor material, heirloom transfer, carried-anchor risk, and the contradiction checks inside the cursed life-anchor boundary.

- 2026-04-25T20:26:45.291Z
Reconciliation update

Implementation emphasis:

* curse architecture should support escalating severities from inconvenience through lethal transformation, with focus items improving reliability on a gradient from owned item to touched item to crafted effigy
* every curse should preserve a break condition, loophole, or paradox failure path, and the original curser should remain able to withdraw the curse directly where that family allows it

This concept stays inside that issue’s boundary.

- 2026-04-25T15:09:54.090Z
Reconciliation update

Implementation emphasis:

* some death-triggered curses should invert trusted gear into authored liabilities, including near-never-hit weapons, protection that attracts harm, and other postmortem item rewrites rather than simple stat penalties
* visible permanent body marks may also function as cross-region faction hostility flags, changing future reactions long after the originating event is over

This concept stays inside that issue’s boundary.

- 2026-04-25T15:08:26.115Z
Reconciliation update

Implementation emphasis:

* theft-triggered curse objects may drive timed transformation over a fixed clock, halt when discarded, yet still leave partial permanence if the process was interrupted late rather than cleanly reversing to baseline
* cursed weapon ownership can also bind through separation obsession and daily kill pressure, with missed feeding escalating body gain, mental decline, and eventual irreversible bestial lock-in
* relic handling should therefore support multi-path destruction, origin-sensitive break clauses, and purpose-fulfillment shatter conditions instead of one canonical disposal rule

This concept stays inside that issue’s boundary.

- 2026-04-25T14:48:58.722Z
Contradiction check

Implementation emphasis:

* anchor objects should not remain too generic if the intended frame expects careful construction, placement tradeoffs, access logistics, and destruction consequences to shape the whole apex lifecycle
* if current external-anchor handling still overreads them as simple inventory, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T14:48:58.668Z
Reconciliation update

Implementation emphasis:

* external soul anchors should remain precisely engineered continuity objects, with construction details, concealment-versus-access tradeoffs, and destruction aftermath all treated as first-class design surfaces rather than generic special loot
* some ascension paths should also hinge on exact ritual timing, lethal ingestion, and a short helpless interval before the new apex state is fully operational
* long-cycle maintenance rites may be existentially necessary, with missed upkeep degrading power, bodily integrity, and command authority over time rather than merely weakening one subsystem

This concept stays inside that issue’s boundary.

- 2026-04-25T14:36:15.674Z
Contradiction check

Implementation emphasis:

* anchor objects should not remain too generic if the intended frame expects careful construction, placement tradeoffs, access logistics, and destruction consequences to shape the whole apex lifecycle
* if current external-anchor handling still overreads them as simple special inventory, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T14:36:15.582Z
Reconciliation update

Implementation emphasis:

* external soul anchors should remain precisely crafted behavior-shaping objects rather than generic tagged loot, with construction details, concealment constraints, reactivation access needs, and destruction fallout all treated as first-class design surfaces
* some apex transformations should hinge on exact ritual timing, lethal ingestion, and a post-ascension helpless interval before full functionality returns
* long-cycle maintenance rites may also be existentially necessary, with missed upkeep degrading power, minion control, and body integrity over time rather than simply toggling the entity off

This concept stays inside that issue’s boundary.

- 2026-04-25T09:24:51.140Z
Reconciliation update

Implementation emphasis:

* curse structures may sustain a survivor through daily toxic maintenance, where the required substance preserves life or youth but imposes nausea, weakness, revulsion, or comparable ongoing punishment
* refusal of that sustaining input may trigger accelerated aging or collapse without granting clean release, preserving immortality as a punitive lock rather than a benefit
* curse packets should therefore allow life-preserving upkeep loops whose maintenance cost is itself part of the horror state

This concept stays inside that issue’s boundary.

- 2026-04-25T09:22:28.959Z
Reconciliation update

Implementation emphasis:

* some murder-linked relics may bind their next carrier through first bare-skin blood contact rather than voluntary attunement or ordinary pickup
* those relics may accumulate pain, terror, or comparable emotional residue across killings and feed that burden back into the holder's behavior, pressure, and corruption path over time
* the murder cycle may also recur on a long periodic chain tied to transfer of the object rather than to one isolated bearer only

This concept stays inside that issue’s boundary.

- 2026-04-25T01:24:28.456Z
Reconciliation update

Implementation emphasis:

* some cursed items should permanently rewrite the user into a hybrid predator body rather than applying a temporary buff, with specific body-plan changes, altered movement, and persistent curse logic bound to the item
* those transformations may also disable or lock out specific powers in one form while leaving them available in another, preserving form-specific capability gaps instead of universal inheritance
* destroying or removing the linked focus component should remain a valid defeat or cure path for these cursed-body states

This concept stays inside that issue’s boundary.

- 2026-04-24T23:49:29.566Z
Reconciliation update

Implementation emphasis:

* cursed objects may create false-ghost conditions that perfectly mimic haunting or undeath while the victim is still technically alive, continuing to bind, isolate, and reassert themselves after apparent cure windows
* bound curse-items should therefore support temporary suppression followed by later reactivation and reacquisition risk instead of one clean resolved-or-destroyed state only

This concept stays inside that issue’s boundary.

- 2026-04-18T03:07:35.615Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/124). All replies are displayed in both locations.

---

## SPE-82 - Compound analysis, antidotes, and consumable specialist lane
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-15T21:11:02.331Z
- Updated: 2026-04-27T08:56:36.596Z

### Description
Goal:  
Implement the compound specialist lane so analysis, antidotes, toxins, and consumable synthesis are owned by a clear specialist path instead of being scattered across generic crafting and medicine.

Scope:

* define a specialist lane for compound identification, contamination detection, antidote preparation, and bounded consumable manufacture
* support production rules with explicit cost, time, sample advantage, sourcing, and synthesis risk
* support cumulative toxin burden, delayed onset, partial neutralization, and limited-duration weapon payloads as reusable state flows
* support heuristic compound reading where context and partial cues improve confidence without granting instant perfect identification
* support specialist-only leverage from certain research or artifact assets where that lane should gain deeper utility than general operators

Constraints:

* deterministic only
* no full item-crafting sandbox for every role
* no universal toxin access across all operators
* prefer compact compound families and explicit synthesis rules over giant recipe catalogs
* reuse existing medical-response, support-asset, and research systems where possible

Acceptance criteria:

* at least one specialist lane explicitly owns compound analysis and antidote preparation
* at least one consumable family uses cost, time, and research gates for production
* cumulative toxin burden and partial neutralization are represented in a reusable flow
* at least one weapon-applied payload has bounded duration, potency window, or limited-use behavior
* targeted tests cover deterministic identification, antidote application, toxin lifecycle, and consumable production outcomes

### Relations
_No relations_

### Comments
- 2026-04-27T08:56:36.606Z
Reconciliation update

Fold countermeasure-specific immunity, ineffective-attack escalation, and generic-weapon-effectiveness contradiction risk into this issue.

Implementation emphasis:

* some anomaly classes should ignore ordinary weapons while remaining vulnerable to narrow material, thermal, chemical, or ritual counters
* ineffective attacks may still worsen the situation by increasing aggression, changing target priority, or switching the entity from capture to kill behavior
* current combat handling should not assume ordinary weapons are broadly useful against all physical threats

This keeps narrow vulnerability windows, ineffective-attack escalation, and the contradiction check inside the countermeasure-analysis boundary.

- 2026-04-27T01:32:08.221Z
Reconciliation update

Implementation emphasis:

* hazard assessment should continue to separate identification, exposure pathway, dose-response logic, and final risk characterization rather than collapsing everything into one contamination flag
* mitigation and treatment should remain route-specific, so reducing inhalation risk does not imply dermal or ingestion safety, and proxy environmental measurements may stand in when personal dose data is unavailable
* decontamination and medical support should also remain differentiated by population class and condition family.

This keeps pathway-aware hazard analysis and route-specific mitigation inside the compound-analysis and consumable-response boundary.

- 2026-04-26T10:27:30.351Z
Reconciliation update

Implementation emphasis:

* forbidden laboratories should remain both lore nodes and hazard spaces, revealing a villain’s specialty through tools, prototypes, residue, torture apparatus, failed subjects, and active experimental infrastructure rather than documents alone
* specialized anti-operator guardians may also prioritize a target class such as psions, mediums, or other specialists first, treating them as the primary threat even when other intruders are present

This keeps experimental lab hazard identity and anti-specialist countermeasure design inside the specialist-analysis and research-lab boundary.

- 2026-04-24T11:21:24.680Z
Reconciliation update

Implementation emphasis:

* toxins, sedatives, antidotes, and cure production should support identification, application, incapacitation, and nonlethal use rather than poison-as-damage only
* specialist analysis may distinguish compounds by sight, smell, taste, symptoms, and remedy path under explicit rules instead of generic cure-item behavior

This concept stays inside that issue’s boundary.

- 2026-04-18T10:14:40.993Z
Reconciliation update

Fold poison manufacture, sourcing, onset, movement penalties, and antidote dependency into this issue.

Implementation emphasis:

* poison systems should continue to distinguish acquisition path, craft cost, delayed onset, duration, and mobility or function penalties instead of collapsing into direct damage only
* antidote timing and specificity should remain first-class resolution states, especially for creature-specific venoms and prepared compounds

This keeps poison lifecycle and antidote logic inside the compound-analysis boundary.

- 2026-04-18T04:10:20.179Z
Reconciliation update

Fold delayed-onset poison and antidote dependency into this issue.

Implementation emphasis:

* poison systems should continue to distinguish sourcing, manufacture cost, onset timing, duration, and mobility or function penalties rather than collapsing to instant damage only
* antidote requirements and timing should remain first-class state transitions, especially for creature-specific venoms and black-market compounds

This keeps delayed poison lifecycle, movement penalties, and antidote logic inside the compound-analysis boundary.

- 2026-04-18T04:06:31.833Z
Reconciliation update

Fold poison manufacture, sourcing, onset delay, mobility penalties, and antidote dependency into this issue.

Implementation emphasis:

* poisons should expose acquisition path, crafting cost, delayed onset, and downstream mobility or function penalties instead of a flat damage tag only
* antidote timing and dependency should matter for reversal, making poison lifecycle a multi-step state rather than one immediate save-or-suffer event

This keeps poison lifecycle and antidote logic inside the compound-analysis boundary.

- 2026-04-18T02:46:44.519Z
Reconciliation update

Fold heuristic consumable identification and dual-use hazardous compounds into this issue.

Implementation emphasis:

* compounds may expose partial cues through color, storage position, local notes, residue, or container context without granting full certainty before testing or analysis
* dangerous substances such as acids, toxins, volatile agents, or corrosives should remain valid tools when correctly identified and deployed, not just penalties for misplay
* specialist analysis should improve confidence and safe use rather than replacing all inference with instant perfect identification by default

This keeps heuristic compound reading, partial certainty, and dual-use hazardous consumables inside the compound-analysis boundary.

- 2026-04-15T22:59:59.303Z
Reconciliation update

Fold specialist recovery and cleansing lane functions into this issue.

Implementation emphasis:

* a specialist lane may center on restoration, contamination detection, antidotes, and recovery support rather than direct confrontation power
* narrow-family detection verbs for toxins, disease, slimes, molds, phase-state contamination, or similar hazards should remain a role-defining part of that lane

This keeps recovery-specialist and contamination-detection lane scope inside the compound and antidote specialist boundary.

- 2026-04-15T22:59:13.146Z
Reconciliation update

Fold cumulative toxin burden, partial neutralization, limited-duration weapon toxins, and specialist asset privilege into this issue.

Implementation emphasis:

* toxins or contaminant systems may stack inside the body and escalate across repeated exposures rather than resolving as isolated one-off checks
* interventions may reduce that burden incrementally instead of flipping it off entirely
* some weapon-applied payloads should have short potency windows or limited charges once prepared
* specific specialist lanes may receive deeper utility from alchemical or restorative assets than general operators do

This keeps cumulative toxins, partial neutralization, and consumable payload behavior inside the medical and compound-specialist boundary.

- 2026-04-15T21:11:03.373Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/82). All replies are displayed in both locations.

---

## SPE-405 - Summon taxonomy and tiered families
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 3
- Labels: simulation, core-loop, system
- Created: 2026-04-22T05:50:53.646Z
- Updated: 2026-04-26T12:00:07.534Z

### Description
Goal:  
Implement a bounded summoning layer so some summon families escalate through discrete named tiers while others remain special-case summons with unique roles.

Scope:

* support summon ladders with numbered or tiered progression
* support special-case summon families such as familiars, stalkers, swarms, or elementals outside one generic ladder
* distinguish summon taxonomy from one undifferentiated summon action
* connect the layer to proxy actors and battlefield-only summon rules where relevant

Constraints:

* deterministic only
* no universal summon sandbox
* no assumption that every summon scales through one free parameter
* prefer compact summon-family packets over sprawling spell trees

Acceptance criteria:

* at least one summon family uses explicit tiered progression
* at least one summon family remains structurally distinct from that ladder
* targeted tests or validation examples cover deterministic summon-taxonomy behavior

### Relations
_No relations_

### Comments
- 2026-04-26T11:56:11.717Z
Reconciliation update

Implementation emphasis:

* staged summoning should remain able to draw from local substrate, produce temperament-mismatched obedience problems, and create future vendetta or service-liability even when the immediate ritual succeeds
* some environments should also intercept or substitute local hostile entities into the summon result instead of honoring the intended clean output

This keeps local-substrate summons, temperament-sensitive control, and lingering summon liability inside the summon-family boundary.

- 2026-04-26T11:31:52.280Z
Reconciliation update

Implementation emphasis:

* some support entities should be real runtime actors with explicit capability omissions, delayed activation, owner state, upkeep source, dismissal authority, and creator-loss collapse differences rather than full parity with baseline actors
* created ownership may also transfer under hostile control, moving upkeep, command, and dismissal rights to the new controller instead of leaving them with the original source

This keeps created-actor runtime state and ownership transfer inside the summon-family boundary.

- 2026-04-26T11:23:52.373Z
Reconciliation update

Implementation emphasis:

* summoning should remain constrained by available source material or substrate when the entity family requires it, with explicit duration, command scope, and dismissal handling
* some animated or summoned entities should also shift between low-fidelity and high-fidelity control depending on whether crude motion alone is present or shaping/control have been paired more precisely

This keeps material-gated summons and fidelity-banded animation control inside the summon-family boundary.

- 2026-04-25T20:26:44.946Z
Reconciliation update

Implementation emphasis:

* summoning should remain separate from control, with visible costly preparation, hard interruption points, and failure states that still leave residue, collateral damage, or partial arrival evidence
* some powerful entities should also resist or distort summoning if they read the destination as confinement, trap-world entrapment, or other hostile context rather than approaching every call symmetrically

This concept stays inside that issue’s boundary.

- 2026-04-24T15:32:19.747Z
Reconciliation update

Implementation emphasis:

* summon handling should continue to distinguish direct offense from indirect offense delivered through intermediaries, with active command bandwidth and communication required for precise summon use
* concentration break, loss of command, or hostile context should be able to reverse a summon into uncontrolled or hostile behavior rather than preserving passive obedience
* medium and environment should filter summon legality, so aquatic, planar, or otherwise specialized contexts only admit forms that can actually function there

This concept stays inside that issue’s boundary.

- 2026-04-24T15:28:38.940Z
Contradiction check

Implementation emphasis:

* summoning should not be assumed to create a controlled ally by default if some summon paths are better modeled as hostile displacement, unstable arrival, or zero-loyalty extraction from elsewhere
* if current summon handling still over-assumes obedience and clean return semantics, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T07:01:17.669Z
Reconciliation update

Implementation emphasis:

* setting-bound creature filters should support both positive myth-native curation and explicit deny-lists, so roster logic can exclude nonnative beings even when a wider global bestiary exists
* summon outputs should remain environment-aware and setting-filtered, with separate ecological tables for terrain and medium rather than one generic result pool

This concept stays inside that issue’s boundary.

- 2026-04-23T06:07:06.876Z
Contradiction check

Implementation emphasis:

* summon systems should not assume manifestation is clean, external, and channel-free
* body-channel occupancy, temporary speech lockout, captive power sources, and unstable anchored manifestations are all valid summon or release costs that may contradict a frictionless spawn model

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-22T09:26:16.946Z
Reconciliation update

Fold command-bound summoned formations and one-active-instance summon bags into this issue.

Implementation emphasis:

* some summon items should work only in specific contexts such as battles, while directly inheriting obedience and skipping ordinary morale behavior
* token or bag summons may limit total weekly draws and allow only one active instance at a time

This keeps context-gated mass summon items and one-active summon bag logic inside the summon-family boundary.

- 2026-04-22T05:54:14.470Z
Reconciliation update

Fold aggregate-capacity summon budgeting, no-morale created entities, spell-created proxy bodies, ordered multi-target resolution, and sensory-triggered effect channels into this issue.

Implementation emphasis:

* summoned or created entities may be budgeted by total hits, levels, or aggregate capacity rather than only by one named unit type
* created helpers may ignore ordinary morale assumptions and instead obey simplified control states
* some effects should instantiate proxy bodies such as hands, hammers, staves, or temporary servants with their own stat-like behavior
* some multi-target effects should resolve in ordered chains or weakest-first budgets instead of uniform simultaneous application
* triggers may depend on sight, hearing, or proximity-glyph contact rather than direct target selection only

This keeps summoned-capacity budgets, proxy bodies, ordered target routing, and sensory channels inside the summon and proxy framework.

- 2026-04-22T05:50:54.901Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/406). All replies are displayed in both locations.

---

## SPE-378 - Nonstandard kill conditions and defeat procedures
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, core-loop, system
- Created: 2026-04-22T05:30:53.364Z
- Updated: 2026-04-27T12:24:33.758Z

### Description
Goal:
Implement a bounded defeat layer so some anomalies require bespoke interaction procedures instead of ordinary damage races to neutralize.

Scope:

* support enemies defeated through custom verbs, ingestion, containment, ritual, or other special procedures
* allow those procedures to replace normal kill logic in bounded cases
* support special risk states during the defeat sequence
* connect the layer to puzzle encounters, item activation, and anomaly handling where relevant

Constraints:

* deterministic only
* no universal bespoke minigame for every boss
* no assumption that every enemy is solved by damage throughput
* prefer compact defeat procedures over sprawling scripted fights

Acceptance criteria:

* at least one hostile entity uses a nonstandard defeat procedure instead of ordinary kill logic
* at least one procedure includes its own risk or failure states
* targeted tests or validation examples cover deterministic bespoke defeat behavior

### Relations
_No relations_

### Comments
- 2026-04-27T12:24:33.765Z
Reconciliation update

Implementation emphasis:

* compromised survivors may sometimes choose deliberate self-termination as the only remaining containment action once loss of control seems imminent and no host-safe cure window remains
* this should remain distinct from panic or despair, reading as a bounded containment decision with real threat-suppression value

This keeps self-termination containment choices inside the nonstandard defeat-procedure boundary.

- 2026-04-26T11:13:11.113Z
Reconciliation update

Implementation emphasis:

* overwhelming-force encounters should remain explicitly hide-or-die or comply-or-die situations, where concealment, surrender, or total avoidance are the only viable responses and direct combat is invalid by design
* some predator or hunting parties may also obey ritual sport constraints, disengaging after one trophy, obeying rank rules, or limiting their own movement options under the terms of the hunt

This keeps overwhelming-force avoidance and rule-bound predator-hunt behavior inside the non-fightable threat boundary.

- 2026-04-26T11:00:08.223Z
Reconciliation update

Implementation emphasis:

* nonstandard kill conditions should include existential or informational defeat paths that bypass ordinary attrition when specific target-class, knowledge, and delivery conditions are met
* those defeat paths should remain tightly gated by target category, so a forbidden phrase, symbol-state countermeasure, or other absolute condition may work on patron-scale beings, remnants, or bound proxies without becoming a universal combat shortcut
* some successful countermeasures may also carry mandatory operator cost, including lethal or effectively terminal sacrifice, when the artifact or procedure is designed as a one-use mutual-destruction solution

This keeps target-class-gated existential defeat and sacrificial success conditions inside the nonstandard defeat-procedure boundary.

- 2026-04-26T10:52:05.534Z
Reconciliation update

Implementation emphasis:

* nonstandard defeat endpoints should include preserved, absorbed, fused, entombed, routed into unknown transit, trapped-by-visit-count, or merged-into-environment outcomes rather than HP death alone
* some threats may be escapable only by environmental displacement or route severance rather than direct combat, preserving relocation-only defeat conditions where ordinary counters fail

This keeps environmental capture endpoints and relocation-only defeat inside the nonstandard defeat boundary.

- 2026-04-26T10:30:58.074Z
Reconciliation update

Implementation emphasis:

* some anomalies should require a multi-step permanent neutralization chain involving body destruction, vessel destruction, and restoration of a broken containment structure rather than a single kill endpoint
* restoring a missing physical key component to a seal, circle, or ward may therefore matter as much as defeating the active form
* tactical victory over one current body should remain distinct from true removal whenever a source spirit, vessel, or damaged containment network can still reconstitute the threat

This keeps multi-condition anomaly neutralization inside the nonstandard defeat boundary.

- 2026-04-25T09:24:51.296Z
Contradiction check

Implementation emphasis:

* invulnerable bosses should not resolve as raw number checks only if sunlight windows, prior false damage becoming real, reconciliation-triggered stat collapse, or other symbolic state changes are meant to determine whether damage actually matters
* if current boss handling still over-assumes that enough ordinary damage always solves the encounter regardless of state condition, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T15:46:33.449Z
Reconciliation update

Implementation emphasis:

* corpse preparation and burial procedure should continue to alter postmortem anomaly risk through route handling, grave treatment, threshold marking, and other preventative protocols rather than passive funerary flavor only
* some hostile entities should remain safest to neutralize only when their resting place is known and they are breached in an inactive state, preserving lair discovery as part of reliable elimination doctrine
* some entities should also require multi-step destruction chains rather than one generic lethal threshold, with staking, dismemberment, burning, grave treatment, or equivalent chained steps as the real kill protocol
* release-condition removal should remain valid, so certain haunts or undead are resolved by correcting the original injustice or freeing bound remains rather than by brute force

This concept stays inside that issue’s boundary.

- 2026-04-24T11:55:57.570Z
Reconciliation update

Implementation emphasis:

* weakness-gated final neutralization should remain distinct from apparent destruction, so some hostile entities can be beaten temporarily yet return unless their specific defeat condition is satisfied
* this preserves a separation between tactical victory and true removal from the case file

This concept stays inside that issue’s boundary.

- 2026-04-22T05:30:54.448Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/379). All replies are displayed in both locations.

---

## SPE-425 - Capture-priority hostile behavior
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, core-loop, system
- Created: 2026-04-22T06:01:57.762Z
- Updated: 2026-04-28T00:21:08.080Z

### Description
Goal:  
Implement a bounded hostile-behavior layer so some enemies prioritize taking targets alive for ritual, labor, or staging value instead of simple kill optimization.

Scope:

* support live-capture preference in target selection and attack choices
* support prisoner stripping, holding, conditioning, or later ritual preparation as downstream states
* distinguish capture-priority behavior from generic nonlethal branches only
* connect the layer to prison systems, ritual rooms, and objective handling where relevant

Constraints:

* deterministic only
* no universal slave-raid simulator
* no assumption that every hostile force optimizes for immediate kills
* prefer compact capture-priority states over sprawling prison simulation

Acceptance criteria:

* at least one hostile group changes behavior because living captives have downstream value
* at least one combat or capture outcome differs materially from kill-first logic
* targeted tests or validation examples cover deterministic capture-priority behavior

### Relations
_No relations_

### Comments
- 2026-04-28T00:21:08.089Z
Reconciliation update

Implementation emphasis:

* some impostor predators should prefer nonlethal capture over immediate kill when living templates provide memory access, social leverage, or identity-maintenance value
* captives may therefore function as part of the hostile system rather than passive rescue timers alone
* if current captive handling still treats rescued or held victims only as objectives and not as capability sources for the anomaly, that should be treated as a contradiction

This keeps identity-motivated capture and the contradiction check inside the capture-priority hostile boundary.

- 2026-04-26T10:30:57.827Z
Reconciliation update

Implementation emphasis:

* enemy objective selection should remain conditional on target state, with some hostile groups preferring kill against armed or actively resisting targets but capture, drag, or transport against unarmed or vulnerable ones
* nonlethal defeat can therefore route into stripping, tying, bait placement, imprisonment, conversion prep, or source-entity delivery rather than one generic captive outcome
* opportunistic small-creature scavengers should remain valid capture-first actors when they avoid fair fights, stalk larger groups, and exploit isolation before committing

This keeps kill-versus-capture switching, nonlethal transport logic, and opportunistic abduction behavior inside the capture-priority boundary.

- 2026-04-25T14:47:50.974Z
Reconciliation update

Implementation emphasis:

* some infected lines may permit coarse source-to-progeny control only when both controller and progeny are in transformed states, preserving state-gated dominance rather than always-on puppetry
* that control should remain broad directive pressure rather than fine motor micromanagement, and may be supplemented by weak lineage-biased social trust or proximity sensing in some families
* newly activated hosts should also mature behaviorally from obvious frenzy toward more careful stealth predation over repeated episodes instead of staying static from first expression onward

This concept stays inside that issue’s boundary.

- 2026-04-25T10:28:18.238Z
Contradiction check

Implementation emphasis:

* downed operators should not be assumed out of play if the intended frame expects rerouting into capture, repurposing, or later rescue within the same hostile complex
* if current downed-state handling still over-assumes terminal removal, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T10:28:18.206Z
Reconciliation update

Implementation emphasis:

* capture-forward design should remain a primary encounter doctrine in enemy home territory, with incapacitation and abduction treated as intended outcomes rather than as edge-case failures
* downed operators can therefore be reassigned into slave-force, laboratory, or holding-state roles inside the same scenario instead of being assumed gone

This concept stays inside that issue’s boundary.

- 2026-04-25T10:24:28.416Z
Contradiction check

Implementation emphasis:

* killing or downing an operator should not be assumed to remove them from play if the intended frame expects capture, rerouting, conversion prep, or later rescue inside the same hostile complex
* if current downed-state handling still over-assumes out-of-play resolution, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T10:24:28.381Z
Reconciliation update

Implementation emphasis:

* some encounters should be capture-forward by design, with incapacitation and abduction treated as intended outcomes rather than failure states, especially in enemy home territory
* downed operators can therefore remain inside the scenario through hostile detention, conversion prep, or slave-force reassignment rather than automatic death or clean extraction
* key allies sustaining the only viable anti-boss condition may still die at climax, separating mission success from ally survival and preserving sacrifice as a valid end-state

This concept stays inside that issue’s boundary.

- 2026-04-25T09:47:46.141Z
Reconciliation update

Implementation emphasis:

* support target-capture priority AI for burrowing or ambush undead that value seizing specific live bodies over maximizing general kill count
* terrain-native undead may use subsurface movement, wake-trails, upward eruptions, and grab-first attack vectors so the ground itself becomes concealment and abduction pressure rather than just difficult terrain
* those same encounters can still deliver forensic signatures such as desiccated husks, half-buried victims, or woundless terror-corpses as part of the downstream clue surface

This concept stays inside that issue’s boundary.

- 2026-04-23T04:03:54.955Z
Reconciliation update

Implementation emphasis:

* some captors may maintain stable live-captive households with collaborators, frightened nonactors, resigned prisoners, and escape planners instead of simple kill chambers
* capture-first intent can therefore support differentiated prisoner attitudes, delayed rescue value, and long-horizon ownership behavior rather than one generic slave-state

This concept stays inside that issue’s boundary.

- 2026-04-22T07:56:17.405Z
Reconciliation update

Fold target-condition-sensitive live capture, hostage preparation, and ritual-use prisoner handling into this issue.

Implementation emphasis:

* some missions prioritize a living target in excellent condition over a kill
* hostile groups may prefer live capture because captives have later ritual, labor, or staging value
* prisoner handling may include stripping, conditioning, feeding, or intoxication as explicit pre-event stages rather than simple storage

This keeps live-target quality, capture-priority logic, and prisoner staging inside the capture-priority boundary.

- 2026-04-22T06:17:01.667Z
Reconciliation update

Fold live-specimen mission structure, optional dual-specimen bonus logic, and target-condition-sensitive capture priorities into this issue.

Implementation emphasis:

* some missions should track live-target preservation, transport, and return-state rather than kill, loot, or retrieve-object resolution
* baseline completion may accept one excellent specimen while a higher-value branch rewards multiple comparative specimens or stricter condition outcomes
* age tier and trainability can materially affect whether live capture is viable or worth attempting

This keeps live-capture return-state logic, multi-specimen bonus branches, and condition-sensitive capture objectives inside the capture-priority boundary.

- 2026-04-22T06:01:59.177Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/425). All replies are displayed in both locations.

---
