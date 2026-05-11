# Containment Protocol — Milestones

## Purpose

This document defines the milestone structure for Containment Protocol.

Milestones are not just date buckets. They are bounded proof points that show the game is becoming more itself in a controlled, testable way.

This document exists to answer:

- what each major development milestone is trying to prove
- what systems must be real at each stage
- what quality bar each milestone must meet
- what should not be considered “done enough” for milestone closure
- how to keep milestone scope aligned to dependency order

This document is for:

- planning
- milestone review
- issue grouping
- implementation focus
- scope discipline

---

## Milestone goals

Milestones should:

- represent meaningful increases in playable capability
- prove real system integration, not just visible progress
- stay bounded enough to complete
- reflect dependency order
- support honest issue closure and QA signoff
- move the project toward a trustworthy MVP and beyond

Milestones should not:

- become generic collections of unrelated work
- close based on partial demo paths
- prioritize breadth over core loop proof
- allow placeholder logic to count as delivery
- imply progress that the current playable game does not support

---

## 1. Milestone philosophy

Each milestone should answer a concrete question about the game.

Good milestone questions include:

- can the weekly loop run end to end?
- does the institution now matter across weeks?
- can the player understand why outcomes happened?
- does the world now react in bounded, meaningful ways?

Bad milestone framing includes:

- “more systems”
- “more polish”
- “more content”
- “Phase 2 stuff”

Milestones should be structured around proof, not volume.

---

## Routing clarifications for milestone scope (SPE-186–SPE-380)

Some issue families get misrouted as “flavor” or “content” when they are actually structural systems work. Use these clarifications when grouping issues under milestone scope.

### Sites / Infrastructure routing expansion (SPE-186)

Sites / Infrastructure explicitly includes:

- **room role drift** (rooms can change operational meaning without changing geometry),
- **concealed subspaces** and **hidden-route retrofits** that preserve the base shell,
- retrofit discovery through **environmental contradictions** rather than omniscient reveal.

### Factions & Authority routing expansion (SPE-187, SPE-190)

Factions & Authority explicitly includes:

- **formal vs real power** (finance/guild leverage constraining rulers),
- commerce-core institutions and chokepoint statecraft where **capital access dominates policy** without broad territory,
- **calendar-driven governance overrides**, omen channels, and astronomical structures that periodically change faction discipline or site state.

Economy / Procurement is secondary only when the implementation boundary is **revenue flow mechanics itself**, not the power structure that uses commerce as leverage.

### Civic / governance routing expansion (SPE-188)

Civic/governance includes:

- justice procedure and **access-biased outcomes**,
- sanctioned public ordeals, rhetorical contests, and **reprieve-by-service** paths,
- outsider vs insider legal asymmetry as a **live simulation surface**, not flavor.

### Research / Archives routing expansion (SPE-189)

Research / Archives includes controlled-access knowledge as an operational system:

- **compartmented access** and sensitivity tiers,
- deliberate information absence / redaction as a real state,
- declassification lifecycle,
- auditable consultation workflows.

### Teams / Recovery / Planning routing expansion (SPE-191, SPE-192, SPE-195)

Teams explicitly includes **party / company objects** with first-class shared state:

- persistent group-level records distinct from individual operators,
- composition and membership rules,
- shared-purpose and origin fields when applicable.

Under Teams / Recovery, treat group-level cohesion resources as real shared state:

- bond / fellowship budgets that can be gained, spent, depleted, and rebuilt,
- separate from individual health, readiness, morale, and action budgets.

For SPE-195-style mechanics, route as:

- **Planning / Scheduling** when rest/prep generates a temporary predictive resource that changes later commitment quality,
- **Recovery / Reintegration** when the primary effect is restoration or rehabilitation of depleted/failed state.

### Taxonomy / Schema — bounded subsystem borrowing (SPE-196)

**Taxonomy / Schema** can cover **bounded capability-grant packets** and **legality / conflict grammar** when identities **borrow narrow slices** of another subsystem (perks that grant inspectable fragments of another family’s rules, not general multiclassing). Treat these as reusable structural patterns: overlap resolution, revocation, and audit fields belong here unless a dedicated child issue owns them.

### Settlement / Civic and Staff / Personnel — staged population generation (SPE-198)

**Settlement / Civic Systems** and **Staff / Personnel** routing includes **staged population generation** as core simulation pipeline work, not one-off flavor:

1. **Macro-region** — climate, polity, pressure, migration context.
2. **Local anchor** — settlement, district, site, or institution attachment.
3. **Vocation / social detail** — role lists, inhabitant pools, and persona layers keyed to site, biome, and faction context.

### Generation — intermediate vocation layers (SPE-199)

Generation systems may expose **intermediate layers** (e.g. **expertise-domain** or broad competence domain) **before** final profession or job string. Downstream systems may consume **either** the domain layer **or** the resolved profession; routing should not force every consumer to wait for the final label.

### Generation / routing — late rare overlays on ordinary NPCs (SPE-200)

**Late rare overlays** belong with **generation / routing** when they **preserve the grounded base actor** and attach exceptional status, hooks, or capability **after** ordinary generation — additive packets under explicit rarity rules, not a separate “elite-only” generator path.

### Behavior / Psychology and Staff / Personnel — layered personality packets (SPE-201)

**Behavior / Psychology** and **Staff / Personnel** include **compact layered actor packets** as reusable simulation surface, not only deep psych sims:

- **motive**, **interest**, **presentation** as separable fields,
- **archetype seed** and low-cost **stock-role templates**,
- **promotion** from stock actor to fuller dossier when attention, evidence, or recurrence warrants (see `architecture/actor-dossiers-lineage-snapshots.md` — SPE-158).

Burden-forward or socially risky identities must remain **explicit state**, not cosmetic gloss.

### Settlement / Civic — rapid incidental population generation (SPE-202)

**Settlement / Civic Systems** can include **high-yield incidental population generation** — optimized for **hooks, rumor, motive**, and **later expansion** — as **core simulation infrastructure**, not a content-side convenience tool. Route rapid seeding work here when outputs feed hub, district cadence, or encounter pools rather than bespoke one-off prose.

### Docs and World Rules / Simulation Law — truth vs narrative framing (SPE-207)

**Docs** and **World Rules / Simulation Law** routing can include the explicit separation between **simulation truth** (canonical events and state) and **narrative framing** (how actors and institutions interpret or report what happened), including:

- **multi-perspective interpretation** (same events, incompatible narratives until resolved),
- **delayed meaning** (understanding shifts when new evidence or reveal order changes framing without retroactively rewriting truth).

Route cross-cutting narrative-emergence work here when it is about **interpretation contracts** and legibility of divergence, not only prose.

### Social / Community — emergent relationships as persistent surface (SPE-208)

**Social / Community** includes **long-horizon bond trajectories** and **relationship carriers** (tokens, debts, shared trauma, public feuds) with **consequence propagation through relation networks** — not one-scene contact state only. Emergent ties that persist across weeks belong here when they change routing, access, or obligation surfaces.

### Missions × Social / Community — relationship-testing hazards (SPE-209)

**Missions / Social / Community** crossover includes hazards whose **primary consequence** is **relational strain**, **trust distortion**, **dependence pressure**, or **cooperation failure** rather than raw damage. Route authored relational tests here when encounter resolution must surface inspectable downstream relationship deltas (not only HP or morale).

### Sites / Infrastructure, Missions, and Response / Recovery — environment as operational pressure (SPE-211)

**Environment pressure** is not only **backdrop** or **direct-damage hazards**. Route SPE-211-style work under **Sites / Infrastructure**, **Missions**, and **Response / Recovery** when the design surface includes:

- **route viability** and degradation (whether travel or extraction is structurally possible),
- **logistics denial** (supply, staging, or reinforcement paths broken or unreliable),
- **visibility collapse** (graded sensing, weather, smoke, or terrain that changes what can be known or coordinated),
- **survival loadout sensitivity** (outcomes hinge on carried gear, consumables, or preparation state),
- **post-disaster survival layers** (phased hardship after the acute event that still changes scheduling, readiness, and extraction before combat).

### Factions & Authority and Social / Community — intraculture ideological splits (SPE-212)

**Factions & Authority** and **Social / Community** include **internal anti-monolith** work: a single culture or lineage can host **rival doctrinal, strategic, or reform blocs** with **imposed labels**, **contested internal framing**, and incompatible claims about legitimacy or history. Route here when splits are **simulated internal models** (access, obligation, violence thresholds), not only external enemy factions.

### Settlement / Civic Systems and Factions & Authority — concealed and seasonal worship infrastructure (SPE-214)

**Settlement / Civic Systems** and **Factions & Authority** can include **worship infrastructure** that is **hidden**, **seasonally active**, **mobile**, or **taboo-bound** — not only stable public temples. Sacred sites may exhibit **site-as-authority** behavior (local permissions, amplified or blocked actions, punishment surfaces). Route institutional-religious operational work here when place and calendar change what actors may do or claim.

### Behavior / Psychology, Missions, and Recovery — precommitted ferocity and aftermath (SPE-215)

**Behavior / Psychology**, **Missions**, and **Recovery** share routing when **combat modes** are **precommitted control tradeoffs** with **persistent aftermath burden** — narrowed agency, altered targeting or action eligibility, equipment constraints, or paydown states — **distinct from generic morale** and **distinct from flat stat buffs**. Misrouting as “combat tuning” loses the bounded **behavior-state contract** and its **recovery / reintegration** tail.

### Equipment / Loadouts, Taxonomy / Schema, and Factions & Authority — body-bound ability media (SPE-216)

Some **embodied media** are **neither ordinary gear** nor **pure identity flavor**: they are **body-bound**, **item-like in function** (activation, storage, degradation, transfer rules), and **socially legible** as **status**, **office**, **contagion risk**, or **legitimacy** signals. Split routing by primary contract:

- **Equipment / Loadouts** when carry, maintenance, removal, or physical interaction dominates,
- **Taxonomy / Schema** when type grammar, legality, conflict resolution, or capability packets dominate,
- **Factions & Authority** when office, recognition, sanction, or institutional reaction to the marking dominates.

