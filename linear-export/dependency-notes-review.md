# Review Packet

Generated: 2026-04-28T10:28:02.656Z
Issues: SPE-921, SPE-922, SPE-547

## SPE-921 - Multi-presence haunted-site state and false clears
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-28T00:46:25.280Z
- Updated: 2026-04-28T02:52:19.426Z

### Description
Goal:
Implement a bounded haunted-site state model so one location can host several concurrent presences with different intentions, visibility rules, and resolution paths instead of collapsing the whole site to one ghost and one exorcism outcome.

Scope:

* support several simultaneous presences in one site, including hostile, protective, dormant, residual, hidden, and unknown categories
* support site wounds or prior breach scars that attract later secondary infestations without requiring the new presence to be the original killer or victim
* support room-weighted anomaly centers tied to historical event geometry, prior room function, and current pressure concentration
* support false-clear states where one presence is reduced or suppressed while another remains active or becomes newly legible only after the ritual
* support protective manifestations that initially resemble the hostile visual grammar, forcing recognition and relationship-based reclassification before response
* support resolutions where presences cancel, consume, suppress, or destroy one another rather than only being solved by the player directly
* distinguish multi-presence haunted sites from ordinary one-anchor haunt packets or generic concurrent faction occupancy
* connect the layer to haunt resolution, detection, room-state, and campaign-thread systems where relevant

Constraints:

* deterministic only
* no universal all-sites-are-complex assumption
* no assumption that all presences share the same hostility, visibility, or anchor relationship
* prefer compact presence-state packets and interaction rules over sprawling custom ghost casts
* keep active-presence count, disposition, and residual risk legible enough for planning and debugging

Acceptance criteria:

* at least one site contains more than one active presence with materially different intent or role
* at least one ritual creates a false-clear state because a second presence remains unresolved
* at least one protective manifestation is initially misread as hostile because it shares the event's visual language
* at least one site wound attracts a later secondary presence distinct from the original event source
* at least one resolution path uses entity cancellation or mutual destruction instead of player-only elimination
* targeted tests or validation examples cover deterministic multi-presence coexistence, false-clear aftermath, recognition-based reclassification, and inter-entity resolution

### Relations
- related: SPE-547 Haunt resolution through anchors, remains, and rites

### Comments
- 2026-04-28T01:18:30.215Z
Routing note

* keep this issue focused on several concurrent presences in one haunted site, false-clear aftermath, recognition-based reclassification, room-weighted anomaly centers, and inter-presence interaction or cancellation
* route the baseline haunt-resolution workflow of diagnosis, anchor identification, remains handling, funerary closure, and temporary-banished-versus-finally-resolved state to [SPE-547](https://linear.app/spectranoir/issue/SPE-547/haunt-resolution-through-anchors-remains-and-rites)
* use this issue when the core planning problem is that more than one presence remains active or legible in the same site, not when the core problem is the ordinary single-haunt resolution chain

This keeps multi-presence haunted-site logic separate from the general haunt-resolution shell.

- 2026-04-28T00:46:52.770Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/931). All replies are displayed in both locations.

---

## SPE-922 - Building-scale purification geometry and interruption
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-28T00:46:25.390Z
- Updated: 2026-04-28T02:52:19.426Z

### Description
Goal:
Implement a bounded building-scale countermeasure layer so cleansing or containment can require cardinal placement, floor coverage, wall-cavity insertion, civilian clearance, and interruption management rather than one generic room-level ritual action.

Scope:

* support spatial geometry requirements such as north, south, east, and west placement, per-floor coverage, corner nodes, wall cavities, and complete-structure distribution
* support destructive installation steps such as opening walls, breaching surfaces, or otherwise damaging property to place the countermeasure correctly
* support civilian clearance requirements before high-risk procedures begin, including trust and timing pressure around getting occupants out
* support active entity resistance during execution, with telekinetic attacks, object hazards, exit denial, or room-level escalation triggered by the detection of the ongoing ritual
* support localized node success where one placement clears or stabilizes a room before the whole site is fully resolved
* support post-ritual confirmation windows where the structure remains under observation because the all-clear may be false
* distinguish building-scale purification from ordinary portable rites or single-object countermeasures
* connect the layer to haunted-site resolution, domestic hazard objects, rescue timing, and property-cost consequences where relevant

