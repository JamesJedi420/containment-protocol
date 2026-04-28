Goal:
Implement a bounded haunted-site state model so one location can host several concurrent presences with different intentions, visibility rules, and resolution paths instead of collapsing the whole site to one ghost and one exorcism outcome.

Scope:

* support several simultaneous presences in one site, including hostile, protective, dormant, residual, hidden, and unknown categories
* support site wounds or prior breach scars that attract later secondary infestations without requiring the new presence to be the original killer or victim
* support room-weighted anomaly centers tied to historical event geometry, prior room function, and current pressure concentration
* support false-clear states where one presence is reduced or suppressed while another remains active or becomes newly legible only after the ritual
* support protective manifestations that initially resemble the hostile visual grammar, forcing recognition and relationship-based reclassification before response
* support nonhostile communicative presences that deliver chained partial clues such as numbers, room references, or whisper fragments pointing toward the true hostile source rather than resolving the case directly
* support resolutions where presences cancel, consume, suppress, or destroy one another rather than only being solved by the player directly
* distinguish multi-presence haunted sites from ordinary one-anchor haunt packets or generic concurrent faction occupancy
* connect the layer to haunt resolution, detection, room-state, and campaign-thread systems where relevant

Constraints:

* deterministic only
* no universal all-sites-are-complex assumption
* no assumption that all presences share the same hostility, visibility, or anchor relationship
* no assumption that every manifestation at a haunted site is purely hostile or inert
* prefer compact presence-state packets and interaction rules over sprawling custom ghost casts
* keep active-presence count, disposition, clue-chain state, and residual risk legible enough for planning and debugging

Acceptance criteria:

* at least one site contains more than one active presence with materially different intent or role
* at least one ritual creates a false-clear state because a second presence remains unresolved
* at least one protective manifestation is initially misread as hostile because it shares the event's visual language
* at least one site wound attracts a later secondary presence distinct from the original event source
* at least one nonhostile communicative presence delivers a chained partial clue sequence pointing toward the true hostile rather than resolving the case directly
* at least one resolution path uses entity cancellation or mutual destruction instead of player-only elimination
* targeted tests or validation examples cover deterministic multi-presence coexistence, false-clear aftermath, recognition-based reclassification, communicative clue chains, and inter-entity resolution