### Economy / Procurement and Factions & Authority — hidden sovereign reserves (SPE-217)

**Economy / Procurement** and **Factions & Authority** include **concealed continuity reserves** that sit **outside visible treasury**, with **explicit crisis, succession, or legitimacy activation rules** and inspectable **depletion or exposure** consequences. Route here when the design problem is **off-ledger power continuity**, not ordinary budget line items — still **bounded** so reserves cannot become undisciplined fiat rescue.

### Sites / Infrastructure — environmentally gated concealed access (SPE-218)

**Sites / Infrastructure** includes **environmentally gated hidden access**: **tide**, **weather**, or similar **windows** that **materially change concealment, ingress, or routing** (including secondary concealed paths). This is **structural site and logistics simulation**, not only maritime set dressing.

### Social / Community and Factions & Authority — coercive membership and no-exit (SPE-219)

**Social / Community** and **Factions & Authority** include **structurally coercive membership**: affiliation states where **exit is not a neutral choice** — attempted withdrawal can trigger **retrieval**, **retaliation**, **disappearance**, **exposure**, or other **enforcement** surfaced as tracked organization behavior. Route here when **apparent voluntariness at entry** does not erase later **no-exit** obligation or danger.

### Factions & Authority and Investigation / Casework — deniability and attribution ambiguity (SPE-220)

**Factions & Authority** and **Investigation / Casework** include **leased or sponsored force** under **attribution ambiguity**: **attribution-confidence ladders**, **private detection vs public denial**, **deniable sponsorship**, and states where actors operate under **known-but-unprovable** or **denied** political cover. Route here when outcomes depend on **evidence posture and legitimacy**, not only combat resolution.

### Factions & Authority and Social / Community — taboo capability revelation and loyalty shocks (SPE-221)

**Factions & Authority** and **Social / Community** include **legitimacy events** driven by **taboo or stigmatized capability exposure** — **distinct from** judgments of **actual conduct** or **raw competence**. **Revelation** (suspected vs confirmed, public vs compartmented) can trigger **loyalty collapse**, **support withdrawal**, or **order fracture** through **stigma and interpretive politics** even when behavior stayed useful or disciplined. Route here when the primary simulation surface is **recognition and allegiance**, not only combat outcomes.

### Factions & Authority — split symbolic apex and practical regency (SPE-222)

**Factions & Authority** includes **dual-rule** structures where **symbolic apex authority** and **practical administration** are **controlled by different actors** (e.g. ruler vs regent): split **holdings**, **policy**, **fiscal power**, **enforcement**, or **public legitimacy** surfaces, with downstream behavior depending on **which controller owns which operational channel**. Route here when governance is **incoherent by design**, not only a single clear chain of command.

### Sites / Infrastructure and World Rules / Simulation Law — overlapping reality-state zones (SPE-223)

**Sites / Infrastructure** and **World Rules / Simulation Law** can include **overlapping reality-state territory** — zones that simultaneously function as **hazard**, **territorial marker**, and **access filter** (overlap class, intensity, traversal rules). Treat as **reusable route and jurisdiction logic**, not only regional flavor or one-off anomaly prose.

### Anomalies / Phenomena and Equipment / Loadouts — transit hazard payloads and countermeasures (SPE-225)

**Anomalies / Phenomena** and **Equipment / Loadouts** include **transit side effects**: **gate- or route-class payloads** that impose **bounded hazard or transformation** separate from “successful arrival.” Mitigation belongs in the same routing family when it is **gear**, **preparation**, **ritual handling**, or **carried context** as a **deterministic countermeasure matrix** — **hazard-bearing transport systems**, not a passive **pure transport** surface.

### Settlement / Civic Systems and Sites / Infrastructure — band-based habitability (SPE-226)

**Settlement / Civic Systems** and **Sites / Infrastructure** include **strip- or band-based habitability**: **narrow survivable corridors** between **hostile macro-zones**, where **settlement placement**, **route pressure**, and **edge-condition variation** are organized around **survivable bands** rather than assuming **evenly habitable** regional tiles. Route macro-layout work here when the world model is **corridor logic**, not full-planet uniform biomes.

### World Rules / Simulation Law and Planning / Scheduling — noncelestial timekeeping (SPE-227)

**World Rules / Simulation Law** and **Planning / Scheduling** include **time as an operational state** when **stable celestial reference** is **absent, distorted, or contested**: degraded **time confidence**, **ritual timing** risk, and **watchkeeping** drift. Route here when schedules, contracts, or coordination depend on **which time regime is trusted**, not only calendar labels on a fixed sky.

### Equipment / Loadouts and Containment — decaying portable environmental toxins (SPE-228)

**Equipment / Loadouts** and **Containment** share routing for **portable hazard media** with explicit **storage-safe**, **active-release**, and **spent / degraded** states — persistence shaped by **containment quality**, **environment**, and **deployment method**. This is the **carried toxin** boundary where **gear state** and **hazard propagation** are one object, not separate “item” vs “ambient hazard” tickets.

### Sites / Infrastructure — staged structural instability (SPE-229)

**Sites / Infrastructure** includes **progressive structural failure** before binary collapse — e.g. **heat-triggered stress** with **marginal**, **overloaded**, **shifting**, **cracked**, or **delayed-failure** conditions that change **traversal**, **visibility**, and **safety** while the shell still stands. Route here when structure is a **staged stress surface**, not only **intact vs destroyed** geometry.

### Missions and Settlement / Civic Systems — multi-axis encounter cadence (SPE-230)

**Missions** and **Settlement / Civic Systems** encounter pressure is **multi-axis**, not reducible to biome or hostility alone. Treat **route class**, **local section**, **visibility**, **density**, **time state**, **threat posture**, and **noncombat event categories** (logistics, rumor, salvage, patrol, persistent traversal pressure) as **first-class cadence inputs**. Misrouting as “hostile biome tuning” loses **schedule- and place-shaped** encounter logic.

### Sites / Infrastructure and Response / Recovery — seat-locked embodied vehicle control (SPE-231)

**Sites / Infrastructure** and **Response / Recovery** include **vehicle control** that is **stateful embodiment**, not interchangeable **pilot stations**: **fixed-contact** or **seat-locked** surfaces that **partially replace operator agency**, bind **orientation and envelope state** to the occupant, and depend on **crew-role specialization** and **competency splits**. Route here when the design contract is **who may occupy which control locus** and **what the hull does to the operator**, not only generic “drive the vehicle” affordances.

### Containment, Response / Recovery, and Sites / Infrastructure — mobile atmosphere as operational layer (SPE-232)

**Containment**, **Response / Recovery**, and **Sites / Infrastructure** treat **atmosphere** as a **tracked operational layer** — composition, pressure, fouling, **decay**, **mixing**, **occupancy-sensitive** consumption, **transfer on contact**, and **staged penalties** — not passive “everyone can breathe” background. Route life-support and breach-adjacent work here when **air state** drives **timers, legality of actions, or evacuation pressure**.

### Sites / Infrastructure and World Rules / Simulation Law — geometry-derived local gravity (SPE-233)

**Sites / Infrastructure** and **World Rules / Simulation Law** can include **local gravity takeover** authored as **topology**: **orientation-boundary traversal**, **geometry-derived dominant fields** on contact, and rules for **which “down” wins** in overlapping volumes. Route here when **reorientation** is **map and traversal logic**, not invisible camera polish.

### World Rules / Simulation Law and Equipment / Loadouts — environment-gated ability legality (SPE-234)

**World Rules / Simulation Law** and **Equipment / Loadouts** include **environment-taxonomy-conditioned legality** for tools and powers: **hard illegality**, **degraded reliability**, **null-action** states, **local-compatible substitution**, and **provenance-sensitive** compatibility (what is “legal here” vs “legal anywhere”). Route here when **place type** is a **reusable rules surface**, not only a damage multiplier on the same action list.

### Factions & Authority and World Rules / Simulation Law — location-dependent patron access (SPE-235)

**Factions & Authority** and **World Rules / Simulation Law** include **patron, pact, or divine-channel access** that is **location-dependent**: **recognition** or **denial** by jurisdiction, **throttled** contact ceilings, and **fallback** states (allied equivalence, temporary restored contact, degraded blessing) rather than **globally uniform** availability. Route here when power is **place- and institution-shaped**, not a single always-on buff.

### Response / Recovery and Equipment / Loadouts — temporary propulsion and control packets (SPE-236)

**Response / Recovery** and **Equipment / Loadouts** include **short-lived operational capability** for **temporary control or propulsion** — bounded-duration packets that may **present a helm-like interface** or **boost** an existing plant under **explicit expiry**, **consumption**, or **tear-down** rules. Route separately from **permanent vehicle infrastructure** and from **generic consumables** when the object is **infrastructure-shaped** but **not** the hull’s enduring engine architecture.

### Sites / Infrastructure and Response / Recovery — heterogeneous propulsion and helm taxonomy (SPE-237)

**Sites / Infrastructure** and **Response / Recovery** include **heterogeneous propulsion classes**, **incompatible helm or control taxonomies**, and **salvage-built mixed-origin** vehicles where **origin, fueling, startup, failure modes, and operating regimes** do not collapse to a single clean template. Route propulsion-composition work here when **class mixing** changes **who may command**, **what can run simultaneously**, and **what failure looks like**.

### Equipment / Loadouts and Response / Recovery — bonded remote vehicle control (SPE-238)

**Equipment / Loadouts** and **Response / Recovery** include **wearable or carried bonded control artifacts** for **off-board** vehicles or platforms: **range**, **bandwidth**, **latency**, **line-of-sight or relay constraints**, **override** and **contested-control** rules, and **operator state** distinct from **seat-locked** embodiment (SPE-231). Route here when remote operation is a **bounded operator-state system**, not a free omniscient puppet.

### Response / Recovery, Factions & Authority, and Teams / Recovery — sacrificial biological propulsion (SPE-239)

