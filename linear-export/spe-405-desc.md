Goal:
Implement a bounded summoning layer so some summon families escalate through discrete named tiers while others remain special-case summons with unique roles.

Scope:

* support summon ladders with numbered or tiered progression
* support special-case summon families such as familiars, stalkers, swarms, or elementals outside one generic ladder
* support local-substrate summons that draw from available material in the environment, potentially producing temperament-mismatched obedience problems and creating future vendetta or service-liability even when the ritual succeeds
* support environments that intercept or substitute hostile local entities into summon results instead of honoring the intended output
* support created or summoned entities as runtime actors with explicit capability omissions, delayed activation, owner state, upkeep source, dismissal authority, and different creator-loss collapse behavior rather than full-parity copies
* support ownership transfer under hostile control so command, upkeep, and dismissal rights move to the new controller rather than remaining with the original source
* support material-gated summons when the entity family requires specific substrate, with explicit duration, command scope, and dismissal handling
* support fidelity-banded animation control distinguishing crude motion alone from precise shaping or control more closely paired
* keep summoning separate from control, with visible costly preparation, hard interruption points, and failure states that still leave residue, collateral damage, or partial arrival evidence
* support powerful entities resisting or distorting summoning when they read the destination as confinement, trap-world, or hostile context
* support concentration-break or command-loss reverting summons to uncontrolled or hostile behavior rather than preserving passive obedience
* support medium and environment filtering summon legality so aquatic, planar, or otherwise specialized contexts admit only forms that can actually function there
* support setting-bound creature filters through both positive myth-native curation and explicit deny-lists separate from a wider global bestiary
* support body-channel occupancy, temporary speech lockout, captive power sources, and unstable anchored manifestations as valid summon or release costs
* support command-bound summon formations legal only in specific contexts such as battles, with direct obedience inheritance and no ordinary morale behavior
* support one-active-instance summon bags with limited weekly draws
* support aggregate-capacity budgeting by total hits, levels, or capacity rather than one named unit type
* support proxy bodies such as hands, hammers, staves, or temporary servants instantiated through some summon effects
* support ordered multi-target resolution or weakest-first budget chains instead of uniform simultaneous application
* support sensory-triggered effect channels depending on sight, hearing, or proximity-glyph contact rather than direct target selection only
* distinguish summon taxonomy from one undifferentiated summon action
* connect the layer to proxy actors and battlefield-only summon rules where relevant

Constraints:

* deterministic only
* no universal summon sandbox
* no assumption that every summon scales through one free parameter
* no assumption that summoning always creates a controlled ally
* no assumption that obedience and clean return semantics are default for all families
* prefer compact summon-family packets over sprawling spell trees
* keep summon family, substrate requirements, fidelity tier, control state, and ownership surface legible enough for planning and debugging

Acceptance criteria:

* at least one summon family uses explicit tiered progression
* at least one summon family remains structurally distinct from that ladder
* at least one summon draws from local substrate and creates liability or temperament mismatch rather than clean obedience
* at least one environment substitutes a hostile entity into the intended summon result
* at least one created entity tracks capability omissions, upkeep state, and ownership independently
* at least one powerful entity resists or distorts the summon because it reads the destination as hostile
* at least one concentration break reverts a summoned entity to hostile or uncontrolled behavior
* targeted tests or validation examples cover deterministic summon taxonomy, substrate risk, control loss, ownership transfer, and environment filtering
