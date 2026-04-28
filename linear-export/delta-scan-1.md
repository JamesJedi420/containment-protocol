# Review Packet

Generated: 2026-04-28T12:04:28.124Z
Issues: SPE-893, SPE-921, SPE-882, SPE-126

## SPE-893 - Dual-frame covert investigation model
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-27T08:53:35.352Z
- Updated: 2026-04-28T11:46:58.987Z

### Description
Goal:  
Implement a bounded dual-explanation model so covert technology, classified programs, and true anomaly can remain simultaneously plausible during investigation instead of collapsing too early into one frame.

Scope:

* support competing explanatory frames such as black-project secrecy, covert human sabotage, conventional stress pathology, forensic-biological scientific analysis, and deeper anomaly cause
* support cases where rigorous anatomy, autopsy, and microscopy logic coexist with speculative anomaly hypotheses rather than forcing one to replace the other too early
* support skeptical and pattern-recognition investigators as procedurally distinct roles within the same case
* support escalation from local forensic mystery into institutional conflict over what counts as evidence or proof
* support uncertainty where operationally useful action can begin before one frame fully wins
* distinguish dual-frame investigation from rumor alone or from final truth-state resolution
* connect the layer to evidence confidence, authority interference, and case-graph systems where relevant

Constraints:

* deterministic only
* no universal conspiracy sandbox
* no assumption that one explanatory frame should dominate too early in a strong covert case
* prefer compact frame-confidence rules over sprawling debate prose
* keep active explanatory frames, confidence spread, and institutional pressure legible enough for planning and debugging

Acceptance criteria:

* at least one case sustains more than one plausible explanatory frame through most of the investigation
* at least one skeptical or conventional frame delays but does not invalidate anomaly escalation
* at least one case remains interpretable through both covert human sabotage and emergent anomalous agency until strong evidence resolves the ambiguity
* at least one institutional decision changes because admissible proof lags behind operational conviction
* targeted tests or validation examples cover deterministic dual-frame competition, covert-sabotage ambiguity, and escalation effects

### Relations
_No relations_

### Comments
- 2026-04-28T11:46:59.270Z
Contradiction check

Implementation emphasis:

* actionable anomaly intel should not always be fully verifiable before response if the intended frame expects truth and deception to remain entangled under live operational deadlines
* anomaly resolution should not always force a definitive final classification if the case is meant to close with residual uncertainty about what channel was actually real
* if current investigation logic still over-requires full validation or final certainty before action and closure, that should be treated as a contradiction

This keeps the contradiction check visible inside the dual-frame investigation boundary.

- 2026-04-28T11:46:59.001Z
Reconciliation update

Implementation emphasis:

* some anomaly cases should sustain a belief-contested information channel where truth, deception, and partial legitimacy cannot be cleanly separated during the operational window
* a source may therefore produce verifiably correct, demonstrably false, and impossible-to-classify claims in the same case without collapsing into one stable frame
* investigators may still need to act under deadline pressure before the source can be conclusively sorted into fraud, conduit, or true anomaly
* final case resolution should also remain able to leave the anomaly class itself unresolved even after the immediate incident closes

This keeps ambiguous-intelligence validation, uncertain-intel action pressure, delayed validation, and unresolved anomaly truth-state inside the dual-frame investigation boundary.

- 2026-04-27T12:24:33.642Z
Reconciliation update

Implementation emphasis:

* rigorous anatomy, autopsy, and microscopy logic should remain able to coexist with speculative anomaly hypotheses when the case exceeds ordinary biological expectation
* strong investigation may therefore depend on keeping scientific and anomaly-explanatory frames active in parallel instead of forcing one to replace the other too early

This keeps dual-track scientific and speculative analysis inside the dual-frame investigation boundary.

- 2026-04-27T09:53:43.267Z
Reconciliation update

Fold conventional sabotage versus anomaly ambiguity into this issue.

Implementation emphasis:

* some corporate or technical incidents should remain interpretable through both covert human sabotage and emergent anomalous agency for most of the case
* strong evidence may accurately implicate a human operator while still masking a deeper nonhuman or autonomous actor beneath the same event chain