Constraints:

* deterministic only
* no freeform construction simulator
* no assumption that ritual completion is instant, nondestructive, or unopposed
* prefer compact geometry and interruption rules over sprawling architectural prose
* keep coverage state, completed nodes, and residual risk legible enough for planning and debugging

Acceptance criteria:

* at least one countermeasure requires multi-node placement across more than one room or floor
* at least one procedure requires damaging structure or surfaces to install the countermeasure
* at least one execution phase is interrupted by active entity resistance before full completion
* at least one successful placement clears or stabilizes only a local room state rather than ending the whole incident
* at least one completed procedure still enters a post-ritual watch period because the all-clear may be false
* targeted tests or validation examples cover deterministic placement geometry, interruption handling, localized node effects, and false-clear follow-up

### Relations
- related: SPE-921 Multi-presence haunted-site state and false clears
- related: SPE-547 Haunt resolution through anchors, remains, and rites

### Comments
- 2026-04-28T02:52:18.920Z
Dependency note

* room-clearing semantics and presence categories defer to [SPE-921](https://linear.app/spectranoir/issue/SPE-921/multi-presence-haunted-site-state-and-false-clears)
* implement the multi-presence site-state model there before extending localized node-success logic here

This keeps the building-scale countermeasure layer from redefining presence categories owned by the haunted-site state layer.

- 2026-04-28T01:18:30.245Z
Routing note

* keep this issue focused on building-scale countermeasure geometry, destructive installation, civilian clearance before execution, active interruption during placement, localized node success, and post-ritual watch periods
* route the baseline haunt-resolution workflow of diagnosis, anchor discovery, remains handling, sanctioned burial, and final closure to [SPE-547](https://linear.app/spectranoir/issue/SPE-547/haunt-resolution-through-anchors-remains-and-rites)
* route ordinary portable rites, single-object countermeasures, or non-building-scale cleansing to the relevant general ritual or haunt-resolution issue rather than broadening this one
* use this issue when the core planning problem is multi-room or multi-floor execution geometry under resistance, not when the core problem is simply how a haunting is ultimately resolved

This keeps building-scale purification execution separate from the general haunt-resolution shell.

- 2026-04-28T00:46:49.933Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/930). All replies are displayed in both locations.

---

## SPE-547 - Haunt resolution through anchors, remains, and rites
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-23T04:07:48.662Z
- Updated: 2026-04-28T10:26:31.769Z

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
- 2026-04-28T10:26:31.781Z
Fold-in audit: URGENT. This issue has 15+ reconciliation updates that define the actual scope, far beyond the sparse description.

Key missing scope elements in description:
1. False clears, protective vs hostile recognition, sacrificial resolution, room-weighted centers
2. Withdrawal-first resolution, nonoccupation outcomes, non-neutralizable hazards
3. Temporary disruption with repellents, hidden object anchors, multi-anchor structures
4. Post-cremation evidence recovery, distributed bodily remnants
5. Permanent phantom-site overlays, non-violent closure routes (willing sacrifice, empathy, fulfilled longing)
6. Multi-part sentimental anchors, manifestation mode switches by relational context
7. Body destruction vs temporary banishment vs final retirement, post-destruction states
8. Origin-shaping resolution paths (confusion, unfinished-work, guardian stewardship, justice, vengeance, curse-forged, pact-born)
9. Investigation-first default, recurrence after partial resolution
10. Active locations as threat engines with concealment, trapping, separation, reshaping
11. Selective communication, exact ritual protocol requirements
12. Permanent disposal procedures (burning, sanctified burial)

Recommend: Substantially expand description to integrate these patterns, or extract recurring-patterns document into sister issues for maintainability.

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