**Response / Recovery**, **Factions & Authority**, and **Teams / Recovery** share routing when **propulsion** imposes **explicit life-cost**, **captivity**, **coercion**, or **legitimacy burden** — engines that are **also survival, ethics, and institution surfaces**, not ordinary **fuel depletion**. Route here when moving the hull **consumes or endangers persons** in ways that **faction recognition** and **aftermath care** must acknowledge.

### Equipment / Loadouts and Sites / Infrastructure — consumptive and bound-object power cores (SPE-240)

**Equipment / Loadouts** and **Sites / Infrastructure** include **power cores** that **feed multiple site or vehicle behaviors** from one dependency: **consumptive cores** (burn-through inventory-like inputs for bounded output) and **bound-object cores** (socketed singular artifacts with **persistent output**, **ongoing risk**, and **governance cost**). Include **missing-core evidence surfaces** — inspectable clues when a core is **displaced**, **stolen**, or **wrong object socketed** — so dependency is legible across systems.

### World Rules / Simulation Law, Response / Recovery, and Investigation / Casework — active breach transit and search (SPE-241)

**World Rules / Simulation Law**, **Response / Recovery**, and **Investigation / Casework** include **boundary transit** as an **operational system**, not exotic movement flavor: **deliberate routing**, **formation-locked group transfer**, **finite transit budgets**, **specialist-controlled access asymmetry**, plus **creation**, **stabilization**, **replication**, and **search** under **explicit legality**, **duration**, and **traversal class**. Route breach work here when **procedure, crew role, and resource accounting** matter as much as **geometry** and when **investigation surfaces** must separate **authorized vs rogue** breach use.

### Taxonomy / Schema and Social / Community — presentation vs internal rules (SPE-242)

**Taxonomy / Schema** and **Social / Community** treat **visible presentation** as its own **social-state surface** — **class**, **rank**, **legal privilege**, dress, bearing, gear display, and speech can **signal institutionally recognized status** while still **diverging from internal mechanical rulesets**. **Investigation / Casework** remains the natural home when **forensic separation** of **presentation vs mechanics** drives outcomes. Route here when “what society sees” and “what the sim grants” are **explicitly decoupled but both inspectable**, not a single fused identity blob.

### Anomalies / Phenomena and Taxonomy / Schema — environment-driven adaptation templates (SPE-243)

**Anomalies / Phenomena** and **Taxonomy / Schema** include **template-based**, **pressure-shaped** adaptation that **combines** with **age-stage**, **exposure**, or other **overlays** — **reusable ecological drift** and **mutation packets** on **baseline families** without **isolated bespoke variants** or a **new species tree** per roll. Route environment-conditioned deltas here when the design surface is **composable template novelty**, not one-off creature authorship.

### Recovery / Reintegration and Containment — environmental survival intervention (SPE-244)

**Recovery / Reintegration** (under **Teams / Recovery**) and **Containment** include **partial environmental countermeasures** that preserve **survivability** through **retention**, **atmosphere refresh**, **cocooning**, or **low-output preservation** stances — **not total immunity**. Effects may impose **channel-specific failure modes**, **deferred cost**, and **residual risk** while **trading action capacity or throughput for life**. Route here when survival is **tradeoff-shaped intervention**, not a binary resist flag.

### Sites / Infrastructure and Taxonomy / Schema — material-aware structural conversion (SPE-245)

**Sites / Infrastructure** and **Taxonomy / Schema** share **material response tables** for **substrate-aware conversion**: **repair**, **sabotage**, **fabrication**, **transmutation**, **breach creation**, **delayed release** from altered material state, and **post-conversion behavior** keyed by **material family**. Route structural chemistry work here when **the same operation** means different things on **steel vs crystal vs organics**, as a **reusable rules family** rather than one-off set pieces.

### Settlement / Civic Systems and Sites / Infrastructure — mobile habitat lifecycle (SPE-250)

**Settlement / Civic Systems** and **Sites / Infrastructure** include **mobile assets** that are **not transport-only shells**: **habitats**, **civic hubs**, **industrial centers**, **drifting settlements**, **covert routes**, **spectacle platforms**, and **later ruins or hostile sites** — with **explicit lifecycle phases** and **movement-dependent identity** (jurisdiction, recognition, supply, crew continuity). Route here when the object is **a place that happens to move**, not a static tile with a vehicle graphic.

### Investigation / Casework and World Rules / Simulation Law — anchored remote viewing (SPE-251)

**Investigation / Casework** and **World Rules / Simulation Law** include **remote viewing** as a **bounded interface family**: **anchored** surfaces or devices, **explicit anti-scry denial**, **verification and leakage-audit** posture, and **escalation risk** where observation can **reciprocate into breach** or counter-breach — **not** invisible **omniscient** sensing. Route scry/projection work here when **operator, anchor, and target-field** states are **separately accountable**.

### Equipment / Loadouts and Factions & Authority — prestige wearables as risk objects (SPE-253)

**Equipment / Loadouts** and **Factions & Authority** include **prestige wearables** and **ceremonial relics worn on-body** that are **identity-bearing risk objects**, not inert gear: **ownership drama**, **pursuit pressure**, **state-gated activation**, **custody and forfeiture consequences**, and **social privilege or vulnerability** tied to **wear-state** and **removal rules**. Route here when the item’s drama is **legitimacy, jealousy, or coercion**, not only stat slots.

### Sites / Infrastructure — silhouette as site-class promise (SPE-254)

**Sites / Infrastructure** treats **exterior silhouette** and **readable massing** as a **learned promise** about **likely hazard family**, **encounter rhythm**, **access rules**, and **probable hidden depth** — bounded **site-class** vocabulary (e.g. civic park vs secured reserve vs industrial bulk) as **distinct play offers**, not decorative variants of the same encounter template.

### Docs — cross-discipline brief packets (SPE-255)

**Docs** includes **documentation-first** work that ships a **reusable cross-discipline brief format** — aligning **systems**, **writing**, **art**, **UX**, and **production constraints** (shared vocabulary, scope, and **resolved priority conflicts**) **before** content is locked. Route coordination-heavy “brief packet” issues here when the deliverable is **process and contract**, not only narrative prose or a single subsystem spec.

### Anomalies / Phenomena and Taxonomy / Schema — lineage infusion and derived subtypes (SPE-256)

**Anomalies / Phenomena** and **Taxonomy / Schema** distinguish **lineage-derived subtypes**, **origin overlays**, and **continuity markers** (blood chemistry, residue signatures, heritable capability packets) from **environment-driven adaptation templates** (SPE-243). Route infusion and **progenitor-driven subtype creation** here when propagation is **ancestry and continuity**, not **local pressure-shaped drift** alone.

### Recovery / Reintegration, Investigation / Casework, and Containment — delayed death conversion (SPE-258)

**Recovery / Reintegration** (under **Teams / Recovery**), **Investigation / Casework**, and **Containment** share routing for **staged decline**, **multi-phase cure chains** with **ordering-sensitive windows**, **corpse-handling and postmortem risk**, and **delayed hostile reactivation** after **apparent resolution** — work that spans **clinical triage**, **civic response**, **evidence chain**, and **burial or transport policy**. Route here when “we thought it was over” is a **tracked simulation tail**, not a single resolution tick.

### Sites / Infrastructure and Response / Recovery — deployable chokepoint fortifications (SPE-259)

**Sites / Infrastructure** and **Response / Recovery** include **portable or deployable defensive runtime objects**: **chokepoint nodes** that **unfold** into pass-control and **anti-assault** value, then **restore**, **recompress**, or **redeploy** under **explicit cost, timing, and crew** rules — **not** only **map-fixed** fortifications baked into terrain. Route fortification kits here when **ownership and state** (packed vs emplaced vs damaged) are first-class.

### World Rules / Simulation Law and Anomalies / Phenomena — region-scale spell corruption fields (SPE-260)

**World Rules / Simulation Law** and **Anomalies / Phenomena** include **regional corruption** that **distorts specific effect families** across an **area** while preserving a **hidden focal source** — **inferable signatures** (unreliability, family-specific amplification or dampening) without **rewriting all magic behavior equally**. Route here when the design surface is **field geometry + investigative triangulation**, not a single-room hazard only.

### Sites / Infrastructure and World Rules / Simulation Law — realm-scale concealment and return denial (SPE-261)

**Sites / Infrastructure** and **World Rules / Simulation Law** include sites that are **physically present** yet **operationally hidden**: **access-conditioned approach**, **return-denial**, **trap boundaries**, **misleading perimeters**, and **extraction failure** under specific entry or exit contracts — **persistent site-state**, not only **discovery fog** or one-shot reveal. Route concealment here when **revisit logic** and **exception-return** rules are authored, not generic fog-of-war.

### Sites / Infrastructure and Containment — passive anti-intrusion materials (SPE-262)

**Sites / Infrastructure** and **Containment** include **passive construction packages**: **anti-transport**, **anti-scry**, **anti-diffuse** or **seep-blocking** materials and **seal classes** that work **without active wards** or standing guard duty — **material and envelope security** as a **first-class** surface alongside **surveillance, legal leverage, and keyed access**. Route here when defense is **what the walls are made of**, not only who patrols them.

### Sites / Infrastructure and World Rules / Simulation Law — confined-space explosion propagation (SPE-263)

**Sites / Infrastructure** and **World Rules / Simulation Law** treat **geometry** as a **first-class blast modifier**: **tunnel-amplified propagation**, **shaft and choke channeling**, **pre-ignition warning states**, and **ignition buildup** that differs from **open-field** rules. Route confined blast work here when **room graph and aperture shape** change **lethality and evacuation windows**, not only a generic “explosion” tag.

### Settlement / Civic Systems and Sites / Infrastructure — altitude and depth environmental bands (SPE-264)

**Settlement / Civic Systems** and **Sites / Infrastructure** include **altitude / depth bands** within one mapped place: **distinct survivability**, **breathability**, **visibility**, **route logic**, and **conflict front lines** per band — **vertical layering** of environment state, not a **single uniform** outdoor room. Route layered atmosphere and ecology here when **the same X,Y** has **multiple Z-resolved** play contracts.