This keeps covert-crime versus anomaly ambiguity inside the dual-frame investigation boundary.

- 2026-04-27T08:53:36.876Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/899). All replies are displayed in both locations.

---

## SPE-921 - Multi-presence haunted-site state and false clears
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-28T00:46:25.280Z
- Updated: 2026-04-28T11:49:30.638Z

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
- 2026-04-28T11:49:30.646Z
Reconciliation update

Implementation emphasis:

* haunted institutional sites should remain able to contain several simultaneous presences with different roles, including hostile drivers and frightened or communicative trapped spirits
* some nonhostile presences may first appear through the same unsettling visual grammar as the hostile event and only later be reclassified as warning or clue-bearing manifestations
* nonhostile entities should also remain able to deliver chained partial clues such as numbers, room references, or whisper fragments that point toward the true hostile source rather than resolving the case directly
* if current haunted-site logic still over-assumes one active entity per site or purely hostile manifestation behavior, that should be treated as a contradiction

This keeps multi-presence coexistence, nonhostile manifestation classification, communicative spirit clue chains, and the contradiction checks inside the multi-presence haunted-site boundary.

- 2026-04-28T11:12:42.285Z
Fold-in audit: reviewed description against accumulated comments. Description accurately captures owned scope. No fold-in required.

- 2026-04-28T10:28:50.141Z
Dependency note

* base haunt-resolution workflow including diagnosis, anchor discovery, remains handling, and final closure defers to [SPE-547](https://linear.app/spectranoir/issue/SPE-547/haunt-resolution-through-anchors-remains-and-rites)
* implement the haunt-resolution layer there before extending multi-presence site-state logic here
* this issue adds concurrent-presence management, false-clear aftermath, and protective-versus-hostile recognition on top of SPE-547's base workflow

This keeps the multi-presence haunted-site layer focused on presence coexistence and interaction patterns rather than the baseline haunt-resolution chain.

- 2026-04-28T01:18:30.215Z
Routing note

* keep this issue focused on several concurrent presences in one haunted site, false-clear aftermath, recognition-based reclassification, room-weighted anomaly centers, and inter-presence interaction or cancellation
* route the baseline haunt-resolution workflow of diagnosis, anchor identification, remains handling, funerary closure, and temporary-banished-versus-finally-resolved state to [SPE-547](https://linear.app/spectranoir/issue/SPE-547/haunt-resolution-through-anchors-remains-and-rites)
* use this issue when the core planning problem is that more than one presence remains active or legible in the same site, not when the core problem is the ordinary single-haunt resolution chain

This keeps multi-presence haunted-site logic separate from the general haunt-resolution shell.

- 2026-04-28T00:46:52.770Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/931). All replies are displayed in both locations.

---

## SPE-882 - Persistent symbolic clue capture and translation
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-27T08:46:35.888Z
- Updated: 2026-04-28T11:46:59.105Z

### Description
Goal:  
Implement a bounded symbolic-clue workflow so operators can capture, preserve, copy, decode, and later combine nonverbal clue fragments without assuming immediate full understanding.

Scope:

* support capture of symbolic clues through observation, copying, or recording with quality state
* support later translation or interpretation by qualified specialists rather than immediate universal readability
* support clues that remain operationally incomplete until combined with other fragments or later context
* support encoded archives and research notes that yield candidate theories with confidence levels rather than one certain answer until field testing resolves them
* support sensor-condition dependence such as light, angle, or inspection mode for clue visibility
* support encoded archives and clue objects that require decoding before full use
* distinguish symbolic clue workflow from generic item pickup or ordinary text notes
* connect the layer to arc-state, evidence custody, and expert consultation systems where relevant

Constraints:

* deterministic only
* no universal auto-translation layer
* no assumption that seeing a clue once guarantees full later use
* prefer compact capture-quality and translation states over sprawling linguistics prose
* keep current clue state, capture quality, translation dependency, and hypothesis confidence legible enough for planning and debugging

Acceptance criteria:

* at least one symbolic clue is captured in partial form and only becomes useful after later interpretation or combination
* at least one clue can be missed or degraded because sensor conditions were inadequate
* at least one encoded archive requires decoding before operational use
* at least one research output yields candidate theories with confidence levels rather than one resolved answer
* targeted tests or validation examples cover deterministic clue capture, persistence, translation, hypothesis confidence, and combination behavior

### Relations
_No relations_

### Comments
- 2026-04-28T11:46:59.329Z
Contradiction check

Implementation emphasis:

* clue systems should not assume all useful information arrives in literal or directly mappable form if the intended frame expects symbolic, metaphorical, or image-coded guidance
* if current clue handling still overweights direct-literal mapping and underweights interpretive clues, that should be treated as a contradiction

This keeps the contradiction check visible inside the persistent symbolic-clue boundary.

- 2026-04-28T11:46:59.133Z
Reconciliation update

Implementation emphasis:

* anomaly intel may arrive through symbolic or indirect spatial language, where location clues surface as monuments, metaphors, objects, or evocative images rather than direct coordinates
* operators should therefore remain able to act on interpretive clue bundles that require contextual decoding before they become spatially useful

This keeps symbolic-intel interpretation inside the persistent symbolic-clue boundary.

- 2026-04-27T08:48:04.236Z
Reconciliation update

Fold final-key symbol chains, copied or memorized clue fragments, specialist interpretation of nonverbal symbols, sensor-condition clue visibility, coded ledgers, and multi-hypothesis key research into this issue.

Implementation emphasis:

* symbolic clues should remain capturable in partial form and only become useful after later translation, combination, or context
* clue acquisition should depend on adequate light, angle, inspection mode, and recording quality rather than automatic full comprehension
* encoded archives and research notes may yield candidate theories with confidence levels instead of one certain answer until dangerous field testing resolves them

This keeps symbolic clue capture, translation, conditional visibility, coded archives, and hypothesis-bearing research outputs inside the persistent symbolic-clue boundary.

- 2026-04-27T08:46:37.147Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/889). All replies are displayed in both locations.

