# Review Packet

Generated: 2026-04-28T12:14:40.088Z
Issues: SPE-48, SPE-86, SPE-47, SPE-154, SPE-174, SPE-71, SPE-106, SPE-178, SPE-547, SPE-88

## SPE-48 - Template authoring kernel and contextual content composition
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-14T11:19:30.478Z
- Updated: 2026-04-28T11:52:03.067Z

### Description
Goal:  
Implement the template authoring kernel so new scenario, hazard, doctrine, and support content can be added through reusable template shapes rather than bespoke per-case logic.

Scope:

* define a stable template kernel for requirements, conditions, modifiers, risk hooks, investigation visibility, reward-family hooks, and presentation metadata
* support at least three reusable content-family templates such as protocol materials, hazards/incidents, and doctrine or playbook assets
* support bounded contextual variation, investigation-first and preparation-first authoring, and deterministic “usually X unless Y” behavior
* support scenario packet authoring for geometry, routes, mission wrappers, objective structure, reward finishing, and bounded procedural variation without freeform scripting
* support support-asset taxonomy, depletion models, deceptive variants, identification workflow, and action/power-band validation rules
* make template boundaries explicit so authors can add or tune content without changing unrelated runtime systems

Constraints:

* deterministic only
* no generic data-driven-everything rewrite
* no freeform scripting layer
* prefer a small number of stable template shapes over many bespoke formats
* keep templates as authoring surfaces and hooks, not replacements for canonical runtime logic

Acceptance criteria:

* at least three content families use explicit template-based authoring patterns
* adding a new entry in those families requires minimal or no bespoke runtime logic
* templates support shared hooks for modifiers, conditions, investigation gating, contextual variation, and rewards in a reusable way
* support-asset depletion, deception, and identification are represented through the template grammar where relevant
* validation enforces bounded action/power-band discipline in authored content
* targeted tests verify template validation, contextual variation, and deterministic runtime hookup

### Relations
_No relations_

### Comments
- 2026-04-28T11:52:03.083Z
Reconciliation update

Implementation emphasis:

* issue and feature briefs should remain able to declare implementation surface, expected runtime behavior, and intended player-facing result as separate authoring slots rather than one blended description
* core premise should also remain separable from the system grammar built around it, so one fantasy can support several valid rule structures without forcing the first mechanical reading to dominate

This keeps MDA-informed issue templating and premise-versus-grammar separation inside the template-authoring boundary.

- 2026-04-24T16:10:37.509Z
Reconciliation update

Implementation emphasis:

* sandbox prep should continue to follow a strict output pipeline in which geography and locale structure come before plotted story linkage, rather than forcing plot-first design
* hooks and local plots should emerge by scanning already-authored notes and connecting existing locales, not by inventing detached quest lines first
* hybrid world hooks should remain composable so two or three hook packets can be intentionally mixed into one region frame

This concept stays inside that issue’s boundary.

- 2026-04-24T15:43:29.519Z
Reconciliation update

Implementation emphasis:

* settlement and kingdom packets should remain driven by first-class world hooks, with climate, site type, culture, situation, and history all valid primary entry points rather than one fixed starting template
* hook-first design should propagate downstream into polity shape, threat pressure, economic identity, and local adventure calls instead of remaining a loose flavor tag
* world and region packets should stay inspiration-first but structurally complete enough for immediate use, with compact civic, geographic, and hook fields rather than exhaustive gazetteer depth

This concept stays inside that issue’s boundary.

- 2026-04-19T22:08:12.797Z
Reconciliation update

Fold scale-critical key-frame emphasis and structured visual-reference support into this issue.

Implementation emphasis:

* content packets whose gameplay depends on scale, atmosphere, posture, or complex spatial reading may warrant higher-detail key frames or reference-backed concept surfaces than ordinary scenes
* pose, prop, costume, and body-language reference should remain reusable support assets for consistent scene production rather than ad hoc one-off fixes

This keeps key-frame emphasis and reference-backed production support inside the template-driven authoring boundary.

- 2026-04-19T10:05:15.514Z
Reconciliation update

Fold compact chained-table NPC authoring into this issue.

Implementation emphasis:

* a small linked-table architecture can still emit geography, role, personality, and presentation outputs when the table chain is layered well
* compact authoring should therefore remain a first-class content strategy for rapid packet generation rather than a sign of low depth by itself

This keeps chained-table content authoring inside the template-driven authoring boundary.

- 2026-04-18T10:54:56.115Z
Reconciliation update

Fold compact one-to-four-hour ruin packets, embedded map-chain progression, and fixed-site versus travel-discovery insertion into this issue.

Implementation emphasis:

* some ruins should remain portable micro-site packets sized for one sitting rather than full long-form campaign arcs
* those packets may embed clue objects, route maps, or directional artifacts that point toward the next ruin, letting progression emerge from recovered physical evidence rather than a quest log only
* the same packet may appear as a fixed landmark or as a travel-layer discovery depending on campaign use without changing its core internal logic

This keeps short-session ruin classification, cross-site clue-chain objects, and dual insertion modes inside the site packet and clue boundaries.

- 2026-04-18T10:27:24.201Z
Reconciliation update

Fold secure-site operations as survey-plan-execute loops with hidden-entry variance into this issue.

Implementation emphasis:

* secure location operations may begin with outside survey and partial floorplan intelligence, then pass through an explicit planning phase before execution under live resistance
* survey should reduce uncertainty without eliminating undiscovered entries, hidden approaches, or internal unknowns entirely
* tactical path diversity, layered defenses, and multi-objective complexity should remain first-class planning surfaces inside the hostile site rather than preamble only

This keeps surveyable hostile sites, planning-phase emphasis, hidden-entry variance, and tactical path density inside the secure-site operation boundary.

- 2026-04-18T04:08:18.475Z
Reconciliation update

Fold dual-layer power acquisition and parallel power-family authoring into this issue.

Implementation emphasis:

* some ability families may require both broad enabling discipline investment and separate purchase of specific learned effects rather than one flat acquisition path only
* parallel power families such as magic and faith-like miracles may share core resolution surfaces while still diverging in gating, acquisition, and contradiction behavior
* template and content authoring should therefore preserve family identity without duplicating the full runtime logic for each tradition

This keeps discipline-plus-effect acquisition and parallel power-family structure inside the template authoring boundary.

- 2026-04-18T02:30:21.548Z
Reconciliation update

Fold procedural crypt-loot by burial class and room-alternate presentation support into this issue.

Implementation emphasis:

* burial sites may derive rewards from corpse count, burial class, and social tier rather than only hand-authored treasure entries
* authored spaces may expose a recommended presentation plus bounded alternates so the same mechanical shell can support variation in tone, population, or narrative emphasis without rewriting the room completely
* economically meaningful outbuildings, fields, barns, yards, and support structures should remain valid content surfaces for hidden rewards and operational state rather than decorative filler only

This keeps burial-site procedural rewards, alternate room presentations, and functional outbuilding authoring inside the template boundary.

- 2026-04-18T00:08:56.518Z
Reconciliation update

Fold role-diverse patrol and occupancy doctrine into this issue.

Implementation emphasis:

* hostile sites should derive depth not only from stronger enemies, but from functional role diversity such as cooks, jailers, guards, commanders, beasts, servants, smiths, torturers, and hidden elites occupying the same facility ecology
* authored patrols and room populations should therefore communicate believable operational purpose as well as combat value

This keeps role-diverse occupancy doctrine inside the template authoring boundary.

- 2026-04-18T00:08:56.472Z
Reconciliation update

Fold macro-to-micro encounter insertion and variable room-detail density into this issue.

Implementation emphasis:

* travel and site systems may instantiate authored encounter inserts aligned to passage width, approach vector, or room class rather than always resolving on one generic combat surface
* authored spaces can deliberately vary in detail density, with richer interaction logic reserved for rooms with higher tactical or narrative leverage while lower-importance spaces remain concise but functional

This keeps encounter-piece insertion and selective room-detail depth inside the template authoring boundary.

- 2026-04-18T00:03:13.128Z
Reconciliation update

Fold fit-sensitive stealth garments, environment-bound item power, nonstandard powered-item detection, and charged specialty weapon payload authoring into this issue.

Implementation emphasis:

* some stealth garments should depend on correct fit, intact construction, and proper wearing state to preserve their intended concealment value
* some gear may derive function from a source environment and degrade under hostile exposure, distance, or time away from that origin while still remaining operationally special
* enhanced item states should not always appear as ordinary magical aura signatures, so authoring must support powered-but-nonstandard detection semantics where relevant
* charged weapons and specialty ammunition should support typed secondary payloads such as sleep, blindness, vapor release, or similar subclasses through the same item-authoring grammar

This keeps fit-sensitive stealth wear, environment-dependent item power, nonstandard aura semantics, and specialty attack-item payloads inside the template authoring boundary.

- 2026-04-17T23:52:58.835Z
Reconciliation update

Fold encounter-geometry template selection, authored patrol composition, coated-ammunition decay, environment-dependent item power, and nonstandard consumable activation into this issue.

Implementation emphasis:

* runtime encounters may select from geometry templates keyed to route class or site context instead of always using generic confrontation space
* patrols should be authorable as structured compositions with commander, specialist, escort, and line roles rather than flat bundles
* ammunition-borne payloads may carry independent toxin logic, shelf life, environmental spoilage, and refresh requirements
* some gear may derive unusual function from a source environment and lose potency under hostile exposure, distance, or time away from that origin region
* consumables should include brittle gas stones, restorative tablets, and similar activation classes beyond potions or scrolls only

This keeps encounter-template choice, authored patrol structures, ammunition payload decay, environment-bound item power, and uncommon consumable classes inside the template authoring boundary.

- 2026-04-17T23:23:11.968Z
Reconciliation update

Fold charged-item authoring, cursed counterpart swaps, item-mediated sensing, compatibility gates, and post-generation value drift into this issue.

Implementation emphasis:

* support items should be authorable with persistent charge state, depletion rules, and family-specific payload pools rather than as one-use anonymous effects only
* authoring should support good-versus-bad counterpart substitution, hidden adverse state, and delayed reveal for apparently valuable items without bespoke per-item scripting
* item families may grant scan, reveal, locate, classify, or anti-concealment capabilities as payload-bearing support assets rather than actor-native powers only
* activation and payload legality may depend on actor compatibility, role family, doctrine family, or item-source family where relevant
* generated valuables may apply bounded post-roll quality drift after base selection so similar results do not collapse into one fixed value band

This keeps charged items, cursed variants, sensing tools, compatibility gates, and quality drift inside the template authoring boundary.

- 2026-04-17T23:15:10.307Z
Reconciliation update

Fold tutorial mission packets, hazard-first site exploration support, procedural lifeform generation, and doctrine-weighted success scoring into this issue.

Implementation emphasis:

* core rules support may include starter scenario packets that teach the main operational surfaces directly, rather than separating rules and introductory content completely
* authored site packets should support mapped exploration with discrete hostile entities, trap or hazard nodes, and room- or zone-keyed interaction states as first-class mission wrappers
* encounter authoring should support both curated entity templates and bounded procedural species or variant generation from trait tables without abandoning compendium governance
* mission evaluation should support objective completion plus doctrine or compliance scoring where scenario identity depends on lawful or protocol-correct resolution rather than extraction value or kills alone

This keeps starter packets, keyed hazardous exploration, procedural lifeform authoring, and doctrine-aware victory scoring inside the scenario and content-authoring boundary.

- 2026-04-15T22:59:12.970Z
Reconciliation update

Fold hidden-score versus public-power reward splits, reward-object hazard logic, noisy value objects, and active-slot-limited enhancers into this issue.

Implementation emphasis:

* some rewards should remain concealed score or value objects while others become visible power commitments with active tactical meaning
* reward objects themselves may be trapped, deceptive, noisy, owner-seeking, or otherwise dangerous instead of passive value piles
* some enhancement families should use explicit active-slot limits so possessing more copies does not automatically stack public power
* bounded random potency within one reward family can remain valid when later interactions preserve continuity of the active item state

This keeps hidden-score/public-power reward logic and dangerous reward objects inside the template and support-asset authoring boundary.

- 2026-04-15T21:11:02.538Z
Reconciliation update

Fold mirrored benchmark parties, multi-axis scoring, and seeded objective cards into this issue.

Implementation emphasis:

* scenario packets may use mirrored or fixed starting parties to improve comparative benchmarking across players or runs
* scoring can combine multiple axes such as eliminations, problem solving, treasure or asset recovery, and progression depth rather than simple win/loss alone
* special objective cards or similar inserts may be seeded into existing reward or content streams to create scenario-specific goals without bespoke map scripting

This keeps benchmark scenario packets, multi-axis scoring, and seeded-objective insertion inside the template authoring boundary.

- 2026-04-15T10:36:18.446Z
Reconciliation update

Fold role-compatible versus incompatible asset use, singleton apex assets, hidden-function artifacts, modular benefit-and-drawback generation, multipart assembly progression, grafted body artifacts, and multi-function apex relics into this issue.

Implementation emphasis:

* some support assets should define operator compatibility, owner-binding, or incompatibility penalties explicitly rather than assuming universal safe use
* certain apex assets may remain globally unique, require trial-and-error identification, or assemble through ordered multi-part progression
* artifact generation can use modular benefit and drawback tables where uniqueness still emerges from constrained combinations
* some assets may graft irreversibly to the body, alter identity, or function through opaque multi-control interfaces rather than safe transparent activation
* compact weapon or relic packages may add unique verbs such as reflection, cancellation, slaying, fear, or summoning instead of only flat numeric bonuses

This keeps apex asset uniqueness, compatibility, generation grammar, and grafted-risk behavior inside the template authoring boundary.

- 2026-04-15T09:31:17.261Z
Reconciliation update

Fold objective-chart alliance instability and anti-tunnel-vision scoring into this issue.

Implementation emphasis:

* some scenario or campaign objectives should make permanent alliances strategically unstable by rewarding shifting priorities rather than fixed coalition loyalty
* elimination of one rival in isolation should not automatically be the optimal path when broader board-state pressure, distributed objectives, or multi-front scoring matter more
* strategic scoring should reward wider state management and objective fulfillment rather than single-axis extermination behavior

This keeps unstable-alliance objective design and anti-tunnel-vision scoring inside the scenario authoring boundary.

- 2026-04-15T09:30:33.906Z
Reconciliation update

Fold top-down spatial authoring workflow into this issue.

Implementation emphasis:

* authored spaces should often be built from region-scale structure down to settlement and then building/interior detail rather than starting from isolated rooms alone
* larger geography, local districting, and interior layout should remain connected so downstream routing, rumor distribution, and pressure generation inherit the right context

This keeps top-down spatial authoring inside the template and worldbuilding workflow boundary.

- 2026-04-15T09:30:33.620Z
Reconciliation update

Fold support-relic cadence limits, bundled capability platforms, containment vessels with release-state consequences, and gated asset families into this issue.

Implementation emphasis:

* some support assets may be cadence-limited, role-locked, or weekly-use class tools rather than freely repeatable consumables
* some high-tier support assets may bundle multiple reusable capabilities behind escalating rarity or qualification gates
* containment vessels and similar assets may hold hostile entities while preserving a post-release mood or hostility state based on how confinement occurred
* support taxonomies should explicitly include recovery-class, hidden-state reveal, and attribute-enhancing artifacts where those families matter mechanically

This keeps cadence-limited relics, bundled support platforms, containment vessels, and explicit support-asset families inside the template authoring boundary.

- 2026-04-15T08:44:59.009Z
Reconciliation update

Fold compact persistent support-node effect families into this issue.

Implementation emphasis:

* support assets may provide narrow persistent effects such as regeneration, sustenance, storage, enhancement, or protection without requiring bespoke subsystem treatment for each item
* these families should remain compact, authorable, and compatible with depletion, positional limits, and identification rules where relevant

This keeps persistent support-asset effect families inside the template authoring framework.

- 2026-04-15T08:44:03.933Z
Reconciliation update

Fold doctrine-specific organization templates, nested composition hierarchies, and mixed-dimension exemplar profile cards into this issue.

Implementation emphasis:

* force and faction authoring should support organization templates across multiple echelons, with nested composition such as large formation to sub-formation to role package where relevant
* those templates should remain reusable in scenario setup and faction definition rather than being hard-coded one-offs
* exemplar profile cards may carry mixed technical, physical, social, or professional ratings when that improves scenario setup, benchmarking, or reference use

This keeps organizational template authoring and exemplar-card structure inside the template authoring framework.

- 2026-04-15T08:43:25.664Z
Reconciliation update

Fold mapped-theme conversion guides, exemplar stat-card authoring, and lore-to-mechanics translation workflow into this issue.

Implementation emphasis:

* authoring support should include structured conversion notes that map outside inspirations into internal archetype groups without copying their source fiction directly
* exemplar operators, factions, or threats should be expressible as compact benchmark cards for scenarios, tests, or design reference
* narrative or lore source material should be convertible into mechanical templates through an explicit translation workflow rather than ad hoc stat guessing

This keeps conversion guidance, exemplar cards, and lore-to-mechanics workflow inside the authoring framework.

- 2026-04-15T07:49:57.607Z
Reconciliation update

Fold scenario-defining victory conditions, resource-point scoring, multi-start scenario modes, partial-information deployment, precommitted force templates, and geography-plus-schedule scenario authoring into this issue.

Implementation emphasis:

* scenarios should be defined by explicit strategic goals such as hold, deny, occupy, protect, or inflict threshold damage rather than generic elimination only
* scoring can derive from control and denial of resource value, strategic nodes, or timed objectives rather than only casualties
* scenario starts may vary by precommitted rosters, hidden deployment, reserve uncertainty, and staged arrival schedules
* scenario authoring should remain tightly coupled to geography, timed reinforcements, and map-keyed objectives rather than abstract generic mission shells

This keeps scenario goals, starts, deployment templates, and map-driven scheduling inside the template authoring framework.

- 2026-04-15T07:35:53.113Z
Reconciliation update

This issue has been reopened because the framework foundation was completed, but newer authoring-governance and support-asset responsibilities are not yet implemented.

Already implemented:

* the original template framework kernel and completed bounded authoring foundation
* the existing implemented support for the initial template families and validation path

Still to implement from the newer scope:

* stronger action-band and power-band discipline in validation
* broader support-asset taxonomy authoring expectations
* explicit depletion and charge-model authoring support
* deceptive or inverted support-asset variants and delayed truth-reveal workflow support
* the newer context-rich scenario assembly expectations now folded into this issue where still not covered by the completed base framework

Interpretation:

* the completed framework remains valid as the first-pass kernel
* this issue is reopened for the newly assigned follow-on authoring and validation work

- 2026-04-15T07:22:59.157Z
Reconciliation update

Fold support-asset libraries, finite-use and charge models, deceptive support assets, and identification workflow into the authoring framework.

Implementation emphasis:

* support assets should be authorable as compact reusable categories such as detection, mobility, command, control, concealment, protection, excavation, transport, or construction tools
* authored assets should support depletion models such as charges, once-per-day use, fixed total uses, threshold-based burnout, or permanent depletion
* deceptive or inverted variants should be representable where an asset appears beneficial but misfires, fails under pressure, or conceals a harmful rider
* identification should support delayed truth reveal through testing, use, or specialized analysis rather than assuming perfect classification on acquisition

This keeps support-asset taxonomy, depletion, deceptive variants, and identification workflow inside the template authoring boundary.

- 2026-04-15T07:04:12.657Z
Reconciliation update

Fold action-band discipline for authored actions into this issue.

Implementation emphasis:

* authored actions or techniques intended for the same acquisition band should remain roughly comparable in operational scope, complexity, and cost
* validation should help catch entries that are too broad, too cheap, too exception-heavy, or too compressive relative to their intended band
* this should remain a bounded authoring discipline and validation rule, not a full numeric balancing simulator

This keeps action-band governance inside the template authoring framework.

- 2026-04-15T06:36:10.332Z
Reconciliation update

Fold explicit power-band discipline into the authoring framework.

Implementation emphasis:

* authored content should obey bounded power and complexity bands so entries intended for the same tier or acquisition stage remain roughly comparable in operational scope and cost
* template validation should help prevent bespoke drift such as unusually broad effects, too many exception hooks, or under-costed high-impact entries inside one authoring band
* band discipline should guide content review and validation without turning into a full numeric balance simulator

This keeps power-band discipline with template validation and authoring constraints rather than creating a separate balancing-governance issue.

- 2026-04-15T06:18:38.791Z
Reconciliation update

Fold context-rich procedural scenario assembly into this issue.

Implementation emphasis:

* scenario generation should vary not only by threat mix, but by political state, reserve posture, unknown-contact state, asymmetry package, objective logic, and special deployment constraints
* templates should be able to express alternate entry conditions, reserve rules, hidden-state hooks, and objective variants without bespoke scenario scripting for each case
* procedural assembly should remain context-driven and bounded rather than a random scenario grab-bag

This keeps context-sensitive scenario generation in the authoring framework rather than creating a separate scenario-engine issue.

- 2026-04-15T05:21:57.946Z
Chainmail mapping pass:

Fold rough composition-cost heuristics into the authoring framework.

Add implementation emphasis:

* templates should support simple point-like cost bands or rough weight values for team packages, threat packages, support assets, or scenario modules
* these values are for authoring sanity checks and assembly guidance, not exact balance promises or a player-facing market simulator
* composition-cost heuristics should remain compact and reusable so scenario setup can detect obviously lopsided bundles without deep manual review each time

This keeps bounded assembly costing with authoring/template concerns rather than creating a separate balance-economy issue.

- 2026-04-15T02:13:56.946Z
En Garde!, Bunnies & Burrows, and Monsters! Monsters! integration pass:

This completed framework remains the authoring home for compact powers, weaknesses, hidden properties, reveal conditions, doctrine assets, and bounded procedural world-building.

Useful follow-on interpretation:

* short reusable powers/behavior entries should be authored here, then consumed by structured definitions and shared runtime rules
* weakness/constraint authoring should sit beside capability authoring as a default discipline
* knowledge-facing and exploration-facing content should continue to be authored through hidden properties, confirmation paths, and environment-conditioned branches rather than bespoke scripting

No new framework split is needed here.

- 2026-04-15T02:09:19.853Z
Monsters! Monsters! integration pass:

The template framework already covers much of the authoring boundary for compact profile-plus-power content and power-plus-weakness discipline.

Represented here already:

* template-driven structured content
* reusable hooks for modifiers, conditions, risk, and presentation
* bounded procedural variation

Recommended follow-on use:

* support template fields for short powers/behavior entries rather than bespoke per-entry logic
* support explicit weakness/constraint fields alongside capability fields
* allow compact authoring for quick-rated minor groups where the structured-definition layer consumes template-authored simplified profiles

No new framework split is needed here; this remains the authoring boundary consumed by structured definitions and runtime rules.

- 2026-04-15T01:24:44.994Z
Metamorphosis Alpha integration pass:

The template framework already covers a large part of the needed procedural world-building boundary.

Represented here already:

