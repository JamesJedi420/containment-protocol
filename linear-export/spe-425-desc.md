Goal:
Implement a bounded hostile-behavior layer so some enemies prioritize taking targets alive for ritual, labor, or staging value instead of simple kill optimization.

Scope:

* support live-capture preference in target selection and attack choices
* support prisoner stripping, holding, conditioning, or later ritual preparation as downstream states
* support impostor predators preferring nonlethal capture when living templates provide memory access, social leverage, or identity-maintenance value rather than optimizing for immediate kill
* support kill-versus-capture switching based on target state, so some hostile groups prefer kill against armed or actively resisting targets but switch to capture against unarmed or vulnerable ones
* support nonlethal defeat routing into stripping, tying, bait placement, imprisonment, conversion prep, or entity delivery rather than one generic captive outcome
* support opportunistic small-creature or ambush actors that avoid fair fights, stalk larger groups, and exploit isolation before committing
* support state-gated source-to-progeny control that operates as coarse directive pressure only when both controller and progeny are in transformed states, with no fine-motor micromanagement
* support newly activated hosts maturing behaviorally from obvious frenzy toward more careful stealth predation over repeated episodes rather than staying static from first expression onward
* support downed operators remaining in play through hostile detention, conversion prep, slave-force reassignment, or laboratory roles rather than automatic out-of-play removal
* support capture-forward encounter design as the primary doctrine in enemy home territory, with incapacitation and abduction treated as intended outcomes, and key ally deaths separating mission success from ally survival
* support burrowing or ambush undead using subsurface movement, wake-trails, upward eruptions, and grab-first attack vectors, with forensic signatures such as desiccated husks, half-buried victims, and woundless terror-corpses
* support stable live-captive households with differentiated prisoner attitudes including collaborators, frightened nonactors, resigned prisoners, and escape planners, with long-horizon ownership behavior
* support live-target quality tracking for mission branches, with multi-specimen bonuses, condition-sensitive objectives, and age-tier trainability materially affecting capture viability
* distinguish capture-priority behavior from generic nonlethal branches only
* connect the layer to prison systems, ritual rooms, and objective handling where relevant

Constraints:

* deterministic only
* no universal slave-raid simulator
* no assumption that every hostile force optimizes for immediate kills
* no assumption that downed operators are automatically out of play in hostile territory
* prefer compact capture-priority states over sprawling prison simulation
* keep capture preference, target-state switching, captive downstream state, and progeny-control tier legible enough for planning and debugging

Acceptance criteria:

* at least one hostile group changes behavior because living captives have downstream value
* at least one combat or capture outcome differs materially from kill-first logic
* at least one impostor predator prefers nonlethal capture specifically because living templates provide memory or identity value
* at least one downed operator is rerouted into a captive or conversion state within the same scenario rather than removed from play
* at least one capture objective tracks target condition, with a multi-specimen or condition-quality branch
* at least one newly activated host progresses from frenzy toward stealth predation over repeated episodes
* targeted tests cover deterministic capture-priority behavior, kill-versus-capture switching, downed-operator rerouting, and captive downstream state