### Factions & Authority and Planning / Scheduling — strategic antagonist timetables (SPE-265)

**Factions & Authority** and **Planning / Scheduling** include **major hostile actors** with **explicit timetables**: **proactive objectives**, **retaliation tiers**, **restoration or rebuild agendas** after setbacks, **recurring nemesis continuity**, and **off-screen progress beats** between player-visible encounters — **not** only **reactive** spawn-on-approach villainy. Route antagonist progression here when **the calendar is the threat**, not only the stat block.

### Equipment / Loadouts and Taxonomy / Schema — contact-based object transmutation (SPE-266)

**Equipment / Loadouts** and **Taxonomy / Schema** include **anomaly or ritual contact** that **rewrites carried object state** — **material**, **class**, **value**, or **target legality** — rather than only applying **damage**, **durability loss**, or **destroy**. Route transmutation here when post-contact items are **inspectable typed results** with **reversal or downgrade** rules, not a one-off narrative hand-wave (see also material conversion families in SPE-245).

### Behavior / Psychology and Anomalies / Phenomena — emotion-fed hostile sustain (SPE-267)

**Behavior / Psychology** and **Anomalies / Phenomena** include **closed provoke-and-feed loops**: hostiles that **provoke**, **harvest**, or **convert** emotional or collective-affective states into **sustain**, **healing**, **persistence**, **retargeting**, or **escalation**. Route here when counterplay is **social-loop interdiction**, **rite disruption**, or **de-escalation strategy**, not only DPS races.

### Staff / Personnel and World Rules / Simulation Law — construct maintenance and malfunction (SPE-268)

**Staff / Personnel** and **World Rules / Simulation Law** include **persistent autonomous constructs** with **upkeep burden**, **fault tables**, **partial shutdown**, **degraded capability bands**, and **rogue drift** — **not** only **intact vs destroyed**. Route created-actor maintenance here when **crew time**, **spares**, **calibration**, or **jurisdiction** (who may service the construct) matters as much as combat HP.

### Containment, Recovery / Reintegration, and Investigation / Casework — staged parasitic host conversion (SPE-269)

**Containment**, **Recovery / Reintegration** (under **Teams / Recovery**), and **Investigation / Casework** share routing for **staged parasitic or host conversion**: **multi-step progression**, **extraction-risky** interventions, **cure-window sensitivity**, and **rescue or transfer** moments that can **accelerate spread** — **not** instant binary “infected” flags. Route here when diagnosis, procedure, and evidence chains span **clinical, legal, and quarantine** surfaces together.

### Research / Archives and Behavior / Psychology — biological and mnemonic drain (SPE-270)

**Research / Archives** and **Behavior / Psychology** treat **memory**, **identity traces**, and **cognition payloads** as **runtime resources**: **theft**, **reservoir storage**, **typed subsystem loss**, and **later recovery windows** — **operational state** with audit and continuity fields, not only **prose flavor** or cutscene beats. Route dual biological + mnemonic drain here when **what was stolen** must remain **inspectable and restorable** under explicit rules.

### Anomalies / Phenomena and World Rules / Simulation Law — phase-conditioned actor profiles (SPE-276)

**Anomalies / Phenomena** and **World Rules / Simulation Law** include **phase-driven profile replacement** as a **core authored mechanic**: **external** **celestial phase**, **eclipse or season-light** thresholds, or **thresholded environmental** inputs swap **runtime profiles** — **appearance**, **behavior hooks**, **capability gates**, **restraint bands**, **timed reactivation** — as **explicit machine states**, **not** local **buff stacks**, **morale**, or **fatigue** alone. Route here when “what this actor is” **changes with the sky or the world clock**, not only when gear or mood ticks.

### Research / Archives and Investigation / Casework — information-feeding entities (SPE-277)

**Research / Archives** and **Investigation / Casework** include hostile or predatory use of **knowledge**, **memory**, and **operational understanding** as **consumable runtime fuel** — **feeding**, **overload**, **harmful knowledge payloads**, **repeat-exposure escalation**, and **casework-relevant** consequence chains — **not** only **archive holdings** or **neutral evidence** packets. **Anomalies / Phenomena** remains the natural home for **entity taxonomy** of feeders; route intake-and-sustain mechanics here when **what investigators know** directly **powers or grows** the threat (see SPE-270 for theft-oriented drain).

### Equipment / Loadouts and Response / Recovery — species-specific vehicle usability (SPE-278)

**Equipment / Loadouts** and **Response / Recovery** include **transport and control usability** keyed to **operator body plan**, **posture**, **size**, and **interior ergonomics** — **separate from** **training**, **license**, or **authorization** alone. **Logistics-facing summaries** (crew fit, cargo, **route suitability**, **transport role**) should **surface physical compatibility** as a **first-class** deployment constraint, not a hidden post-pick failure.

### Anomalies / Phenomena and World Rules / Simulation Law — oversized distributed entity representation (SPE-279)

**Anomalies / Phenomena** and **World Rules / Simulation Law** include **one coherent actor** whose **footprint exceeds ordinary token scale** — **distributed presence**, **multi-cell embodiment**, or **region-spanning body** — while remaining an **entity** (single identity, single obligation graph), **not** a **vehicle**, **crowd**, or **disconnected hazard patch**. Route representation-layer work here when **collateral, travel, and sustainment** semantics must still attach to **one actor id**.

### Planning / Scheduling and Docs — offsite campaign transition (SPE-280)

**Planning / Scheduling** and **Docs** include **cross-scale continuity**: moving play into **offsite operations** via **bounded migration packets** that **inherit actors**, **resources**, **obligations**, **world state**, and **site liabilities** — **not** a **fresh campaign shell** or implied reset. Route transition authorship here when the deliverable is **what carries forward** and **what new scheduling surfaces unlock**, not only a new map skin.

### Social / Community and Investigation / Casework — behavior-weighted disguise validation (SPE-285)

**Social / Community** and **Investigation / Casework** include **layered disguise scrutiny**: **appearance**, **conduct**, **voice**, **hierarchy fit**, **route behavior**, and **procedural compliance** can each **trip suspicion** — including **escalation from conduct mismatch alone** before dress fails. Support **long-lived cover** with **accumulating contradiction** surfaces and **inspectable** audit trails (who saw what, which ritual step was wrong). Route infiltration validation here when **social performance** is the **primary failure mode**, not only disguise DC vs Perception.

### Social / Community, Investigation / Casework, and Sites / Infrastructure — site conduct as security (SPE-286)

**Social / Community**, **Investigation / Casework**, and **Sites / Infrastructure** include **posted conduct codes**, **visible permission surfaces**, and **restricted-zone behavior rules** as **active security filters** — escalation through **scrutiny, shame, escort, ejection, or access denial** tied to **patrol and authority** systems — **not** only **locks**, **keys**, or **guard HP**. Route site policy here when **following local etiquette** is the **gate**, not only whether the door opens.

### Anomalies / Phenomena and Sites / Infrastructure — false-occupant and safe-seeming facades (SPE-287)

**Anomalies / Phenomena** and **Sites / Infrastructure** include **domestic- or civilian-looking** rooms with **dormant hostile reveal states** — **occupancy facades** and **bio-construct** or **illusion-backed** “someone lives here” packets **distinct from** ordinary **stealth** or **invisible enemy** placement. Route here when safety is a **room-state timer or trigger**, not only hidden combatants in geometry.

### Investigation / Casework and Recovery / Reintegration — postcombat witness recovery (SPE-288)

**Investigation / Casework** and **Recovery / Reintegration** (under **Teams / Recovery**) include **hostile-to-witness** transitions **gated by explicit postcombat handling**: stabilization, debrief, medical triage, custody, or transport choices that unlock **testimony**, **clue reliability**, or **relapse-sensitive** evidence decay. Route aftermath here when **how you treat the defeated** changes **what you can later prove**, not only loot rolls.

### Social / Community and Investigation / Casework — staged accusation rooms (SPE-289)

**Social / Community** and **Investigation / Casework** include **accusation or credibility-pressure** spaces as **authored reveal choreography**: **seating**, **timing**, **crowd framing**, **exit control**, **procedural delay**, and **registry or witness ordering** can shape outcomes **before** violence. Route **social trap** rooms here when **theater of legitimacy** is the **mechanic**, not only a dialogue node.

### Sites / Infrastructure — concealed shell and interior base state (SPE-290)

**Sites / Infrastructure** includes **one site packet** with **split fidelity**: a **deceptive shell** (inert, ordinary, or misclassified exterior) and a **distinct engineered interior** with its own **breathability**, **hazard**, **routing**, and **opening or bypass** rules. Route shell-vs-interior work here when **recognition** and **deterministic transitions** between layers are **first-class**, not a single merged navmesh.

### Sites / Infrastructure and Containment — facility zoning and lockdown ladders (SPE-292)

**Sites / Infrastructure** and **Containment** include **live facility zoning**: **access bands**, **hidden vs public dual maps**, **monitored presence classes**, **ordered lockdown gates**, **quarantine or hotspot wings**, and **circulation changes under alarm** that **trap, reroute, or isolate** — **operational topology**, not only **static room graphs**. Route large-site work here when **the building’s mode** (normal, elevated, breached) **rewrites who may go where**.

### Taxonomy / Schema, Equipment / Loadouts, and Behavior / Psychology — modular technique packets (SPE-293)

**Taxonomy / Schema**, **Equipment / Loadouts**, and **Behavior / Psychology** include **named nonspell technique packets** for **specialist lanes** — **modular actions** with **shared legality**, **resource**, and **revocation** rules — **distinct from** **spell lists** and **passive equipment bonuses**. Route technique libraries here when the surface is **reusable packet format + use constraints**, not a one-off custom action.

### Equipment / Loadouts and World Rules / Simulation Law — phase-traversal item routing risk (SPE-294)

**Equipment / Loadouts** and **World Rules / Simulation Law** include **traversal artifacts** that **bypass ordinary pathing** while carrying **calendar- or event-window routing risk**: **misjump** outcomes, **transition vulnerability**, **companion coupling**, and **rematerialization counters** or **reverse banishment** as valid counterplay. Route high-mobility items here when **where and when you can jump** is a **risk-bearing routing system**, not a free fast-travel button.

