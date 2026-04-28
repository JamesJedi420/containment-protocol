Goal:
Implement bounded preplaced site trigger families so delayed or conditional site-state effects can change later operations without bespoke scripting for every room.

Scope:

* support preplaced and conditionally triggered effects such as alarms, delayed blasts, sealed responses, trap glyphs, persistent site fields, and comparable reusable trigger families
* support interaction-surface trigger taxonomy distinguishing viewing, touching, opening, looting, proximity, and rough investigation as distinct trigger surfaces rather than treating all hostile effects as equivalent attack actions
* support directional trap origin rules with explicit origin points and directional delivery: front-fired, top-fired, bottom-fired, wall-fired, container-internal, and forward-opening mechanics tied to the interaction context
* support deferred hazard onset so some effects arm on one step and resolve later — delayed blasts, delayed regeneration start, and other deferred-onset behaviors rather than assuming immediate application only
* support trap metadata-first generation where authoring begins from visibility, accessibility, lethality, and difficulty before selecting effect family; lethal hazards support delayed kill, ongoing injury, elemental analogs, layered pit features, and escape-denial structures; treasure containers inherit lock and trap state as part of reward generation
* support decor-to-hostile conversion where decorative fixtures such as statues, gargoyles, tapestries, and figureheads convert into runtime defenders on touch, climb, phrase, or delayed incantation triggers; fixture-disguised actors present as architectural decor until activation conditions are met
* support passive watcher proxies: remote watcher fixtures that observe without moving or attacking directly, and site fixtures binding trigger zones to reusable proxy announcers or recorded-warning response entities that repeat without requiring an active operator
* support resettable false-asset fixtures: false caches that present visible value, collapse on direct disturbance, and regenerate on timed reset as site-side deceptive fixtures rather than ordinary containers
* support guardian-release containers and containment-door releases: containers holding bound hostile entities released by opening or mishandling; sealed rooms functioning as containment state for dormant hostile populations with breach acting as the wake trigger
* support guardian-bound visible treasure where obvious reward objects are mounted directly on guardians so extraction is itself the activation condition; moving a high-value object may reveal both a concealed guardian and a second-layer reward cache beneath it
* support first-entry stasis breaks: some rooms preserve bodies, clues, or local state under stasis until first disturbance, then permanently transition into ordinary runtime
* support grouped-container risk logic distributing explosive or hostile outcomes across a set dynamically rather than assigning one fixed trapped container forever
* support displacement-triggered room-scale effects where high-value objects trigger room-scale lockdown or broad floor-failure effects when displaced or opened, so trap scope need not stay container-local
* support cumulative-trigger traversal traps that accumulate trigger pressure through traffic count, actor size, or repeated crossings rather than one flat activation chance
* support sound-triggered and dwell-time triggers: hidden hazard actors keyed off traversal sound on specific structures with short response delays; escalating noncombat or harmful effects based on dwell time inside the space rather than immediate trigger alone
* support multi-stage trap payloads and theatrical relocation trap endpoints: relocation traps throwing victims to exposed, falling, or theatrical destinations; ordinary debris, clutter, or room dressing incubating delayed hostile emergence; colony hazards combining passive environmental danger with active retaliation when disturbed
* support zone-scale illusion shells: persistent false-environment shells that rewrite the whole scene presentation until disrupted; false scenes hiding multiple actors with different reveal thresholds, response scripts, and escalation timing once the shell breaks; staged looping illusion hazards that cycle through a scripted progression unless bypassed or interrupted
* support airborne incapacitant hazards with nonlethal behavioral impairment, involuntary noise generation, and alert spillover rather than damage-only gas logic; bottled or room-scale delivery both supported
* support door-conditioned and architecture-conditioned hazard rooms where environmental hazards depend on door, vent, airflow, or enclosure state while remaining architectural rather than overtly anomalous in source
* support dense overgrowth and fungal hazard volumes combining movement penalty, visibility loss, spore-triggered response, and unsafe sampling inside one hazard packet
* support fall-to-immersion trap chains: vertical trap chains continuing beyond impact into immersion, encumbrance, cold exposure, and recovery burden rather than ending at fall damage only
* support liquid-state trigger systems: cross-liquid neutralization reagents that apply one broad neutralized state while allowing liquid-specific downstream outcomes; threshold-triggered fire suppression that activates automatically only after a blaze exceeds a defined threshold; delayed-input healing conversion where containers convert water into healing charges after a waiting period with finite use count; concentration ignition through handheld sources creating environmental fire while exposing the user to vulnerability during use
* support narrow detector artifacts and embedded hazard-resource nodes: small site relics functioning as detection tools with limited range or specificity; embedded relics functioning simultaneously as hazard triggers and later resource or salvage objects once safely handled
* support false-source oracle channels where oracle devices speak through environmental media such as vapors or acoustically redirected chambers while the true operator remains hidden; some oracle devices answer only one question per actor per day and wrap the useful answer in distracting or irrelevant output rather than clean certainty
* support living-body-operated mechanisms that validate a living seated or anchored body rather than allowing remote activation, making physical presence itself part of the key
* support fixture-embedded advisory entities: environmental fixtures such as fountains, tables, and pillars hosting concealed advisory entities without functioning as ordinary loot or NPCs; passive suppression stockpiles suppressing nearby ecological growth or altering ambient behavior without overt activation; objects that relocate on very long periodic cycles creating slow-moving state changes
* support modality-specific flora and environmental hazards with different hazard channels by interaction mode — smelling, tasting, close examination, or disturbance — rather than one generic inspect result
* support concealed subzone hazard volumes where soft partitions and similar boundaries hide real restraint or hazard volume behind apparently non-solid surfaces
* support web system variants including material overrides and altar-linked auto-restraint beyond ordinary flammable hazard webs
* support map-metadata-first trigger authoring where some site content is stored primarily as map metadata, legend symbols, and route annotations rather than keyed prose per feature; one shared symbol vocabulary operates across many map assets and scales without losing local identity
* support clue-first, misleading-first, or escalating outcomes instead of immediate damage only when a trigger family activates
* distinguish trigger-family behavior from the child surfaces for deceptive topology and weird-room local rule overrides; keep this parent focused on reusable trigger packages and activation semantics rather than broader route deception, room-scoped reality shifts, or room-local rule overrides
* connect the trigger-family shell to SPE-814 for deceptive topology and false-route states and to SPE-815 for weird-room state and local rule overrides

