# Review Packet

Generated: 2026-04-28T10:25:30.643Z
Issues: SPE-844, SPE-126, SPE-924, SPE-547

## SPE-844 - Crisis spokesperson credibility and deployment
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 3
- Labels: simulation, system, core-loop
- Created: 2026-04-27T08:13:20.307Z
- Updated: 2026-04-28T01:17:35.856Z

### Description
Goal:
Implement a bounded spokesperson layer so the visible face of response materially affects trust, compliance, and accountability through suitability, early deployment, and explicit credibility pillars.

Scope:

* support spokesperson assignment based on both subject competence and communication fit rather than pure seniority
* support early visible deployment of the face of response during acute crisis onset
* support trust evaluation through explicit pillars such as empathy, competence, honesty, commitment, and accountability
* support nondefensive response posture built around regret, empathy, and forward motion rather than procedural defensiveness alone
* support reusable assessment and feedback loops for spokesperson skill growth and selection
* distinguish spokesperson credibility from general message composition or outlet logistics alone
* connect the layer to crisis communication and public-trust systems where relevant

Constraints:

* deterministic only
* no celebrity-simulation layer
* no assumption that any senior figure is automatically the best public representative
* prefer compact suitability, trust, and deployment rules over sprawling communications training prose
* keep current spokesperson fit, trust posture, and deployment state legible enough for planning and debugging

Acceptance criteria:

* at least one crisis selects a spokesperson by expertise and communication fit rather than rank alone
* at least one early visible appearance materially changes trust or orientation outcome
* at least one trust surface uses explicit credibility pillars rather than one flat charisma score
* targeted tests or validation examples cover deterministic spokesperson selection, deployment timing, and credibility effects

### Relations
- related: SPE-912 Response readiness assets and redundant communications
- related: SPE-853 Incident communication phase lifecycle
- related: SPE-911 Stakeholder notification matrix and escalation thresholds
- related: SPE-856 Communication command integration

### Comments
- 2026-04-28T01:17:35.565Z
Routing note

