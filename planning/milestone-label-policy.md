# Milestone scope and label policy

## Source

Synced from Linear Containment Protocol project resource (2026-05-12). Git is canonical for ongoing edits. Original: [Linear doc](https://linear.app/spectranoir/document/milestone-scope-and-label-policy-eca9dd149d83).

Pair with `planning/milestones.md` for dependency-order milestone proof points and SPE routing clarifications.

## Purpose

Use this document as the quick routing guide for Containment Protocol. Milestones define the primary implementation surface. Labels refine the subsystem inside that surface.

## Strategic success framing

Run a containment agency through escalating weekly pressure. Success means keeping the agency functional from week to week, building a more capable and resilient organization over time, and absorbing paranormal fallout without losing operational control.

## Milestones

### Recruitment

Use for intake, sourcing, screening, candidate generation, admission rules, replacement, and operator acquisition.

Typical labels:

- `system:recruitment`
- `onboarding` when first-run operator acquisition comprehension is part of the issue
- `documentation` when the issue is primarily explanatory or audit-oriented

### Teams

Use for team composition, role interaction, cohesion, shared state, company or party objects, multi-team coordination, internal personnel structure, and cross-operator relationship surfaces.

Typical labels:

- `system:teams`
- `onboarding` when comprehension of team assembly or control is the main blocker
- `documentation` when the issue is primarily explanatory or audit-oriented

### Missions

Use for mission generation, mission taxonomy, objective routing, mission execution, mission support, mission evidence, mission-state progression, and encounter structures where combat, puzzles, or relational hazards shape the same live scene.

Typical labels:

- `system:missions`
- `onboarding` when the issue is mainly about player understanding of mission flow
- `documentation` when the issue is primarily explanatory or audit-oriented

### Outcome/Friction

Use for consequence resolution, legitimacy shifts, exposure pressure, trust or compliance movement, fallout, tradeoffs, and systemic friction that changes later play.

Typical labels:

- `balance` when the main problem is unstable tradeoffs or degenerate incentives
- `stability` when the issue is mainly about deterministic failure, contradiction, or verification risk
- `save-load` when consequence state persistence is part of the core boundary
- `documentation` when the issue is primarily explanatory or audit-oriented

### Factions & Authority

Use for faction structure, membership, institutional doctrine, legitimacy, obedience, governance, jurisdiction, competing command or sanction systems, formal-versus-real power, split governance, deniable action, taboo revelation fallout, and coercive affiliation or access structures.

Typical labels:

- `system:teams` only when the issue is truly about team composition or internal operator coordination rather than broader institution or faction structure
- `stability` when the issue is mainly about deterministic legitimacy, obedience, or authority-resolution correctness
- `documentation` when the issue is primarily explanatory or audit-oriented
### Economy / Procurement

Use for funding pressure, budget timing, reserves, market access, procurement channels, exchange friction, availability classes, acquisition constraints, and recovery or salvage value when that value is primarily an economic surface.

Typical labels:

- `system:economy` when the issue is mainly about budget structure, solvency, reserves, revenue pressure, hidden continuity resources, or macro economic behavior
- `system:procurement` when the issue is mainly about acquisition channels, supplier friction, market access, trade class, delivery lag, restricted purchasing, or special-goods access
- `documentation` when the issue is primarily explanatory or audit-oriented

### Sites / Infrastructure

Use for facilities, room networks, site topology, shell-versus-interior structure, room repurposing, hidden retrofits, transit, storage adjacency, structural behavior, transfer compatibility, infrastructure dependency, living-site packetization, facility zoning, lockdown circulation, and environment-shaped access.

Typical labels:

- `system:sites` when the issue is mainly about site topology, settlement structure, transit logic, concealed access, living-site zoning, or world-space routing
- `system:infrastructure` when the issue is mainly about facilities, room adjacency, storage, dependency graphs, progressive structural stress, deployable structures, or operational infrastructure
- `documentation` when the issue is primarily explanatory or audit-oriented

### Containment

Use for containment facilities, quarantine, breach states, anomaly-specific holding logic, storage-condition policy, custody or isolation surfaces, and hostile-environment intervention or affliction handling when the main boundary is safe holding and controlled recovery.

Typical labels:

- `system:containment` when the issue is mainly about holding logic, breach behavior, storage-condition rules, or containment facility behavior
- `system:quarantine` when the issue is mainly about provisional isolation, infection mistrust, custody infection, segregated hazardous holding, or delayed corpse-handling risk
- `documentation` when the issue is primarily explanatory or audit-oriented

### Response Operations

Use for response readiness, dispatch, alerts, emergency coordination, operational command packages, vehicle-control layers, temporary operational infrastructure, and the agency’s ability to mobilize and route action once an incident is live.

Typical labels:

- `system:response` when the issue is mainly about readiness state, alert doctrine, response assets, operator-state control surfaces, or operational capacity under live conditions
- `system:dispatch` when the issue is mainly about alert routing, coordination flow, command views, dispatch filters, or action assignment under time pressure
- `documentation` when the issue is primarily explanatory or audit-oriented

### Anomalies / Phenomena

Use for anomaly taxonomy, entity classes, phenomenon families, interaction rules, ecology, adaptation, distributed geometry, transition states, hostile feeding or sustain loops, phase-conditioned profiles, and governed classification of non-ordinary actors or effects.

Typical labels:

- `system:anomalies` when the issue is mainly about anomaly classes, entity taxonomy, registries, capability profiles, or interaction behavior
- `system:phenomena` when the issue is mainly about phenomenon families, ecology, adaptation, embedded pockets, mutation overlays, pressure-shaped drift, or broader environmental or non-actor anomaly behavior
- `documentation` when the issue is primarily explanatory or audit-oriented

### Staff / Personnel

Use for staff attributes, duty state, morale, resilience, recovery, housing, preferences, readiness, layered harm, and personnel behavior that shape the agency’s human capacity outside pure team composition.

Typical labels:

- `system:staff` when the issue is mainly about attributes, aptitude, discipline, specialization, recovery, housing, or staff-state management
- `system:morale` when the issue is mainly about morale, panic, stress behavior, resilience, satisfaction, or emotional appraisal affecting agency function
- `documentation` when the issue is primarily explanatory or audit-oriented

### Research / Archives

Use for research programs, archive systems, historical continuity, scientific branch structure, classification knowledge, controlled-access knowledge, hazardous knowledge, and long-horizon institutional memory.

Typical labels:

- `system:research` when the issue is mainly about research state, science branches, experimental programs, or knowledge-generation workflow
- `system:archives` when the issue is mainly about archives, provenance, compartmented access, historical records, document authenticity, or long-term knowledge retention
- `documentation` when the issue is primarily explanatory or audit-oriented

### Settlement / Civic Systems

Use for settlement structure, civic systems, districts, service density, hidden civic understructure, urban service fronts, community-level world behavior, site silhouettes, vertical environment bands, and public-facing access expectations that are broader than individual facilities.

Typical labels:

- `system:settlements` when the issue is mainly about settlement generation, district structure, habitation patterns, route bands, or service-density behavior
- `system:civics` when the issue is mainly about civic understructure, service fronts, governance-through-place, site conduct, or socially embedded urban systems
- `documentation` when the issue is primarily explanatory or audit-oriented

### Behavior / Psychology

Use for behavior, psychology, belief-driven action, stress response, panic, appraisal, emotional sustain loops, ferocity states, command presence, and other cognitive or emotional state systems that shape decisions across actors.

Typical labels:

- `system:behavior` when the issue is mainly about visible action patterns, stress behavior, panic branching, behavior under pressure, or non-item social presentation conflict
- `system:psychology` when the issue is mainly about appraisal models, morale perception, belief effects, emotional processing, cognition loss, or hostile emotional leverage
- `documentation` when the issue is primarily explanatory or audit-oriented

### World Rules / Simulation Law

Use for global rule compatibility, ontology boundaries, contradiction handling, entity or effect coexistence rules, breach law, noncelestial timing, environment-conditioned legality, geometry-sensitive defense, local gravity, and other simulation-wide laws that govern how systems can interact.

Typical labels:

- `system:world-rules` when the issue is mainly about world compatibility, ontology boundaries, or rule interaction at the global model level
- `system:simulation-law` when the issue is mainly about contradiction handling, universal resolution rules, cross-system constraints, or simulation-wide law surfaces
- `documentation` when the issue is primarily explanatory or audit-oriented

### Social / Community

Use for community ties, social structure, belonging, trust networks, relationship trajectories, coercive affiliation, visible status signaling, and local social dynamics that are broader than one team but narrower than faction-level governance.

Typical labels:

- `system:social` when the issue is mainly about social structure, relationship networks, belonging, referrals, or local tie patterns
- `system:community` when the issue is mainly about community ownership, local trust, neighborhood support, public-value reaction, or public-community dynamics
- `documentation` when the issue is primarily explanatory or audit-oriented

### Equipment / Loadouts

Use for equipment state, gear quality, certification, readiness, field-kit configuration, armor or restraint coverage, body-bound media, prestige wearables, hazard media, smart weapons, and what operators can actually carry, prepare, or deploy.

Typical labels:

- `system:equipment` when the issue is mainly about gear integrity, equipment interaction, item-runtime state, restricted media, or item-level operational reliability
- `system:loadouts` when the issue is mainly about loadout definitions, prepared versus available state, kit assignment, carried kit, configuration, or field-use constraints
- `documentation` when the issue is primarily explanatory or audit-oriented

### Taxonomy / Schema

Use for classification vocabularies, registries, schemas, tier packets, shared definition grammar, packet families, presentation overlays, technique packets, material response tables, and other structural category systems that multiple gameplay layers depend on.

Typical labels:

- `system:taxonomy` when the issue is mainly about category vocabularies, registries, type packets, tier systems, or classification surfaces
- `system:schema` when the issue is mainly about shared definition grammar, schema rules, structural child boundaries, cross-system data-shape consistency, or reusable packet formats
- `documentation` when the issue is primarily explanatory or audit-oriented

### Investigation / Casework

Use for case reconstruction, witness contradiction handling, target narrowing, interrogation as information work, remote viewing interfaces, accusation rooms, postcombat witness recovery, breach-search, truth bottlenecks, and the operational workflow of turning fragmented clues into a usable case.

Typical labels:

- `system:investigation` when the issue is mainly about investigative logic, witness contradiction, remote observation, case reconstruction, or explanation competition
- `system:casework` when the issue is mainly about case progression, detainee intake, interrogation workflow, truth bottlenecks, accusation choreography, or multi-thread case convergence
- `documentation` when the issue is primarily explanatory or audit-oriented

### Planning / Scheduling

Use for planning surfaces, prep-slot allocation, sequencing, throughput orchestration, scheduling pressure, offsite transition continuity, foresight generation, and the coordination logic that determines when work can be attempted.

Typical labels:

- `system:planning` when the issue is mainly about planning surfaces, strategic allocation, migration packets, or orchestration choices across limited agency capacity
- `system:scheduling` when the issue is mainly about prep slots, timing windows, sequencing constraints, throughput pressure, or readiness-time coordination
- `documentation` when the issue is primarily explanatory or audit-oriented

### Recovery / Reintegration

Use for post-incident recovery, aftercare, return-to-duty, rehabilitation, departure risk, reintegration, environmental survival intervention, and the long-tail human consequences of surviving operational pressure.

Typical labels:

- `system:recovery` when the issue is mainly about restoration, stabilization, aftercare, treatment ladders, survival intervention, or post-incident recovery state
- `system:reintegration` when the issue is mainly about return-to-duty, self-exile, incomplete reintegration, retention failure, or post-event reentry into normal agency or civilian life
- `documentation` when the issue is primarily explanatory or audit-oriented

### Onboarding

Use for first-run comprehension blockers, tutorial-adjacent structure, player-facing clarity gaps, and issues whose main value is making the system legible earlier.

Typical labels:

- `onboarding`
- the relevant system label as a secondary classifier when the issue also belongs to Recruitment, Teams, or Missions
- `playtest` when sourced from observed user confusion
- `documentation` when docs debt is the primary intervention

### Docs

Use for audits, specs, glossary work, mechanic explanation, content briefs, routing policy, and other documentation-first issues.

Typical labels:

- `documentation`
- `playtest` when docs changes are driven by observed confusion
- a system label only when the document is scoped tightly to one subsystem

## Label policy

- Milestone first, label second.
- Use `system:recruitment`, `system:teams`, and `system:missions` for primary subsystem identity when the issue clearly belongs to one of those surfaces.
- Use `system:economy` and `system:procurement` only when the issue is clearly about funding structure, reserve logic, special-goods pressure, or acquisition behavior rather than general consequence or logistics effects.
- Use `system:sites` and `system:infrastructure` only when the issue is clearly about space, facilities, topology, structural layering, lockdown geometry, living-site packets, or environmental routing rather than mission flow or general consequence handling.
- Use `system:containment` and `system:quarantine` only when the issue is clearly about safe holding, isolation, breach risk, hazard segregation, or controlled corpse or infection handling rather than broader facility layout or evidence handling.
- Use `system:response` and `system:dispatch` only when the issue is clearly about mobilization, readiness, command routing, vehicle-control surfaces, or emergency coordination rather than mission definition itself.
- Use `system:anomalies` and `system:phenomena` only when the issue is clearly about anomaly classification, entity behavior, ecology, distributed representation, adaptation, or non-ordinary effect families rather than information handling or containment procedure.
- Use `system:staff` and `system:morale` only when the issue is clearly about staff state, layered harm, resilience, recovery, morale, or personnel behavior rather than team composition or live mission routing.
- Use `system:research` and `system:archives` only when the issue is clearly about knowledge generation, archive structure, compartmented access, hazardous knowledge, historical continuity, or institutional memory rather than immediate evidence verification.
- Use `system:settlements` and `system:civics` only when the issue is clearly about settlements, districts, community systems, civic access expectations, site silhouettes, or urban service structures rather than individual facility topology.
- Use `system:behavior` and `system:psychology` only when the issue is clearly about behavioral patterns, cognition, stress response, command presence, emotional sustain loops, or belief-driven action rather than staff administration alone.
- Use `system:world-rules` and `system:simulation-law` only when the issue is clearly about global compatibility, ontology boundaries, breach law, contradiction handling, or simulation-wide rules rather than a single subsystem.
- Use `system:social` and `system:community` only when the issue is clearly about community ties, social structure, relationship trajectories, belonging, coercive affiliation, or local trust patterns rather than faction governance or settlement topology.
- Use `system:equipment` and `system:loadouts` only when the issue is clearly about gear state, readiness, configuration, restricted-device use, body-bound media, intelligent weapons, or carried kit rather than procurement or response routing.
- Use `system:taxonomy` and `system:schema` only when the issue is clearly about classification language, registries, tier packets, reusable packet families, presentation overlays, technique packets, or shared structural definitions rather than a single gameplay subsystem.
- Use `system:investigation` and `system:casework` only when the issue is clearly about reconstructing incidents, resolving contradictory inputs, remote viewing, accusation sequencing, or managing a case forward under uncertainty rather than raw evidence intake alone.
- Use `system:planning` and `system:scheduling` only when the issue is clearly about prep-slot allocation, sequencing, migration packets, foresight generation, orchestration, or timing pressure rather than live response or mission definition.
- Use `system:recovery` and `system:reintegration` only when the issue is clearly about post-incident restoration, rehabilitation, return-to-duty, long-tail aftermath, or tradeoff-based survival intervention rather than live response or baseline staff state.
- Use `onboarding` only when the main problem is comprehension, discoverability, or first-run interpretation.
- Use `playtest` for evidence gathered from observed confusion or external validation.
- Use `balance` for tradeoff tuning, not for every consequence issue.
- Use `stability` for deterministic correctness, contradiction, or verification-risk surfaces.
- Use `save-load` only when persistence behavior is materially inside scope.
- Use `documentation` for docs-first issues rather than implementation issues that merely mention docs touchpoints.

## Routing rule

If an issue touches several milestones, place it by the main implementation boundary:

- acquisition and staffing → Recruitment or Teams
- operation planning and execution → Missions
- fallout, secrecy, trust, legitimacy, and escalation → Outcome/Friction
- faction structure, institutional doctrine, legitimacy, obedience, governance, split rule, and coercive affiliation → Factions & Authority
- funding pressure, market access, procurement channels, reserves, salvage value, and acquisition constraints → Economy / Procurement
- facilities, site topology, shell layers, room repurposing, living-site packets, transit, storage adjacency, and infrastructure dependency → Sites / Infrastructure
- containment facilities, quarantine, breach states, anomaly-specific holding logic, custody risk, and hazard segregation → Containment
- response readiness, dispatch, alerts, vehicle-control surfaces, and emergency coordination → Response Operations
- anomaly taxonomy, entity behavior, ecology, representation, adaptation, and phenomenon classification → Anomalies / Phenomena
- staff attributes, morale, layered harm, resilience, recovery, and personnel state → Staff / Personnel
- research programs, archive systems, controlled knowledge, historical continuity, and institutional knowledge → Research / Archives
- settlement structure, districts, service density, civic systems, and community-level world behavior → Settlement / Civic Systems
- behavior, psychology, stress response, panic, command presence, and belief-driven action → Behavior / Psychology
- global compatibility, contradiction handling, ontology boundaries, geometry-sensitive rules, breach law, and simulation-wide law → World Rules / Simulation Law
- community ties, social structure, belonging, relationship trajectories, and local trust dynamics → Social / Community
- equipment state, loadout configuration, certification, field-kit readiness, restricted media, and item-runtime behavior → Equipment / Loadouts
- classification vocabularies, registries, schemas, tier packets, packet formats, and shared definition grammar → Taxonomy / Schema
- case reconstruction, witness contradiction, interrogation workflow, remote-view interfaces, accusation sequencing, target narrowing, and truth bottlenecks → Investigation / Casework
- planning surfaces, prep slots, sequencing, throughput pressure, migration packets, and scheduling logic → Planning / Scheduling
- post-incident recovery, aftercare, rehabilitation, return-to-duty, survival intervention, and reintegration → Recovery / Reintegration
- comprehension-first work → Onboarding
- explanation-first work → Docs
