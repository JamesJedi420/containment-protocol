# Review Packet

Generated: 2026-04-28T10:15:25.054Z
Issues: SPE-891, SPE-878, SPE-879, SPE-881, SPE-910

## SPE-891 - Civilian blowback from concealed agent lives
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-27T08:50:57.000Z
- Updated: 2026-04-28T00:46:25.183Z

### Description
Goal:
Implement a bounded spillover layer so agents with concealed histories, civilian obligations, or hidden case involvement can expose nearby civilians and homes to delayed anomaly retaliation or operational fallout.

Scope:

* support personal obligation timers and civilian-life commitments that compete with case work
* support secrecy strain where agents conceal dangerous history or current work from close civilians
* support post-case blowback against partners, homes, or identities adjacent to the investigator rather than the field site only
* support cases where returning from an investigation carries proximity risk into domestic life
* distinguish civilian blowback from generic reputation damage or from direct hostage-taking in the field
* connect the layer to agent background, legal-risk, and mission-state systems where relevant

Constraints:

* deterministic only
* no full life-sim subsystem
* no assumption that civilian life is insulated from anomaly work once the field operation ends
* prefer compact obligation and blowback states over sprawling relationship prose
* keep current civilian exposure risk, secrecy strain, and spillover trigger state legible enough for planning and debugging

Acceptance criteria:

* at least one agent carries a personal obligation or civilian commitment that constrains mission timing
* at least one concealment choice creates later civilian or domestic exposure risk
* at least one completed field case can still produce delayed blowback into civilian life
* targeted tests or validation examples cover deterministic obligation timers, secrecy strain, and civilian spillover

### Relations
_No relations_

### Comments
- 2026-04-28T00:46:25.191Z
Reconciliation update

Implementation emphasis:

* returning to a family trauma site should remain able to trigger stress events, memory-fragment evidence, mentor dependence, and role instability for investigators even when the local case is technically separate from the original wound
* side-case outcomes may also update the main-thread emotional stance toward absent family or handlers without resolving the larger campaign mystery itself

This keeps trauma-site stress and side-case emotional progression inside the concealed-agent spillover boundary.

- 2026-04-28T00:21:00.498Z
Reconciliation update

Implementation emphasis:

* ongoing contact with pre-case civilian networks such as old friends, school contacts, former colleagues, and family friends should remain a viable source of case referral rather than pure operational weakness
* those same ties should still carry secrecy strain, because partial disclosure, false cover stories, and long absences can shift trust sharply once the civilian sees the truth of the work
* post-case fallout may also include a civilian becoming partially initiated into the hidden world, creating future trust, secrecy, and contact-risk obligations rather than a clean return to ignorance
* social costs should remain visible when a civilian witness understands the gap between an agent's public identity and hidden role, even if the immediate case is resolved
* if current handling still treats civilian contacts as liability only, that should be treated as a contradiction

This keeps civilian-network referrals, secrecy strain, partial initiation, post-case relationship fallout, and the contradiction check inside the concealed-agent civilian-blowback boundary.

- 2026-04-27T08:50:58.403Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/897). All replies are displayed in both locations.

---

## SPE-878 - Unified process change control
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-27T08:42:51.995Z
- Updated: 2026-04-27T08:42:51.995Z

### Description
Goal:
Implement a bounded change-control layer so substance, technology, equipment, procedure, and facility changes require one formal review path with justification, impact review, authorization, and retraining before restart.

Scope:

* support unified change control across materials, methods, hardware, procedures, and site form, except true replacements in kind
* support change packets containing technical basis, safety impact, duration, authorization, and affected surfaces
* support pre-restart retraining and affected-person notification as part of change deployment
* support identification of informal or under-scoped changes as safety debt rather than invisible background drift
* distinguish change control from startup readiness or post-incident review alone
* connect the layer to safety-information, hazard review, training, and integrity systems where relevant

Constraints:

* deterministic only
* no assumption that only hardware changes need formal review
* no sprawling bureaucracy simulator
* prefer compact change packets and restart gates over prose-heavy approval flows
* keep change type, justification, authorization state, and retraining requirement legible enough for planning and debugging

Acceptance criteria:

* at least one procedural or facility change requires the same formal review path as a hardware or substance change
* at least one change packet includes technical basis, safety impact, duration, and authorization
* at least one restart is blocked until affected personnel are informed or retrained
* targeted tests or validation examples cover deterministic change classification, authorization, and retraining gates

### Relations
_No relations_

### Comments
- 2026-04-27T08:42:53.464Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/884). All replies are displayed in both locations.

---

## SPE-879 - Multi-scale emergency action planning
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-27T08:42:52.248Z
- Updated: 2026-04-27T08:42:52.248Z

### Description
Goal:
Implement a bounded emergency-plan layer so hazardous sites can respond through one doctrine that covers both local contained releases and full-site catastrophe rather than one generic crisis switch.

Scope:

* support emergency action planning for both small releases and full-site events under one coherent doctrine
* support whole-site planning rather than room-local emergency fragments alone
* support linkage between emergency doctrine and release-coupled hazard boundaries
* support plan adequacy checks against current process coverage and hazard scale
* distinguish emergency action planning from public crisis communication or major-incident framing alone
* connect the layer to hazard boundaries, startup readiness, and incident response systems where relevant

Constraints:

* deterministic only
* no full firefighting or HAZMAT tactics simulator
* no assumption that one emergency script covers both local and catastrophic events equally well
* prefer compact multi-scale emergency packets over sprawling emergency manuals
* keep current emergency tier, covered area, and plan adequacy legible enough for planning and debugging