Constraints:

* deterministic only
* no full immersive-sim room-logic rewrite
* no purely ornamental weirdness with no operational effect
* prefer reusable trigger families over bespoke one-off room scripts
* route false-route topology, rotating rooms, sloped-floor relocations, and deceptive spatial controls to SPE-814 rather than absorbing them here
* route room-local rule overrides, emotion-driven environmental rewrites, and local aura-driven state changes to SPE-815 rather than absorbing them here
* reuse existing site, hazard, routing, and hidden-state infrastructure where possible

Acceptance criteria:

* at least one site supports a delayed or conditional preplaced effect that changes later operations
* at least one trigger family produces clue-first, misleading-first, or escalating outcomes before full resolution
* trigger surface taxonomy covers at least viewing, touching, opening, looting, proximity, and rough investigation as independently handled surfaces
* at least one directional trap delivery uses an explicit origin point such as front-fired or wall-fired rather than an omnidirectional effect
* at least one deferred-onset hazard arms on a first interaction and resolves on a later separate event
* at least one guardian-release container or containment-door release triggers on breach rather than on direct attack
* at least one zone-scale illusion shell hides multiple actors with different reveal thresholds
* trigger-family behavior remains separable from deceptive-topology handling in SPE-814 and weird-room state logic in SPE-815
* reusable trigger semantics are legible enough for authoring and debugging review
* targeted tests or validation examples cover deterministic trigger timing, activation conditions, directional delivery, deferred onset, and downstream outcome changes