### Equipment / Loadouts and Behavior / Psychology — semi-autonomous weapon personality (SPE-295)

**Equipment / Loadouts** and **Behavior / Psychology** include **semi-autonomous weapons** as **runtime actors**: **command-triggered power menus**, **target preferences**, **benefit gating**, and **user-goal conflict** or **personality clash** states — **not** inert stat sticks. Route intelligent armaments here when **whose intent wins** must be **tracked across encounters**, not only durability and DPS.

### Planning / Scheduling and Sites / Infrastructure — observation-based navigation and intercept (SPE-306)

**Planning / Scheduling** and **Sites / Infrastructure** include **inference-based navigation** as a **planning surface**: **route**, **destination**, **safer path**, and **intercept** estimates from **observed motion**, **sky or environmental state**, and **trained instruments** — **bounded confidence**, **skill plus tool** dependencies, and **anticipation** of weather or hazard **without** assuming **full map truth** for the actor. Route recon-and-transit work here when **what you infer** drives **commitment and risk**, not only revealed tiles.

### Recovery / Reintegration and Sites / Infrastructure — resource stretching and cumulative exhaustion (SPE-307)

**Recovery / Reintegration** (under **Teams / Recovery**) and **Sites / Infrastructure** include **deliberate short-term survival stretching** — procedures that **reduce immediate** food, water, air, or similar **burn** while **accumulating exhaustion**, **collapse risk**, or **severe stress** across **repeated** stretch cycles. Route here when survival is a **repeatable tradeoff curve**, not only one-shot intervention packets (see SPE-244).

### Response / Recovery — crew-specialized heavy weapon operation (SPE-308)

**Response / Recovery** includes **large crewed weapons** as **differentiated role systems**: **fire control**, **loading**, **command linkage**, and **staffing-sensitive** output or **degraded-fire** behavior when **required roles** are **missing or substituted** — parallel to **vehicle crew specialization** (SPE-231) but for **emplaced or shipboard heavy arms**. Route here when **who stands which post** changes **what the battery can do**, not only ammo count.

### Factions & Authority and Response / Recovery — hierarchy-driven fleet composition (SPE-309)

**Factions & Authority** and **Response / Recovery** include **force composition** derived from **hierarchy**, **doctrine**, **command structure**, and **faction or family templates** — **proportions and hull roles** shaped by **governance**, not **neutral ship-list** generation alone. Route fleet authorship here when **who commands whom** determines **what kinds of units exist**, not only encounter budget.

### Behavior / Psychology and Response / Recovery — command-action morale (SPE-310)

**Behavior / Psychology** and **Response / Recovery** include **active leadership outputs** — **speeches**, **orders**, **command presence**, or similar **bounded interventions** — that **temporarily improve group morale** contingent on **leader quality**, **credibility context**, and **audience state**. Route morale here when it is **an actionable schedule cost with upside**, not only a **passive drift** bar.

### Investigation / Casework and Settlement / Civic Systems — survey success vs site confirmation (SPE-311)

**Investigation / Casework** and **Settlement / Civic Systems** distinguish **survey outcomes** as **separate states**: **survey success** (better models, tighter bounds), **negative confirmation**, **suspected presence**, and **actionable site confirmation** (a **deployable or exploitable** locus). Route here when work **advances knowledge** without **guaranteeing a usable site** — “we learned a lot” is **not** the same as “we can dig here now.”

### Planning / Scheduling and Sites / Infrastructure — terrain-scaled survey clocks (SPE-312)

**Planning / Scheduling** and **Sites / Infrastructure** include **survey as time-and-coverage systems**: **bounded survey clocks**, **terrain-scaled throughput**, **progressive confidence** bands, and **probe-before-commit** sequencing that spends **labor, specialists, and risk** before **excavation or expansion** locks in. Route exploration pacing here when **coverage fraction** and **clock pressure** are the mechanic, not only a binary “survey roll.”

### Investigation / Casework and World Rules / Simulation Law — catastrophic survey misinformation (SPE-313)

**Investigation / Casework** and **World Rules / Simulation Law** include **actively misleading survey products**: **false absence**, **false richness**, **stale-plan confidence**, **unresolved discrepancies**, and **source-specific confidence ceilings** — **not** neutral nulls when instruments fail. Route bad intel here when **wrong maps** drive **bad commitments** with **inspectable provenance** of why the model lied.

### Economy / Procurement — coupled primary output and by-products (SPE-314)

**Economy / Procurement** includes **single-site generation** that yields a **primary output** plus **coupled by-products** under **shared coupling rules** (tables, reactions, or process chains) — **not** one **yield class** per node only. Route deposit and processing work here when **secondary streams** are **deterministic consequences** of running the primary line.

### Sites / Infrastructure and Economy / Procurement — pre-yield access phase (SPE-315)

**Sites / Infrastructure** and **Economy / Procurement** separate **access-phase** work from **extraction-phase yield**: some discoveries require **named access work**, **elapsed thresholds**, or **depth breakthroughs** before **productive extraction** begins — **nonproductive** until the **transition** is satisfied. Route here when **opening the pocket** is its own **milestone**, not the same ticket as **tons per week**.

### Economy / Procurement — finite lifespan clocks on resource nodes (SPE-316)

**Economy / Procurement** includes **resource nodes** with **finite productive lifespan clocks**: **depletion pressure** as a **planning surface**, **bounded extension** outcomes (partial refresh, costly overdrive, irreversible tailoff), and **context-sensitive longevity** (biome, stewardship, adjacent processing). Route here when **how long the hole stays good** shapes **commitment and replacement strategy**, not only instantaneous yield rates.

### Economy / Procurement and Sites / Infrastructure — post-extraction processing (SPE-317)

**Economy / Procurement** and **Sites / Infrastructure** treat **realized value** as **downstream of processing capacity**: **refineries**, **yards**, **labs**, or **logistics choke** that convert **raw** into **salable or deployable** form under **efficiency**, **throughput**, and **bottleneck** rules — **distinct** from **acquisition** or **salvage appraisal** alone. Route value-chain work here when **the building that finishes the ore** is the **gate**, not only **what came out of the ground**.

### Economy / Procurement and Taxonomy / Schema — tier-scoped infrastructure upgrades (SPE-318)

**Economy / Procurement** and **Taxonomy / Schema** include **infrastructure upgrades** that apply to **named tiers or models** — **science vs engineering** tracks, **retrofit vs new-build** paths, and **non-global** gains (this line only, this hull class only). Route upgrade trees here when **compatibility matrices** and **replaceable components** matter, not a single “+10% to everything” tech flag.

### Economy / Procurement and Staff / Personnel — specialist refinement for premium outputs (SPE-319)

**Economy / Procurement** and **Staff / Personnel** include **premium outputs** that stay **low-value or unsellable** until **dedicated specialist finishing** — **time per unit**, **bottleneck crafters**, and **clear split** from **ordinary inline cleaning** of **lower-tier by-products**. Route refinement here when **who finishes the batch** is the **value unlock**, not only plant throughput.

### Settlement / Civic Systems, Economy / Procurement, and Staff / Personnel — labor and terrain throughput matrix (SPE-320)

**Settlement / Civic Systems**, **Economy / Procurement**, and **Staff / Personnel** share a **throughput matrix** surface: **worker class**, **terrain**, **discipline or morale state**, **settlement size**, **service base**, **transport access**, and **surge** or **upkeep** modifiers — **not** flat **headcount multipliers** for extraction, construction, or civic services. Route labor planning here when **local availability** and **terrain fit** change **what work can run this week**, not only payroll totals.

### Economy / Procurement and Sites / Infrastructure — fast extraction machinery tradeoffs (SPE-321)

**Economy / Procurement** and **Sites / Infrastructure** include **machinery-driven throughput boosts** that **trade** **node longevity**, **fragile-output survival**, or **loss rates** for **short-term gain** — **bounded tradeoff systems**, not pure **+throughput** buffs. Route extraction plant here when **running hot** accelerates **depletion clocks** (see SPE-316) or **breaks delicate fractions**, not only cycle time.

### Sites / Infrastructure and Containment — underground operational hazards (SPE-322)

**Sites / Infrastructure** and **Containment** include **noncombat underground failure modes**: **collapse**, **flooding**, **gas**, **toxicity**, **suffocation pressure**, and **forced shutdown** — **without enemy action** — plus paths where **stabilized hazards** convert into **long-term infrastructure value** (sealed vaults, pressure taps, rerouted drainage). Route subsurface operations here when **the mine is the opponent**, not only combat encounters.

### Planning / Scheduling and World Rules / Simulation Law — dynamic celestial navigation (SPE-323)

**Planning / Scheduling** and **World Rules / Simulation Law** include **live navigation infrastructure** from **moving celestial markers**, **concept-anchored direction**, and **dynamic sky references** — **forecasting**, **route pressure**, and **timekeeping coupling** where **orientation is authored state**. Route celestial nav here when **where the moon is** changes **which routes are valid**, not only cosmetic skyboxes (see SPE-306, SPE-227).

### Settlement / Civic Systems — vertical class and commerce bands (SPE-324)

**Settlement / Civic Systems** treats **vertical arrangement** as a **readable civic signal**: **class rank**, **market access**, **storage role**, and **access-band logic** communicated by **elevation and banded floors** — **not** aesthetic stacking alone. Route commerce-site authorship here when **who shops on which level** is **policy and logistics**, not only prop density.

### Anomalies / Phenomena and Economy / Procurement — bio overgrowth hazard ecology (SPE-325)

**Anomalies / Phenomena** and **Economy / Procurement** include **aggressive overgrowth** as **simultaneous** **hazard field**, **salvage complication**, and **resource opportunity** — **inspectable overgrowth states** that change **access**, **yield tables**, and **risk**. Route ecological overlap here when **clearing vs cultivating** is a **strategic fork**, not a single “weed” tag.

### Response / Recovery and Sites / Infrastructure — helm and control-surface shutdown (SPE-326)