Acceptance criteria:

* at least one site has one emergency doctrine that differentiates small-release and catastrophic-release handling
* at least one plan adequacy check changes because the managed hazard boundary grows or shrinks
* at least one local event is handled through the same emergency framework without being mistaken for full catastrophe
* targeted tests or validation examples cover deterministic multi-scale plan routing and adequacy handling

### Relations
_No relations_

### Comments
- 2026-04-27T08:42:53.627Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/885). All replies are displayed in both locations.

---

## SPE-881 - Multi-anchor anomaly arc state
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-27T08:46:35.783Z
- Updated: 2026-04-27T09:52:02.958Z

### Description
Goal:
Implement a bounded arc-state layer so a multi-anchor anomaly series can track one shared activation window, per-anchor conditions, clue prerequisites, faction awareness, and final unlock state rather than treating each anchor as an unrelated one-off.

Scope:

* support one shared activation cycle with hard global timing
* support per-anchor state such as dormant, active, keyed, traversed, compromised, or repaired
* support distributed prerequisite chains where earlier anchors contribute clue state to later access
* support faction awareness and progress against the same anomaly window
* support fallback progression paths when mandatory clue routes are missed without erasing the primary puzzle path
* distinguish multi-anchor arc state from single-gate portal behavior or generic campaign clocks
* connect the layer to portal classes, rival-expedition, and clue-capture systems where relevant

Constraints:

* deterministic only
* no full campaign-state sandbox
* no assumption that every anchor is independently discoverable or relevant at the same time
* prefer compact arc packets over sprawling bespoke campaign prose
* keep active window, per-anchor state, and final unlock condition legible enough for planning and debugging

Acceptance criteria:

* at least one anomaly arc tracks a shared timer plus individual anchor states together
* at least one later access condition depends on clues or states gathered at earlier anchors
* at least one rival or faction pressure surface reads from the same shared window
* targeted tests or validation examples cover deterministic global timing, per-anchor progression, and prerequisite unlock behavior

### Relations
_No relations_

### Comments
- 2026-04-27T09:52:02.968Z
Reconciliation update

Fold multi-node anomaly distribution, per-node activation state, temporal surge windows, artificial reactivation, persistent recurrence, and the always-available-anomaly / single-global-anomaly contradiction checks into this issue.

Implementation emphasis:

* anomaly arcs should support more than one node of the same class operating independently or in parallel rather than one singular world event
* each node may remain dormant, active, destabilized, artificially triggered, or collapsed under its own local state while still sharing a broader anomaly family
* activation windows and cyclical intensity spikes should remain trackable at node level and may synchronize pressure across several locations without requiring simultaneous full breach
* recurrent anomalies should not be assumed permanently closed or continuously available once first discovered

This keeps multi-node anomaly state, cyclical activation, artificial reopening, persistent recurrence, and the contradiction checks inside the multi-anchor anomaly-arc boundary.

- 2026-04-27T08:48:04.141Z
Reconciliation update

Fold shared external cycle pressure, interleaved side-arc timing, and synchronized faction acceleration into this issue.

Implementation emphasis:

* a multi-anchor anomaly arc may remain usable only during a hard global window while individual anchors keep their own state and prerequisites
* factions should be able to accelerate competing plans against the same anomaly window rather than pacing independently in isolation
* side-arc content may interleave with other missions while still remaining bounded by one global countdown

This keeps shared anomaly-window timing, interleaved arc pressure, and synchronized faction clocks inside the multi-anchor anomaly-arc boundary.

- 2026-04-27T08:46:36.851Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/887). All replies are displayed in both locations.

---

## SPE-910 - In-flight countermeasure execution
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-27T10:02:06.559Z
- Updated: 2026-04-27T10:02:06.559Z

### Description
Goal:
Implement a bounded live-countermeasure layer so dangerous procedures performed in transit or other public spaces can require role splits, restraint, secrecy, interruption recovery, and hazardous intermediate states rather than one binary action check.

Scope:

* support multi-role procedures with reader, restrainer, guard, witness handler, tool handler, or evac lead responsibilities
* support concealed execution inside public spaces through temporary privacy, crowd blocking, and compartment control
* support confirmation reagents, verbal challenge tests, and other low-cost reveal tools before full procedure commitment
* support hazardous intermediate states where a partial procedure worsens the threat before final completion
* support interruption risks such as lost texts, dropped tools, disrupted reading, or moving entities that must still be recovered from to finish the sequence
* support host survival versus entity removal as distinct outcome tracks
* distinguish live countermeasure execution from ordinary combat or static ritual scenes
* connect the layer to moving-site incidents, possession, and panic systems where relevant

Constraints:

* deterministic only
* no universal ritual sandbox
* no assumption that procedure success is binary or instantaneous
* prefer compact role states and interruption rules over sprawling ceremonial prose
* keep current procedure phase, intermediate risk, and role coverage legible enough for planning and debugging

Acceptance criteria:

* at least one dangerous countermeasure requires more than one simultaneous role to execute safely
* at least one procedure enters a hazardous intermediate phase before final completion
* at least one interruption forces recovery or continuation rather than immediate hard failure only
* at least one outcome distinguishes saving the host from merely stopping the incident
* targeted tests or validation examples cover deterministic role splits, intermediate states, interruption recovery, and host-versus-entity outcomes

### Relations
_No relations_

### Comments
- 2026-04-27T10:02:11.239Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/915). All replies are displayed in both locations.

---