* keep this issue focused on spokesperson selection, suitability, deployment timing, validator fit, and credibility-pillar effects on trust and compliance
* route audience-segment message differentiation and relay-path differences to [SPE-836](https://linear.app/spectranoir/issue/SPE-836/audience-segmented-crisis-communication)
* route stakeholder selection, threshold-based notification duties, acknowledgement ladders, and formal notification channels to [SPE-911](https://linear.app/spectranoir/issue/SPE-911/stakeholder-notification-matrix-and-escalation-thresholds)
* route communication phase changes, phase objectives, and recovery/evaluation transition logic to [SPE-853](https://linear.app/spectranoir/issue/SPE-853/incident-communication-phase-lifecycle)
* route command-table participation, release sequencing, and communication feedback into operational decisions to [SPE-856](https://linear.app/spectranoir/issue/SPE-856/communication-command-integration)
* route redundant channels, readiness assets, fallback communications, and isolated analysis readiness to [SPE-912](https://linear.app/spectranoir/issue/SPE-912/response-readiness-assets-and-redundant-communications)

This keeps messenger-selection scope separate from audience design, notification governance, phase logic, command integration, and readiness support.

- 2026-04-27T08:28:55.762Z
Reconciliation update

Fold messenger credibility matching, expert trustworthiness framing, and local-trust variability into this issue.

Implementation emphasis:

* messenger quality should continue to vary by audience, with central officials, local clinicians, community leaders, survivors, and outside experts carrying different credibility depending on context
* expert use should remain paired with explicit trustworthiness framing rather than assuming expertise alone persuades the audience
* local actors should not be treated as automatic trust boosters if some are distrusted, politicized, or seen as captured by outside interests

This keeps audience-specific messenger credibility, expert trustworthiness framing, and the contradiction check inside the spokesperson-credibility boundary.

- 2026-04-27T08:22:49.309Z
Reconciliation update

Fold spokesperson ability over rank, backup spokespersons, third-party validators, training refresh, spokesperson prep space, and rank-equals-quality contradiction risk into this issue.

Implementation emphasis:

* spokesperson selection should continue to depend on ability, availability, stamina, and training rather than rank alone
* backup spokespersons and credible third-party validators should remain part of the trusted response surface when core officials are overloaded or distrusted
* spokesperson performance should improve or decay with refresh cycles, rehearsal access, and preparation quality rather than remaining static
* the system should not assume the highest-ranked official is automatically the best communicator

This keeps spokesperson quality, backups, validator networks, training refresh, prep support, and the contradiction check inside the spokesperson-credibility boundary.

- 2026-04-27T08:13:21.404Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/849). All replies are displayed in both locations.

---

## SPE-126 - Identity-overwrite traps and possession escalation
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-18T03:07:34.923Z
- Updated: 2026-04-28T02:52:19.110Z

### Description
Goal:  
Implement the identity-trap layer so mirrors, pools, vats, and similar surfaces can overwrite apparent identity, entrap consciousness, or escalate into possession instead of acting like ordinary hazards.

Scope:

* support cosmetic overwrite, idealized reflection, blended memory state, body-state replacement, and possession escalation as bounded identity effects
* support subtle transformation states that remain partially deniable or misread instead of always broadcasting themselves perfectly
* support long-duration consciousness entrapment where the mind remains aware but cannot leave except through bounded transfer or possession logic
* support apparent-form changes that alter authorization, hostility, ceremony, invitation, or social handling downstream
* support layered host/monster identity stacks, office-grade impersonation, and full-role replacement without collapsing them into ordinary disguise
* preserve clear distinction between truth-state, apparent form, and possession state for debugging and later consequence handling

Constraints:

* deterministic only
* no unrestricted body-hopping sandbox
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

## SPE-924 - Engineered anomaly populations with shared cognition drift
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 3
- Labels: simulation, system, core-loop
- Created: 2026-04-28T00:52:33.474Z
- Updated: 2026-04-28T02:52:19.110Z

### Description
Goal:
Implement a bounded engineered-population layer so anomalies can be deliberately manufactured as several near-identical human or human-adjacent instances with shared cognition, classified origin, escalating instability, and recursive continuation risk rather than behaving like isolated monsters.

Scope:

* support artificially created anomaly populations with altered biology, capability bundles, and embedded social covers rather than purely natural or supernatural origins
* support enhancement bundles that combine gains such as intelligence, strength, or coordination with built-in instability, psychosis, or other long-tail failure risk
* support distributed identity where several bodies may share one self-model, continuity claim, or partial group consciousness instead of one stable one-body identity
* support implicit coordination without overt communication, making group behavior appear synchronized even when no visible signal chain exists
* support behavioral drift where real outcomes accelerate ahead of the program's predicted failure schedule
* support successor generations or recursive continuation where the anomaly population can continue its own program logic after oversight fails
* support handlers, guardians, or assigned oversight figures becoming primary targets for removal once the population seeks autonomy
* support knowledge-based low-visibility attacks, where high-capability subjects use precise technical harm instead of brute force
* support extraction or recovery attempts against containment facilities by aligned or predecessor instances
* distinguish engineered anomaly populations from simple clone swarms, one-off body transfer, or ordinary institutional conspiracies alone
* connect the layer to identity displacement, containment-residence, classified-origin suppression, and case-cluster systems where relevant

Constraints:

* deterministic only
* no full clone-society simulator
* no assumption that creation quality guarantees behavioral control or timeline predictability
* prefer compact instance-state, cohort-state, and drift rules over sprawling biotech prose
* keep current instance identity, cohort linkage, predicted instability, and oversight status legible enough for planning and debugging

Acceptance criteria:

* at least one anomaly cohort is explicitly engineered rather than naturally occurring
* at least one enhancement bundle provides capability gain plus instability cost together
* at least one case supports more than one instance sharing distributed identity or implicit cognition
* at least one program shows divergence between expected instability timing and observed behavior
* at least one continuation path lets surviving instances propagate or preserve the originating program logic after oversight failure
* targeted tests or validation examples cover deterministic cohort identity, synchronized behavior, drift from predicted timelines, and recursive continuation risk

### Relations
_No relations_

### Comments
- 2026-04-28T02:52:18.785Z
Routing note

* keep this issue focused on engineered multi-body populations: shared self-model, implicit cohort coordination, instability drift across instances, and recursive continuation after oversight failure
* the subject here is a designed cohort of multiple manufactured bodies where distributed identity is an architectural property, not a trap-triggered outcome
* route single-entity identity displacement by environmental trap mechanics such as pools, mirrors, or vats to [SPE-126](https://linear.app/spectranoir/issue/SPE-126/identity-overwrite-traps-and-possession-escalation)
* route possession escalation within one host / controller chain to [SPE-126](https://linear.app/spectranoir/issue/SPE-126/identity-overwrite-traps-and-possession-escalation)
* route apparent-form changes creating downstream authorization or social fallout for one displaced entity to [SPE-126](https://linear.app/spectranoir/issue/SPE-126/identity-overwrite-traps-and-possession-escalation)
* route consciousness entrapment within one mind pending a bounded escape condition to [SPE-126](https://linear.app/spectranoir/issue/SPE-126/identity-overwrite-traps-and-possession-escalation)

`Embedded social covers` in this issue refers to manufactured individuals carrying a designed civilian persona as part of their construction. It does not extend to arbitrary trap-driven possession or identity-overwrite surfaces.

- 2026-04-28T00:52:34.726Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/933). All replies are displayed in both locations.

---

## SPE-547 - Haunt resolution through anchors, remains, and rites
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-23T04:07:48.662Z
- Updated: 2026-04-28T01:18:34.706Z

### Description
Goal:  
Implement a bounded haunt-resolution layer so unresolved dead are cleared through a repeatable workflow of subdual, diagnosis, body recovery, funerary handling, and sanctified closure rather than simple defeat.

Scope:

* support haunt states that persist until an attachment cause such as neglected remains, desecration, or unfinished rite is identified and cleared
* support a formal resolution chain including subduing the spirit, learning the haunting condition, finding the remains or grave, performing body care, and finalizing sanctioned burial or release
* distinguish temporary banishment from true resolution when the anchor condition still exists
* let neglected funerary upkeep function as a long-duration world state that can spawn recurrence until restored
* connect the layer to undead, knowledge, ritual, and site-maintenance systems where relevant

Constraints:

* deterministic only
* no freeform ghost-therapy sandbox
* no assumption that all undead resolution is combat-first
* prefer compact haunt-state packets over sprawling bespoke exorcism trees

Acceptance criteria:

* at least one haunt requires more than combat defeat to resolve permanently
* at least one banished entity returns automatically while its anchor condition remains unresolved
* at least one neglected funerary site can continue emitting haunt pressure until upkeep is restored
* targeted tests cover deterministic subdual, diagnosis, remains handling, and final closure

### Relations
_No relations_

### Comments
- 2026-04-28T00:46:24.757Z
Reconciliation update

Implementation emphasis:

* haunt resolutions should support false-clear states, where a ritual appears to work but a residual or misclassified presence remains active until a later confirmation window or fresh trigger proves otherwise
* protective manifestations may initially present with the same visual language as the hostile event and require recognition, relationship memory, or specialized interpretation before they are treated as nonhostile
* some final resolutions may occur through entity-versus-entity conflict, including sacrificial cancellation where a protective presence destroys the hostile one and is lost in the process
* local room history should matter, with nurseries, bedrooms, basements, and other spaces acting as weighted anomaly centers when they coincide with the original event geometry
* if current cleansing logic still assumes that ritual completion guarantees safety or removes every presence indiscriminately, that should be treated as a contradiction
* if current haunt logic still assumes the current threat must be the original killer or original victim, that should be treated as a contradiction

This keeps false clears, protective-versus-hostile recognition, sacrificial resolution, room-weighted centers, and the contradiction checks inside the haunt-resolution boundary.

- 2026-04-28T00:36:39.268Z
Reconciliation update

Implementation emphasis:

* some hazards should remain non-neutralizable during their active window, making withdrawal, moratorium, or preventing future occupation the correct resolution instead of immediate destruction
* discovery of buried remains should therefore remain an opening into expert analysis, oral history, timing, and land-use restriction rather than a near-complete resolution on its own
* if current case handling still assumes all haunt or curse cases must end in direct neutralization, that should be treated as a contradiction
* if current handling still assumes remains discovery nearly solves the case by itself, that should be treated as a contradiction

This keeps withdrawal-first resolution, nonoccupation outcomes, and the contradiction checks inside the haunt-resolution boundary.

- 2026-04-28T00:29:24.088Z
Reconciliation update

Implementation emphasis:

* some active windows may be functionally non-neutralizable in the moment, making withdrawal, moratorium, or preventing future occupation the correct resolution instead of immediate source destruction
* remains discovery should therefore remain only one step in the response chain when the real outcome depends on site restriction, commemorative respect, or stopping continued habitation over violated ground
* if current case handling still assumes neutralization is the mandatory end state for every haunting or curse case, that should be treated as a contradiction

This keeps withdrawal-first resolution, nonoccupation outcomes, and the contradiction check inside the haunt-resolution boundary.

- 2026-04-28T00:26:01.271Z
Reconciliation update

Implementation emphasis:

* haunt cases should support temporary disruption through narrow repellents or sanctified ammunition that buy time without creating false permanent resolution
* remains destruction should remain insufficient when a murder weapon, relic, heirloom, or other death-linked object still carries the active anchor state
* anchor coverage should therefore include remains, murder implements, reforged material descendants, worn heirlooms, and other distributed carriers rather than one corpse-only checklist
* a single haunting may also combine several relationship types at once, with a living emotional router shaping targets while a separate sustaining anchor object keeps the entity active
* if current haunt handling still assumes fixed-location binding or bones-only ghost resolution, that should be treated as a contradiction
* if current countermeasure handling still assumes first-pass completion after the expected rite, that should be treated as a contradiction

This keeps temporary spirit disruption, hidden object anchors, multi-anchor relationship structure, and the contradiction checks inside the haunt-resolution boundary.

- 2026-04-27T09:53:43.177Z
Reconciliation update

Fold hidden-object retrieval, postmortem force-bearing presence, post-cremation distributed biological evidence, and pure-location-bound haunting contradiction pressure into this issue.

Implementation emphasis:

* some haunt cases should remain driven by unresolved hidden objects, distributed bodily remnants, or proof items rather than one obvious corpse-only resolution path
* deceased actors may continue to exert force or leave image-bearing traces without requiring a stable visible apparition state
* cremation or destruction of the main body should not automatically remove all biologically or ritually relevant evidence if tissues, implants, grafts, or preserved fragments still exist elsewhere
* current haunt logic should not assume every residual force stays fixed to one room or one remains-site when relational and object-bound anchors remain active

This keeps hidden-object retrieval, force-bearing postmortem presence, post-cremation evidence recovery, and the contradiction check inside the haunt-resolution boundary.

- 2026-04-26T00:40:07.289Z
Reconciliation update

Implementation emphasis:

* haunt packets should support permanent phantom-site overlays where a ruined or absent location presents itself as preserved through an emotional imprint rather than ordinary illusion only
* some ghosts should also resolve through willing sacrifice, empathy, or fulfilled longing, preserving nonviolent closure routes where the core curse is relational
* involuntary emotional fields and lethal contact loops may therefore sabotage the ghost’s own desires instead of expressing clean predatory coherence

This concept stays inside that issue’s boundary.

- 2026-04-25T20:42:09.051Z
Reconciliation update

Implementation emphasis:

* permanent phantom-site overlays should remain able to project an emotionally preserved house or room over a ruin, replacing present reality with a tragic imprint that still governs interaction inside the site
* some haunt loops should also support nonviolent completion through willing sacrifice, empathy, or fulfilled longing when the unfinished condition is relational rather than adversarial
* involuntary emotional fields and lethal embraces may therefore sabotage the ghost’s own desires, preserving tragic self-opposition inside the haunting rather than clean predatory intent only

This concept stays inside that issue’s boundary.

- 2026-04-25T15:09:54.163Z
Reconciliation update

Implementation emphasis:

* recurring ghosts may depend on multi-part sentimental anchors, with final retirement requiring destruction of both the main artifact and a specific embedded personal remnant rather than one object only
* manifestation mode can also switch by relational context, letting a spirit remain ethereal generally but become corporeal, vulnerable, or more interactive near specific family anchors
* broad category counters may therefore fail where one unique relationship-bound object still carries authority over the haunting

This concept stays inside that issue’s boundary.

- 2026-04-25T15:06:50.081Z
Reconciliation update

Implementation emphasis:

* body destruction, temporary banishment, and final retirement should remain separate outcomes, with some dead entities reconstructing a vessel after a short powerless window unless the true rite, dependency break, or anchor condition is resolved
* post-destruction states may persist as noninteractive apparition, omen, or tracking residue even while the entity is reforming, preserving investigation pressure after apparent victory
* some entities may also seek their own retirement or be reawakened by later disturbance of an earlier valid rite, so recurrence should include both broken containment and self-resolution pursuit paths

This concept stays inside that issue’s boundary.

- 2026-04-25T14:34:46.514Z
Contradiction check

Implementation emphasis:

* hauntings should not be assumed uniformly malicious if the intended frame expects justice and stewardship spirits to resolve very differently from vengeance cases
* combat victory should not be assumed equal to permanent resolution if anchors, rejuvenation, and target-specific finalization methods remain load-bearing
* generic anti-undead kits should not be assumed sufficient if the intended frame expects target-specific biographical counters and anchor logic to matter materially

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T14:34:46.466Z
Reconciliation update

Implementation emphasis:

* haunting origin should continue to shape motive and closure path, distinguishing sudden-death confusion, unfinished-work persistence, guardian stewardship, correction-seeking justice, grievance-driven vengeance, curse-forged states, and pact-born immortality failures rather than flattening all ghosts into one malicious loop
* final resolution may therefore route through truth restoration, atonement, release, body handling, containment, or destruction depending on origin and anchor rather than one universal exorcism or kill path
* temporary defeat should remain distinct from final closure where anchors, rejuvenation, or special kill conditions persist

This concept stays inside that issue’s boundary.

- 2026-04-25T14:33:23.678Z
Reconciliation update

Implementation emphasis:

* some ghosts should remain linked to hidden remains through a two-step architecture where disturbing the remnant causes sympathetic pain or instability but does not itself finish the entity
* final neutralization may therefore require both a political or social-state prerequisite and the correct physical handling of the concealed remnant, rather than one generic anti-undead action
* haunted estates may also combine occupancy sensing with environmental actuation under the ghost’s control, preserving the lorded-house pattern beyond simple apparition presence

This concept stays inside that issue’s boundary.

- 2026-04-25T09:24:50.938Z
Contradiction check

Implementation emphasis:

* ghosts should not default to truthful quest-givers if the intended frame allows them to be sincere, manipulative, wrong, or strategically incomplete at the same time
* finale design should not collapse into kill-the-ghost only if exposing truth, defending reconciliation, or selectively breaking the right anchor can also resolve the haunting

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:24:50.884Z
Reconciliation update

Implementation emphasis:

* curse packets may need several valid weakening or resolution routes at once, such as site destruction, remains exposure, environmental alignment, and direct sacrificial or reconciliatory closure rather than one canonical exorcism path only
* partial success should remain explicit, so one anchor can be broken while the wronged dead, the enforcer, or the residual pressure loop continues in altered form
* ghost testimony should remain emotionally sincere but factually slanted where the dead actor believes its own grievance while omitting self-incriminating truth
* some haunt cases should therefore route toward restitution, confession, and anchor correction rather than kill-the-ghost simplification

This concept stays inside that issue’s boundary.

- 2026-04-24T23:49:29.391Z
Reconciliation update

Implementation emphasis:

* ghost scenarios should remain investigation-first by default, with confession, burial choreography, object recovery, symbolic restitution, and moral release conditions carrying as much weight as combat
* recurrence after partial resolution should stay explicit, so clearing one episode or one anchor may not retire the whole haunting if the deeper condition remains unresolved
* some ghosts should also be defined by recurring behavioral failure under renewed pressure, making the next test of character itself part of the release condition

This concept stays inside that issue’s boundary.

- 2026-04-24T16:30:25.701Z
Reconciliation update

Implementation emphasis:

* spectral encounters should default toward investigation, burial choreography, confession, symbolic restitution, and anchor correction rather than combat-only clearance
* many haunt packets should therefore expose a biography layer, a first-contact scenario layer, and a partial-resolution state so the same ghost can recur if only the immediate disturbance is handled
* observer-specific communication may remain damaged, fragmentary, dream-bound, or tactile rather than clear exposition, preserving investigation work even after first contact

This concept stays inside that issue’s boundary.

- 2026-04-24T11:55:57.627Z
Reconciliation update

Implementation emphasis:

* active locations should behave as threat engines rather than scenery, able to conceal, trap, separate, reshape navigation, and exert mood or pressure through place-specific powers
* haunted houses, haunted terrain, and similarly active sites should therefore remain first-class procedural adversaries rather than just maps with lore

This concept stays inside that issue’s boundary.

- 2026-04-23T06:51:57.965Z
Reconciliation update

Implementation emphasis:

* restless spirits may remain because of unfinished purpose and should communicate selectively only to relevant actors or only through correctly framed questioning rather than acting as generic hostile ghosts
* true resolution may require exact ritual protocol, including correct formula, language, or sanctioned funerary handling, instead of combat defeat or generic banishment alone
* corpse-state undead may also require specific permanent disposal procedures such as burning or sanctified burial depth rather than ordinary kill-state resolution

This concept stays inside that issue’s boundary.

- 2026-04-23T04:07:50.471Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/550). All replies are displayed in both locations.

---