**Response / Recovery** and **Sites / Infrastructure** include **anti-interface** hostile effects that **disable, jam, or destroy helms**, **power interfaces**, or **control seats** **without** requiring **hull destruction** — a **physically intact** platform can become **nonfunctional** when **command loci** are gone. Route vehicle and emplaced-control combat here when **targeting the seat** is the **win condition**, not only structure HP (see SPE-231).

### Sites / Infrastructure and Anomalies / Phenomena — persistent directed debris fields (SPE-327)

**Sites / Infrastructure** and **Anomalies / Phenomena** include **sustained moving field hazards** built from **directed debris** — coherent **barrier or sweep objects** with **collision**, **blocking**, and **route threat** semantics — **not** only **static clutter** or generic obstacles. Route field hazards here when **the cloud is authored** as a **persistent spatial layer**, not full particle sim.

### Equipment / Loadouts and World Rules / Simulation Law — tag-linked remote manipulation (SPE-328)

**Equipment / Loadouts** and **World Rules / Simulation Law** include **marker-mediated remote manipulation**: **tagged** objects or beings acted on **at range** through **explicit link states** — **link ownership**, **per-target constraints**, **multi-target upkeep**, and **infrastructure kill chains** — **not** generic **telekinesis** freebies. Route remote tools here when **who is marked** and **which channel is live** are **inspectable contracts**.

### Equipment / Loadouts and Missions — beneficial curse with latent hostility (SPE-329)

**Equipment / Loadouts** and **Missions** include gear that grants **real immediate utility** while **secretly writing** **tracking**, **claim**, **classification drift**, **escalation hooks**, or **hostile follow-on** obligation — **upside/downside ladders** and **friction** that surface in **deployment outcomes**, not flat **always-on debuffs**. Route here when **prestige or power** (SPE-253) pairs with **latent betrayal** timed to **mission state** or **report fallout**.

### Staff / Personnel and World Rules / Simulation Law — finite command construct control (SPE-330)

**Staff / Personnel** and **World Rules / Simulation Law** include **semiautonomous proxies** operated through **finite command vocabularies**, **configured channels**, **delegated use rights**, and **long-delay fail-safes** (return, hide, alert, intrusion-kill) — **bounded lexicons** and **dormant behaviors** as **first-class** construct state, not freeform AI. Route construct command here when **who may issue which token** and **what happens unattended** must be **auditable** (see SPE-268).

### Taxonomy / Schema and Investigation / Casework — environmental glyph substrates (SPE-331)

**Taxonomy / Schema** and **Investigation / Casework** include **environmental inscriptions** as **active segmented substrates**: **hidden triggers**, **partial decipherment**, **stored payloads**, **category filters**, **bypass credentials**, and **stress collapse** — **operational systems**, not passive lore text. Route glyph fields here when **line-by-line reading** changes **what the space can do**, not only flavor captions.

### Research / Archives and Investigation / Casework — partial translation and nonportable scripts (SPE-332)

**Research / Archives** and **Investigation / Casework** distinguish **local decipherment** from **portable replication** and **system mastery**: **partial translation**, **segment-local behavior**, and **context-bound script logic** where **copied or transcribed** text **does not** preserve full power **off-site**. Route script work here when **understanding** and **reproducibility** **diverge**, not “we read it so we own it everywhere.”

### Sites / Infrastructure and World Rules / Simulation Law — invisible dead zones and suppression (SPE-333)

**Sites / Infrastructure** and **World Rules / Simulation Law** include **invisible or low-readability zones** that **suppress propulsion** or **key movement systems** **without** direct injury — **trap**, **tow**, **wait**, or **bounded recovery** instead of ordinary escape. Route suppression hazards here when **the vehicle stops working** in empty-looking space, not only damage-over-time fields.

### Economy / Procurement and Anomalies / Phenomena — processing-state botanical hazards (SPE-334)

**Economy / Procurement** and **Anomalies / Phenomena** include **harvested biological materials** whose **hazard profile changes** after **drying**, **preparation**, or **treatment** — **explosive**, **incapacitating**, **corrosive**, or **evidence-revealing** only in **processed state**. Route botanical pipelines here when **processing is the hazard transition**, shared across **procurement, containment, and casework** surfaces.

### Sites / Infrastructure and Settlement / Civic Systems — environment-gated port approaches (SPE-335)

**Sites / Infrastructure** and **Settlement / Civic Systems** include **docking and descent access** gated by **turbulence**, **depth**, **cloud bands**, **currents**, or **local geometry** — **approach risk** and **environmental approach states** as **port logic**, **not** fortification alone. Route harbor work here when **final approach** can exceed **long-range transit** difficulty without a wall gun.

### Linear duplicate issues (SPE-336–SPE-339)

These Linear issues repeat earlier scope; **use the same routing** as the canonical SPE:

| Duplicate | Same routing as |
| --------- | ---------------- |
| **SPE-336** | **SPE-323** — dynamic celestial navigation |
| **SPE-337** | **SPE-324** — vertical class and commerce bands |
| **SPE-338** | **SPE-325** — bio overgrowth hazard ecology |
| **SPE-339** | **SPE-326** — helm and control-surface shutdown |

### Behavior / Psychology and Anomalies / Phenomena — ambient control and progressive enthrallment (SPE-341)

**Behavior / Psychology** and **Anomalies / Phenomena** include **persistent area control auras** and **progressive enthrallment fields**: **repeated exposure** pressure, **bounded obedience** or **redirected loyalty**, **temporary social inversion**, **room- or district-scale hostility suppression**, and **voice- or presence-only** delivery before full threat posture — with **exemptions** (e.g. generator self-exemption) and **counterplay paths**. Route here when **the field is the mechanic**, not a **single instant charm** or **generic morale buff** (non-goals: universal blanket charm, full mind-control sim).

### Sites / Infrastructure and Anomalies / Phenomena — distributed mind for sentient structures (SPE-342)

**Sites / Infrastructure** and **Anomalies / Phenomena** include **sentient structures** whose **agency is distributed** across **subsystems** (surfaces, zones, assemblies, records, sensors) — **no single decisive core**; **partial damage** degrades capability **without** instant total collapse; **retaliation** can be **room-local** (doors, heat, constriction, debris). Route megastructure minds here when **architecture is the actor graph**, not one HP bar in the basement.

### Anomalies / Phenomena and Factions & Authority — bonded operator replication gates (SPE-343)

**Anomalies / Phenomena** and **Factions & Authority** include **autonomous living structures** that still require **bonded external operators** for **replication**, **succession**, or **generation** events — **cooldowns**, **one-shot-per-controller** limits, and **inspectable replication state**. Route here when **autonomous movement ≠ autonomous reproduction**, and **who holds the bond** is **diplomacy, denial, or breeding-right** strategy.

### Settlement / Civic Systems and Anomalies / Phenomena — timed reproduction crisis states (SPE-344)

**Settlement / Civic Systems** and **Anomalies / Phenomena** include **breeding, gestation, brood, or nest phases** as **timed scarcity and unrest packets**: **temporary zone closure**, **food and labor stress**, **service degradation**, and downstream **riot, sabotage, legitimacy shock**, or **suppression campaigns** — **ecological and logistics** consequences **before** mature threat populations surface. Route here when **the calendar of life** is a **crisis generator**, not a full colony sim.

### Equipment / Loadouts and Taxonomy / Schema — autonomous item conversion seeds (SPE-345)

**Equipment / Loadouts** and **Taxonomy / Schema** include **mundane hosts** progressing into **bonded or apex artifacts** via **hidden seed-state conversion** — **delayed power revelation**, **persistence while correctly configured**, and **inspectable progression stages** **without** explicit conventional crafting trees. Route emergence here when **the object ripens**, not only **forge recipes** (non-goals: universal self-enchant sandbox per item family).

### Investigation / Casework and Taxonomy / Schema — context-bound puzzle lexicon (SPE-351)

**Investigation / Casework** and **Taxonomy / Schema** include **puzzle vocabulary** sourced from **current scenario state**: **entities**, **places**, **artifacts**, **hazards**, **local terms**, and **role labels** — **deterministic local pools**, **scenario-driven lexicon shifts**, and **author inspection** of eligibility — **not** **generic word pools**, setting-agnostic defaults, or opaque dictionary draws. Route puzzle generation here when **fairness** requires **traceable sourcing**, not an NLP stack.

### Investigation / Casework and Docs — structured puzzle hint ladders (SPE-352)

**Investigation / Casework** and **Docs** cover **onboarding-adjacent** and **author-facing** puzzle support: **multi-step hint ladders**, **fallback clue paths**, and **bounded anti-deadlock assistance** — **tiered hints**, **NPC or support-system delivery**, and **explicit escalation rules** — **not** universal auto-solve or sprawling adaptive tutoring. Route puzzle support here when **stuck recovery** is a **designed contract** visible to authors and QA (see `docs/first-run-week-loop.md` for loop-adjacent framing).

### Research / Archives and Investigation / Casework — player-language puzzle abstraction (SPE-353)

**Research / Archives** and **Investigation / Casework** include **bounded readability rules** where **player-facing puzzle text** may be **abstracted** from strict **diegetic** wording while **meaningful language gating** persists elsewhere — **explicit boundaries**, **convention maps** for equivalent tongues, and **author/debug** notes on what is abstracted. Route here when **usability** and **in-world fidelity** **diverge by surface**, not via a full translation simulator.

### Taxonomy / Schema — structured riddle authoring (SPE-354)

**Taxonomy / Schema** includes **riddle packets** as **reusable schema**: **setup**, **punchline**, **answer class**, **obscuration**, and **validation hooks** — **deterministic fields** compatible with **clue delivery** and **puzzle lexicon** systems, **not** prose-only literary tooling as the primary structure. Route riddle work here when **answer-class taxonomy** and **machine-checkable** payloads matter.

### Investigation / Casework and Taxonomy / Schema — scalable encoded messages (SPE-355)