---

## SPE-126 - Identity-overwrite traps and possession escalation
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-18T03:07:34.923Z
- Updated: 2026-04-28T11:55:19.611Z

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
* support hiddenly transformed settlements that conceal synchronized transformation ecologies beneath ordinary civic presentation
* support renewed monster slots through transformed victims rather than one fixed monster body
* support false-recovery hostile conversion that presents as normal recovery before full hostile revelation
* support possession artifacts that embed physically, alter alignment or ideology, and transfer across hosts after death on a delayed schedule
* support long-horizon identity drift from prolonged possession or sustained artifact use slowly rewriting alignment or identity over time
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
* at least one hidden transformation ecology passes as ordinary civic presentation until detection is triggered
* at least one possession artifact transfers across hosts after the original carrier dies
* targeted tests cover deterministic overwrite, possession escalation, subtle-state surfacing, long-duration entrapment, false-recovery conversion, and possession artifact transfer behavior

### Relations
- related: SPE-924 Engineered anomaly populations with shared cognition drift

### Comments
- 2026-04-28T11:55:19.620Z
Reconciliation update

Implementation emphasis:

* fear systems should remain able to route into self-type inversion, where the target manifests as the class of being they most dread becoming rather than only facing an outside attacker
* if current identity-threat logic still underweights this inversion pattern, it should be treated as a contradiction against fixed-self fear handling

This keeps identity-inversion fear and the contradiction check inside the identity-displacement boundary.

- 2026-04-28T11:54:01.713Z
Reconciliation update

Implementation emphasis:

* physical identity should remain non-static, with some entities shifting biological presentation, sexed appearance, and social-read category dynamically enough to break stable identity tracking
* if current identity handling still assumes persistent physical form or fixed biological attributes too strongly, that should be treated as a contradiction

This keeps dynamic biological transformation and the contradiction check inside the identity-displacement boundary.

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
