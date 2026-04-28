Goal:
Implement a bounded escalation layer so a higher anomaly can repeatedly possess newly available corpses, sustaining combat through host replacement rather than a single body.

Scope:

* support corpse-triggered manifestation of a higher entity within a bounded host-class radius
* support vessel artifacts that grant or extend the possession radius to eligible host classes
* allow repeated host hopping as new bodies become available
* support varied possession and attachment subtypes including body takeover, carried-object habitation, escort-ghost presence, and co-occupant states rather than one flat possession family
* support portable-anchor habitation through carried items and nearby objects so the threat can travel across scenes without full corporeal manifestation
* support memory drain and body-replacement pressure as independent ghost tactics alongside direct harm
* support controller interruption and forced expulsion creating a brief minion-disruption window in which dependent undead stall, lose coordination, or become temporarily vulnerable
* support kill-method-dependent conversion where victims slain by a source attack convert into stronger minion types, producing identity shock for nearby allies
* support residue intelligence from failed transfer attempts, animating the nearest viable corpse after a delay rather than immediately
* support preemptive dormant-shell destruction to prevent later residue manifestation
* let cumulative chance or room-specific conditions raise the likelihood of manifestation over time
* connect the layer to ritual kill spaces, undead families, and identity-overwrite systems where relevant

Constraints:

* deterministic only
* no universal necromancy simulator
* no assumption that one boss equals one body for the whole encounter
* no assumption that every possession attempt is corpse-only or requires direct contact
* prefer compact corpse-chain rules over sprawling resurrection logic
* keep possession radius, host-class eligibility, disruption window, and residue state legible enough for planning and debugging

Acceptance criteria:

* at least one entity can jump from one corpse host to another during a fight or ritual sequence
* at least one possession is delivered through a carried object or portable anchor rather than direct body entry
* at least one controller interruption creates a minion-disruption window affecting dependent undead
* at least one kill creates a stronger minion through source-conversion rather than ordinary summoning
* at least one residue intelligence animates a dormant shell after a delay following a failed transfer attempt
* at least one dormant shell can be destroyed preemptively to prevent later manifestation
* targeted tests or validation examples cover deterministic corpse-chain possession, portable anchor habitation, controller disruption, kill-method conversion, and residue animation
