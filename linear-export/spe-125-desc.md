Goal:
Implement a bounded relic layer so certain artifacts can anchor, preserve, transfer, or corrupt a life-state at severe long-term cost instead of functioning as ordinary beneficial items.

Scope:

* support relics that preserve or tether an actor's continued existence through an external anchor object
* support anchor material surviving physical transformation including melting, reforging, splitting, and repurposing, so murder-linked objects preserve their bind through material changes rather than requiring named-object continuity
* support heirloom and gift transfer routes so institutional or collective material can become a personal wearable without losing its underlying anchor state
* include carried jewelry and worn objects in sweep logic when distributed-anchor material remains unresolved
* support multiple active anchors per entity rather than assuming a one-anchor-per-entity limit
* allow removal, transfer, or misuse of the anchor to trigger catastrophic outcomes such as death, madness, undeath, progression loss, or body corruption
* support carriers or later holders becoming degraded over time through curse spread, drain, or imposed transformation rather than suffering one instant effect only
* support curse severity gradients from minor inconvenience through lethal transformation, with focus items improving reliability on a gradient from owned item to touched item to crafted effigy
* preserve break conditions, loopholes, and paradox failure paths for every curse, and allow the original curser to withdraw directly where that family permits
* support death-triggered curses that invert trusted gear into authored liabilities including near-never-hit weapons and protection that attracts harm
* support visible permanent body marks functioning as cross-region faction hostility flags long after the originating event
* support theft-triggered timed transformation that advances over a fixed clock, halts when discarded, but leaves partial permanence if the process was interrupted late rather than cleanly reversing to baseline
* support cursed weapon ownership through separation obsession and daily kill pressure, where missed feeding escalates body gain, mental decline, and eventual irreversible bestial lock-in
* support multi-path destruction with origin-sensitive break clauses and purpose-fulfillment shatter conditions rather than one canonical disposal rule
* support external soul anchors as precisely engineered objects with explicit construction details, concealment-versus-access tradeoffs, and destruction aftermath rather than generic special loot
* support ascension paths that hinge on exact ritual timing, lethal ingestion, and a short helpless interval before the new state is fully operational
* support long-cycle maintenance rites that are existentially necessary, with missed upkeep degrading power, body integrity, and command authority over time
* support daily toxic maintenance loops where the sustaining substance preserves life or youth but imposes ongoing punishment, and refusal triggers accelerated aging or collapse without clean release
* support murder-linked relics that bind through first bare-skin blood contact, accumulate emotional residue across killings, and run the murder cycle on a long periodic chain tied to object transfer rather than to one bearer only
* support cursed items that permanently rewrite the user into a hybrid predator body with specific body-plan changes, altered movement, and form-specific capability gaps
* support destroying the linked focus component as a valid defeat or cure path for cursed-body states
* support false-ghost conditions from bound curse-items that perfectly mimic haunting or undeath while the victim is technically alive, with temporary suppression followed by later reactivation and reacquisition risk
* distinguish preserving life, transferring burden, and corrupting the host so not all life-anchor relics behave as simple immortality devices
* connect the layer to relic authoring, medical response, identity-state, and bound-entity systems where appropriate

Constraints:

* deterministic only
* no universal resurrection-item sandbox
* no flattening of severe curse state into a small temporary debuff
* no assumption that anchor continuity requires named-object form
* no assumption that one entity can hold only one anchor
* prefer a small number of explicit anchor-state patterns over many bespoke phylactery variants
* keep cause, consequence, maintenance state, and material-continuity legible enough for player explanation and long-term state review

Acceptance criteria:

* at least one relic can preserve or tether a life-state externally
* at least one anchor object preserves its bind after physical transformation such as melting, reforging, or splitting
* at least one direct handling path can kill or catastrophically harm the remover or wearer
* at least one later carrier accumulates corruption, drain, or transformation over time
* at least one curse advances through a severity gradient with an explicit break condition or paradox failure path
* at least one theft-triggered transformation halts when discarded but leaves partial permanence when interrupted late
* at least one cursed weapon creates separation obsession and behavioral escalation through missed feeding cycles
* at least one life-anchor requires long-cycle maintenance, with missed upkeep visibly degrading power or body integrity
* at least one cursed item creates a daily toxic maintenance loop where the preserving substance also punishes the carrier
* at least one false-ghost condition mimics haunting while the victim is alive, suppresses temporarily, and reactivates after apparent cure
* targeted tests cover deterministic anchor persistence, material-transformation continuity, transfer and removal outcomes, maintenance decay, and long-horizon curse consequences