* template-driven procedural world building
* bounded reusable content families
* investigation-first and preparation-first authoring
* rumor/lead/misinformation authoring
* doctrine and knowledge-asset authoring

Recommended extension in follow-on use of this framework:

* author unknown interaction surfaces explicitly through template fields such as hidden properties, reveal conditions, misread states, and confirmation paths
* author environment-conditional behavior variants and closed-system local context hooks through stable template fields rather than bespoke branching
* support exploration-first content where discovery changes what future template branches become eligible

No new framework split is needed here; the gap is not authoring shape, but the runtime knowledge-state and unknown-interaction layers that consume authored content.

- 2026-04-15T00:20:04.537Z
Completed an acceptance-criteria-aligned planning pass and the issue is now implementation-ready.

Planning outcome:

* expanded the framework to three bounded content families:
  * protocol materials
  * hazard/incident templates
  * doctrine/playbook assets
* defined a shared template kernel for requirements, conditions, modifiers, risk hooks, investigation visibility, reward-family hooks, and presentation metadata
* kept authored templates, runtime resolution, and projection/display concerns explicitly separated
* preserved protocol materials as the anchor vertical slice for the first implementation pass

Recommended implementation boundary for the first pass:

* implement the shared kernel
* implement protocol materials end to end
* add one hazard/incident slice
* add one doctrine/playbook slice
* defer routes, rivals, contracts, and broader content families until the kernel proves stable

Current status:

* not complete
* ready for implementation

Primary caution:

* finalize the shared kernel field names and types before coding so the framework does not drift during implementation.

- 2026-04-15T00:13:38.599Z
Completed a bounded planning pass for the first implementation slice.

Current planning direction:

* use protocol-sensitive materials as the anchor slice for the framework
* keep authored templates, runtime resolution, and projection/display concerns explicitly separated
* implement deterministic recognition, preparation, delivery, side-effect, and contamination handling
* validate the first pass with a small number of sample templates and targeted tests

What this planning pass covers well:

* a legible template shape for protocol materials
* deterministic runtime hookup rather than freeform scripting
* a bounded vertical slice that can be implemented without a broad content rewrite

What still needs to be added before the issue is fully planned against its acceptance criteria:

* define at least two additional content families for the same framework pass
* add shared hooks for modifiers, conditions, investigation gating, contextual variation, and reward-family composition where relevant
* include at least one reusable doctrine/playbook/knowledge asset shape

Recommended expansion for the full issue plan:

* protocol materials
* hazard or incident templates
* doctrine/playbook assets

Issue is not implementation-ready for full closure yet, but the first slice is well-bounded and suitable as the framework anchor.

- 2026-04-14T11:19:31.715Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/47). All replies are displayed in both locations.

---

## SPE-86 - Urban service nodes and hidden business functions
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-16T01:36:42.642Z
- Updated: 2026-04-28T00:21:00.359Z

### Description
Goal:  
Implement urban service nodes as active operational packets so city access, support, and hidden functions depend on specific providers rather than generic menus.

Scope:

* define business and service nodes with operator identity, service families, stock or availability state, clientele profile, rumor output, and bounded local rules
* support legal-front versus hidden-function layering so shops, inns, shrines, clubs, and similar venues can conceal contraband, covert logistics, informant roles, detention space, or hidden caches
* support temporary rented capability, guided passage, specialist help, repair, knowledge brokerage, and similar service families that materially change access or risk
* support degraded, mixed-trust, or near-site service pockets that provide partial sanctuary, rumors, procurement, and compromised support under pressure
* support civic institutions, tolerated illicit quarters, structural black markets, and hostile-domain commerce where service access matters more than simple shop availability
* make hidden business functions, covert routing, and unstable operators legible enough to plan around

Constraints:

* deterministic only
* no full merchant-management game
* no simulation of every civilian in the city
* prefer compact service-node packets and reusable service families over bespoke per-shop minigames
* keep urban services operationally meaningful without turning the hub into open-ended sandbox shopping

Acceptance criteria:

* at least one service node exposes operator identity, local availability, clientele behavior, and rumor output in one reusable packet
* at least one storefront or institution hides a meaningful secondary function
* at least one service family provides temporary capability, route access, or bounded support rather than permanent ownership only
* at least one service outcome varies by trust, availability, access fit, or local risk terms
* targeted tests cover node generation, hidden-function reveal, temporary-service acquisition, and downstream integration

### Relations
_No relations_

### Comments
- 2026-04-28T00:21:00.369Z
Reconciliation update

Implementation emphasis:

* urban service infrastructure should remain a hidden traversal layer, with sewers and comparable utility routes letting anomalies bypass street surveillance and domestic access assumptions
* repeated-use movement through those networks can also define impostor lairs through stored disguises, discarded forms, and accumulated personal effects rather than one isolated hideout clue

This keeps sewer-network movement and service-layer bypass inside the urban service-nodes boundary.

- 2026-04-26T13:56:32.299Z
Reconciliation update

Implementation emphasis:

* some route-adjacent merchants and brokers should remain morally ambiguous but immediately useful, providing gear, portal lore, or dangerous inventory while still carrying hidden agenda or future-complication flags
* route surfaces can also be embedded in mundane commercial thresholds, including shop arches, counters, back rooms, and retail fixtures whose exit conditions are separately controlled by the operator
* missed key evidence should continue to relocate to plausible custody holders instead of disappearing from the case entirely, supporting fail-forward investigation.

This keeps portal commerce, ambiguous contact merchants, and evidence-custody fallback inside the urban service-node boundary.

- 2026-04-26T11:51:22.431Z
Reconciliation update

Implementation emphasis:

* local service nodes should remain able to gate information by trust, spending, social class handling, and perceived threat, especially for marginalized witnesses or neighborhood contacts avoiding official scrutiny
* expert merchants, brokers, and faction-aligned shops may provide useful hints or supplies sincerely in the short term while still carrying hidden agendas, future hooks, or dangerous inventory not fully explained at sale time
* specialist archives and notebooks should also remain access-gated handout surfaces that can substantially reduce investigation friction when obtained through contract, theft, or favor

This keeps trust-gated testimony, ambiguous contact merchants, and faction dossier access inside the urban service-node boundary.

- 2026-04-26T11:28:14.329Z
Reconciliation update

Implementation emphasis:

* semi-private venues outside normal patrol earshot should remain valid rumor, contact, and handoff spaces where enforcement pressure is lower and covert negotiations can happen more openly
* mission funds or route assets held in escrow by a contact may still require identity proof, password, recommendation, or leverage before release even when the handoff was prearranged
* guide contracts should also be able to exclude real combat support while still supplying route knowledge, local custom, and bounded translation or doctrine help

This keeps low-surveillance contact spaces, escrow verification, and limited-duty guide services inside the urban service-node boundary.

- 2026-04-26T11:13:11.213Z
Reconciliation update

Implementation emphasis:

* low-surveillance venues such as bathhouses, roadside shrines, or off-wall social spaces should remain valid contact hubs for handoffs, rumors, and covert meetings because patrol ears do not dominate them the way they do ordinary city streets
* escrowed mission funds or specialist supplies may also require identity proof, passwords, faction references, or pressure before release even when the holding contact was pre-briefed

This keeps low-surveillance contact venues and escrow identity challenges inside the urban service-node boundary.

- 2026-04-26T10:41:01.159Z
Reconciliation update

Implementation emphasis:

* respectable taverns, warehouses, stores, and market stalls should remain valid crime fronts where ordinary civic commerce conceals logistics, fencing, hidden reserves, coded access, and political violence support
* distributed low-status vendors such as barbers, bards, herbalists, and other small operators should remain useful intelligence nodes through repeated small disclosures rather than one dramatic confession
* entertainment venues may also shape rumor and public understanding actively, making songs, performances, and public complaint loops part of the information economy rather than ambience only
* some hidden bases should invert by time-of-day, functioning as normal civic or commercial sites in daylight and politically explosive staging grounds at night

This keeps respectable crime fronts, distributed rumor vendors, entertainment-driven rumor shaping, and day-night site-role inversion inside the urban service-node boundary.

- 2026-04-26T05:17:28.600Z
Reconciliation update

Implementation emphasis:

* mark-location taxonomy for heists should continue to read from site class, with customs houses, guild halls, warehouses, residences, sacred sites, municipal buildings, ruins, markets, farms, cult sites, and criminal fronts each carrying different default access patterns, defenses, and fallout
* sacred institutions and elite residences should remain especially distinct heist targets because their protection mixes legal, social, domestic, and sometimes metaphysical defense layers.

This concept stays inside that issue’s boundary.

- 2026-04-25T15:09:54.392Z
Reconciliation update

Implementation emphasis:

* clandestine venues should remain layered service fronts with password entry, visible disarm screening, shallow searches that still allow concealed exceptions, segregated backstage space, protected cash or prize nodes, and covert exits
* public festival or carnival layers should also function as concealment cover for hostile action, covert observation, and witness unreliability rather than neutral atmosphere only

This concept stays inside that issue’s boundary.

- 2026-04-25T09:44:08.958Z
Reconciliation update

Implementation emphasis:

* some hospitality or prestige venues should operate in dual mode, serving as elite social spaces on the surface while using hidden passages, twisting service routes, and off-axis rooms to isolate, charm, intoxicate, or stalk selected victims after hours
* social consumables within those venues may function simultaneously as status currency, concealment aid, and byproducts of local predation ecology rather than ordinary luxury goods only
* covert hospitality packets should therefore blend civility, information exchange, and violence infrastructure inside one site rather than splitting them across separate locations

This concept stays inside that issue’s boundary.

- 2026-04-24T16:21:04.459Z
Reconciliation update

Implementation emphasis:

* false refuges should remain valid hostile-site patterns, where shelter, warmth, food, or apparent help conceal cages, remains, transformation victims, or predator infrastructure until close examination
* environmental intake such as wrecks, storms, and washed-up survivors can function as a recurring supply chain feeding those hostile sites rather than static stocking only

This concept stays inside that issue’s boundary.

- 2026-04-24T16:19:30.787Z
Reconciliation update

Implementation emphasis:

* some shelters should present as rescue surfaces first and predator infrastructure second, with warm fire, food, and apparent help masking cages, remains, or conversion systems until closer inspection
* false refuge should therefore remain a valid hospitality inversion pattern inside isolated hostile environments, not only in urban vice fronts

This concept stays inside that issue’s boundary.

- 2026-04-24T15:36:12.604Z
Reconciliation update

Implementation emphasis:

* disguised and dual-use gear should remain a first-class covert equipment surface, including hidden compartments, pop-out blades, concealed spearheads, tube-weapons, collapsible forms, and mundane-looking tools with deployable violent or infiltration functions
* fragile airborne insertion devices should be able to trade reach and stealth against pilot skill, landing risk, and environmental exposure instead of reading as ordinary transport

This concept stays inside that issue’s boundary.

- 2026-04-24T15:25:54.828Z
Reconciliation update

Implementation emphasis:

* entertainment fronts may hide illegal job brokerage, gambling rooms, secret subvenues, insect-fighting pits, or comparable criminal side-markets behind ordinary leisure presentation
* city establishments should remain differentiable through compact owner, quality, and specialty fields, with faction embedding making some businesses practical access nodes for smugglers, fences, pirates, exiles, or minority networks rather than neutral storefronts only
* temporary specialists recruited through city businesses or bounty offices may take percentage-share compensation from final payout rather than flat fees only

This concept stays inside that issue’s boundary.

- 2026-04-24T13:01:30.898Z
Contradiction check

Implementation emphasis:

* inns should not be reduced to meal-and-bed nodes if the intended surface includes lodging tiers, service menus, consumables, patrons, secrets, trustee roles, messaging, training, and recurring social hooks
* hospitality content should not remain mechanically thin if menus, drinks, entertainment, and oral performance culture are meant to do procedural work alongside rooms and operators

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T13:01:30.798Z
Reconciliation update

Implementation emphasis:

* inns should remain full-service social hub packets rather than generic rest stops, combining lodging, food, drink, patrons, rumor flow, trustee functions, messaging, training access, and recurring operator behavior in one bounded venue surface
* hospitality menus should carry identity and light utility through ordinary dishes, distinctive drinks, scarcity-preserved fare, and low-intensity timed effects such as scent masking, recovery support, or travel-comfort support rather than functioning as price-list filler only
* dominant clientele should remain a first-class venue variable shaping tone, service profile, rumor traffic, conflict risk, and security expectations
* proprietor secrets and hidden venue state may radically reframe an inn once discovered without turning the site into a separate dungeon system

This concept stays inside that issue’s boundary.

- 2026-04-24T12:56:59.681Z
Reconciliation update

Implementation emphasis:

* hospitality fronts may invite entrants into apparently safe employment, shelter, or elite access only to convert the visit into a containment trap through sealed rooms, hidden wards, or controlled staff procedure
* refuge access may depend on contribution, performance, reputation, or evaluative participation rather than money or violence alone
* lodging pressure should remain a real urban survival surface when crowding, celebration, regulation, and hostility make ordinary overnight shelter unavailable
* commercial rivalry scenes may use hands-on field testing and public endorsement to decide which operator wins a contract or local standing advantage

This concept stays inside that issue’s boundary.

- 2026-04-24T12:00:39.320Z
Contradiction check

Implementation emphasis:

* civilians and bystanders should not remain inert set dressing if witnesses, helpers, skeptics, victims, and officials are intended to generate procedural friction and redirect the case
* if current case handling still underuses active civilian pressure, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T11:55:57.829Z
Contradiction check

Implementation emphasis:

* civilians and bystanders should not remain inert set dressing if witnesses, skeptics, helpers, officials, and victims are intended to generate procedural friction and redirect the case
* if current case handling still underuses active civilian pressure, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T11:21:24.564Z
Reconciliation update

Implementation emphasis:

* underworld economies should support fences, dues, cuts, laundering, specialist hires, and black-market movement as coherent service families instead of ordinary shop purchase only
* many covert tools should remain restricted by shadow-market access, faction contacts, or local illegality rather than being universally purchasable
* hidden businesses should therefore continue to function as access brokers for contraband, rumor, false goods, and covert logistics rather than simple vendor fronts

This concept stays inside that issue’s boundary.

- 2026-04-23T04:07:50.576Z
Contradiction check

Implementation emphasis:

* settlements should not remain mechanically decorative if fees, traffic control, burial rules, intake routines, public-resource discipline, staffing cycles, and guard procedure are intended to do gameplay work
* if current settlement design still sidelines mundane logistics as noninteractive flavor, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T04:07:49.397Z
Reconciliation update

Implementation emphasis:

* some hospitality fronts may secretly function as inn, ferry house, warehouse, contraband cellar, tunnel hub, and hidden river-exit site all at once
* civilian-front sites should therefore remain able to carry covert storage, basement alarms, escape tunnels, skiff exits, and similar logistics infrastructure beneath ordinary service use
* abandoned forts or rural ruins may also remain multipurpose assets whose occupancy, salvage, and political value depend on who controls them now rather than on original function alone

This concept stays inside that issue’s boundary.

- 2026-04-23T03:55:00.421Z
Contradiction check

Implementation emphasis:

* shops, taverns, shrines, stables, courts, and smithies should not be treated as mechanically shallow transaction wrappers if the site surface is implying anomaly generation, covert hooks, hidden wards, trapped valuables, or disguised captives
* if current urban-site handling still trends too shallow, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T03:54:59.228Z
Reconciliation update

Implementation emphasis:

* civic fountains, statues, shops, stables, smithies, taverns, and shrines may act as living service nodes that also seed baited legal traps, spoken clue delivery, unstable anomaly incidents, password-gated access, and narrative-value barter preferences
* ordinary businesses should remain able to conceal secure back layers, accidental magical misuse, decorative spillover hazards, and rare tactical services without ceasing to function as everyday commerce fronts

This concept stays inside that issue’s boundary.

- 2026-04-23T03:51:02.799Z
Contradiction check

Implementation emphasis:

* urban anomaly sources do not need to be explicit villains or dungeon cores when everyday merchants, unstable tools, decorative biology, or misunderstood routines can produce recurring incidents locally
* if current anomaly sourcing still overweights obvious masterminds and underweights unstable everyday operators, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T03:51:02.727Z
Contradiction check

Implementation emphasis:

* urban shops, taverns, temples, stables, courts, and smithies should not be treated as mechanically shallow transaction wrappers if the site surface is implying hidden wards, covert hooks, vaults, magical surveillance, anomaly incidents, or disguised prisoners
* if current urban-site handling still trends toward shallow service-only behavior, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T03:51:02.251Z
Reconciliation update

Implementation emphasis:

* religious sites may operate simultaneously as worship space, market, forum, archive, and secure deposit institution rather than one passive service node
* password-gated taverns, baited public fixtures, unstable merchant tools, hazardous ornamental flora, and story-or-curiosity barter preferences should remain valid service-node behaviors rather than colorful prose only
* ordinary businesses may conceal trapped vaults, hidden guardians, secret investigation hooks, or accidental anomaly generation while still functioning as real commerce fronts

This concept stays inside that issue’s boundary.

- 2026-04-22T06:10:13.698Z
Reconciliation update

Fold concealed furniture-based vertical access, hidden utility-furniture compartments, and hidden hearth-based dungeon ingress into this issue.

Implementation emphasis:

* ordinary room furnishings such as beds, podiums, or comparable utility pieces may conceal vertical routes or narrow storage shafts for mission-critical documents
* everyday architectural fixtures such as fireplaces may hide major dungeon ingress activated by mechanical or magical triggers rather than obvious wall panels

This keeps furniture-concealed vertical access, hidden work-podium shafts, and fixture-hidden ingress inside the hidden business and covert infrastructure boundary.

- 2026-04-22T06:07:45.990Z
Reconciliation update

Fold in-site commerce, hidden business functions, and rival embedded operator groups into this issue.

Implementation emphasis:

* hostile spaces may contain player-run or third-party microbusinesses operating directly inside the danger zone
* business fronts may create shelter, rumor flow, customer interaction, and conflict rather than only passive income
* rival operator groups may run their own parallel commerce loops with stock, policy, and hidden reserves inside the same site

This keeps in-site commerce, embedded business operations, and rival operator-business entities inside the hidden-business-function boundary.

- 2026-04-22T05:57:46.109Z
Reconciliation update

Fold front-business covert operations and hidden business functions into this issue.

Implementation emphasis:

* civilian businesses such as taverns, shops, or inns may double as coercive or covert operational venues with hidden backrooms, detention spaces, reserve fighters, or concealed exits while still reading as ordinary commerce on first approach

This keeps front-business covert operations inside the hidden-business-function boundary.

- 2026-04-19T10:07:14.326Z
Contradiction check

The current project should not assume hostile realms are trade-inert violence zones.

Implementation emphasis:

* hostile, monstrous, or raider-controlled polities may still sustain neutral markets, illicit exchanges, contracted services, and specialist commerce nodes
* if current realm logic still suppresses commerce once a polity becomes hostile-coded, that should be treated as a contradiction against the broader simulation model

This keeps the contradiction check visible inside the urban service-node boundary.

- 2026-04-19T10:05:35.836Z
Reconciliation update

Fold universal gray-market hubs, protected foreign-contact enclaves, and hostile-realm commerce into this issue.

Implementation emphasis:

* hostile or monstrous polities may still host neutral or semi-neutral markets where stolen goods, luxuries, services, intelligence, and even morally compromised trade can transact under bounded rules
* exclusionary realms may likewise preserve narrow foreign-contact enclaves for trade, diplomacy, or tolerated exchange without becoming broadly welcoming
* hostile-domain commerce should therefore remain a first-class service and access surface rather than an exception to violence-only realm logic

This keeps gray-market exchange, bounded outsider commerce, and protected enclave trade inside the urban service-node boundary.

- 2026-04-18T10:34:53.946Z
Reconciliation update

Fold hidden-cache ecology and profession-linked rumor distribution into this issue.

Implementation emphasis:

* ordinary trades may routinely maintain concealed reserves, buried money, hidden documents, contraband, or private support stores behind normal workspaces
* professions may also act as rumor and suspicion nodes, surfacing nearby raids, spies, grain pressure, or rival movement rather than generic flavor only

This keeps civilian hidden caches and profession-linked rumor channels inside the urban service-node boundary.

- 2026-04-18T08:33:43.742Z
Reconciliation update

Fold hidden-cache ecology and profession-linked rumor distribution into this issue.

Implementation emphasis:

* ordinary trades may routinely maintain buried chests, secret rooms, concealed reserves, hidden money, contraband storage, or private documents behind normal workspaces
* each profession may also function as a distinct rumor and intelligence node, surfacing nearby raids, political stress, moving tribes, supply shortages, or covert loyalties rather than generic flavor only

This keeps hidden civilian reserves and trade-linked rumor channels inside the urban service-node boundary.

- 2026-04-18T04:06:31.894Z
Reconciliation update

Fold rank-shaped repair quality and restoration access into this issue.

Implementation emphasis:

* repair outcomes may depend on item class, repairer status, and whether the work is rushed, crude, or skilled rather than one universal restore action
* higher social standing may improve access to better repair outcomes or better repairers without making repair purely a money check

This keeps ranked repair quality inside the urban service and workshop boundary.

- 2026-04-18T04:06:31.590Z
Reconciliation update

Fold venue-dependent contamination risk, weak-tie street intelligence, and hidden-effect commodities into this issue.

Implementation emphasis:

* ordinary food and drink may carry baseline contamination risk that varies by venue cleanliness rather than being universally safe once purchased in a city
* low-status contacts such as beggars can function as rumor and prediction markets with variable payment floors, topic breadth, and uncertain truthfulness
* some trade goods may secretly carry anomalous or hidden-effect payloads, making appraisal a question of function as well as price

This keeps venue contamination, street-intel markets, and hidden-effect commodities inside the urban service-node boundary.

- 2026-04-18T03:37:07.922Z
Reconciliation update

Fold covert commercial nodes and venue-specific rule enforcement into this issue.

Implementation emphasis:

* ordinary shops, taverns, and bazaar stalls may conceal contraband, magical goods, traps, guild ties, hidden treasure, covert patrons, or side-work rather than behaving as passive vendor endpoints
* venue rule sets such as dress requirements, confiscation, expulsion, or house-specific penalties should be able to alter service access and local risk without escalating to full civic arrest automatically

This keeps covert-content commerce and venue-local rule enforcement inside the urban service-node boundary.

- 2026-04-18T03:24:47.417Z
Reconciliation update

Fold social-front covert venues with embedded surveillance and escape geometry into this issue.

Implementation emphasis:

* inns, clubs, or similar hospitality fronts may simultaneously host public traffic, private negotiation, acoustic eavesdropping channels, hidden storage, secret basement links, and operator escape routes
* on-demand architectural conversion such as dropping through a trap, flattening stairs into a ramp, or similar local geometry shifts should remain valid venue-defense tools when owned by the operator

This keeps covert social fronts, embedded surveillance architecture, and venue-escape geometry inside the service-node boundary.

