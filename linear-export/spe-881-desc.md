Goal:
Implement a bounded arc-state layer so a multi-anchor anomaly series can track one shared activation window, per-anchor conditions, clue prerequisites, faction awareness, and final unlock state rather than treating each anchor as an unrelated one-off.

Scope:

* support several nodes of the same anomaly class operating independently or in parallel under a shared anomaly family rather than one singular world event
* support one shared activation cycle with hard global timing
* support per-node activation states including dormant, active, destabilized, artificially triggered, collapsed, keyed, traversed, compromised, and repaired
* support cyclical intensity spikes and temporal surge windows trackable at node level that may synchronize pressure across locations without requiring simultaneous full breach
* support artificial reactivation of previously closed nodes so anomaly arcs are neither permanently eliminated nor continuously available after first discovery
* support distributed prerequisite chains where earlier anchors contribute clue state to later access
* support faction awareness and synchronized faction clocks so competing plans accelerate against the same anomaly window rather than pacing independently
* support interleaved side-arc content that runs concurrently with other missions while remaining bounded by one global countdown
* support fallback progression paths when mandatory clue routes are missed without erasing the primary puzzle path
* distinguish multi-anchor arc state from single-gate portal behavior or generic campaign clocks
* connect the layer to portal classes, rival-expedition, and clue-capture systems where relevant

Constraints:

* deterministic only
* no full campaign-state sandbox
* no assumption that every anchor is independently discoverable or relevant at the same time
* prefer compact arc packets over sprawling bespoke campaign prose
* keep active window, per-node state, final unlock condition, and reactivation eligibility legible enough for planning and debugging

Acceptance criteria:

* at least one anomaly arc tracks a shared timer plus individual anchor states together
* at least one later access condition depends on clues or states gathered at earlier anchors
* at least one rival or faction pressure surface reads from the same shared window
* at least one previously resolved node is artificially reactivated or recurs after first discovery
* at least one case supports two or more nodes of the same anomaly class operating independently under a shared anomaly family
* targeted tests or validation examples cover deterministic global timing, per-anchor progression, prerequisite unlock behavior, node-level surge windows, and artificial reactivation