**Investigation / Casework** and **Taxonomy / Schema** include **encoded message** systems that **scale by authored parameters**: **substitution model**, **symbol set**, **layout**, and **difficulty tier** — **plot-bearing** instructions or revelations with **inspectable encoding state** for test and review — **distinct from** generic **clue prose**. Route ciphers here when **difficulty is designed**, not arbitrary obscurity (non-goals: full cryptography simulator, one model for all codes).

### Investigation / Casework and Taxonomy / Schema — multi-layer word search extraction (SPE-356)

**Investigation / Casework** and **Taxonomy / Schema** include **stacked or multi-layer word-search** mechanics used as **structured extraction**: **bounded layers**, **deterministic extraction rules**, and **inspectable grid state** that feeds **keys, credentials, or evidence packets** — **not** ad-hoc “find any word” hunts without authored linkage to scenario objects.

### Investigation / Casework, Taxonomy / Schema, and Equipment / Loadouts — crossword object authentication (SPE-360)

**Investigation / Casework**, **Taxonomy / Schema**, and **Equipment / Loadouts** include **crossword- or grid-shaped authentication**: **solved grid state**, **completed constraints**, or **extracted keywords** that **unlock**, **attest**, or **bind** **objects**, **doors**, or **credentials** — **inspectable completion** and **replay-safe validation**, **not** freeform prose passwords only.

### Investigation / Casework and Taxonomy / Schema — parameterized puzzle difficulty (SPE-361)

**Investigation / Casework** and **Taxonomy / Schema** include **formal puzzle difficulty parameters**: **clue exactness**, **word length**, **overlap density**, **grid size**, **layout disorder**, **transform complexity**, and **per-family applicability** — **deterministic** output changes when parameters change, with **author and QA visibility** — **not** instinct-only tuning or a universal solver simulator.

### Investigation / Casework and Taxonomy / Schema — positional letter harvest assembly (SPE-362)

**Investigation / Casework** and **Taxonomy / Schema** include **multi-stage extraction** where **final answers** are **assembled from indexed letter positions** harvested across **several clue lines** — **second-stage extraction rules**, **distinct from** acrostics or single-step full-word solves, with **inspectable indexing logic**.

### Investigation / Casework — stealth embedded answers in diegetic text (SPE-363)

**Investigation / Casework** includes **hidden answer strings** embedded in **ordinary prose** or **scene text** **without** overt puzzle chrome — **fair**, **author-reviewable** constraints, **narrative relevance**, and **payoff** when the string surfaces — **not** a generic text-search minigame platform.

### Taxonomy / Schema and Investigation / Casework — sound-equivalence puzzle grammar (SPE-364)

**Taxonomy / Schema** and **Investigation / Casework** include puzzle families resolved by **spoken similarity** (**homophone**, **sound-equivalent** chains) rather than **exact spelling** — **bounded rule families**, **deterministic authoring limits**, and **compatibility** with typed templates — **not** a full phonetics engine and **not** collapsing into spelling-only transforms.

### Factions & Authority, Response / Recovery, and Containment — external interdiction and quarantine (SPE-365)

**Factions & Authority**, **Response / Recovery**, and **Containment** include **outside-enforced** **interdiction**, **blockade**, **sealed districts**, **technology-transfer restrictions**, **sterilization or catastrophic fallback triggers**, and **politically enforced transfer** rules — **release, relaxation, or screening** across **public health, legal authority, emergency management, and military** lines — **not** purely **local or self-imposed** isolation. Route quarantine here when **who ordered the cordon** and **what may still cross the line** are **first-class** (see SPE-292 for facility-internal zoning). *“Response Operations” → **Response / Recovery**.*

### Sites / Infrastructure and Missions — dormant perimeter ambush fields (SPE-366)

**Sites / Infrastructure** and **Missions** include **perimeter fields** of **dormant hostile units** that **activate on intrusion** — **folded or passive** until an **activation envelope** trips — **distinct from** standing **patrols** or **mine-belt** metaphors alone. Route approach defense here when **the field is concealed** until late in the approach and **route choice** changes **who wakes up**.

### Sites / Infrastructure and Planning / Scheduling — temporary safe corridors (SPE-367)

**Sites / Infrastructure** and **Planning / Scheduling** include **temporary low-danger corridors** through otherwise **lethal** media — **moving**, **expiring**, or **drifting validity** windows where **route discipline** is the protection surface and **leaving the band** triggers **failure states** (collapse, lockout, burial, storm-blindness, etc.). Route traversal here when **safe path is a schedule object**, not a stable road.

### Settlement / Civic Systems and World Rules / Simulation Law — parent world with distinct nodes (SPE-368)

**Settlement / Civic Systems** and **World Rules / Simulation Law** include **one parent world identity** spanning **multiple nodes** (platforms, continents, regions) with **different local logic**, **route asymmetry**, **return bias**, and **node-dependent faction behavior** — **membership under a shared parent** without **flattening** all tiles to one ruleset. Route macro-world work here when **which node you are on** changes **law, hazard, and graph**.

### Settlement / Civic Systems and World Rules / Simulation Law — shard worlds and inherited state (SPE-369)

**Settlement / Civic Systems** and **World Rules / Simulation Law** include **shattered worlds** persisting as **several named shard nodes** carrying **inherited political**, **hazard**, **resource**, and **route** state under a **destroyed parent** — **governance and confrontation** may **differ by shard**; **reassembly** or **anchor fragments** can shift **manifestation phase**. Route continuity packets here when **the world ended but the places remain playable**, not a single reset map.

### Sites / Infrastructure and Settlement / Civic Systems — hidden-solid airborne terrain (SPE-370)

**Sites / Infrastructure** and **Settlement / Civic Systems** include **apparent cloud or mist** that may conceal **solid or partially solid** substrate — **weight-class-sensitive** traversal (**sink**, **drop-through**, **temporary support**) and **settlement or route** implications where **aerial terrain** is both **hazard and platform** — **not** only binary solid/air or cosmetic skybox.

### Missions and Settlement / Civic Systems — approach-route travel contacts (SPE-371)

**Missions** and **Settlement / Civic Systems** include **dynamic contact generation** on **overland or approach routes** before **primary site arrival**: **civilian**, **faction**, **infrastructure**, **observer-first**, and **interruption-style** beats that change **rumor**, **tension**, **reinforcement context**, or **off-map knowledge** — **route-period or zone-chain** framing, **not** only tactical-grid assumptions. Route approach travel here when **the road is a live case surface**, not a loading screen.

### Sites / Infrastructure and Investigation / Casework — construction-based surveillance (SPE-372)

**Sites / Infrastructure** and **Investigation / Casework** treat **architecture** as **surveillance and privacy mechanics**: **wall type**, **vents**, **ducts**, **glass**, **geometry**, and **purpose-built vs flimsy** construction modify **eavesdropping fidelity**, **leak risk**, and **strategic detection range** — **distinct from** a single **generic perception DC** and **distinct from** visible guards alone. Route social and casework scenes here when **how the room is built** decides **who overhears what**.

### Settlement / Civic Systems and Sites / Infrastructure — ruined settlement to hostile compound (SPE-373)

**Settlement / Civic Systems** and **Sites / Infrastructure** include **hostile compounds layered on former civic shells**: **prior civic function** remains **legible** under **occupation** or **militarized conversion** — **public, domestic, or service** volumes **repurposed** for hostile use — **not** only purpose-built fortresses on empty ground. Route site templates here when **mapping and encounter** logic must read **two eras at once**.

### Settlement / Civic Systems and Anomalies / Phenomena — resilient landmarks under occupation (SPE-374)

**Settlement / Civic Systems** and **Anomalies / Phenomena** include **sacred or magical landmarks** that can stay **active** and **self-restoring** under **hostile occupation** — **resilient inner function** beside **local desecration or infestation**, **distinct from** immediate **disabled/corrupted** flips — with implications for **navigation**, **clues**, and **social claims** when the **site still “works”** for some channels.

### Investigation / Casework — deep search and concealment in hostile spaces (SPE-375)

**Investigation / Casework** includes **caches** that require **exhaustive environmental interaction** and **forensic-surface manipulation** — **dig-out**, **clearing**, **trace suppression** via **dust, mud, cobwebs**, or similar media — **not** passive or casual **notice** checks alone. Route deep concealment here when **finding is work** and **the environment can erase evidence**, not a single search roll.

### Sites / Infrastructure — latent structural instability and pre-collapse planning (SPE-376)

**Sites / Infrastructure** includes **latent collapse** as a **detectable planning surface**: **pre-advance probing** (supports, voids, gas pockets, trap mechanics), **linked hazard transfer** across **rider/mount**, **handler/companion**, or **operator/carried-object** pairs, **active subsidence clocks**, and **newly opened collapse routes** that change **access by body size or equipment** — **before** full failure (see SPE-229 for staged heat/structural stress; SPE-376 emphasizes **detection, probing, and transfer**).

### World Rules / Simulation Law and Missions — procedural blink re-entry (SPE-377)

**World Rules / Simulation Law** and **Missions** include **short-range displacement** resolved through **bounded re-entry tables** — **vertical reappearance**, **collision**, **crush**, or **hazardous emergence** outcomes — **distinct from** unrestricted free placement, **ordinary step movement**, and **fixed long-range teleport**. Route blink-like moves here when **where you come out** is a **typed roll**, not a cursor.

### Anomalies / Phenomena, Containment, and Investigation / Casework — nonstandard defeat and true removal (SPE-378)

**Anomalies / Phenomena**, **Containment**, and **Investigation / Casework** include **bespoke defeat procedures** where **tactical victory** **separates from** **true removal**: **release-condition** resolution, **ordered multi-step neutralization**, **reconstitution risk** after incomplete success, and **target-class gates** (patron-scale, remnant, bound-proxy) — **not** assuming **HP-only** endpoints. Route existential threats here when **the verb matters** (entomb, sever route, ritual lock), not only DPS.

### Research / Archives and Equipment / Loadouts — document consumption and cached projection (SPE-379)

**Research / Archives** and **Equipment / Loadouts** include **written media** as **runtime power surface**: **consumption** into **bounded cached effects**, **ready/resolve phases**, **recovery of last cache**, **accidental activation on inspection**, and **document-reactive sites** that **re-express** ingested content on **walls or fixtures** with **observer-only** or **capture-resistant leakage** — **not** passive read-only files only.