- 2026-04-18T03:05:44.952Z
Reconciliation update

Fold disguised logistics houses and shrine-front transport nodes into this issue.

Implementation emphasis:

* innocuous religious or civic buildings may hide long-range logistics capability, rare-goods routing, and other strategic transport functions behind an ordinary public facade
* these sites should remain readable as service nodes on the surface while preserving a second hidden operational role that materially changes regional movement, trade, or conflict once exposed

This keeps facade-hidden logistics infrastructure inside the urban service-node boundary.

- 2026-04-18T02:52:39.239Z
Reconciliation update

Fold mining-town service ecosystems and hireling utility packets into this issue.

Implementation emphasis:

* one settlement may expose a dense ecosystem of rope makers, wagon support, inns, ferries, temples, offices, smiths, animal breeders, barrel makers, lamp makers, and other specialized utility nodes rather than one generic town shop layer
* those nodes should express the identity of an extraction town where labor, transport, taxation, and service dependence shape what is available locally
* hireling encounters may package immediate equipment, bounded regional lore, and temporary practical support together rather than acting as pure combat reinforcements only

This keeps specialized extraction-town services and hireling utility packets inside the urban service-node boundary.

- 2026-04-18T02:30:20.585Z
Reconciliation update

Fold layered NPC-embedded rumors, protected outsider trade channels, and counterfeit anomaly-item commerce into this issue.

Implementation emphasis:

* service providers should continue to act as rumor-bearing nodes whose trade, lodging, or repair interactions surface hidden leads, contradictions, and objective hooks organically
* xenophobic settlements may still preserve narrow profitable lanes for outsider commerce through guarded guilds, harbor contacts, inns, or sanctioned brokers without becoming broadly welcoming
* informal sellers and back-channel traders may offer claimed anomaly items whose authenticity must be verified separately from the sale claim itself

This keeps rumor-bearing service nodes, protected commerce under hostility, and counterfeit anomaly-item trade inside the urban service-node boundary.

- 2026-04-18T00:03:13.184Z
Reconciliation update

Fold district encounter cadence, nonprotective policing, opportunistic street factions, and warehouse search weighting into this issue.

Implementation emphasis:

* urban danger should vary by district or route class, with different encounter cadence on main thoroughfares, back streets, and public interiors rather than one citywide rhythm
* patrol presence may control riot or property damage without making the city safe for outsiders, so guard presence and actual protection should remain separate semantics
* street factions can swing between predation, negotiation, and short-term cooperation based on local contact outcome rather than fixed hostility only
* logistics spaces may mostly yield low-value stock while rarely hiding disproportionately useful disguise, navigation, or infiltration tools

This keeps urban encounter rhythm, patrol stance, volatile street brokers, and logistics-space search weighting inside the urban service-node boundary.

- 2026-04-17T23:52:58.950Z
Reconciliation update

Fold paid neutral ferrymen with unstable disposition and negotiated temporary allied support into this issue.

Implementation emphasis:

* service actors may provide paid passage or specialist help while carrying volatile disposition that can degrade into hostility through repetition, provocation, or stress
* temporary allied support groups may join through explicit payment and loot-share or outcome-share terms rather than alignment alone
* these arrangements should remain bounded service contracts with clear support expectations, not permanent recruitment by default

This keeps volatile paid service actors and contract-bound temporary alliances inside the urban service-node boundary.

- 2026-04-16T01:36:44.056Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/86). All replies are displayed in both locations.

---

## SPE-47 - Shared structured-definition grammar and child boundaries
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 4
- Labels: simulation, system, core-loop
- Created: 2026-04-14T11:19:30.370Z
- Updated: 2026-04-27T08:19:56.307Z

### Description
Goal:  
Maintain the shared structured-definition grammar and child boundaries so simulation-facing content families can evolve under one consistent schema without collapsing back into bespoke cross-cutting definitions.

Scope:

* define the shared contracts, naming discipline, and boundary rules that child definition issues must follow
* keep the parent focused on schema governance, compatibility expectations, and partitioning logic between child surfaces
* distinguish the parent shell from child-owned work on actor/anomaly/hazard record shapes, reusable trigger or backlash grammar, and support-asset or reward-hook structure
* support bounded extension points so new child schema work can be added without re-broadening the parent into a catch-all implementation bucket
* connect the parent shell to child issues that own concrete record fields, reusable behavior entries, and support/reward structure

Constraints:

* deterministic only
* no direct ownership here of child-level runtime semantics or field additions
* no duplication of child implementation detail inside the parent description
* prefer compact schema-governance rules over sprawling umbrella scope
* keep the parent limited to shared grammar and child boundary management

Acceptance criteria:

* child issues can evolve record shape, reusable behavior grammar, and support/reward schema without the parent reclaiming their concrete scope
* shared contracts and partition boundaries remain clear enough that future schema additions land on the correct child or trigger a new bounded child
* the structured-definition family stays coherent across children without requiring this parent to absorb their implementation detail
* targeted validation or review can confirm that child-owned schema work still conforms to the shared grammar and boundary rules

### Relations
_No relations_

### Comments
- 2026-04-26T11:38:26.725Z
Reconciliation update

Routing note:

* this parent should remain the schema-governance shell for shared definition grammar and child partitioning, not the place where child-level field additions or runtime semantics accumulate
* route record-shape questions to [SPE-741](https://linear.app/spectranoir/issue/SPE-741/compact-actor-anomaly-and-hazard-records), reusable effect grammar to [SPE-742](https://linear.app/spectranoir/issue/SPE-742/reusable-trigger-modifier-and-backlash-entries), and support-asset or reward-hook structure to [SPE-743](https://linear.app/spectranoir/issue/SPE-743/structured-support-asset-and-reward-hooks)
* if new schema work does not fit one existing child cleanly, split another bounded child instead of widening the parent again

This keeps [SPE-47](https://linear.app/spectranoir/issue/SPE-47/structured-definition-schema-with-reusable-behavior-entries) as the schema-boundary parent rather than a catch-all implementation bucket.

- 2026-04-26T11:23:52.348Z
Reconciliation update

Implementation emphasis:

* temporary characteristic modifiers should cascade into derived values and respect explicit caps, rather than treating stat changes as isolated labels
* projectile augmentation packages should remain mutually exclusive where their delivery assumptions conflict, preserving package choice over unrestricted stacking
* directed movement powers should continue to include forced reposition, speed modulation, attack redirection, and externally driven flight as one coherent movement-control family rather than only self-buffs

This keeps stat-propagation, projectile exclusivity, and movement-control consequences inside the structured-definition and effect framework.

- 2026-04-26T11:23:51.864Z
Reconciliation update

Implementation emphasis:

* ability authoring should continue to use one shared trait schema across multiple power paths, with common fields such as range, duration, concentration, resist, trigger, area, touch, and intensity metadata instead of bespoke subsystem prose for each tradition
* by default, active power use should also emit readable cast tells in sight and sound unless a separate concealment rule overrides them
* multi-action casting windows, concentration loss on disruption, and default detectability should therefore remain core assumptions rather than rare special cases

This keeps shared ability traits, cast signatures, and interruption windows inside the structured ability-definition boundary.

- 2026-04-26T11:12:57.678Z
Reconciliation update

Routing note:

* this parent should remain the coordination shell for the shared structured-definition grammar and child split, not the landing zone for child-level field decisions
* route core record-format questions to [SPE-741](https://linear.app/spectranoir/issue/SPE-741/compact-entity-records-for-actors-anomalies-and-hazards), reusable trigger/backlash grammar to [SPE-742](https://linear.app/spectranoir/issue/SPE-742/reusable-behavior-entries-for-triggers-modifiers-and-backlash), and support-asset or reward-hook schema detail to [SPE-743](https://linear.app/spectranoir/issue/SPE-743/support-asset-equipment-and-reward-hook-schema)
* if future work does not fit one of those children cleanly, split another bounded child instead of broadening the parent

This keeps the parent compact and prevents schema detail from drifting back into one catch-all issue.

- 2026-04-25T15:06:49.935Z
Reconciliation update

Implementation emphasis:

* hostile definitions should support multi-axis profiles rather than one creature-type bucket, combining operational danger tier, physical origin, motive origin, body form, preservation state, anchor surfaces, sustainment dependencies, and social links in one compact record
* the same schema should separate vessel, animating identity, anchor objects, dependency loops, and external support so apparent destruction, body loss, and final retirement can resolve through different state paths
* authoring should also carry rationale fields for why a power, weakness, or resolution key exists so clue surfaces can point back to biography instead of leaving counters arbitrary

This concept stays inside that issue’s boundary.

- 2026-04-25T09:20:35.822Z
Reconciliation update

Implementation emphasis:

* core rules should be authored as a reusable engine layer rather than as a one-setting content bundle
* structured definitions and reusable behavior entries should expose replacement points clearly enough that downstream content families, setting overlays, and subsystem swaps are expected authoring paths rather than exceptions
* shared schema should preserve deterministic contracts while allowing jurisdiction tags, source tags, and bounded overlays to reskin or redirect behavior without bespoke rewrites
* explanation surfaces should stay clear enough that system authors can tell which layer is core, which layer is overlay, and which rules are being replaced or extended

This concept stays inside that issue’s boundary.

- 2026-04-24T15:32:19.625Z
Reconciliation update

Implementation emphasis:

* capability entries should keep a repeatable metadata schema covering activation score, initial cost, maintenance cost, range, preparation time, area, prerequisites, special threshold outcomes, and catastrophic-failure outcomes
* new effect families should not be considered viable until they clear minimum content thresholds across tiers, and they should be checked for duplication or domain conflict before admission into the broader taxonomy
* preparation and maintenance should remain separate runtime concepts, so charged-up actions can be lost to delay or disruption without always consuming final execution resources

This concept stays inside that issue’s boundary.

- 2026-04-24T15:28:38.783Z
Reconciliation update

Implementation emphasis:

* capability entries should keep explicit fields for initial cost, maintenance cost, preparation time, range, area, prerequisites, exact-threshold outcomes, and catastrophic-failure outcomes rather than burying those rules in prose only
* activation may resolve as trained skill use with resource loss on failure, special threshold results, and power-specific backlash or temporary lockout on critical failure rather than guaranteed clean execution
* explicit prerequisite links should remain visible in authoring so dependent abilities auto-pull required foundations where that family is randomly generated or procedurally assigned
* simulated sensory or audio output should not inherit the mechanical payload of the thing it imitates unless that payload is separately authored

This concept stays inside that issue’s boundary.

- 2026-04-23T04:07:50.349Z
Reconciliation update

Implementation emphasis:

* reusable site packets should continue to separate history, current condition, keyed spaces, named actors, and adventure hooks as the baseline scaffold
* secondary-route expectations should remain standard, with important sites carrying at least one official route, one covert route, and one emergency route wherever the design supports it
* site integrity and degradation should continue to act as first-class state that shapes traversal, occupancy, and salvage rather than map flavor alone

This concept stays inside that issue’s boundary.

- 2026-04-22T05:32:51.095Z
Reconciliation update

Fold compact cross-category card schema, world-tagged classification, behavior-profile fields, ecology shorthand, family-template actors, variant species built from one core skeleton, and cross-domain stat normalization into this issue.

Implementation emphasis:

* entities across actors, anomalies, items, and vehicles may share one compact operational schema with small category-specific variation
* content should support source or jurisdiction tags so one shared presentation grammar can span incompatible settings or domains
* anomaly and actor cards should surface cognitive profile, disposition, and one short ecology or provenance note alongside combat-facing values
* creature families and variant species may be authored from one core chassis with swapped output packages rather than rewritten from zero each time
* heterogeneous sources should normalize through one shared stat language where practical

This keeps compact cross-category schema, source-tagged taxonomy, behavior-profile fields, ecology shorthand, family-template actors, and stat normalization inside the structured-definition boundary.

- 2026-04-19T22:04:54.701Z
Reconciliation update

Fold bounded mutation envelopes for familiar entities into this issue.

Implementation emphasis:

* local variants may alter number appearing, defense, movement, size, vulnerabilities, or selected special ability surfaces inside a compact mutation budget rather than through unrestricted rewrite
* those envelopes should preserve legibility and role identity while still defeating rote recognition

This keeps safe local mutation bounds inside the structured-definition boundary.

- 2026-04-18T10:54:56.904Z
Reconciliation update

Fold composite false-giant actors, reflected retaliation traits, delayed revivification, anti-stealth cave populations, and per-entry encounter behavior notes into this issue.

Implementation emphasis:

* one apparent large hostile may be implemented as several smaller coordinated actors whose shared presentation collapses into separate agents under explicit trigger conditions
* encounter definitions may continue to attach local behavior notes such as gaze lock, hold-on-double-hit, retreat on disadvantage, blood-drain latch, delayed regeneration, or species-specific sensory packages rather than relying on a generic family shell alone
* these entry-specific behaviors should remain compact overrides layered on top of the shared creature schema rather than one-off bespoke monsters each time

This keeps composite actor presentation, reactive traits, delayed shutdown conditions, cave-species sensory packages, and per-entry behavior overrides inside structured definitions and reusable behavior text.

- 2026-04-18T10:37:30.631Z
Reconciliation update

Fold weapon-specialist archetype progression, weapon-family specialization curves, and intelligent-item sensing into this issue.

Implementation emphasis:

* martial specialist archetypes may bundle offense, stealth-adjacent movement, crafting, aura detection, and weapon appraisal rather than pure damage scaling only
* mastery should be able to progress differently by weapon family so one class of weapons can improve on a different cadence than another
* signature or intelligent weapons may continue to provide tactical information and advisory behavior instead of acting as passive numbers only

This keeps weapon-specialist progression, family-specific mastery curves, and sensing weapons inside structured definitions and role authoring.

- 2026-04-18T10:18:02.311Z
Reconciliation update

Fold features-versus-skills-versus-special distinction and reusable blank actor templates into this issue.

Implementation emphasis:

* actor capability should support at least three layers: stable traits or features, trained competencies, and exceptional/special states rather than only stats plus skills
* reusable blank templates for actor records should remain a first-class authoring aid when quickly drafting many similar characters or NPCs
* important symbolic or patron affiliations such as divinity can remain explicit metadata inside the same actor definition rather than drifting into prose only

This keeps multi-layer capability taxonomy, reusable actor templates, and explicit affiliation metadata inside structured definitions and role authoring.

- 2026-04-18T09:51:24.664Z
Reconciliation update

Fold multi-mode performance control suites, gaze and eye-beam payloads, anti-stealth sensory overrides, weapon-family immunity, reactive parry breakage, actor-linked signature weapons, symbolic identity metadata, layered power tracks, and localized weather fields into this issue.

Implementation emphasis:

* one actor or item may expose several discrete control modes keyed to instrument, stance, or other sub-tool choice rather than one flat charm effect
* vision-based attacks may carry raw damage, illumination, fear, control, or long-horizon domination payloads, with optional scaling by distance or exact eye contact
* some entities should bypass silence, surprise, or ordinary concealment through extreme sensory packages instead of sharing a standard sight-and-hearing model
* weapon interaction should support family-level immunity, reactive parry-based destruction, and actor-linked signature items that act as bespoke subsystems rather than simple high-damage inventory pieces
* important actors may expose symbolic identity fields that other systems can query for recognition, ritual, or item coupling
* high-tier beings may compose several power tracks at once instead of fitting one archetype line only
* localized climate or weather generation can act as a hard-control field with save penalties and lethal freeze thresholds rather than decorative atmosphere only

This keeps multi-mode control, gaze payloads, anti-stealth sensing, weapon-family interaction, signature items, symbolic identity, layered power tracks, and local weather attack fields inside structured definitions and reusable behavior text.

- 2026-04-18T04:22:06.417Z
Reconciliation update

Fold themed device families, broadcast fear emitters, guardian-template projection, wearable full-form swaps, and volatile organ-weapons into this issue.

Implementation emphasis:

* artifact lines may be authored as coherent myth- or species-source families where each device expresses a different subsystem of the same conceptual source rather than existing as unrelated one-offs
* some broadcast devices may produce fear or rout effects partly through target recognition or interpretation rather than raw force alone
* some interface artifacts may project a bounded guardian from a stored template with limited-use state rather than creating a permanent ally
* wearable transformation devices may swap the user's body-state and capability set while suppressing incompatible human functions during the altered form
* organ-like or quasi-biological devices may be portable, rechargeable, and dangerously vulnerable to accidental discharge on impact or mishandling

This keeps themed device-family authoring, interpretive fear emitters, stored-template guardian projection, full-form wearable swaps, and volatile organ-devices inside structured definitions and reusable behavior text.

- 2026-04-18T04:03:39.519Z
Reconciliation update

Fold intelligent equipment personalities, themed device families, broadcast fear tools, guardian-template projection, and volatile organ devices into this issue.

Implementation emphasis:

* equipment may behave like active companion objects with dialogue, advice, insults, hunger, agenda pressure, and involuntary signaling during use rather than passive stat sticks
* artifact lines may be authored as coherent myth- or species-source families where each device expresses a different subsystem of the same conceptual source
* some broadcast devices may create fear based partly on target interpretation or recognition rather than raw force alone
* some interface artifacts may project a bounded guardian entity from a stored template with limited-use state rather than creating a permanent summoned ally
* biological or organ-like devices may be portable, rechargeable, and highly vulnerable to accidental discharge on impact or mishandling

This keeps intelligent equipment agency, device-family authoring, interpretive fear emitters, stored-template guardian projection, and volatile organ-weapons inside structured definitions and reusable behavior text.

- 2026-04-18T03:37:08.058Z
Reconciliation update

Fold context-switched military loadouts into this issue.

Implementation emphasis:

* one actor definition may expose different equipment packages for horseback versus foot duty, changing shield, lance, bow, spear, or sidearm mix without requiring a separate actor record each time
* these packages should remain structured alternate loadouts tied to locomotion or duty mode rather than ad hoc narrative swaps

This keeps locomotion-dependent loadout switching inside structured definitions and reusable behavior text.

- 2026-04-18T03:34:29.052Z
Reconciliation update

Fold composite guardian construction, target-specific blessed ammunition, and actor-tag item permission inside this issue.

Implementation emphasis:

* hybrid guardians may be authored by bundling multiple attack, mobility, immunity, and special-effect packages into one actor rather than inventing a wholly separate rules model each time
* item or ammunition packages may be specialized against one target family or known enemy rather than remaining fully general-purpose
* some items should grant or deny full functionality based on actor tags such as role, alignment, or ethical status rather than raw possession alone

This keeps composite enemy composition, target-specific item payloads, and actor-tag item permission inside structured definitions and reusable behavior text.

- 2026-04-18T03:26:38.269Z
Reconciliation update

Fold reflected retaliation traits, layered multi-medium ecology, and composite guardian behavior into this issue.

Implementation emphasis:

* entities may reflect spell energy, retaliate on death, or rebound harm toward an attacker through explicit typed traits rather than generic resistance only
* encounter spaces may layer wall-side, water-side, and ground-side species that react under different movement-medium conditions inside one room or cave network
* composite guardians should be able to assemble runtime behavior from multiple discrete attack, mobility, and condition packages rather than one single-species template only

This keeps reflected/retaliatory traits, layered ecology packages, and composite actor behavior inside structured definitions and reusable behavior text.

- 2026-04-18T03:24:47.640Z
Reconciliation update

Fold reflected retaliation traits, material-seeking tunnelers, perch-ambush paralysis predators, alignment-gated trackers, and mixed-value discovery tables into this issue.

Implementation emphasis:

* entities may reflect spell-energy, retaliate on death, or rebound harm toward the attacker through explicit typed traits rather than generic resistance only
* some entities should be able to path directly toward a target material class through terrain while exposing asymmetric damage-type weaknesses
* predator packages may combine hidden perch logic, vulnerability-based target selection, grapple setup, and injected condition payloads in one reusable definition
* some specialist pursuit entities may primarily serve as long-range trackers and only secondarily as attackers, with hard restrictions on the kinds of controllers they will obey
* discovery pools may mix mundane clutter, disguised utility, low-grade anomalies, and true valuables instead of separating them into clean reward tables

This keeps retaliatory traits, material-seeking pathers, perched paralysis predators, specialist trackers, and mixed-value discovery pools inside structured definitions and reusable behavior text.

- 2026-04-18T03:14:02.430Z
Reconciliation update

Fold intelligent-item sensing packages into this issue.

Implementation emphasis:

* intelligent or semi-autonomous held items may contribute sensing, secret-door detection, shifting-wall awareness, and other bounded analysis outputs beyond ordinary combat bonuses
* these items should remain active informational participants with their own specialty channels rather than passive stat sticks

This keeps intelligent-item sensing inside structured definitions and reusable behavior text.

- 2026-04-18T03:08:08.674Z
Reconciliation update

Fold intelligent-item environmental sensing into this issue.

Implementation emphasis:

* intelligent or semi-autonomous held items may contribute sensing, secret-door detection, shifting-wall awareness, and other bounded analysis outputs beyond ordinary combat bonuses
* these items should remain active informational participants with their own specialty channels rather than passive stat sticks

This keeps intelligent-item sensing packages inside structured definitions and reusable behavior text.

- 2026-04-18T02:52:39.359Z
Reconciliation update

Fold stored-energy items, tiny-creature lightweight health, and target-class-sensitive predator packages into this issue.

Implementation emphasis:

* carried crystals, cells, or similar storage objects may hold externalized energy reserves that extend ability use beyond innate capacity while remaining explicit inventory-bearing state
* very small fauna such as insects or equivalent minor life forms may use lightweight one-hit or near-one-hit runtime semantics rather than the full combat-health pipeline
* predator definitions should be able to vary by time window, preferred target class such as mounts versus foot parties, and pair-bond or brood state without requiring bespoke per-species subsystems

This keeps stored-energy objects, lightweight tiny-fauna runtime, and family-sensitive predator behavior inside structured definitions and reusable behavior text.

- 2026-04-18T02:49:49.200Z
Reconciliation update

Fold lightweight notable-NPC packets into this issue.

Implementation emphasis:

* important NPCs may be authored through a compact packet of identity, archetype, hidden motive or secret, threat threshold, and one distinctive behavior rule rather than full bespoke sheets
* unnamed figures may promote into named packets once they become structurally important, preserving continuity without requiring full preauthoring for everyone
* this compact packet should stay readable enough for rapid scenario play and authority handoff while still exposing one sharp differentiator per notable figure

This keeps minimal notable-NPC packet authoring inside structured definitions and reusable behavior text.

- 2026-04-18T02:46:44.599Z
Reconciliation update

Fold nonvisual omnidirectional sensing, cadence-limited breath attackers, thermal-tracking heavy units, and equipment-consuming predator appetites into this issue.

Implementation emphasis:

* compact threat definitions should support alternate sensing packages such as radar-like 360-degree awareness, heat-sensitive tracking, vibration bias, or other nonstandard detection families that do not inherit ordinary darkness and facing assumptions
* heavy hostile packages may combine bounded-cadence area attacks with special tracking channels so reveal timing, spacing, and warmth management materially affect encounter handling
* predator profiles may include explicit appetite classes for charged gear, anomalous equipment, or other carried resources, with feed thresholds influencing pursuit, aggression, and disengage behavior

This keeps alternate sensing, heat-tracking attack packages, and inventory-targeting predator appetite inside structured definitions and reusable behavior text.

- 2026-04-17T23:23:11.791Z
Reconciliation update

Fold layered treasure bundles, parameterized payload items, noncombat hostile roles, repeat-attack composites, and swallowed-capture profile hooks into this issue.

Implementation emphasis:

* reward-bearing objects should support a compact layered bundle of container form, defensive package, and concealment method rather than a flat loot flag
* payload items such as scroll-like consumables should act as item shells carrying variable payload definitions and family-restricted payload pools rather than hardcoded one-offs
* hostile definitions should support lure, alarm, watcher-proxy, and refusal-to-commit behavior roles in addition to direct damage roles
* some entities should expose parameterized repeat-attack channels or composite attack heads without bespoke per-creature sheets
* profile hooks should exist for engulf, swallow, internal capture, or body-held target states so later runtime rules can consume them deterministically

This keeps layered reward objects, payload-bearing consumables, noncombat hostile roles, composite attack templates, and capture-capable actor profiles inside structured definitions.

- 2026-04-15T22:59:12.900Z
Reconciliation update

Fold technology-forward anti-anomaly doctrine packages into this issue.

Implementation emphasis:

* factions may center their identity on highly technical anti-anomaly tools, shielding, restoration, beam-like typed devices, and anti-occult countermeasures rather than on conventional doctrine alone
* those packages should remain coherent enough that technology-forward factions feel meaningfully distinct in both support options and confrontation assumptions

This keeps anti-anomaly technological faction identity inside structured definitions and faction template work.

- 2026-04-15T10:36:18.498Z
Reconciliation update

Fold shapechange retention rules and movement modes as authority classes into this issue.

Implementation emphasis:

* form-change systems should state which powers, permissions, or defenses persist through transformation and which are lost or constrained by the adopted form
* movement modes should communicate authority and interaction scope, not only raw speed, including layer-crossing or domain-specific travel privileges when relevant

This keeps transformation-retention logic and authority-bearing movement modes inside structured definitions.

- 2026-04-15T09:31:17.213Z
Reconciliation update

Fold rich multi-field mobile asset profiles into this issue.

Implementation emphasis:

* mobile assets may require explicit fields for speed, maneuverability, climb or vertical mobility, dive or burst movement, ceiling or altitude band, durability, armament package, and special operating traits where those distinctions matter
* these richer profiles should remain compact enough to integrate with existing structured definitions rather than turning into bespoke simulation sheets for every asset

This keeps multi-field asset performance profiles inside structured definitions.

- 2026-04-15T09:30:33.785Z
Reconciliation update

Fold nuisance entities, setup-gated catastrophic gaze threats, ranged taxonomy refinements, shock-versus-penetration distinction, and hidden higher-tier lineage variants into this issue.

Implementation emphasis:

* some hostile entities should function primarily as social or logistical disruptors rather than direct front-line threats
* some catastrophic effects should be gated by setup, facing, or geometry constraints so their lethality depends on positional conditions rather than constant availability
* ranged tools should distinguish effective range from absolute reach, and classify delivery methods by weight, shock, penetration, or training demands where those differences matter
* hostile lineages may contain concealed higher-tier subtypes that preserve shared family traits while introducing stronger or rarer variants

This keeps nuisance threats, geometry-gated catastrophic effects, refined ranged taxonomy, and hidden lineage escalation inside structured definitions.

- 2026-04-15T07:23:40.532Z
Reconciliation update

Fold broad advanced-action libraries, explicit equipment degradation risks, and modular override packets into this issue.

Implementation emphasis:

* the project should support a broad reusable library of advanced actions spanning attack, control, mobility, detection, shaping, defense, deception, recall, summoning, and manipulation families through the same compact definition discipline
* specific hazard families should be able to degrade, corrode, rust, drain, or destroy tools and gear as first-class equipment risks rather than only generic damage
* modular override packets should exist for body type, construction type, fabricated status, or other special forms so compact exceptions can be applied without bespoke rewrites of the base definition

This keeps advanced-action libraries, equipment degradation, and override packets inside structured definitions.

- 2026-04-15T07:22:59.131Z
Reconciliation update

Fold compact threat definition templates, composite threat package rules, animated environment hostility, and context-sensitive reward embodiment into this issue.

Implementation emphasis:

* threat definitions should support compact attack-plus-rider templates, attack counts, body-form-sensitive outputs, and reusable native attack families without full bespoke stat sheets
* composite packages such as rider plus mount, servant plus master, nested host threats, or symbiotic combinations should be authorable as bounded combined entities rather than one-off custom logic
* hostile environments and object-host threats should be representable through the same definition discipline as mobile threats where relevant
* rewards and salvage can be tied to anatomy, habitat, hidden compartments, or capture state through structured hooks rather than only flat loot tables

This keeps compact threat templates, composite packages, hostile objects, and context-tied reward embodiment inside structured definitions.

- 2026-04-15T07:04:12.625Z
Reconciliation update

Fold functional equipment identity, interaction-matrix style matchup logic, natural-attack taxonomies, domain-opposition structure, reusable geometry vocabulary, modular protection families, body-form-sensitive handling, and bounded environment-shaping verbs into this issue.

Implementation emphasis:

* tools, powers, and anomaly-native attack families should differ by speed, reach, penetration or disruption profile, target suitability, and contact style rather than collapsing into flat tiers
* interaction logic may depend on attacker family, defender protection or body form, and method pairing through compact typed matchup rules rather than one universal output rule
* nonhuman or anomaly-native attack families should be reusable packages such as constrict, ram, sting, engulf, claw, or analogous contact models in Containment Protocol terms
* explicit domains or schools should support bounded opposition, affinity, specialization discounts, and cross-domain penalties where methods are not equally compatible
* reusable effect-shape language should cover line, cone, wall, burst, field, and scaled-size variants so shaped effects are authored through shared vocabulary
* modular protection and countermeasure families should allow selective resistance packages against specific threat classes instead of one generic defense state
* body form and size should influence carrying, movement, targeting, and hazard interaction where relevant
* advanced environment-shaping methods should be represented as bounded verbs that open routes, close routes, create barriers, alter cover, or reshape local hazard state without bespoke per-entry systems

This keeps the effect language, matchup logic, protection families, and environment verbs inside structured definitions.

- 2026-04-15T06:36:10.236Z
Reconciliation update

Fold tool differentiation, explicit domain-opposition structure, and reusable effect-shape vocabulary into this issue.

Implementation emphasis:

* tools, powers, and operational methods should differ by function, speed, reach, penetration or disruption profile, and target suitability rather than collapsing into flat strength tiers
* content families should be able to declare explicit domains or schools with bounded oppositions, affinities, or specialization modifiers where certain methods are stronger, weaker, or less efficient against particular targets or countermethods
* reusable geometry language should exist for effects such as cone, line, wall, burst, clustered field, and scaled-size variants so shaped outcomes are authored through a compact vocabulary rather than bespoke per-entry logic
* these distinctions should remain compact and composable so definitions do not bloat into full secondary combat subsystems

This keeps meaningful tool identity, domain opposition, and shape language inside structured definitions.

- 2026-04-15T06:18:38.656Z
Reconciliation update

Fold shaped effect geometry and asymmetric faction doctrine packages into this issue.

Implementation emphasis:

* structured definitions should support directional, line-based, cone-like, clustered, or otherwise shaped effect patterns where anomaly fields, suppression tools, or support actions are not well represented by flat radius logic
* recurring factions or actor families should be able to carry compact doctrine and technology packages that alter preferred tactics, response assumptions, effect geometry, costs, or constraints without becoming bespoke subsystems
* these packages should remain compact reusable overlays on top of existing profiles, triggers, and weakness fields

This keeps shaped effect behavior and faction asymmetry inside structured definitions rather than splitting them into separate geometry or faction-tech issues.

- 2026-04-15T05:43:33.807Z
Reconciliation update

Fold faction doctrine templates into this issue.

Implementation emphasis:

* faction or actor families should be able to declare compact doctrine packages such as morale tendencies, preferred tactics, engagement distance bias, weapon or tool preferences, legality bias, and fallback behavior
* these packages should function as reusable behavior overlays rather than bespoke per-faction systems
* doctrine packages should remain compact enough to combine with existing profile, weakness, and trigger fields without becoming full secondary stat blocks

This keeps reusable faction doctrine behavior inside structured definitions rather than splitting it into a separate faction-template issue.

- 2026-04-15T05:09:28.439Z
Reconciliation update

Fold two content-definition needs into this issue:

* behavior-profile taxonomies for threat families
* prepared-material failure profiles such as spoilage, contamination, degraded potency, or false-confidence states

Implementation emphasis:

* reusable threat families should be able to declare pursuit style, ambush tendency, persistence, movement pattern, habitat affinity, and disengagement logic through compact profiles rather than generic hostile behavior
* prepared materials and protocol compounds should be able to declare spoilage paths, contamination risks, degradation cues, and mishandling consequences through the same definition-first discipline

This keeps both boundaries inside compact reusable definitions rather than splitting off bespoke threat-AI or material-failure issues.

- 2026-04-15T04:41:45.649Z
Boot Hill integration pass:

This issue is the best owner for tool malfunction, misfire consequences, and recurring professional template packages.

Fold in:

* tools failing in distinct ways such as dud outcomes, jams, self-harm risk, recovery delay, or degraded future use
* unstable equipment, overloaded support gear, breached containment tools, and jammed response systems as compact structured failure states
* recurring world-actor template packages for support, contractor, security, civilian, and rival archetypes rather than bespoke one-off definitions

Recommended guardrails:

* keep malfunction states compact and deterministic
* keep recurring role packages template-driven and definition-first rather than full bespoke actor sheets

- 2026-04-15T02:13:56.971Z
En Garde!, Monsters! Monsters!, and Bunnies & Burrows integration pass:

This issue remains the best owner for compact profile-plus-power definitions, weakness discipline, environment-driven behavior, and quick-rated minor groups.

Fold in as implementation emphasis:

* short reusable powers attached to compact profiles
* explicit capability-plus-constraint authoring
* environment-conditional and container-conditional behavior entries
* simplified ratings for non-key actors where full sheets are unnecessary
* hazardous or anomaly-facing entries that can change behavior under instability, damage, containment, or local conditions

This keeps structured definitions compact, deterministic, and reusable across multiple simulation-facing content families.

- 2026-04-15T02:09:19.824Z
Monsters! Monsters! integration pass:

This issue is the best home for compact profile-plus-power templates, quick-rated non-key actors, and power-plus-weakness authoring discipline.

Fold in:

* compact profile-plus-power definitions for anomalies, rival cells, support assets, hazards, and specialist-facing simulation actors
* one or more short reusable powers/behavior entries per definition rather than sprawling bespoke logic
* simplified aggregated ratings for non-key actors such as civilians, crowds, militia, irregulars, animal packs, or minor hostile groups where full entity sheets would be overkill
* explicit power-plus-weakness authoring discipline so definitions include both:
  * primary capability
  * exploitable weakness, limit, or environmental constraint

Recommended guardrails:

* no giant stat-block import
* no full-sheet simulation for minor actors
* keep quick-rated groups bounded and simulation-facing
* keep powers short, explicit, and reusable

This avoids creating a separate issue for quick-rated non-key actors because the compact-definition boundary already owns them cleanly.

- 2026-04-15T01:24:44.933Z
Metamorphosis Alpha integration pass:

This issue is the right home for environment-driven behavior and compact closed-system entity definitions.

Fold in:

* behavior entries that change by environment, local context, containment state, and system damage rather than by static encounter role only
* explicit closed-system container logic where anomalies, hazards, incidents, and agency assets can reference deck/site/zone/local-state constraints without bespoke per-case code
* bounded asymmetric progression hooks so dangerous content can gain, lose, or transform capabilities through deterministic state changes rather than uniform linear scaling
* compact unknown-behavior entries where some response rules are hidden until discovery, exposure, or analysis

Recommended emphasis:

* environment modifies behavior
* containment context modifies behavior
* damage/instability modifies behavior
* role-readable definition blocks stay short and deterministic

This keeps the issue focused on reusable structured actor definitions rather than on a giant procedural ecology layer.

- 2026-04-14T11:19:31.823Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/48). All replies are displayed in both locations.

---

## SPE-154 - Hidden civic understructure in mixed-surface settlements
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 4
- Labels: simulation, system, core-loop
- Created: 2026-04-18T08:33:29.783Z
- Updated: 2026-04-27T08:19:56.146Z

### Description
Goal:  
Implement mixed-surface settlement structure so public settlement footprint and hidden civic understructure can diverge without becoming unrelated maps.

Scope:

* support settlements where major habitation, storage, institutions, routes, and infrastructure sit partly or wholly beneath or behind the public surface layout
* support concealed civic nodes that require trust, status, investigation, or insider access to discover
* support shared boundary logic between surface-visible settlement form and hidden civic understructure without collapsing them into separate unrelated site packets
* distinguish the mixed-surface settlement shell from the narrower child surfaces for concealed regional habitation, unified undercity circulation, and institution-specific restricted lower levels
* connect the parent shell to child issues that own low-footprint settlement presentation, hidden-route network circulation, and institutional depth/access behavior

Constraints:

* deterministic only
* no need for every settlement to contain a full hidden undercity
* no freeform map-within-map complexity without authoring support
* prefer compact public-versus-hidden layer rules over sprawling bespoke labyrinth logic
* keep the parent limited to mixed-surface settlement boundary logic rather than child-level route or institution specifics

Acceptance criteria:

* at least one settlement supports public surface locations plus hidden or subsurface civic infrastructure under one coherent settlement shell
* at least one key civic node is absent from the public-facing map but discoverable through play
* movement, population, or service access differs materially between surface and hidden layers in at least one reusable flow
* parent/child boundaries remain clear enough that concealed regional habitation, undercity circulation, and institutional depth rules can evolve without re-broadening this issue
* targeted tests or validation examples cover deterministic discovery, surface-hidden divergence, and mixed-surface settlement handling

### Relations
- related: SPE-451 Institutional Depth Bands and Restricted Access

### Comments
- 2026-04-27T06:58:31.863Z
Reconciliation update

Fold civic-hazard hybrid settlements into this issue.

Implementation emphasis:

* some settlements may remain partly civic and partly active hazard ecology, with ordinary movement, trade, and habitation interleaved with traps, predator pressure, or unstable soft-hostility zones
* the public settlement shell and its hazard ecology should therefore coexist under one coherent settlement surface rather than splitting into unrelated town and wilderness packets

This keeps civic-hazard hybrid settlement logic inside the mixed-surface settlement boundary.

- 2026-04-26T13:44:14.067Z
Parent/child split update

Routing note:

* keep this parent as the mixed-surface settlement shell for shared boundary and completion logic
* route concealed regional habitation and low-footprint surface presentation to [SPE-805](https://linear.app/spectranoir/issue/SPE-805/concealed-regional-habitation-and-low-footprint-settlements)
* route unified undercity circulation and mixed-faction hidden-route networks to [SPE-806](https://linear.app/spectranoir/issue/SPE-806/unified-undercity-circulation-and-mixed-faction-underlayers)
* route institution-specific hidden depth and restricted lower-level access to the already-completed [SPE-451](https://linear.app/spectranoir/issue/SPE-451/institutional-depth-bands-and-restricted-access) boundary rather than re-broadening this parent

This keeps the parent compact and gives future reconciliation work explicit landing zones.

- 2026-04-26T11:56:11.855Z
Reconciliation update

Implementation emphasis:

* some districts should act as sanctuary, surveillance zone, social experiment, and soft containment space at the same time, with protected minorities or anomalies both sheltered and pressured toward conformity
* lawful hospitality should therefore remain able to slide from refuge into monitored assimilation without open imprisonment.

This keeps protected enclaves and refuge-containment duality inside the hidden civic understructure boundary.

- 2026-04-25T10:28:18.291Z
Contradiction check

Implementation emphasis:

* guides should not be assumed truthful merely because they are victims if the intended frame expects desperation, damage, and self-interest to distort what they say while still leaving them narratively useful
* if current victim-guide handling still over-trusts harm as proof of reliability, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T10:28:18.261Z
Reconciliation update

Implementation emphasis:

* victim-guides may remain essential yet epistemically unstable, giving core facts through trauma, obsession, and corruption while still distorting motives, names, or causal models around those facts
* guide usefulness and guide truthfulness should therefore remain separate variables rather than one binary trust state

This concept stays inside that issue’s boundary.

- 2026-04-25T10:24:28.474Z
Contradiction check

Implementation emphasis:

* guides should not be assumed truthful merely because they are victims if the intended frame expects desperation, damage, and self-interest to distort what they say while still leaving them narratively useful
* if current victim-guide handling still over-trusts harm as proof of reliability, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T10:24:28.439Z
Reconciliation update

Implementation emphasis:

* victim-guides may remain essential yet epistemically unstable, providing core mission facts through trauma, corruption, obsession, or addled perception while still distorting names, motives, or cosmology around those facts
* guide usefulness and guide truthfulness should therefore remain separate surfaces rather than one binary trust state

This concept stays inside that issue’s boundary.

- 2026-04-25T10:04:01.951Z
Contradiction check

Implementation emphasis:

* anomaly allies should not be treated as harmless merely because they help if the intended frame allows them to be truthful in part, dangerous in part, and still one bad threshold away from involuntary hostile revelation
* if current helper logic still over-collapses usefulness into safety, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T10:04:01.919Z
Reconciliation update

Implementation emphasis:

* a true anomaly ally may still be a valid false suspect, with body size, diet, solitude, nocturnal routine, and origin all producing genuinely incriminating patterns even while the ally is helping against the main killer
* useful insiders may therefore tell the truth about the central threat while still withholding the most dangerous truth about themselves
* injury thresholds can also force involuntary revelation and immediate loss of control, turning the ally into a short-run hazard if combat pressure becomes too severe
* killing or exposing the wrong anomaly should remain able to create a false clean ending that suppresses symptoms briefly while preserving the real hostile pattern underneath

This concept stays inside that issue’s boundary.

- 2026-04-25T10:02:28.797Z
Contradiction check

Implementation emphasis:

* anomaly allies should not be treated as harmless merely because they help if the intended frame allows them to be truthful in part, dangerous in part, and still one bad threshold away from involuntary hostile revelation
* if current helper logic still over-collapses usefulness into safety, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T10:02:28.765Z
Reconciliation update

Implementation emphasis:

* a true anomaly ally may still be a valid false suspect, with body size, diet, solitude, nocturnal routine, and origin all producing genuinely incriminating patterns even while the ally is helping against the main killer
* useful insiders may therefore tell the truth about the central threat while still withholding the most dangerous truth about themselves
* injury thresholds can also force involuntary revelation and immediate loss of control, turning the ally into a short-run hazard if combat pressure becomes too severe

This concept stays inside that issue’s boundary.

- 2026-04-25T09:52:55.899Z
Contradiction check

Implementation emphasis:

* faction allies should not default to gratitude or moral clarity if the intended frame expects both major powers to exploit investigators, discard them when convenient, and turn on them after the shared objective is met
* if current ally handling still over-assumes clean reciprocity for tactical cooperation, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:52:55.866Z
Reconciliation update

Implementation emphasis:

* some support NPCs should remain emotionally attached yet not fully emancipated, allowing rescue-imprint bonds, nightly origin-reaffirmation rituals, curiosity-driven probing, and intimate nonlethal betrayal to coexist in one household role
* trusted intermediaries can therefore act as both genuine comfort and capture vector without reading as simple allegiance swaps

This concept stays inside that issue’s boundary.

- 2026-04-25T09:49:09.421Z
Contradiction check

Implementation emphasis:

* faction allies should not default to gratitude or moral clarity if the intended frame expects both major powers to exploit investigators, discard them when convenient, and turn on them after the immediate objective is met
* if current ally handling still over-assumes clean reward for tactical cooperation, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:49:09.219Z
Reconciliation update

Implementation emphasis:

* support NPCs may remain emotionally attached yet not fully emancipated, with rescue-imprint bonding, nightly secret returns to origin kin, or curiosity-driven social probing all functioning as incomplete loyalties rather than clean allegiance
* trusted intermediaries can therefore deliver intimate nonlethal betrayal through proximity, drugs, or emotional access instead of overt hostile role swap

This concept stays inside that issue’s boundary.

- 2026-04-25T09:47:45.934Z
Contradiction check

Implementation emphasis:

* support NPCs should not reveal their true alignment too early or too clearly if the intended frame expects credible partial aid, selective withholding, and delayed betrayal
* if current helper-role antagonists still read too transparently, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:47:45.896Z
Reconciliation update

Implementation emphasis:

* support-NPC betrayal should remain able to operate through selective aid, where a credible helper offers real healing, shelter, or knowledge while quietly refusing the one intervention that would truly break the antagonist’s plan
* helper-role antagonists may also weaponize immunities or staged body states to fake death convincingly and escape once pursuit slackens
* aligned support should therefore stay partially legible and strategically incomplete rather than transparently false from the start

This concept stays inside that issue’s boundary.

- 2026-04-24T15:46:34.418Z
Contradiction check

Implementation emphasis:

* anomaly spaces should not signal themselves too early if the intended frame relies on castles, inns, roads, bridges, and villages reading as ordinary first and hostile second
* if current site authoring still foregrounds the anomaly layer before the mundane layer has done any work, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T15:46:33.232Z
Reconciliation update

Implementation emphasis:

* hidden anomaly spaces should continue to be authored in two passes, with ordinary civic or travel function first and hostile, haunted, or ritual underlayers second
* urban tunnels, false tombs, crypts behind false walls, and owner-biased trap geometry should remain valid patterns for secret hostile infrastructure concealed beneath ordinary sacred or civic surfaces
* some lair defenses should be authored around the resident entity’s traversal mode so the owner bypasses the defense while ordinary intruders absorb it

This concept stays inside that issue’s boundary.

- 2026-04-24T15:30:42.476Z
Contradiction check

Implementation emphasis:

* architecture and circulation should not remain mere flavor if the intended frame expects buildings, elevation, and path networks to respond materially to local threat and ecology
* if settlement form still underreacts to persistent predator pressure or environmental hazard, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T15:30:42.397Z
Reconciliation update

Implementation emphasis:

* settlement architecture and circulation should continue to adapt directly to local threat ecology, producing elevated paths, stilts, suspended links, nightly routines, or restricted movement zones when persistent predators or hazards shape everyday life
* hidden undercity or parasitic value-seeking threats may coexist beneath a town defined by one dominant craft or commodity, letting prosperity attract covert predation without replacing the surface identity
* persistent nearby danger should remain able to organize civic form even when active breaches are currently rare, so background threat can still define housing, routes, and local legend quests

This concept stays inside that issue’s boundary.

- 2026-04-24T15:25:55.027Z
Reconciliation update

Implementation emphasis:

* city-originating jobs may terminate in nearby concealed offsite locations such as underwater buildings, hidden river structures, or similarly obscured facilities while still remaining part of the urban mission ecology
* hidden access may be telegraphed through subtle sensory clues such as drafts, smell shifts, candle behavior, or other low-intensity physical tells rather than overt search declarations only

This concept stays inside that issue’s boundary.

- 2026-04-24T12:56:59.605Z
Reconciliation update

Implementation emphasis:

* public sacred or civic spaces may reverse into coercive hidden-depth scenes, with temples, manors, or similar elite sites revealing sealed rooms, crypt routes, or controlled-capture infrastructure beneath ordinary social presentation
* present-day settlement activity may also sit directly over buried objectives, forcing retrieval logic to route through active civic surfaces, monuments, fountains, and public traffic rather than through isolated ruins

This concept stays inside that issue’s boundary.

- 2026-04-24T11:47:49.109Z
Reconciliation update

Implementation emphasis:

* settlements may host village-bound wilderness stewards whose authority, support, and obligations come from the local community rather than a distant hierarchy
* low-technology ritual operators can therefore remain socially embedded civic figures instead of roaming specialists only

This concept stays inside that issue’s boundary.

- 2026-04-23T07:22:48.838Z
Contradiction check

Implementation emphasis:

* monsters and nonhumans should not be ambient background if the intended frame introduces them mainly through singular encounters, distant lands, escape events, or hidden populations
* if current stocking logic still assumes routine background density, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T07:13:14.526Z
Reconciliation update

Implementation emphasis:

* monsters and nonhuman peoples should remain special-entry content introduced through import, escape, patron commission, distant lands, hidden communities, or singular encounters rather than ambient background density
* legal status, cultural assimilation, and visible ancestry should remain separable identity surfaces instead of collapsing into one ancestry flag

This concept stays inside that issue’s boundary.

- 2026-04-23T06:51:58.052Z
Reconciliation update

Implementation emphasis:

* ordinary civic or historical sites such as mills, roadsides, keeps, vats, or workshops should remain valid mission anchors once one strong complication is attached
* adventure seeding should therefore not depend on overtly anomalous ruins or dungeon spaces only

This concept stays inside that issue’s boundary.

- 2026-04-23T04:21:25.868Z
Contradiction check

Implementation emphasis:

* strongholds should not be treated as pure combat maps if they are also courts, treasuries, schools, prisons, markets, ritual centers, and homes with day-to-day service logic
* if current stronghold handling still overweights battle space and underweights civic function, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T04:21:25.602Z
Reconciliation update

Implementation emphasis:

* strongholds should be modeled as civic clusters combining fortress, court, prison, market anchor, school, religious center, and storage hub rather than as pure combat maps
* specialist archetypes such as wizard keeps, cathedral-core priest fortresses, terrain-retaining ranger forts, living-growth druid sites, subterranean dwarf citadels, living elven sanctuaries, hidden-footprint halfling holds, and coercive orc forts should remain overlay families that change labor policy, terrain use, symbolic center, and geometry without replacing the underlying site grammar
* reusable exemplar castle packets should continue to ship as concrete site templates, not only as abstract construction rules

This concept stays inside that issue’s boundary.

- 2026-04-23T04:07:49.274Z
Reconciliation update

Implementation emphasis:

* wrecks and derelicts should expose explicit integrity grades that communicate access, collapse risk, salvage promise, and likely current usefulness
* derelicts may become long-lived habitat shells whose current residents are ecologically unrelated to the original crew or cargo
* isolated salvage-lords may repurpose local dead into labor and defense while psychologically collapsing into territorial hoarding around one site

This concept stays inside that issue’s boundary.

- 2026-04-23T03:55:00.314Z
Reconciliation update

Implementation emphasis:

* captives may be hidden as petrified, transformed, or otherwise inert-looking environment objects inside ordinary rooms, storage, or structural features rather than obvious cells
* some detainees require body-state suppression because ordinary cages fail against alternate-form movement or escape capability

This concept stays inside that issue’s boundary.

- 2026-04-22T09:35:14.399Z
Reconciliation update

Fold civilian-venue abduction pipelines and urban bureaucratic pressure as encounter engines into this issue.

Implementation emphasis:

* inns, markets, or similar public fronts may conceal multi-step capture, transfer, cage, or feeding pipelines beneath ordinary service presentation
* urban encounters may be driven by law, curfew, checkpoints, registries, bureaucracy, and guild politics rather than wilderness threat only

This keeps nested abduction infrastructure and bureaucratic-urban encounter logic inside the mixed-surface civic understructure boundary.

- 2026-04-22T08:21:54.975Z
Reconciliation update

Fold official-versus-unofficial control layering in detention facilities into this issue.

Implementation emphasis:

* secure facilities may present formal procedures and overseers at the top while deeper zones develop inmate rulers, contraband hierarchies, monster residents, and decayed practical authority

This keeps dual-control detention-site logic inside the hidden civic understructure boundary.

- 2026-04-22T08:21:54.651Z
Reconciliation update

Fold unified undercity circulation and mixed official–criminal–monster encounter ecology into this issue.

Implementation emphasis:

* one continuous undercity may connect sewers, tunnels, civic buildings, cult spaces, guild zones, and monster-haunted routes instead of isolating each institution into a separate dungeon
* the same region-scale encounter ecology may surface officials, criminals, cultists, civilians, undead, or vermin through one shared movement network

This keeps unified undercity network logic and mixed-faction undercity encounter ecology inside the mixed-surface settlement boundary.

- 2026-04-22T06:11:41.388Z
Reconciliation update

Fold public-site to covert-lower-level layering and repeated institution archetypes with local variation into this issue.

Implementation emphasis:

* public civic sites such as schools, jails, guilds, theatres, or temples may conceal deeper operational or restricted layers beneath ordinary footprints
* institution archetypes can repeat across a region while still differing materially in their lower-level structure, route logic, and hidden depth

This keeps public-site hidden depth and institution-family variation inside the mixed-surface settlement boundary.

- 2026-04-19T10:07:14.385Z
Contradiction check

The current project should not assume habitation always requires an obvious built footprint.

Implementation emphasis:

* populated and governed territory may remain visually illegible to outsiders at settlement or landscape scale
* if current settlement logic still expects inhabited regions to read clearly through visible built form, that should be treated as a contradiction against concealed-habitation design

This keeps the contradiction check visible inside the hidden civic understructure boundary.

- 2026-04-19T10:05:35.788Z
Reconciliation update

Fold concealed-settlement regional presentation and low-footprint habitation assumptions into this issue.

Implementation emphasis:

* a realm may remain fully inhabited and politically active while presenting as near-wilderness or low-obviousness settlement surface to outsiders
* public footprint and actual habitation density should therefore be allowed to diverge at landscape scale, not only within one town's understructure

This keeps concealed regional habitation and low-obviousness settlement presentation inside the hidden civic understructure boundary.

- 2026-04-18T10:34:53.598Z
Reconciliation update

Fold mixed-surface civic mapping and hidden civic institutions into this issue.

Implementation emphasis:

* some settlements may present a modest surface shell while major habitation, storage, temples, foundries, or support routes live beneath or around the public footprint
* key civic nodes may be intentionally omitted from ordinary maps and only discovered through trust, insider access, or investigation

This keeps mixed-surface habitation and concealed civic-node discovery inside the hidden civic understructure boundary.

- 2026-04-18T08:33:30.752Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/154). All replies are displayed in both locations.

---

## SPE-174 - Institution records, calendars, and affiliated orders
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 3
- Labels: simulation, system, core-loop
- Created: 2026-04-18T11:47:14.622Z
- Updated: 2026-04-28T11:42:37.826Z

### Description
Goal:  
Implement the institution schema so religions, orders, cults, and similar bodies can be authored through one repeatable operational format instead of prose-only definitions.

Scope:

* support institution profiles covering doctrine, calendar, routine behavior, visual identity, permissions, major centers, suborders, and capability packages
* support umbrella institutions with rival sects, doctrinal schisms, regional branches, and semi-autonomous affiliated orders
* support calendars that shape presence, availability, crowding, morale, and event timing through daily rites and observances
* support public schooling, magical education, continuing study, and public ritual constraints where those belong to institution behavior
* support mobile clergy, concealed worship infrastructure, wandering sacred authority, and institution portability across distant or environment-separated domains
* preserve symbolic-versus-operational leadership splits where charisma and practical command belong to different offices

Constraints:

* deterministic only
* no full theology simulator
* no monolithic one-faith-one-voice assumption for large institutions
* prefer compact profile fields and linked branch/order records over sprawling narrative prose
* keep institution differences legible enough for downstream system use and authoring review

Acceptance criteria:

* at least one institution uses a repeatable schema covering doctrine, calendar, identity, and permissions
* at least one umbrella institution contains competing or divergent internal branches
* at least one affiliated order operates semi-autonomously under a parent institution
* at least one calendar event changes downstream availability or behavior deterministically
* targeted tests cover deterministic profile loading, branch linkage, affiliated-order handling, and calendar-driven effects

### Relations
_No relations_

### Comments
- 2026-04-28T11:42:37.834Z
Reconciliation update

Implementation emphasis:

* schools and comparable institutions should remain able to answer repeated anomaly or death history through schedule preservation, order maintenance, and event continuity rather than immediate causal investigation or full shutdown
* prior-disaster accumulation may therefore normalize dysfunction, lowering shock response and preserving routine calendars even when the institution has become obviously unsafe by outside standards
* public performance events should also remain valid institution-calendar outputs whose rehearsal, staging, and attendance structures materially reshape presence and vulnerability for a short window

This keeps order-first institutional denial, disaster normalization, and event-calendar vulnerability spikes inside the institution-schema boundary.

- 2026-04-27T01:32:08.342Z
Reconciliation update

Implementation emphasis:

* plans should carry formal metadata for approval, distribution, revision, and maintenance triggers, with review events caused by leadership change, legal change, capability change, demographic shift, exercise results, or major incidents
* publication should also be followed by socialization, training, and operator-facing quick-reference outputs rather than treated as an archival endpoint.

This keeps plan metadata, maintenance triggers, and post-release socialization inside the institution records and calendar boundary.

- 2026-04-25T09:39:51.562Z
Contradiction check

Implementation emphasis:

* secret factions should not remain too static across long timelines if the intended frame expects splits, defections, corruption, successor orders, and long-horizon mutation under pressure
* if current clandestine organizations still read as overly stable through centuries of occult conflict, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-25T09:39:51.520Z
Reconciliation update

Implementation emphasis:

* occult politics should remain an ecosystem of resistance cells, dark cabals, mirror-orders, splinter factions, infiltrated institutions, and successor groups rather than one permanently coherent master conspiracy
* benevolent resistance networks may fragment under pressure, corruption, infiltration, and historical defeat, producing rival or partially compromised descendants instead of one eternal alliance
* reformist or benevolent institutions may also generate hostile mirror-orders that retain the same structure while reversing purpose

This concept stays inside that issue’s boundary.

- 2026-04-24T16:17:52.242Z
Reconciliation update

Implementation emphasis:

* secret societies should be authorable through a repeatable schema of symbol, membership type, history, methods, and stance toward the main anomaly pressure or its opposition
* trusted institutions may host parasite pipelines that recruit, compartmentalize, test, and quietly eliminate failed prospects while preserving a legitimate public face
* benevolent performer networks should remain valid covert-aid structures with unusually broad civilian access rather than being forced into priestly or military cover only

This concept stays inside that issue’s boundary.

- 2026-04-24T15:46:33.648Z
Reconciliation update

Implementation emphasis:

* public dedications of bridges, gates, or other civic works may conceal occult payloads such as surveillance, warding, or city-scale monitoring effects anchored into the infrastructure itself
* rites and processions should remain high-density information meshes where music, dance, obligation, gossip, and covert action coincide rather than separate event systems

This concept stays inside that issue’s boundary.

- 2026-04-24T15:43:29.937Z
Reconciliation update

Implementation emphasis:

* pantheon distribution, deity portfolio basis, creation myths, historical eras, and current conflicts should remain scenario engines rather than flavor-only backdrops
* present tensions should continue to emerge from ancient history, middle history, and current events in sequence, with mythic and arcanological history acting as parallel causal layers rather than decorative lore
* campaign customization should also support temporary style-shift overlays such as intrigue, heist, frontier, or scandal emphasis without requiring a fresh worldbuild each time

This concept stays inside that issue’s boundary.

- 2026-04-24T15:32:19.936Z
Reconciliation update

Implementation emphasis:

* institution schema should support academy-style admission, aptitude testing, interviews, fees, staged progression, and standardized curriculum modules rather than treating specialist education as pure lore
* curriculum packets can include physical training, theory, meditation, transcription, practicum, formula analysis, and laboratory work as reusable institutional modules
* affiliated-order libraries should remain broad enough to model lobbying groups, purists, monster-intelligence societies, planar traveler networks, and other specialist organizations under the same schema

This concept stays inside that issue’s boundary.

- 2026-04-24T12:00:38.983Z
Reconciliation update

Implementation emphasis:

* cults and occult organizations may be authored through repeatable matrices covering public face, hidden structure, recruitment promises, corruption vectors, agendas, and influence domains rather than loose prose only
* institutions should therefore support both overt organizations and hidden cells using the same core schema with different secrecy and social-reach assumptions

This concept stays inside that issue’s boundary.

- 2026-04-24T11:55:57.671Z
Reconciliation update

Implementation emphasis:

* organizations and cults should be authorable through repeatable schema fields such as rationale, history, public face, hidden structure, and influence vectors rather than ad hoc prose only
* cult recruitment, promises, corruption, and agenda can then be layered on top of that same organizational kernel instead of requiring a separate ontology each time

This concept stays inside that issue’s boundary.

- 2026-04-23T07:29:21.842Z
Reconciliation update

Implementation emphasis:

* focused contact with a local resident should be able to extract a compressed read of laws, courtesies, taboos, and protocol without replacing deeper language or faction systems
* this remains a bounded settlement-handling surface for wilderness or expedition operators entering unfamiliar communities

This concept stays inside that issue’s boundary.

- 2026-04-23T07:27:36.158Z
Reconciliation update

Implementation emphasis:

* field operators may use focused contact to extract a compressed read of local laws, courtesies, taboos, and similar settlement protocol from one resident rather than learning a whole culture abstractly
* this should remain a bounded social-intelligence surface that improves community handling without replacing deeper relationship or language systems

This concept stays inside that issue’s boundary.

- 2026-04-23T07:01:17.978Z
Contradiction check

Implementation emphasis:

* social simulation should not assume flat public access if citizenship, gender, status, and city identity are meant to gate assemblies, courts, professions, and public honor in some profiles
* if current public-space handling still ignores those status gates too often, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T07:01:17.726Z
Reconciliation update

Implementation emphasis:

* public institutions such as courts, assemblies, gymnasia, harbors, and civic religious offices should remain first-class scenario generators rather than background scenery only
* named social and domestic spaces may switch behavior rules by mode, with participation, gender, status, and civic identity shaping what actions are permitted inside each environment
* visible markers such as uniform, emblem, and public role-signaling should continue to alter access and reaction inside those institutional spaces

This concept stays inside that issue’s boundary.

- 2026-04-23T05:17:06.438Z
Contradiction check

Implementation emphasis:

* nonhuman factions should not remain religion-thin if their gods, myths, priesthoods, and creator histories are supposed to shape hierarchy, self-conception, and hostility patterns from inside the culture
* if current nonhuman groups still read as belief-light ecological enemies, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T05:17:06.383Z
Contradiction check

Implementation emphasis:

* shaman-like or spirit-intermediary roles should not be flattened into ordinary priest equivalents if their social position, power profile, and operational conditions are meant to differ materially
* if current spirit-mediating roles still read as generic cleric clones, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T05:17:06.197Z
Reconciliation update

Implementation emphasis:

* spirit-intermediary offices should remain distinct from ordinary priests, with community mediation, ancestor or spirit negotiation, narrower authority, and different resource or hardship assumptions
* low-resource, marginal, or isolated office conditions may be part of the role definition itself rather than an incidental biography note

This concept stays inside that issue’s boundary.

- 2026-04-23T05:17:06.004Z
Reconciliation update

Implementation emphasis:

* priesthood access should remain entity-specific, with bespoke gates for race, alignment, class background, behavior, office qualifications, apparel, armor, weapons, and symbol permissions rather than one universal ordained track
* granted powers should remain separate from ordinary spell access and unlock through sponsorship, role, or office status instead of generic list access alone
* species- and faction-scoped pantheon packets should support overlap, conflict, selective borrowing, and partial syncretism instead of one universal doctrine layer
* creator-line or divine-lineage splits can justify subgroup divergence, inherited favor or disfavor, and durable interspecies hostility beyond present-day politics only

This concept stays inside that issue’s boundary.

- 2026-04-23T05:13:10.795Z
Contradiction check

Implementation emphasis:

* nonhuman factions should not remain religion-thin if their myths, priesthoods, and creator histories are meant to shape hierarchy, hostility, and culture from the inside
* if current nonhuman groups still read as belief-light ecological enemies, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T05:13:10.764Z
Contradiction check

Implementation emphasis:

* spirit-intermediary offices should not be flattened into ordinary priests if their authority, social position, and mediated relationship to ancestors or local spirits are meant to differ materially
* if current shaman-like roles still read as generic cleric equivalents, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T05:13:10.423Z
Reconciliation update

Implementation emphasis:

* deity- or institution-specific priesthoods should be gated by bespoke conditions such as race, alignment, class background, behavior, apparel, weapons, or office expectations rather than one universal career ladder
* granted powers should remain distinct from ordinary spell access and unlock through sponsorship, role status, and office progression rather than just broad ability lists
* nonhuman priesthoods, shamans, and related offices may exist primarily as NPC institutions that structure faction behavior rather than broadening player build space by default
* species- or culture-scoped pantheon packets should coexist, conflict, borrow, or partially syncretize without collapsing into one universal doctrine layer
* creator-line, subrace, and cultural divergences may be authored through associated divine lineages, inherited favor, disfavor, or mythic schism rather than pure present-day politics

This concept stays inside that issue’s boundary.

- 2026-04-23T03:55:00.546Z
Contradiction check

Implementation emphasis:

* public religious sites should not default to passive healing hubs if the same institution can also be a bank, archive, anti-scry complex, forum, and controlled-offering system
* if current temple logic is still too narrow, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T03:54:59.282Z
Reconciliation update

Implementation emphasis:

* temple-like institutions may simultaneously operate as worship space, market, public forum, archive, and secure deposit institution rather than a narrow healing-service node
* recurring collection schedules and designated custodians should govern how public offerings move from exposed surfaces into institutional custody without requiring those surfaces to be hidden from the public entirely

This concept stays inside that issue’s boundary.

- 2026-04-23T03:51:02.774Z
Contradiction check

Implementation emphasis:

* public religious sites should not default to passive healing hubs if the institution surface is also carrying banking, archive security, anti-scry rooms, donation custody, and civic forum behavior
* if temple logic is still too narrow, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T03:51:02.283Z
Reconciliation update

Implementation emphasis:

* temple-like institutions should support hybrid civic roles including worship, debate, storage, archive, banking, and controlled donation handling under one institutional profile
* institution calendars, collection schedules, and affiliated staff custody loops should drive when public-offering surfaces are emptied, who may touch them safely, and how ritual or service spaces change over time

This concept stays inside that issue’s boundary.

- 2026-04-19T22:04:55.111Z
Reconciliation update

Fold institution portability metadata across distant or environment-separated domains into this issue.

Implementation emphasis:

* institutions, faiths, or orders may remain fully valid, partially degraded, or unrecognized depending on the region or world they operate in
* portability should therefore be authorable as metadata about operational reach and recognition rather than assumed universal continuity

This keeps institution portability inside the institution-schema boundary.

- 2026-04-19T10:07:14.296Z
Contradiction check

The current project should not assume religious infrastructure defaults to permanent visible temples.

Implementation emphasis:

* hidden shrines, seasonal ritual sites, and wandering clergy may be the primary sacred infrastructure in some regions
* if current worship modeling still assumes open permanent temple grids as the normal case, that should be treated as a contradiction to correct deliberately

This keeps the contradiction check visible inside the institution-schema boundary.

- 2026-04-19T10:05:15.712Z
Reconciliation update

Fold mobile theocratic enforcement, concealed worship infrastructure, and wandering sacred authority into this issue.

Implementation emphasis:

* clergy may operate as mobile judges, recruiters, blessers, and intimidators without requiring fixed civic office
* sacred infrastructure may include hidden shrines, wandering sites, and seasonal activation patterns rather than visible permanent temple grids only
* religious authority should therefore remain operational even when public temple presence is suppressed or dispersed

This keeps wandering-clergy power and concealed worship infrastructure inside the institution-schema boundary.

- 2026-04-18T11:47:15.640Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/176). All replies are displayed in both locations.

---

## SPE-71 - Preplaced site trigger families
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 4
- Labels: simulation, system, core-loop
- Created: 2026-04-15T07:22:58.961Z
- Updated: 2026-04-27T08:19:56.184Z

### Description
Goal:  
Implement bounded preplaced site trigger families so delayed or conditional site-state effects can change later operations without bespoke scripting for every room.

Scope:

* support preplaced and conditionally triggered effects such as alarms, delayed blasts, sealed responses, trap glyphs, persistent site fields, and comparable reusable trigger families
* support clue-first, misleading-first, or escalating outcomes instead of immediate damage only when the trigger family is activated
* distinguish trigger-family behavior from the child surfaces for deceptive topology and weird-room local rule overrides
* keep this parent focused on reusable trigger packages and activation semantics rather than broader route deception or room-scoped reality shifts
* connect the trigger-family shell to child issues that own false-route behavior and local-space rule overrides

Constraints:

* deterministic only
* no full immersive-sim room-logic rewrite
* no purely ornamental weirdness with no operational effect
* prefer reusable trigger families over bespoke one-off room scripts
* reuse existing site, hazard, routing, and hidden-state infrastructure where possible

Acceptance criteria:

* at least one site supports a delayed or conditional preplaced effect that changes later operations
* at least one trigger family produces clue-first, misleading-first, or escalating outcomes before full understanding
* trigger-family behavior remains separable from deceptive-topology handling and weird-room state logic in the child issues
* reusable trigger semantics are legible enough for authoring and debugging review
* targeted tests or validation examples cover deterministic trigger timing, activation conditions, and downstream outcome changes

### Relations
- related: SPE-765 Anomalous route graphs and misrouting
- blocks: SPE-300 Puzzle-Gated Encounter Openings
- blocks: SPE-519 Architectural Actors with Access Motives

### Comments
- 2026-04-27T06:21:50.682Z
Superseding note

The earlier closure-audit comment that described this issue as still owning three distinct surfaces is now outdated.

Current read after the split:

* this parent owns reusable preplaced trigger families only
* deceptive topology now lives on [SPE-814](https://linear.app/spectranoir/issue/SPE-814/deceptive-topology-and-false-route-states)
* weird-room state and local rule overrides now live on [SPE-815](https://linear.app/spectranoir/issue/SPE-815/weird-room-state-and-local-rule-overrides)

Interpretation:

* keep using the newer routing note and the child structure as the source of truth for scope
* do not treat the old closure-audit comment as current scope guidance

- 2026-04-26T14:02:00.194Z
Parent/child split update

Routing note:

* keep this parent focused on reusable preplaced trigger families and conditional site-state effects
* route false routes, false depth, hidden lifts, and misleading transition logic to [SPE-814](https://linear.app/spectranoir/issue/SPE-814/deceptive-topology-and-false-route-states)
* route room-scoped local rule overrides, weird-room escalation, reveal-state drift, and bounded local-space behavior to [SPE-815](https://linear.app/spectranoir/issue/SPE-815/weird-room-state-and-local-rule-overrides)
* route broader anomalous route-law behavior to [SPE-765](https://linear.app/spectranoir/issue/SPE-765/anomalous-route-graphs-and-misrouting) rather than re-broadening this parent

This keeps the parent compact and gives future reconciliation work explicit landing zones.

- 2026-04-23T05:57:58.115Z
Closure audit update

Current read:

* this remains the broadest unresolved parent in the watchlist
* even after rewrite, it still owns three distinct surfaces: preplaced trigger families, deceptive topology, and weird-room state logic
* it is not closure-ready unless those surfaces are proven to share bounded site-state machinery rather than a pile of unrelated room scripts
* if future work clusters around one subtype only, split children instead of continuing to absorb unrelated reconciliation scope here

Recommendation:

* keep open
* treat this as a bounded parent for shared site-state patterns
* require explicit evidence of reusable trigger logic and reusable deceptive-state handling before closure

- 2026-04-22T09:26:17.192Z
Reconciliation update

Fold broad liquid neutralization, concentration-based environmental ignition, and item-based temporary perception or detection logic into this issue.

Implementation emphasis:

* some reagents may neutralize many liquid classes while still allowing liquid-specific aftermath
* handheld ignition sources may convert concentration time into environmental fire-starting while exposing the user to vulnerability during use
* small site artifacts or relics may also function as narrow detector tools, not only direct weapons or containers

This keeps cross-liquid neutralization, concentration ignition, and narrow detector artifacts inside the environmental-item boundary.

- 2026-04-22T09:10:43.679Z
Reconciliation update

Fold threshold-triggered elemental fire suppression, delayed-input healing conversion, and broad liquid neutralization into this issue.

Implementation emphasis:

* some site assets or small relic systems may automatically suppress fire only after a blaze exceeds a defined threshold
* containers may convert common water into healing charges after a waiting period with finite lifetime use count
* neutralization reagents may apply one broad 'neutralized' state across many liquid types while still allowing liquid-specific downstream outcomes

This keeps threshold-triggered suppression, delayed-input conversion, and cross-liquid neutralization inside the weird-space and environmental-item boundary.

- 2026-04-22T08:51:57.819Z
Reconciliation update

Fold local temporary reality edits, illusion-to-reality bleed, emotion-driven weather, local aura-driven mood rewrite, fear externalization, greed compulsion landmarks, and time-based growth fields into this issue.

Implementation emphasis:

* some sites may impose highly local temporary reality edits, make unreal constructs briefly consequential, or rewrite weather from nearby emotional state
* places may alter speech, hostility, greed, fear projection, or body scale through passive aura rather than direct caster action
* these effects should remain tightly bounded by place and duration rather than general global power

This keeps local place-effects, fear and greed externalization, and site-bound body or mood rewrites inside the weird-space boundary.

- 2026-04-22T06:11:42.503Z
Reconciliation update

Fold map-metadata-first site authoring and shared symbol-language reuse into this issue.

Implementation emphasis:

* some site content should be stored primarily as map metadata, legend symbols, and route annotations rather than keyed prose for every feature
* one shared symbol vocabulary may operate across many map assets and scales without losing local identity

This keeps map-metadata-first authoring and shared symbol reuse inside the weird-space and preplaced-effects boundary.

- 2026-04-22T05:50:14.245Z
Reconciliation update

Fold fire-state eligibility, selective sub-targeting inside one area, post-cast tuning, and early termination actions for maintained environmental effects into this issue.

Implementation emphasis:

* environmental fire control should distinguish ordinary flame from magical or creature-based fire states
* area effects may allow selective targeting of any or all eligible sub-objects rather than one all-or-nothing resolution
* some maintained effects may be retuned by gesture or equivalent input after casting instead of locking all parameters at creation
* sustained spells may include deliberate hard-stop actions that exchange persistence for a stronger terminal outcome

This keeps fire-state taxonomy, selective area sub-targeting, post-cast tuning, and early termination inside the weird-space and preplaced-effects boundary.

- 2026-04-22T05:43:29.135Z
Reconciliation update

Fold trap metadata-first generation, advanced lethal hazard layering, and loot-container lock or trap inheritance into this issue.

Implementation emphasis:

* trap authoring should begin from visibility, accessibility, lethality, and difficulty before selecting effect family
* lethal hazards may support delayed kill, ongoing injury, elemental analogs, layered pit features, and escape-denial structures instead of one flat damage packet
* treasure containers should inherit lock and trap state as part of reward generation rather than defaulting to passive storage

This keeps trap metadata, layered lethal hazard design, and trapped container inheritance inside the preplaced-effects and trick framework.

- 2026-04-18T10:54:56.802Z
Reconciliation update

Fold fixture-disguised predators, decor-triggered hypnosis, repeated false-door misroutes, sloped-floor relocations, and intelligent room-filling barriers into this issue.

Implementation emphasis:

* predators may present as architectural fixtures or themed decor, with room aesthetics priming the party to misread the threat until it acts
* visual room presentation itself may impose pre-combat influence or control effects before any explicit monster attack is recognized
* route deception may use repeated false-door patterns, one-way discoverability, rotating rooms, deceptive controls, or geometric relocation through slope or slide traps instead of one-off chest/floorplate logic only
* room-filling barriers may remain intelligent, negotiable, and bypassable through several channels rather than functioning as dumb gas or damage walls
* corridor hazards may saturate full passage volumes with poison, gas, darts, or moving walls while also responding differently to specific utility abilities where relevant

This keeps fixture camouflage, decor-triggered control, route deception, forced relocation, intelligent barriers, and distributed corridor hazards inside the weird-space boundary.

- 2026-04-18T10:42:02.765Z
Reconciliation update

Fold sentient temples and structural false-site illusions into this issue.

Implementation emphasis:

* buildings may function as active defenders that scream, warn select insiders, lock or unlock doors, collapse sections, emit electrical discharge, or cast as a high-tier ritual actor rather than acting as passive scenery only
* illusions may operate at architectural scale, projecting false walls, doors, guards, monsters, or even an entire temple presentation rather than isolated visual props

This keeps sentient building defense and architectural-scale illusion surfaces inside the weird-space boundary.

- 2026-04-18T10:34:53.456Z
Reconciliation update

Fold fixture-embedded speaking entities, limited-query oracle devices, passive ecological suppression stockpiles, and periodic relocation objects into this issue.

Implementation emphasis:

* environmental fixtures such as fountains, tables, pillars, or similar landscape objects may host concealed advisory entities or answer systems without functioning like ordinary loot or NPCs
* some oracle devices may answer only one question per actor per day while wrapping the useful answer in distracting or irrelevant output rather than clean certainty
* passive stockpiles or dormant relics may suppress nearby ecological growth or alter ambient behavior without overt activation
* some objects may relocate on very long periodic cycles, creating slow-moving state changes instead of tactical mobility only

This keeps low-agency ambient relic behavior, fixture-embedded speakers, bounded oracle devices, passive suppression objects, and periodic relocation inside the weird-space boundary.

- 2026-04-18T03:34:28.963Z
Reconciliation update

Fold volatile fuel rooms, time-driven optical kill zones, and room-scale consumable weather states into this issue.

Implementation emphasis:

* some rooms may enter catastrophic state if open flame or similar ordinary action is used near volatile stores, causing explosion and structural collapse rather than local damage only
* hazard geometry may shift across the room with sunlight angle or time-of-day instead of remaining fixed once authored
* consumables may instantiate chamber-scale weather or particulate states rather than only point-target effects

This keeps catastrophic room states, temporal hazard geometry, and room-scale consumable environment effects inside the weird-space boundary.

- 2026-04-18T03:26:38.376Z
Reconciliation update

Fold flammable-room catastrophe, time-driven optical kill zones, room-scale consumable storms, and flooded-room affordance shifts into this issue.

Implementation emphasis:

* some rooms may hold volatile environmental state where ordinary flame or light use triggers explosion and structural collapse rather than local damage only
* hazard geometry may shift with sunlight or time-of-day, moving the lethal zone instead of remaining a fixed trap tile
* consumables may instantiate chamber-scale weather or particulate states rather than only point-target effects
* flooded or water-coated rooms may change footing, search, visibility, access, and hazard interpretation all at once rather than adding one flat penalty only

This keeps catastrophic room states, temporal hazard geometry, chamber-scale consumables, and flooded-room interaction shifts inside the weird-space boundary.

- 2026-04-18T03:24:47.569Z
Reconciliation update

Fold flooded-room affordance shifts and progressive immersion paralysis into this issue.

Implementation emphasis:

* water-coated or flooded rooms may alter doors, search, footing, visibility, hazard reading, and access all at once rather than behaving like ordinary dry rooms with one added penalty
* immersion hazards may disable body regions progressively over time rather than applying one instant full-body paralysis, with terminal thresholds when full immersion persists

This keeps flooded-room interaction state and staged immersion-hazard progression inside the weird-space boundary.

- 2026-04-18T03:14:01.845Z
Reconciliation update

Fold guardian-bound visible treasure, containment-door releases, first-entry stasis rooms, grouped-container risk logic, false-treasure room scripts, oracle vapor mediation, cumulative-trigger traversal traps, theatrical relocation trap endpoints, and debris-to-hostile emergence into this issue.

Implementation emphasis:

* obvious reward objects may be mounted directly on guardians so extraction itself becomes the activation condition
* sealed rooms and doors may function as containment state for dormant hostile populations, with breach itself acting as the wake trigger
* some rooms may preserve bodies, clues, or local state under stasis until first disturbance, then permanently enter ordinary runtime
* grouped containers may distribute explosive or hostile outcomes across a set dynamically rather than assigning one fixed trapped box forever
* decoy reward rooms should support stacked misdirection such as fake valuables, taunting audio, forced darkness, and real lethal payloads in one bounded script
* mediated oracles may project a false speaking source through vapor, acoustics, or hidden operator position rather than through an overt device only
* traversal traps may accumulate trigger pressure through traffic count or actor size instead of one flat activation chance
* relocation traps may throw victims to exposed, falling, or otherwise theatrical destinations rather than only to hidden interior cells
* ordinary debris, clutter, or room dressing may conceal a delayed hostile emergence state instead of reading as obvious monster concealment

This keeps multi-stage room tricks, delayed releases, grouped risk logic, stasis breaks, and theatrical trap payloads inside the weird-space boundary.

- 2026-04-18T03:08:08.709Z
Reconciliation update

Fold heat-signature terrain ignition and layered physical-trap payloads into this issue.

Implementation emphasis:

* some terrain should ignite from body heat or other signature presence rather than direct interaction alone, with resulting fire or energy states persisting long after the initial trigger
* physical traps may layer poison, slowing agents, or other secondary chemical or anomalous payloads on top of impact or impalement instead of ending at raw physical damage only
* embedded relics or fossil nodes may function simultaneously as hazard triggers and as later resource or salvage objects once safely handled

This keeps heat-triggered terrain, secondary trap payloads, and embedded hazard-resource nodes inside the weird-space and trap composition boundary.

- 2026-04-18T03:08:08.599Z
Reconciliation update

Fold mediated oracle vapor channels and bodily-presence-operated mechanisms into this issue.

Implementation emphasis:

* some oracle devices may speak through environmental media such as vapors or acoustically redirected chambers while the true operator remains hidden nearby
* some doors or mechanisms should validate a living seated or anchored body rather than allowing remote activation, making physical presence itself part of the key

This keeps false-source oracle channels and living-body activation semantics inside the weird-space boundary.

- 2026-04-18T03:08:08.143Z
Reconciliation update

Fold guardian-bound visible treasure, containment-door releases, grouped-container risk logic, first-entry stasis break, false-treasure rooms, colony retaliation hazards, cumulative-trigger traversal traps, theatrical relocation endpoints, disguised debris emergence, and movement-triggered secondary cache reveals into this issue.

Implementation emphasis:

* obvious reward objects may be mounted directly on guardians or other active fixtures so extraction is itself the trigger
* sealed rooms and grouped containers may bind dormant hostiles or explosive outcomes to the act of breach or to the final unopened choice rather than using one fixed trapped object only
* rooms may preserve bodies or state in stasis until first disturbance, then permanently transition into ordinary runtime
* decoy treasure spaces should support stacked misdirection such as fake valuables, taunting audio, forced darkness, and a real lethal payload in one bounded script
* colony hazards may combine passive environmental danger with active retaliation when disturbed
* traversal traps may accumulate pressure through repeated crossings, creature size, or traffic volume rather than one flat trigger chance
* relocation traps may throw victims to theatrical, exposed, or fall-risk destinations rather than only to hidden interior cells
* ordinary debris, clutter, or furnishings may incubate delayed hostile emergence after a short reveal delay
* moving a high-value object may reveal both a concealed guardian and a second-layer reward cache beneath it

This keeps multi-stage room tricks, delayed releases, dynamic container risk, first-entry state breaks, and theatrical trap payloads inside the weird-space boundary.

- 2026-04-18T00:17:40.253Z
Reconciliation update

Fold sound-triggered bridge ambushes, timed topology-shift trap rooms, dwell-time curse escalation, modality-specific flora hazards, staged looping illusion hazards, and concealed subzone webs into this issue.

Implementation emphasis:

* hidden hazard actors may key off traversal sound on a specific structure and respond after a short delay rather than direct line of sight only
* trap spaces may coordinate sealed retreat, retracting traversal surfaces, and hidden exits as one multi-stage topology event rather than one-step failure
* observer populations or site fixtures may apply escalating noncombat effects based on dwell time inside the space rather than immediate trigger alone
* environmental objects may support different hazard channels by interaction mode such as smelling, tasting, close examination, or disturbance rather than one generic inspect result
* false work scenes may loop through staged progress toward a blinding or otherwise active hazard unless bypassed or interrupted
* soft partitions and similar concealed subzones may hide real restraint or hazard volume behind apparently non-solid boundaries

This keeps sound-triggered hazard response, multi-stage topology traps, time-in-room curse cadence, modality-specific environmental hazards, staged illusion loops, and concealed hazard subzones inside the preplaced-effects boundary.

- 2026-04-18T00:03:13.288Z
Reconciliation update

Fold zone-scale illusion shells, layered hidden actors inside false scenes, decor-to-hostile conversion, delayed guardian release, passive watcher statues, and special-web variants into this issue.

Implementation emphasis:

* local spaces may carry persistent false-environment shells that rewrite the whole scene presentation until disrupted or pierced
* false scenes may hide multiple actors with different reveal thresholds, response scripts, and escalation timing once the shell breaks
* decorative fixtures such as statues, gargoyles, tapestries, or figureheads may convert into runtime defenders on touch, climb, phrase, or delayed incantation triggers
* remote watcher fixtures may observe without moving or attacking directly
* web systems may support material overrides, altar-linked auto-restraint, or other variant behaviors beyond ordinary flammable hazard webs

This keeps false-environment shells, layered illusion encounters, decor-conversion triggers, delayed guardian release, watcher proxies, and special-web behavior inside the preplaced-effects boundary.

- 2026-04-17T23:52:59.188Z
Reconciliation update

Fold passive watcher statues, displacement-triggered room lockdowns, container-triggered floor collapse, bound-hostile release containers, and intoxicant debuff consumables into this issue.

Implementation emphasis:

* decorative fixtures may function as passive remote watcher proxies without moving or attacking directly
* high-value objects may trigger room-scale lockdown or broad floor-failure effects when displaced or opened, so trap scope need not stay container-local
* containers may hold bound hostile entities that are released by opening or mishandling rather than through ordinary spawn placement
* environmental consumables may apply noisy intoxication, clumsiness, or motor-control penalties rather than only healing or direct harm

This keeps passive watchers, room-scale displacement traps, released-bound-hostile containers, and intoxicant environment effects inside the preplaced-effects boundary.

- 2026-04-17T23:26:58.218Z
Reconciliation update

Fold repeating warning proxies, false-cache reset fixtures, airborne incapacitant hazards, door-conditioned hazard rooms, overgrowth volumes, fall-to-immersion trap chains, and dormant asset guardians into this issue.

Implementation emphasis:

* site fixtures may bind trigger zones to reusable proxy announcers, recorded warnings, or other repeating response entities without requiring an active operator
* false caches may present visible value, collapse on direct disturbance, and later regenerate on timed reset as site-side deceptive fixtures rather than ordinary containers
* bottled or room-scale airborne agents should support nonlethal behavioral impairment, involuntary noise generation, and alert spillover rather than damage-only gas logic
* environmental hazards may depend on door, vent, airflow, or enclosure state while remaining architectural rather than overtly anomalous in source
* dense overgrowth or fungal volumes may combine movement penalty, visibility loss, spore response, and unsafe sampling inside one hazard packet
* vertical trap chains may continue beyond impact into immersion, encumbrance, cold exposure, and later recovery burden rather than ending at fall damage only
* protected assets may bind dormant guardian activation to disturbance of treasure, samples, or other watched objects

This keeps repeating proxies, resettable false assets, nonlethal airborne hazards, door-conditioned hazard rooms, overgrowth volumes, multi-stage fall traps, and disturbance-triggered guardians inside the preplaced-effects boundary.

- 2026-04-17T23:23:11.883Z
Reconciliation update

Fold interaction-surface trigger taxonomy, directional trap origin rules, and deferred hazard onset into this issue.

Implementation emphasis:

* preplaced effects should distinguish trigger surfaces such as viewing, touching, opening, looting, proximity, and rough investigation rather than treating all hostile effects as attack actions
* trap packages should support explicit origin points and directional delivery such as front-fired, top-fired, bottom-fired, wall-fired, container-internal, or forward-opening mechanics tied to the interaction context
* some effects should arm on one step and resolve later, allowing delayed blasts, delayed regeneration start, and other deferred-onset behaviors instead of assuming immediate application only

This keeps broad trigger surfaces, directional trap origins, and delayed-onset hazards inside the preplaced-effects boundary.

- 2026-04-15T08:43:25.630Z
Reconciliation update

Fold lazy procedural geometry families, topology-aware exits, search-with-risk hidden routes, depth-sensitive topology shifts, embedded subfeatures, environmental anomaly nodes, and generator sanity checks into this issue.

Implementation emphasis:

* procedural site generation should distinguish geometry families such as passages, turns, doors, chambers, exits, and vertical transitions rather than using one universal layout roll
* connectivity should respect room scale, prior mapped state, and fit-to-bounds correction so impossible outputs are corrected through explicit generator safeguards
* hidden-route searches should be costed actions with interruption or wandering-pressure risk rather than free passive discovery
* topology can shift by depth or context from structured architecture to irregular natural space, with embedded subfeatures such as pools, lakes, or anomaly wells carrying their own risk or reward behavior
* environmental anomaly nodes may evaluate actor profile, grant conditional boons, alter state, or transport actors elsewhere while staying inside the same bounded weird-space framework

This keeps lazy geometry generation, environmental nodes, and generator sanity checks inside the preplaced-effects and weird-space boundary.

- 2026-04-15T07:23:00.679Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/71). All replies are displayed in both locations.

---

## SPE-106 - Aggregate Battle Units & Routed Morale States
- Team: SpectraNoir
- Project: Containment Protocol
- Status: In Review
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-18T00:39:41.147Z
- Updated: 2026-04-28T11:57:09.267Z

### Description
Goal:  
Implement a bounded large-scale battle layer so aggregated forces can fight through phase-ordered engagement, morale collapse, facing pressure, and table-driven outcome bands without requiring one-actor-per-combatant simulation.

Scope:

* support aggregate units whose represented headcount varies by actor class, mount class, heavy asset class, or special creature family rather than one universal compression ratio
* support an ordered battle loop with explicit movement, missile, melee, morale, and rally windows, including mutual-resolution segments where appropriate
* support facing-dependent threat projection, zone-of-control style movement denial, and restrictions on chaining movement through hostile influence zones
* support weighted stacking or occupancy capacity rather than one-space-per-unit only
* support localized combined fire, hard per-segment firing or casting cadence limits, and temporary lockouts between melee and ranged contribution where relevant
* support melee eligibility and attack resolution through bounded factor-versus-defense tables or equivalent authored outcome matrices rather than continuous damage formulas alone
* support morale failure branches such as hold, retreat, disorder, and routed states, with routed forces entering persistent altered mobility and vulnerability behavior until recovered or eliminated
* support special-unit wound accumulation for large or rare assets, plus command-loss berserk or indiscriminate behavior where supervisory control matters
* connect the layer to existing confrontation, regional-state, reserve, and command-coordination systems where appropriate

Constraints:

* deterministic only
* no full miniature-wargame simulation for every mission
* no one-actor tactical accounting at army scale
* prefer compact aggregate packets, phase windows, and result tables over sprawling unit-by-unit micromanagement
* keep battle outcomes legible enough for campaign follow-through and post-action explanation

Acceptance criteria:

* at least two distinct unit families use different aggregation scales in one reusable battle flow
* at least one battle uses an ordered multi-phase loop with a mutual-resolution segment
* facing or control zones constrain at least one movement path materially
* morale can produce more than binary pass/flee, including at least one persistent routed-state behavior
* at least one special unit survives multiple hits through a separate accumulation model
* targeted tests cover deterministic aggregation, phase order, control-zone movement denial, morale branching, and special-unit durability

Reconciliation update

Fold horde templates, commander-linked group behavior, and collective action packets into this issue.

Implementation emphasis:

* large groups should be representable as aggregate entities with their own action set such as surround, protect, stampede, or equivalent collective behaviors instead of one-actor-per-body accounting
* commander-linked variants may alter morale, movement, or available collective actions without forcing the horde to dissolve into discrete actors

This keeps horde abstraction and commander-linked collective behavior inside the aggregate battle-unit boundary.

Reconciliation update

Fold area-line battle geometry, commander-presence optimization, and hidden pre-battle deployment into this issue.

Implementation emphasis:

* battles may resolve through connected line, flank, reserve, and support areas rather than free placement, with engagement locks and eligibility varying by unit class and current area state
* some formations should gain attack, defense, or morale advantages only while a specific commander is physically attached to the engagement area rather than issuing orders remotely
* certain deployment effects may place units in fully hidden battlefield positions before contact, leaving them untargetable and absent from ordinary threat accounting until reveal conditions are met

This keeps area-based battle geometry, present-commander force bonuses, and pre-reveal deployment states inside the aggregate battle-unit boundary.

Reconciliation update

Fold apex-commander battlefield overlays into this issue.

Implementation emphasis:

* some singular high-tier entities should attach to an aggregate force as commander overlays that modify morale certainty, melee pressure, defense, spell resistance, or similar army-wide outputs without dissolving into ordinary unit accounting
* these overlays should remain interoperable with personal-scale dossiers so one named anomaly can matter both as an individual actor and as a battle-scale modifier packet

This keeps boss-as-battlefield-modifier logic and cross-scale commander overlays inside the aggregate battle-unit boundary.

Reconciliation update

Fold camp-wide haunt disruption and formation-scale supernatural pressure into this issue.

Implementation emphasis:

* spectral, undead, or haunt-class phenomena should be able to disrupt camps, formations, or army support posture at a larger scale than one adventuring party, altering morale, rest quality, cohesion, or readiness across grouped forces
* these effects should remain distinct from ordinary battlefield spell packets by behaving as persistent supernatural pressure on encampments, columns, or grouped troops rather than one instant blast

This keeps formation-scale haunting and camp-level supernatural disruption inside the aggregate battle-unit boundary.

### Relations
_No relations_

### Comments
- 2026-04-28T11:57:09.277Z
Verification update (repo evidence): hidden pre-battle deployment and bounded supernatural pressure are now implemented in the aggregate battle layer.\n\nClosed gaps:\n- Hidden pre-battle deployment added as bounded unit state with deterministic reveal conditions (round/area), excluded from normal targeting/threat accounting until reveal.\n- Bounded supernatural pressure added as battle-context input affecting readiness/morale without becoming a freeform spell system.\n- Targeted tests added for both features.\n\nValidation:\n- Local test sweep passes: src/test/aggregateBattle.test.ts => 19/19 passing (including new coverage).\n\nHandoff note:\n- Issue remains review-ready in scope terms; remaining practical blocker is remote reviewability if this work is not yet pushed/visible.

- 2026-04-26T11:56:12.140Z
Reconciliation update

Implementation emphasis:

* battle aftermath should remain its own gameplay layer, with salvage, wounded survivors, scavengers, unrecovered devices, and unstable terrain persisting after the main clash rather than collapsing into flavor text
* replenishment, breeding, corruption, and conversion pipelines may matter as much as current troop counts, especially in long-running planar war spaces.

This keeps aftermath ecology and replenishment pressure inside the aggregate battle boundary.

- 2026-04-26T11:28:14.477Z
Reconciliation update

Implementation emphasis:

* battle-scale doctrine should continue to differ sharply by faction, with ordered armies using reserves, flanks, and elite strike teams while chaotic forces overcommit, surge, and lose central coordination
* major mass-battle states may also suppress fear effects that would still matter in smaller skirmishes, preserving scale-sensitive morale logic
* recruitment pipelines, post-battle salvage, and mixed-role mercenary formations should remain as important to campaign strength as the immediate casualty count

This keeps doctrine-level army behavior, scale-dependent fear logic, replenishment pipelines, and aftermath significance inside the aggregate battle boundary.

- 2026-04-22T05:52:54.628Z
Reconciliation update

Fold staged morale degradation, rout contagion, and command-action recovery context into this issue.

Implementation emphasis:

* morale should continue to operate as a multi-step state machine with fallback, second-check collapse, rout, and recovery rather than one binary pass-fail surface
* routed units may pressure nearby friendlies and trigger chained disorder rather than disappearing cleanly from play
* command actions may improve morale locally but should not erase state-machine distinctions

This keeps staged morale and rout contagion inside the aggregate-battle and morale boundary.

- 2026-04-22T05:36:30.303Z
Reconciliation update

Fold derived unit durability from source actor templates, scale conversion from ordinary stats, stacked morale causes, post-break withdrawal behavior, independent-versus-embedded hero states, and translation from skirmish-scale stats into operational units into this issue.

Implementation emphasis:

* aggregate units may derive durability from underlying actor or rider-mount templates rather than flat arbitrary blocks
* movement, range, and similar ordinary-scale stats may convert into battlefield-scale values through a dedicated translation layer
* morale should remain a separate resolution surface with stacked causes rather than hidden inside raw casualties only
* morale break may push units into withdrawal and later recovery checks rather than instant deletion
* heroes may either act independently or embed into host formations, changing initiative and action economy

This keeps unit derivation, battlefield translation, stacked morale, post-break withdrawal, and hero embedding inside the aggregate-battle boundary.

- 2026-04-21T04:12:26.646Z
Status clarification

The blocker on this issue is repository verifiability, not the bounded-scope limitations previously listed.

What is true right now:

* the aggregate battle layer has been implemented and targeted validation passed on the current local verified checkout
* bounded limitations such as no separate hidden pre-battle deployment state, no dedicated camp-wide haunt/disruption packet, and remaining an aggregate campaign-facing layer are acceptable scope limits and are not closure blockers by themselves

What is not yet established from reviewable repo evidence:

* there is still no visible pushed branch or PR containing the implementation for external review
* GitHub review context has twice reported that the referenced battle files were not present on the remote/default branch at the time of review

Interpretation:

* “implemented and validated locally on the current checkout” is true
* “pushed and reviewable on GitHub” is still not established

Until a reviewable branch/PR exists, this issue should be treated as awaiting repository-visible handoff rather than safely complete from a collaboration/review standpoint.

- 2026-04-21T03:21:55.860Z
No PR is attached to [SPE-106](https://linear.app/spectranoir/issue/SPE-106/aggregate-battle-units-and-routed-morale-states), and I can't locate the work on the remote.

What I checked on `JamesJedi420/containment-protocol`:

* No PR linked on the ticket (only Devin session and GitHub issue #106 attachments).
* No branch matching `devin/spe-106-*` or anything `SPE-106`/`aggregate-battle`-related.
* No `aggregateBattle.ts` / `aggregateBattle.test.ts` on `main` or any remote branch/PR ref (open PRs: #1, #44, #45, #46, #281 — none related).

The ticket is marked `Done` and the latest closure comment references `src/domain/aggregateBattle.ts`, `src/domain/sim/advanceWeek.ts`, and `src/test/aggregateBattle.test.ts`, but this matches the prior session's "blocker" comment: the implementation appears unpushed or lives in a different repo/branch. An earlier Devin session already flagged the same mismatch and stopped.

Could you point me to:

1. The PR link (or branch/commit SHA) you want reviewed, or
2. The repo if it's not `JamesJedi420/containment-protocol`?

If the work is only local/unpushed, it needs to be pushed before I can review it.

- 2026-04-21T03:20:10.799Z
On it — starting code review for SPE-106.

- 2026-04-21T03:19:43.394Z
This thread is for an agent session with devin.

- 2026-04-21T03:19:37.143Z
Closure update

Re-implemented and validated the remaining bounded work for the aggregate battle layer against the current verified codebase.

Verified live surfaces used:

* `src/domain/models.ts` for `GameState`, `CaseInstance`, spatial state, weekly reports, and event types
* `src/domain/aggregateBattle.ts` for the bounded aggregate battle core
* `src/domain/sim/advanceWeek.ts` for weekly simulation and live raid / confrontation integration
* `src/domain/pressure.ts` for `getCaseRegionTag(...)` regional context
* `src/domain/reportNotes.ts`, `src/features/dashboard/eventFeedView.ts`, `src/features/dashboard/dashboardView.ts`, and `src/domain/agency.ts` for reporting and summary surfacing
* deterministic tests in `src/test/aggregateBattle.test.ts`, `src/test/sim.advanceWeek.test.ts`, `src/test/dashboardView.test.ts`, `src/test/eventFeedView.test.ts`, and `src/test/agency.test.ts`

What changed in this pass:

* `src/domain/aggregateBattle.ts`: added `anchorUnitId` to commander overlays and made commander bonuses area-bound through the live anchor formation rather than acting as remote buffs
* `src/domain/sim/advanceWeek.ts`: wired live raid-generated operator command overlays to generated aggregate unit ids so commander presence follows the real campaign battle packet
* `src/test/aggregateBattle.test.ts`: added deterministic commander-presence coverage proving co-located formations receive the overlay while remote formations sharing the same overlay id do not

Acceptance criteria coverage on the current verified checkout:

* different aggregation scales remain covered through families such as `line_company`, `mounted_wing`, `horde_mass`, `artillery_section`, and `special_creature`
* the ordered multi-phase loop remains `movement -> missile -> melee -> morale -> rally`, including explicit mutual melee resolution
* control-zone movement denial still constrains chained movement materially
* morale continues to branch beyond binary pass/flee, including persistent routed behavior
* special-unit multi-hit durability remains a separate accumulation track
* the real campaign raid path persists aggregate battle summaries into report snapshots, report notes, event feed, dashboard rollups, and agency summaries
* commander-presence optimization is now correctly bounded to the actual engagement area on the live integrated path

Validation:

* `npm test -- --run src/test/aggregateBattle.test.ts`
* `npm test -- --run src/test/sim.advanceWeek.test.ts src/test/dashboardView.test.ts src/test/eventFeedView.test.ts src/test/agency.test.ts`
* `npx eslint src/domain/aggregateBattle.ts src/domain/sim/advanceWeek.ts src/test/aggregateBattle.test.ts`
* Result: 126 / 126 targeted tests passed and eslint passed on touched files

Remaining bounded limitations:

* no separate hidden pre-battle deployment state yet
* no dedicated camp-wide haunt/disruption packet beyond current spatial/context modifiers
* remains an aggregate campaign-facing layer, not a free-placement tactical simulator

Interpretation:

* the bounded acceptance bar for [SPE-106](https://linear.app/spectranoir/issue/SPE-106/aggregate-battle-units-and-routed-morale-states) is now met on the current verified codebase
* remaining gaps are follow-on expansion, not blockers for closure

- 2026-04-21T02:49:26.726Z
Correction / blocker update

The current checkout does not appear to contain the battle substrate or related files described in the earlier closure comments.

Verified on the present branch/checkout:

* `src/app/store/gameStore.ts`
* `src/domain/models.ts`
* `src/domain/sim/advanceWeek.ts`
* `src/features/report/reportView.ts`
* `src/features/dashboard/eventFeedView.ts`

Not present here:

* `src/domain/territory/*`
* `src/domain/artifacts/*`
* `src/domain/realm/*`
* matches for symbols such as `territorialPower`, `ArtifactState`, or `realmEffects`
* the previously claimed `aggregateBattle*` files are also not present on the remote/default branch per follow-up review context

Interpretation:

* this is a branch/checkout mismatch or an unpushed/local-only implementation, not a verified completed integration on the current repository state
* the issue should not remain treated as cleanly closed from the current repo evidence

Next requirement:

* identify the intended branch/checkout/commit containing the aggregate battle implementation, or re-implement the feature against the current verified repository surfaces

- 2026-04-21T02:22:50.245Z
Devin has stopped working on this task.

- 2026-04-21T01:52:50.425Z
No PR is linked on [SPE-106](https://linear.app/spectranoir/issue/SPE-106/aggregate-battle-units-and-routed-morale-states). The ticket is already in `Done` status and its closure comment describes changes to `aggregateBattle.ts` and `aggregateBattle.test.ts`, but:

* `JamesJedi420/containment-protocol` has 0 open and 0 closed PRs.
* No branch matching `devin/spe-106-*` (or any `SPE-106`/`aggregate battle`) exists on the remote.
* No `aggregateBattle*` files exist on `main` or any remote branch.

Could you share the PR link (or the branch/commit) you want reviewed? If the work only lives in an unpushed local branch or a different repo, pointing me at it would unblock the review.

- 2026-04-21T01:50:30.517Z
On it. Starting the code review for SPE-106.

- 2026-04-21T01:50:00.723Z
This thread is for an agent session with devin.

- 2026-04-21T01:49:59.406Z
Closure update

Implemented the bounded live-integration pass for the aggregate battle layer.

Completed in this pass:

* wired a real weekly campaign flow so raid operations resolved by the weekly simulator now invoke the aggregate battle resolver instead of remaining purely abstract
* persisted a compact aggregate battle summary into the weekly case snapshot for downstream reporting and UI use
* emitted a real `case.aggregate_battle` event so battle outcomes now appear in the canonical event stream rather than only in hidden resolution state
* folded aggregate battle outcomes into mission explanation notes and reflected report notes
* surfaced special-unit durability and battle outcome detail in dashboard and agency summaries
* added targeted validation for persistence, event emission, note reflection, dashboard rollup, and agency-summary rollup

Acceptance coverage:

* a real campaign flow now invokes the aggregate battle resolver through the raid branch of weekly case resolution
* battle outcomes now persist into campaign state through weekly case snapshots, reflected report notes, and the emitted aggregate battle event
* routed state is surfaced in report notes, the event feed, the latest dashboard report summary, and the agency latest-operations summary
* special-unit durability is surfaced through persisted `specialDamage`, report notes, event feed detail, dashboard rollup, and agency summary counts
* the integrated weekly raid path now has targeted tests for persistence, event emission, note reflection, dashboard rollup, and agency-summary rollup

Validation run:

* `npm run test:run -- src/test/aggregateBattle.test.ts src/test/sim.advanceWeek.test.ts src/test/eventFeedView.test.ts src/test/dashboardView.test.ts src/test/agency.test.ts`
* result: 5 files passed, 125 tests passed

Bounded limitations retained intentionally:

* live integration is currently limited to raid or confrontation resolution only; standard single-case resolution still uses the existing abstract resolver
* some real cases still lack fully populated spatial fields, so the raid adapter infers bounded defaults from verified case tags when those fields are absent
* unrelated dirty-worktree files were not touched and no unrelated failures appeared in the targeted validation run

Interpretation:

* the bounded acceptance bar for [SPE-106](https://linear.app/spectranoir/issue/SPE-106/aggregate-battle-units-and-routed-morale-states) is met
* remaining gaps are follow-on expansion, not blockers for closure

- 2026-04-21T01:19:42.056Z
Implemented a bounded aggregate battle substrate pass and verified the repo first before adding anything.

Verified reusable anchors already present:

* regional / zone context through `regionTag` inference in `pressure.ts`
* spatial context on `CaseInstance` through `siteLayer`, `visibilityState`, and `transitionType` in `models.ts`
* morale / readiness / command-adjacent state through `LeaderBonus` and aggregated leadership in `teamSimulation.ts`, `LegitimacyState` in `models.ts`, and `coordinationFrictionActive` / `supportAvailable` in `models.ts`
* deterministic test anchors in `sim.determinism.test.ts` and `scouting.spatial.test.ts`

What was missing was battle-local state for occupancy/frontage, control-zone movement denial, routed morale, reinforcement timing, commander overlays, and special-unit durability, so I added the smallest bounded layer for that in `aggregateBattle.ts`.

Implemented in this pass:

* standalone deterministic battle resolver
* case-context adapter
* side-state builder
* leader-to-command overlay adapter
* ordered phase loop
* report-friendly summary output

Acceptance coverage in the new layer:

* different aggregation scales in one reusable flow via family profiles such as `line_company`, `mounted_wing`, `horde_mass`, and `special_creature`
* ordered multi-phase loop with explicit movement → missile → melee → morale → rally phases, including a mutual melee segment
* control-zone movement denial during movement resolution
* morale branching beyond binary pass/flee, including persistent routed behavior and rally handling
* special-unit multi-hit durability tracked separately from ordinary step loss
* targeted deterministic coverage for aggregation scale, phase order, control-zone denial, morale branching / routed persistence, and special durability

Files changed:

* `aggregateBattle.ts`
* `aggregateBattle.test.ts`

Validation:

* `npm run test:run -- src/test/aggregateBattle.test.ts`
* `npm run test:run -- src/test/aggregateBattle.test.ts src/test/scouting.spatial.test.ts`
* Result: 2 test files passed, 10 tests passed

Current limitation:

* this is intentionally a standalone battle subdomain and is not yet wired into `advanceWeek`, operation events, or dashboard/event-feed/report surfaces
* the output is currently a deterministic result table plus summary strings, ready for later campaign/report integration

Interpretation:

* the bounded aggregate battle core is now in place
* the issue should stay open until campaign integration and output surfacing are completed

- 2026-04-19T22:11:09.235Z
Reconciliation update

Fold specialized mountain-combat rule packages into this issue.

Implementation emphasis:

* harsh-terrain battles may bundle uphill, downhill, angle-of-fire, and cavalry-disadvantage rules into one authored mountain-warfare package instead of one generic rough-ground penalty
* these modifiers should remain legible as a terrain-combat doctrine set rather than scattered one-off bonuses

This keeps specialized mountain-combat bundles inside the aggregate battle-unit boundary.

- 2026-04-19T22:04:55.048Z
Reconciliation update

Fold modular hull retrofit packages and crew-quality performance overlays into this issue.

Implementation emphasis:

* one hull may support alternate armor, weapon, deck, cargo, troop, scout, or disguise configurations through modular retrofit packages rather than requiring wholly new vehicle definitions every time
* crew quality, specialists, and command roles should continue to modify vehicle performance independently from hull baseline stats

This keeps retrofit variation and crew-skill overlays inside the aggregate battle and force-packet boundary.

- 2026-04-19T21:27:05.598Z
Contradiction check

The current project should not let factions collapse into one generic troop silhouette.

Implementation emphasis:

* if force representations remain too visually or functionally interchangeable across factions, cultures, or species families, that should be treated as a contradiction in force authoring
* command groups, cavalry forms, equipment shapes, and overall silhouette should continue to communicate real faction difference at a glance

This keeps the contradiction check visible inside the aggregate battle-unit boundary.

- 2026-04-19T13:06:08.560Z
Reconciliation update

Fold compact force-card authoring for regional military abstraction into this issue.

Implementation emphasis:

* regional forces may be authored as compact cards or packets with move, defense, morale, and role values rather than individual actor sheets
* those cards should remain culture- and formation-sensitive while still interoperating with the aggregate battle layer

This keeps abstracted force-card schema inside the aggregate battle-unit boundary.

- 2026-04-18T03:20:15.302Z
Reconciliation update

Fold horde templates, commander-linked group behavior, and collective action packets into this issue.

Implementation emphasis:

* large groups should be representable as aggregate entities with their own action set such as surround, protect, stampede, or equivalent collective behaviors instead of one-actor-per-body accounting
* commander-linked variants may alter morale, movement, or available collective actions without forcing the horde to dissolve into discrete actors

This keeps horde abstraction and commander-linked collective behavior inside the aggregate battle-unit boundary.

- 2026-04-18T03:18:49.445Z
Reconciliation update

Fold horde templates, commander-linked group behavior, and collective action packets into this issue.

Implementation emphasis:

* large groups should be representable as aggregate entities with their own action set such as surround, protect, stampede, or equivalent collective behaviors instead of one-actor-per-body accounting
* commander-linked variants may alter morale, movement, or available collective actions without forcing the horde to dissolve into discrete actors

This keeps horde abstraction and commander-linked collective behavior inside the aggregate battle-unit boundary.

- 2026-04-18T00:39:42.029Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/106). All replies are displayed in both locations.

---

## SPE-178 - Event-driven crisis packets with multi-scale entry
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-18T11:56:21.640Z
- Updated: 2026-04-28T11:42:37.655Z

### Description
Goal:  
Implement crisis anthology packets so campaign events can instantiate playable scenarios across several participation scales without needing separate content lines.

Scope:

* support crisis generation from event categories using compact inputs such as challenge, opponent package, setting, pressure, and adaptation notes
* support multiple entry scales for the same crisis such as personal ruler response, delegated operatives, lieutenant-led action, or force-backed intervention
* support open-ended crisis shells that define actors, pressures, and stakes without assuming one fixed scripted finish
* support explicit justification for when leader presence is required instead of clean delegation
* support legitimacy, candidacy, or office-seeking progress that accumulates across several crisis packets
* support multiple onboarding or arrival routes into the same higher-order playspace without forking it into a second game shell

Constraints:

* deterministic only
* no need for every event to become a bespoke full adventure
* no forcing one participation scale on all crises
* prefer compact scenario shells and adaptation hooks over sprawling branching scripts
* keep event-to-scenario reasons legible enough for player explanation

Acceptance criteria:

* at least one campaign event instantiates a playable crisis shell rather than text fallout only
* at least one crisis supports more than one participation scale through bounded adaptation rules
* at least one crisis justifies required leader presence over ordinary delegation
* at least one crisis advances an ongoing legitimacy or candidacy track across multiple events
* targeted tests cover deterministic event selection, scenario-shell assembly, and scale-specific adaptation outputs

### Relations
_No relations_

### Comments
- 2026-04-28T11:42:37.998Z
Contradiction check

Implementation emphasis:

* adult presence should not be treated as meaningful event security by default if the intended frame expects rehearsals, backstage flow, and fragmented supervision to leave many exploitable gaps
* if current event-security logic still overweights nominal supervision as effective protection, that should be treated as a contradiction

This keeps the contradiction check visible inside the event-driven crisis boundary.

- 2026-04-28T11:42:37.768Z
Contradiction check

Implementation emphasis:

* one violent incident should not automatically halt institutional routine if the intended frame expects events, rehearsals, and duty structures to keep operating through inertia
* if current institution logic still over-assumes that a severe incident cleanly suspends the surrounding event machinery, that should be treated as a contradiction

This keeps the contradiction check visible inside the event-driven crisis boundary.

- 2026-04-28T11:42:37.670Z
Reconciliation update

Implementation emphasis:

* spectacle events such as talent shows, rehearsals, or similar public-performance packets should remain able to concentrate lightly protected civilians into predictable staging, waiting, dispersal, and backstage windows rather than reading as flavor-only scheduling
* those same event packets should support fragmented micro-spaces, where locker rooms, dressing areas, aisles, rehearsal pockets, and backstage corridors create exploitable gaps between public visibility and real supervision
* institutions may also keep event machinery running during an active threat period, forcing bureaucracy, staging, and production duties to coexist with live danger instead of cleanly yielding to the crisis
* violent incidents should therefore be able to sit inside a still-running spectacle container rather than automatically collapsing the surrounding routine

This keeps event-based civilian concentration, fragmented event-space vulnerability, routine-event persistence during crisis, spectacle-event scenario containment, and layered nonthreat pressure inside the event-driven crisis boundary.

- 2026-04-26T05:17:28.668Z
Reconciliation update

Implementation emphasis:

* heist generation should support a stable six-part job skeleton — mark, loot, location, catch, hitch, and payout — with later live complications layered on top instead of one monolithic mission blob
* known obstacles discovered during casing should remain distinct from hidden hitches revealed only during execution so planning and improvisation are authored in different layers.

This concept stays inside that issue’s boundary.

- 2026-04-25T10:28:18.122Z
Reconciliation update

Implementation emphasis:

* event calendars may escalate from nightmare onboarding to environmental pressure, rescue, paranoia, ambush, infiltration, storm break, siege, and climax, with weather and prophecy synchronized to the same schedule rather than treated as separate subsystems
* one prophecy fragment can matter both now and as part of a wider multi-scenario chain, letting a single sign pay off locally while scheduling future campaign weight

This concept stays inside that issue’s boundary.

- 2026-04-25T10:24:28.280Z
Reconciliation update

Implementation emphasis:

* scenario control may escalate day by day from disappearances and rumor, through funerary procedures, murder evidence, attempted killings, weather build, rising dead, and siege rather than waiting on room-by-room trigger only
* delayed storm and eclipse-style macro-events can remain synchronized to that same calendar, discharging only at a precise narrative beat instead of behaving as decorative weather loops
* prophecy fragments may also act as long-horizon campaign schedulers, mattering partly in the current case and partly as one sign inside a larger multi-scenario chain

This concept stays inside that issue’s boundary.

- 2026-04-25T09:59:12.695Z
Reconciliation update

Implementation emphasis:

* one scenario should be able to support both jump-start entry for fresh groups and continuation entry for parties carrying prior campaign inventory, object custody, and unresolved state without collapsing them into one default opening
* retroactive continuity overlays may also clarify what happened between prior chapters and the current scenario without invalidating prior play, so sequel intake can absorb missing history cleanly

This concept stays inside that issue’s boundary.

- 2026-04-25T09:52:55.071Z
Reconciliation update

Implementation emphasis:

* one scenario may deliberately replace its active objective several times, moving from courier work to voyage trouble, to castaway survival, to false refuge, to artifact retrieval, to factional war, to escape without preserving the original mission frame as primary
* objective drift should therefore be treated as a supported scenario-control pattern rather than as a failure of pacing

This concept stays inside that issue’s boundary.

- 2026-04-25T09:49:08.807Z
Reconciliation update

Implementation emphasis:

* cases may begin as one mission type and then deliberately replace their active objective several times, moving through voyage trouble, survival, false refuge, artifact retrieval, civil war, and escape without preserving the original framing as the main loop
* scenario control should therefore support staged objective replacement rather than assuming one stable mission statement from intake to resolution

This concept stays inside that issue’s boundary.

- 2026-04-25T09:47:45.714Z
Reconciliation update

Implementation emphasis:

* scenario control should support named day-and-night beats where adversary plans escalate on a fixed calendar unless a key interruption occurs, rather than waiting only on room entry or combat outcomes
* nightly abductions, framing attempts, lures, mob turns, and full assault states should remain valid event-controller outputs inside one bounded schedule
* prophecy or divination procedures may also generate exact countdown values that feed those live scenario clocks instead of only revealing flavor

This concept stays inside that issue’s boundary.

- 2026-04-25T01:16:36.239Z
Reconciliation update

Implementation emphasis:

* short horror cases should remain valid as narrow packets built around one monster class, one core investigative twist, and one bounded release or failure logic rather than broad campaign arcs only
* anthology structures may still carry a recurring adviser or recovering expert through several cases so the connective tissue lives in the recurring guide rather than in one giant meta-plot
* climactic horror beats should continue to route through confession, exoneration, ritual closure, curse release, or moral aftermath as often as through combat

This concept stays inside that issue’s boundary.

- 2026-04-24T12:00:39.147Z
Contradiction check

Implementation emphasis:

* cases should not be authored as fixed plots if the intended engine is situation plus escalation rather than prewritten scene sequence
* if current supernatural case prep still over-specifies scripted outcomes instead of active pressures, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T11:55:57.754Z
Contradiction check

Implementation emphasis:

* cases should not be authored as fixed plots if the intended engine is situation plus escalation rather than prewritten scene sequence
* if current case prep still over-specifies scripted outcomes instead of active pressures, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T11:55:56.640Z
Reconciliation update

Implementation emphasis:

* campaign packets may deliberately alternate self-contained weekly cases with a slower-burn meta arc rather than forcing every scenario into one serialized structure
* one-shot or short-run adaptations may also narrow available archetypes, preload information asymmetrically, and tune continuity assumptions without breaking the core investigation loop
* horror overlay should remain a configurable campaign profile that changes tone, pacing, and expected power ceilings rather than acting as a pure reskin

This concept stays inside that issue’s boundary.

- 2026-04-23T07:24:03.522Z
Reconciliation update

Implementation emphasis:

* institution-backed expeditions into hostile unknown regions should remain a valid campaign spine, especially when driven by disputed discoveries that matter if true but are dismissed by the establishment
* cooperative investigator loops can therefore center on clue discovery, escalating threat management, and a race against catastrophic awakening rather than pure combat victory

This concept stays inside that issue’s boundary.

- 2026-04-23T05:22:56.316Z
Reconciliation update

Implementation emphasis:

* session construction should remain a distinct toolkit from worldbuilding, with dedicated generators for random encounters, side quests, chase complications, skill challenges, environmental hazards, and travel complications
* side-objective generation should stay a standard mid-session insertion surface rather than only prep-time content
* chase, hazard, and travel pressure should preserve their own generator classes instead of borrowing generic combat tables by default

This concept stays inside that issue’s boundary.

- 2026-04-23T05:02:28.713Z
Reconciliation update

Implementation emphasis:

* session-building should remain a distinct toolkit layer from worldbuilding, with dedicated generators for random encounters, chase complications, side quests, skill challenges, environmental hazards, and travel trouble
* side-objective generation should be treated as a standard mid-session insertion surface rather than only campaign-prep content
* chase and travel complications should preserve their own authored pressure grammar instead of borrowing generic encounter logic by default

This concept stays inside that issue’s boundary.

- 2026-04-23T04:58:05.255Z
Reconciliation update

Implementation emphasis:

* session-building should expose dedicated generators for side quests, chase complications, travel complications, environmental hazards, and similar mid-session pressure surfaces rather than relying on generic encounter rolls alone
* a one-shot should be assemblable from several generator-backed content layers into a coherent short scenario rather than a loose pile of disconnected hooks

This concept stays inside that issue’s boundary.

- 2026-04-23T04:56:09.601Z
Reconciliation update

Implementation emphasis:

* session construction should remain a distinct layer from worldbuilding, with dedicated generators for encounters, chase complications, side quests, skill challenges, environmental hazards, and travel complications
* side-objective generation should be a standard insertion surface for ongoing play rather than only a campaign-prep concern
* chase complications and travel complications should stay specialized rather than borrowing generic encounter tables by default

This concept stays inside that issue’s boundary.

- 2026-04-23T04:53:54.061Z
Reconciliation update

Implementation emphasis:

* campaign cultures should be built through adaptation of researched historical or mythic material rather than literal import, allowing source synthesis while preserving a coherent playable packet
* worldview, social baseline, and protagonist assumptions should be allowed to define the campaign identity as much as the map does

This concept stays inside that issue’s boundary.

- 2026-04-23T04:07:50.270Z
Reconciliation update

Implementation emphasis:

* side-quest rescues and site detours should be able to materially reconfigure later expedition strength, prisoners, allies, and resource state rather than staying isolated vignettes
* long expeditions may be authored as chained regional rule blocks where sea, beach, forest, ridge, valley, and return journey each carry distinct frequencies, hazards, and keyed overrides
* keyed hex or regional encounter nodes should remain able to override ambient travel behavior with named content and follow-on consequences

This concept stays inside that issue’s boundary.

- 2026-04-19T22:04:55.687Z
Contradiction check

The current project should not assume arrival requires exhaustive world build before landfall.

Implementation emphasis:

* if large-site or world arrival still assumes exhaustive surface simulation before meaningful entry can occur, that should be treated as a contradiction
* arrival should remain valid wherever bounded meaningful content exists, not only after total global coverage

This keeps the contradiction check visible inside the event-driven anthology and multi-scale entry boundary.

- 2026-04-19T22:04:55.157Z
Reconciliation update

Fold multi-entry campaign onboarding into this issue.

Implementation emphasis:

* one higher-order playspace may be entered through several onboarding routes such as found vehicles, crash sites, forced capture, diplomatic contact, or portal displacement depending on prior campaign state
* these paths should converge on the same exploration layer without requiring a second parallel game shell

This keeps multi-entry onboarding into the crisis-anthology and multi-scale entry boundary.

- 2026-04-18T11:56:23.116Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/180). All replies are displayed in both locations.

---

## SPE-547 - Haunt resolution through anchors, remains, and rites
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-23T04:07:48.662Z
- Updated: 2026-04-28T11:49:30.670Z

### Description
Goal:  
Implement a bounded haunt-resolution layer so unresolved dead are cleared through a repeatable workflow of subdual, diagnosis, body recovery, funerary handling, and sanctified closure rather than simple defeat.

Scope:

* support haunt states that persist until one or more attachment conditions are identified and cleared, including neglected remains, desecration, unfinished rites, and death-linked anchor objects
* support a formal resolution chain including subdual or stabilization, diagnosis, anchor discovery, remains or anchor handling, sanctioned closure, and post-resolution verification
* support distributed anchor coverage where active conditions may depend on remains, linked objects, preserved fragments, or multi-part sentimental anchors rather than one corpse-only checklist
* distinguish temporary disruption, temporary banishment, apparent resolution, and final retirement as separate outcomes with explicit transition rules
* support recurrence after partial success when a primary anchor condition remains unresolved
* support investigation-first and nonviolent resolution routes (truth restoration, restitution, confession, relational release) when biography and anchor state allow
* distinguish baseline haunt-resolution semantics from multi-presence site-state logic and building-scale purification execution
* connect the layer to undead, knowledge, ritual, and site-maintenance systems where relevant

Constraints:

* deterministic only
* no freeform ghost-therapy sandbox
* no assumption that combat defeat equals final retirement
* no assumption that remains discovery alone resolves all haunt cases
* prefer compact haunt-state and anchor-state packets over sprawling bespoke exorcism trees
* keep active anchors, resolution state, and recurrence conditions legible enough for planning and debugging

Acceptance criteria:

* at least one haunt requires more than combat defeat to resolve permanently
* at least one case separates temporary disruption or banishment from final retirement
* at least one case remains unresolved until a non-remains anchor object or multi-part anchor condition is cleared
* at least one partial resolution recurs deterministically because a primary anchor condition remains active
* at least one case resolves through investigation-first or nonviolent closure logic instead of destruction-only routing
* targeted tests cover deterministic diagnosis, anchor discovery, remains/object handling, recurrence checks, and final closure state transitions

### Relations
_No relations_

### Comments
- 2026-04-28T11:49:30.681Z
Reconciliation update

Implementation emphasis:

* institutional root events such as riots, abusive treatment programs, hidden experiments, and later abandonment should remain able to define the active anomaly method of a site rather than acting as lore-only backdrop
* unrecovered bodies, hidden remains, and perpetrator work logs should remain valid anchor surfaces, with public history giving only a partial cause chain until concealed records and hidden spaces are found
* temporary spirit repellents such as sanctified ammunition or equivalent anti-entity loads should buy time without implying final resolution, and final closure may still require ordered remains handling rather than the first successful disruption
* if current historical records still explain the whole site too early, or if institutional abuse still reads as flavor rather than inherited mechanism, that should be treated as a contradiction
* if current countermeasure handling still over-assumes the first correct rite finishes the case, that should be treated as a contradiction

This keeps root-event inheritance, unrecovered-remains anchor risk, perpetrator research logs, temporary repel without resolution, ordered remains-neutralization, and the contradiction checks inside the haunt-resolution boundary.

- 2026-04-28T10:28:50.540Z
Dependency note

* this issue provides the baseline haunt-resolution workflow (diagnosis, anchor discovery, remains handling, final closure) that [SPE-921](https://linear.app/spectranoir/issue/SPE-921/multi-presence-haunted-site-state-and-false-clears) and [SPE-922](https://linear.app/spectranoir/issue/SPE-922/building-scale-purification-geometry-and-interruption) build on
* SPE-921 extends this layer to handle multiple concurrent presences, false-clear states, and protective-versus-hostile recognition in one site
* SPE-922 uses the haunt-resolution foundation to implement building-scale countermeasure geometry, interruption handling, and multi-room execution
* implement this issue before or in parallel with SPE-921 and SPE-922 since both depend on the core haunt state, anchor model, and resolution semantics

This keeps the haunt-resolution layer as the foundation that presence-management and purification-execution layers depend on.

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

## SPE-88 - Anomaly compendium with governed taxonomy
- Team: SpectraNoir
- Project: Containment Protocol
- Status: Backlog
- Priority: 2
- Labels: simulation, system, core-loop
- Created: 2026-04-16T01:40:50.389Z
- Updated: 2026-04-27T12:24:33.696Z

### Description
Goal:  
Implement a bounded internal anomaly-reference system so threat families, variants, terminology, schema meanings, and compact doctrine notes can be inspected in one governed compendium rather than remaining scattered across issue text and ad hoc authoring fragments.

Scope:

* define a central anomaly compendium artifact or index that records canonical family entries, subtype links, field semantics, and approved terminology
* support cross-entry consistency checks for shared scales such as prevalence, encounter bands, size, cognition, durability, movement notation, and variant tier language
* support parallel compact reference views for ordinary entries, elite variants, singular apex entries, and family-overview records without duplicating the underlying source data
* support concise ecology, countermeasure, and behavior summaries so design review and scenario authoring can reference stable doctrine without reopening every issue thread
* connect the compendium to structured definitions, template inheritance, research or knowledge outputs, and publication-facing reference artifacts where relevant

Constraints:

* deterministic only
* no giant in-engine encyclopedia as a gameplay requirement
* no duplicate hand-maintained records drifting away from source definitions
* prefer one governed internal reference format over many ad hoc spreadsheets or notes
* keep this focused on authoring governance and reference integrity, not public lore packaging

Acceptance criteria:

* at least one canonical anomaly family can be inspected through a family overview plus subtype record view
* shared field meanings and scales are documented once and reused across multiple entries
* at least one consistency check or review workflow exists for terminology drift, invalid scale usage, or missing required fields
* scenario or content authors can reference a stable compendium record without reconstructing the entry from scattered issue comments
* targeted validation or workflow tests cover reference generation, field-governance rules, and subtype linkage

### Relations
_No relations_

### Comments
- 2026-04-27T12:24:33.707Z
Reconciliation update

Implementation emphasis:

* anomaly classification should tolerate nonterrestrial or nonstandard biochemistry hypotheses when observed survival conditions exceed normal life expectations
* taxonomy and doctrine notes should therefore remain able to record support-medium exceptions, extreme cold tolerance, and off-normal life-design theories without forcing early collapse back to ordinary biology

This keeps nonstandard-biochemistry threat classification inside the compendium and taxonomy boundary.

- 2026-04-26T11:02:43.798Z
Reconciliation update

Routing note:

* this parent should now stay a coordination shell for shared boundary and completion logic
* new implementation detail should land on the specific child that owns records, views, field governance, or consistency review rather than accumulating here
* if future material does not clearly fit one existing child, split a new bounded child instead of re-broadening the parent

This keeps the parent compact and prevents child-level scope from drifting back into it.

- 2026-04-25T15:06:49.987Z
Reconciliation update

Implementation emphasis:

* anomaly taxonomy should preserve independent axes for power tier, physical origin, motive origin, body form, and preservation state rather than treating visible condition or family label as authoritative truth
* compendium entries should therefore tolerate expectation-violating exceptions, allowing misidentification risk and per-entity weakness variance without collapsing governance
* visible clues should remain useful but probabilistic, with appearance helping narrow the field while never proving rank, motive, or final countermeasure on its own

This concept stays inside that issue’s boundary.

- 2026-04-25T01:25:44.862Z
Reconciliation update

Implementation emphasis:

* peaceful anomaly households and non-hostile cursed dependents should remain valid exception packets, so a hunt can turn into custody, protection, alliance, or long-term moral obligation rather than automatic extermination
* those exceptions should still carry aftermath, especially where children, wards, or grieving dependents survive the immediate case

This concept stays inside that issue’s boundary.

- 2026-04-25T01:19:40.552Z
Reconciliation update

Implementation emphasis:

* peaceful anomaly households and non-hostile cursed dependents should remain mechanically meaningful exception packets, so a hunt can end in custody, protection, adoption, or alliance rather than extermination by default
* those exceptions should still generate moral aftermath and long-horizon relationship consequences, especially when children or vulnerable dependents survive the immediate case

This concept stays inside that issue’s boundary.

- 2026-04-25T01:16:36.675Z
Reconciliation update

Implementation emphasis:

* anomaly compendia should continue to carry explicit exceptions, including peaceful anomaly households, non-hostile cursed children, and narrow-domain subtypes that resist default monster classification
* those exception packets should remain mechanically meaningful so a case can end in custody, alliance, protection, or restitution rather than automatic extermination

This concept stays inside that issue’s boundary.

- 2026-04-24T12:00:39.211Z
Contradiction check

Implementation emphasis:

* hostile entities should not remain stat-block-only if monsters, minions, bystanders, and locations are meant to function as behavior engines with motivations and distinct jobs in play
* if current threat authoring still flattens too much into combat payload plus numbers, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-24T11:55:57.789Z
Contradiction check

Implementation emphasis:

* hostile entities should not remain stat-block-only if monsters, minions, bystanders, and locations are all meant to function as behavior engines with motivations and distinct jobs in play
* if current threat authoring still flattens too much into combat payload plus numbers, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T06:49:24.191Z
Reconciliation update

Implementation emphasis:

* within-class procedural variation should preserve recognition without sameness across anomalies, false entities, and expert-like information providers, so family identity does not imply identical behavior, answers, or interpretation burden
* entity classes should therefore remain governed enough for taxonomy while still permitting meaningful local divergence inside the same apparent category

This concept stays inside that issue’s boundary.

- 2026-04-23T05:35:44.166Z
Reconciliation update

Implementation emphasis:

* within-class procedural variation should preserve recognition without sameness, so two entities, experts, or anomalies in the same broad category may share a silhouette yet still diverge in behaviors, answers, weaknesses, or interpretation burden
* the same applies to false entities and information providers: recognizable family identity should not imply identical runtime behavior

This concept stays inside that issue’s boundary.

- 2026-04-23T04:53:54.278Z
Contradiction check

Implementation emphasis:

* monster ecology should not remain independent of civilization density if some campaign profiles intend monsters to retreat toward frontier, underground, and low-settlement zones as civilization expands
* if placement logic still ignores that relationship, that should be treated as a contradiction

This keeps the contradiction check visible inside that issue’s boundary.

- 2026-04-23T04:53:54.100Z
Reconciliation update

Implementation emphasis:

* region authoring should support explicit curation of monster palettes so a locale can filter bestiary access according to history, theme, and cultural logic instead of assuming universal bestiary availability
* the same packet can also carry key heroic NPCs, supra-faction defenders, and named artifact sets as recurring objective anchors

This concept stays inside that issue’s boundary.

- 2026-04-22T09:26:17.228Z
Reconciliation update

Fold broad likes-and-dislikes item metadata and natural anomalous-material generation into this issue.

Implementation emphasis:

* carried items may shape wearer preference, social alignment, or passive behavior through standardized likes-and-dislikes style metadata
* some magical assets should remain naturally occurring anomalous materials or environmental nodes rather than crafted products only

This keeps passive preference shaping and naturally occurring anomaly materials inside the compendium and taxonomy boundary.

- 2026-04-22T06:07:46.479Z
Reconciliation update

Fold objective-object behavior distortion and local anti-power room granularity into this issue.

Implementation emphasis:

* some high-value anomalies should distort holder behavior, trust, and alliance logic while in possession instead of functioning only as treasure
* local anti-power zones may suppress operator tools without erasing resident hazards, social scenes, or active room ecology already present inside the space

This keeps behavior-distorting objective objects and granular anti-power room logic inside the anomaly compendium boundary.

- 2026-04-22T06:06:29.295Z
Reconciliation update

Fold objective-object behavioral distortion into this issue.

Implementation emphasis:

* some high-value anomalies should distort trust, paranoia, and alliance behavior around the current possessor instead of functioning only as treasure to be extracted

This keeps behavior-distorting objective objects inside the anomaly compendium boundary.

- 2026-04-22T05:44:44.548Z
Reconciliation update

Fold differentiated undead subtypes, mixed-channel apex attacks, medium-bound anomaly actors, leader-variant creature families, ecology-tagged hostile summaries, humanoid role diversity, and concise disposition tags into this issue.

Implementation emphasis:

* undead, dragons, giants, and similar families should continue to split into distinct subtype identities rather than flat family buckets
* apex entities may combine aura, breath, drain, command, curse, and direct attack channels instead of relying on one mode only
* some anomalies may remain bound to a local medium or zone rather than roam freely
* creature families should support leader or sovereign variants with distinct authority or encounter-weight behavior
* hostile summaries should preserve ecology cues, role diversity, and concise disposition tags as first-class authoring fields

This keeps subtype differentiation, mixed attack channels, medium-bound anomalies, leader variants, ecology tags, and disposition cues inside the compendium boundary.

- 2026-04-22T05:32:51.349Z
Reconciliation update

Fold front-facing category icon coding into this issue.

Implementation emphasis:

* visual identity surfaces should let users distinguish actor, anomaly, item, vehicle, or utility card class at a glance before reading dense detail

This keeps front-facing category coding inside the compendium and taxonomy boundary.

- 2026-04-19T21:27:05.071Z
Contradiction check

The current project should not overassume humanoid-default creature structure.

Implementation emphasis:

* if creature systems still lean too heavily on bipedal movement, hand-held weapon use, upright reach assumptions, or humanoid spacing as the baseline authoring grammar, that should be treated as a contradiction
* body plan should remain a first-class taxonomy surface rather than a cosmetic skin over humanoid defaults

This keeps the contradiction check visible inside the anomaly compendium and taxonomy boundary.

- 2026-04-18T02:44:36.846Z
Reconciliation update

Fold compact procedural descriptor notation for generated content into this issue.

Implementation emphasis:

* procedural entities, site packets, occupant groups, and equipment bundles may use dense but governed descriptor formats so generation output stays machine-readable, auditable, and compact
* the same governed notation should support large range tables and stocking ledgers without losing field semantics or cross-entry comparability
* compact descriptors should improve reference integrity and downstream inspection rather than acting as opaque shorthand that only exists inside one generator

This keeps compact procedural notation and dense table grammar inside the compendium and taxonomy-governance boundary.

- 2026-04-17T23:20:38.007Z
Reconciliation update

Fold functional ability-family taxonomy into this issue.

Implementation emphasis:

* capability libraries may be grouped by operational purpose such as destructive, protective, enhancement, investigative, cognitive, or transit-facing families rather than only by acquisition order or alphabetic listing
* these families should support authoring review, balancing, and discoverability across both technical and anomaly-facing methods
* taxonomy should remain compact and governed so the same family language can appear in compendium records, acquisition paths, and role-facing reference surfaces

This keeps functional ability bucketing inside the compendium and taxonomy-governance boundary.

- 2026-04-16T01:40:51.882Z
This comment thread is synced to a corresponding [GitHub issue](https://github.com/JamesJedi420/containment-protocol/issues/88). All replies are displayed in both locations.

---
