# SPE-720 — parent-world node membership

[SPE-720](https://linear.app/spectranoir/issue/SPE-720/parent-world-node-membership-and-local-state) defines a pure snapshot of one parent-world reference and independent node references with caller-supplied local-state values. Validation rejects malformed or duplicate nodes and creates a stable, defensively copied projection. The model does not decide what a state value means, establish the existence of a referenced world or node, or create routes, geography, persistence, or simulation state.

Synthetic tests cover two nodes with distinct local states, membership lookup, order independence, defensive copying, and malformed input. They do not demonstrate normal gameplay use. Route asymmetry and other parent SPE-368 behavior remain outside this slice.
