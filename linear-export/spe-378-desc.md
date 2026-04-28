Goal:
Implement a bounded defeat layer so some anomalies require bespoke interaction procedures instead of ordinary damage races to neutralize.

Scope:

* support enemies defeated through custom verbs, ingestion, containment, ritual, or other special procedures
* allow those procedures to replace normal kill logic in bounded cases
* support special risk states during the defeat sequence
* support compromised survivors choosing deliberate self-termination as a bounded containment decision when control loss is imminent and no host-safe cure window remains, distinct from panic or despair
* support overwhelming-force encounters as explicitly hide-or-die or comply-or-die situations where concealment, surrender, or total avoidance are the only viable responses and direct combat is invalid by design
* support ritual sport constraints on some predator or hunting parties, including trophy limits, rank-obedience rules, or movement restrictions under hunt terms
* support target-class-gated existential defeat paths such as forbidden phrases, symbol-state countermeasures, or absolute conditions effective against patron-scale beings, remnants, or bound proxies without becoming universal combat shortcuts
* support mandatory operator cost for some sacrificial success conditions, including lethal or effectively terminal sacrifice when the procedure is designed as a one-use mutual-destruction solution
* support endpoint variety beyond HP death: preserved, absorbed, fused, entombed, routed into unknown transit, trapped by visit count, or merged into environment
* support relocation-only defeat conditions where environmental displacement or route severance is the only viable resolution when ordinary counters fail
* support multi-step permanent neutralization chains requiring body destruction, vessel destruction, and restoration of a broken containment structure rather than a single kill endpoint
* support restoring a missing physical key component to a seal, circle, or ward as a valid neutralization step equivalent to defeating the active form
* keep tactical victory over one current body distinct from true removal whenever a source spirit, vessel, or damaged containment network can reconstitute the threat
* support corpse preparation and burial procedure altering postmortem anomaly risk through route handling, grave treatment, and threshold marking
* support some hostile entities being safest to neutralize when their resting place is known and they are breached in an inactive state
* support multi-step destruction chains where staking, dismemberment, burning, grave treatment, or equivalent chained steps constitute the real kill protocol rather than one lethal threshold
* support release-condition removal as a valid defeat path for haunts or undead resolved by correcting an original injustice or freeing bound remains rather than by force
* connect the layer to puzzle encounters, item activation, and anomaly handling where relevant

Constraints:

* deterministic only
* no universal bespoke minigame for every boss
* no assumption that every enemy is solved by damage throughput
* no assumption that tactical victory over the active form equals permanent neutralization
* prefer compact defeat procedures over sprawling scripted fights
* keep defeat procedure type, required steps, tactical-versus-true-removal distinction, and success cost legible enough for planning and debugging

Acceptance criteria:

* at least one hostile entity uses a nonstandard defeat procedure instead of ordinary kill logic
* at least one procedure includes its own risk or failure states
* at least one overwhelming-force encounter is only resolvable through avoidance or compliance, not combat
* at least one defeat uses a target-class-gated existential condition effective only against patron-scale or bound entities
* at least one successful defeat procedure carries mandatory lethal or terminal operator cost
* at least one neutralization requires more than one distinct step to achieve true removal rather than tactical victory
* at least one hostile entity can reconstitute after tactical defeat unless all required neutralization steps are completed
* at least one release-condition path resolves a haunt or undead through injustice correction or remains liberation rather than combat
* targeted tests cover deterministic bespoke defeat procedures, multi-step neutralization, tactical-versus-true-removal distinction, and overwhelming-force avoidance