### Sites / Infrastructure and World Rules / Simulation Law — persistent multi-subsystem field penalties (SPE-380)

**Sites / Infrastructure** and **World Rules / Simulation Law** include **persistent cloud, bubble, or field** states that **simultaneously** impair **vision**, **distort movement**, and **suppress precision casting** — **roaming** or **trap-independent** whiteouts with **variable susceptibility** by **actor family** — **distinct from** cosmetic weather or **vision-only** concealment.

---

## 2. Recommended milestone sequence

Recommended milestone order:

1. Simulation foundation
2. Weekly loop playable
3. Institutional consequences online
4. Legibility and planning trust
5. World reactivity online
6. MVP proof complete
7. Strategic breadth and hardening

These align with the roadmap’s dependency order.

---

## 3. Milestone 1 — Simulation foundation

### 3.1 Milestone question

Do we have a trustworthy canonical state and processing foundation to build the game on?

### 3.2 Required outcomes

- game state ownership is defined and implemented in usable form
- event schema and persistence model are coherent
- weekly state transition structure exists
- core entities are modeled consistently
- deterministic processing foundation is viable

### 3.3 Typical included work

- game state schema
- entity relationship model
- event schema
- persistence model
- basic save/load shape
- initial simulation scaffolding

### 3.4 Not enough to close

- docs only with no implementation anchor
- partial ownership with unresolved duplicated state
- persistence shape that cannot support next-step development safely

### 3.5 Closure standard

This milestone closes when downstream core-loop systems can be built on a trustworthy foundation without inventing new ownership rules ad hoc.

---

## 4. Milestone 2 — Weekly loop playable

### 4.1 Milestone question

Can a player complete the main weekly loop and feel real triage, deployment, outcome, and next-week consequence?

### 4.2 Required outcomes

- incidents can be generated or surfaced
- actionable work can be triaged
- a team can be assigned and deployed
- missions resolve deterministically
- a weekly report or summary exists
- next-week state changes based on the prior week

### 4.3 Typical included work

- incident generation
- mission triage
- deployment flow
- mission resolution
- basic team states
- initial Agency / Triage / Report views

### 4.4 Not enough to close

- isolated mission resolution without weekly continuity
- triage UI without meaningful consequence
- reports that restate outcomes without causal connection
- no persistent next-week change

### 4.5 Closure standard

This milestone closes when the game can be played through multiple weeks and the core campaign loop is recognizably real.

---

## 5. Milestone 3 — Institutional consequences online

### 5.1 Milestone question

Does the agency now behave like a constrained institution rather than a mission launcher?

### 5.2 Required outcomes

- support operations affect outcomes
- specialist bottlenecks can appear
- recovery and backlog persist across weeks
- readiness degradation matters
- pressure and overload create visible institutional cost
- replacement or recovery pressure exists in bounded form

### 5.3 Typical included work

- support operations
- specialist throughput
- recovery and attrition
- pressure mechanics
- readiness carryover
- Procurement and Support integration

### 5.4 Not enough to close

- support tracked but not affecting real outcomes
- recovery shown but not constraining future play
- pressure flags with no meaningful propagation
- institutional bottlenecks invisible to the player

### 5.5 Closure standard

This milestone closes when the player can clearly feel that the institution itself is now part of the challenge.

---

## 6. Milestone 4 — Legibility and planning trust

### 6.1 Milestone question

Can the player now understand what happened, why it happened, and what matters next?

### 6.2 Required outcomes

- reports surface meaningful causal notes
- key warnings are visible before deployment
- Agency, Triage, Deployment, and Report views agree on core state
- bottlenecks are prioritized clearly
- major thresholds are surfaced legibly
- determinism and integration QA coverage are usable

### 6.3 Typical included work

- Operations Report refinement
- Agency view refinement
- deployment warning quality
- cross-surface consistency work
- QA plans and fixtures
- report note prioritization

### 6.4 Not enough to close

- correct simulation with poor explanation
- contradictory view surfaces
- report noise overwhelming useful signal
- player forced to infer important causes from hidden logic

### 6.5 Closure standard

This milestone closes when the player can learn from outcomes instead of merely observing them.

---

## 7. Milestone 5 — World reactivity online

### 7.1 Milestone question

Does the world now respond through bounded social, faction, and opportunity systems that strengthen the main loop?

### 7.2 Required outcomes

- Hub view exists in meaningful form
- rumors, leads, and contracts surface from state
- faction presence affects opportunity quality or filtering
- legitimacy affects access, visibility cost, or opportunity shape
- prior outcomes influence future world-facing signals

### 7.3 Typical included work

- hub simulation
- rumor / lead / contract surfacing
- factions and legitimacy
- basic district or place-bound behavior
- world-facing filtered information

### 7.4 Not enough to close

- cosmetic faction labels with no gameplay effect
- rumor clutter without strategic signal
- Hub view that duplicates triage instead of adding mediated opportunity
- legitimacy number with no visible consequence

### 7.5 Closure standard

This milestone closes when the game world is reacting in a bounded, strategically meaningful way that the player can interpret and use.

---

## 8. Milestone 6 — MVP proof complete

### 8.1 Milestone question

Does the game now prove the core promise of Containment Protocol at MVP scale?

### 8.2 Required outcomes

- the full MVP loop is stable and playable
- triage, deployment, resolution, and reports all work together
- institutional bottlenecks and carryover matter
- world-facing opportunity variation exists in bounded form
- persistence and determinism are trustworthy enough for repeated campaign testing
- testers can articulate the game’s real identity from play

### 8.3 Typical included work

- MVP scope hardening
- cross-system bug cleanup
- threshold tuning pass
- pressure and fallout tuning pass
- persistence and reload validation
- representative campaign fixture testing

### 8.4 Not enough to close

- “most systems exist” without trustworthy play
- good demo slices with weak campaign continuity
- heavy placeholder tuning
- feature-complete surfaces without feature-complete consequence logic

### 8.5 Closure standard

This milestone closes when the MVP is not just assembled, but genuinely proves the game.

---

## 9. Milestone 7 — Strategic breadth and hardening

### 9.1 Milestone question

Can the game now support broader replayability, stronger campaign differentiation, and deeper validation without losing clarity?

### 9.2 Required outcomes

- more varied incidents and opportunity chains
- stronger strategic differentiation between runs
- improved balancing
- stronger QA regression confidence
- content breadth scaled on top of trustworthy systems
- harder edge-case and persistence resilience

### 9.3 Typical included work

- broader content packets
- richer incident/fallout variation
- balancing and progression refinement
- regression hardening
- larger fixture coverage
- broader campaign pacing validation

### 9.4 Not enough to close

- more content on unstable foundations
- richer breadth with weaker clarity
- “later game” additions that make the core loop less legible

### 9.5 Closure standard

This milestone closes when the game gains breadth without losing systemic trust.

---

## 10. Milestone dependency rules

The following dependency rules should hold:

### 10.1 Rule 1

Do not close a later milestone if a core dependency from an earlier milestone remains materially fake.

### 10.2 Rule 2

Do not count documentation-only proof as implementation proof.

### 10.3 Rule 3

Do not close a milestone on UI completion if core propagation is missing.

### 10.4 Rule 4

Do not skip legibility and trust work in order to widen feature breadth.

### 10.5 Rule 5

If a milestone’s proof question still has an unclear answer from actual play, the milestone is not done.

---

## 11. How to group issues under milestones

A milestone should group issues that all help answer its proof question.

Good grouping:

- all issues needed to make support shortages real and visible
- all issues needed to make weekly reports causal and useful
- all issues needed to make faction/legitimacy change opportunity quality

Bad grouping:

- unrelated “nice to have” UX cleanup
- broad thematic bundles with no shared proof target
- speculative future work that bypasses missing core dependencies

Milestones should feel like integrated slices, not containers.

---

## 12. Milestone review checklist

Before closing a milestone, confirm:

1. Has the milestone’s proof question been answered by actual playable behavior?
2. Are the required systems implemented, not implied?
3. Are connected consequences propagated correctly?
4. Are the major player-facing surfaces truthful and useful?
5. Is the QA evidence strong enough to trust the claim?
6. Would closing this milestone mislead future planning?

If 1, 3, 4, or 6 is weak, the milestone should remain open.

---

## 13. Common milestone closure mistakes

### 13.1 Mistake 1: Closing on visible breadth

Lots of screens or content does not equal milestone proof.

### 13.2 Mistake 2: Closing on one happy path

A demo is not a validated milestone.

### 13.3 Mistake 3: Closing when parent issues are only partially satisfied

Partial implementation should close child issues or get progress comments, not mark the milestone done.

### 13.4 Mistake 4: Closing before player-facing legibility exists

If the player cannot understand the new system, the milestone’s proof is weaker than it looks.

### 13.5 Mistake 5: Using milestone closure to force momentum

False closure creates planning debt and weakens source-of-truth trust.

---

## 14. Suggested current milestone framing

Given the current document and dependency structure, practical milestone framing should likely emphasize:

- finishing the core UX and systems spec chain
- validating the weekly loop and institutional consequence path
- proving the MVP loop before widening planning
- using QA and tuning docs to tighten implementation sequencing

This keeps milestone work aligned with the current actual dependency order.

---

## 15. Acceptance criteria

This milestone plan is effective when:

- milestone scope is easier to judge
- issue grouping becomes more coherent
- milestone closure is more honest
- roadmap phases become actionable
- the team can tell whether a milestone is truly proven or only partially assembled
- future planning has stronger trust in completed work

---

## 16. Summary

Milestones in Containment Protocol should represent proof of increasingly real layers of the game:

- simulation foundation
- playable weekly loop
- institutional consequence
- player legibility
- world reactivity
- MVP proof
- broader strategic depth and hardening

They should close only when playable behavior, propagation, and surfaced explanation all support the claim.

The core milestone question is:

what has the game now genuinely proven about itself that it could not prove before?
