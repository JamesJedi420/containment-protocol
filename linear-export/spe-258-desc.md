Goal:
Implement delayed postmortem conversion so consumables, baths, bites, or similar effects can provide short-horizon benefit while planting a later death-triggered transformation state.

Scope:

* support consumables, immersion effects, or contact vectors that apply delayed postmortem conversion state
* support explicit onward-spread limits for contact vectors so not every infection source automatically chains into a propagating outbreak
* support immediate living benefits and later corpse conversion coexisting in one authored packet
* support family-specific payload variance so contact vectors may deliver rot, convulsion, blindness, hemorrhage, dehydration, or other authored outcomes rather than one default disease for all targets
* support source-obscured attribution and delayed onset so the origin of an active condition may remain unclear until investigation resolves it
* support visible staged progression with day-by-day attribute loss and spellcasting disruption rather than binary infection states
* support staged decline phases through weakness, respiratory distress, surface lesions, motor failure, and death rather than one flat sick-or-dead state
* support separate healing suppression that blocks restoration from items, consumables, and magic even when the target is not at terminal damage, distinct from ordinary damage pressure
* support multi-phase cure sequences requiring source elimination, personal restitution or atonement, and a final active-state rite rather than one generic cleanse
* support cure stage ordering constraints where exact sequencing of absolution, disease purge, and curse removal matters, and failed or misordered attempts can snap back into hostile retransformation or frenzy
* support origin-class cure variation so inherited, transmitted, and curse-derived conditions do not share one uniform treatment path
* support kill method and ritual treatment at death as determinants of which converted class a body becomes rather than assuming all death conversion produces one default outcome
* support failed restoration as a transformation pathway so failed raise or resurrection attempts can produce hostile or transformed outcomes rather than simple null results
* scale conversion result or progression severity by victim tier, class, or biology where relevant
* connect the layer to attrition, corpse handling, undead and transformed actor systems, cure logic, and civic consequence systems where relevant
* preserve inspectable delay and stage state suitable for player planning and debugging

Constraints:

* deterministic only
* no assumption that all death conversion happens instantly on exposure
* no single uniform converted result for all targets by default
* no assumption that every contact vector chains into indefinite propagation
* no assumption that cure is always achievable through one generic cleanse
* prefer compact delayed-state and conversion tables over sprawling undead ontologies
* keep cure timing, stage progression, and origin-class variation legible enough for intervention play

Acceptance criteria:

* at least one consumable, bath, or contact vector applies a delayed death-trigger conversion state
* at least one contact vector delivers different payload types by target family rather than one default outcome
* at least one conversion result or progression path scales by target tier or class
* at least one progressive infection advances day-by-day through staged attribute loss and spellcasting disruption rather than a single threshold
* at least one active condition suppresses healing from items and consumables independently of damage state
* at least one cure sequence requires multi-phase ordering and fails catastrophically if the chain breaks or is misordered
* at least one failed restoration attempt produces a hostile or transformed outcome rather than a null result
* at least one cure path varies by origin class so transmitted and curse-derived conditions do not share one treatment
* targeted tests cover deterministic delayed trigger, death conversion, staged progression, healing suppression, cure ordering, cure-failure transformation, origin-class variation, and tier-scaling behavior
