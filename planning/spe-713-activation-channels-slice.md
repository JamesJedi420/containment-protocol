# SPE-713 — activation channel grammar

[SPE-713](https://linear.app/spectranoir/issue/SPE-713/activation-channel-taxonomy-for-artifacts-and-devices) defines deterministic channel declarations and signal matching. Each caller-authored channel has a kind, trigger reference, required signal references, and cost-type reference. The matcher consumes supplied observations; it does not query hidden state, decide eligibility, spend a resource, execute an effect, or maintain an activation. SPE-714, SPE-3169, SPE-715 and the relevant effect/physical-state owners retain those responsibilities.

Synthetic tests exercise speech, formation, and physical disturbance with distinct inputs, triggers and costs, including a nonverbal item action and rejection of unrelated movement. These are contract fixtures, not live equipment or gameplay evidence. The broader parent SPE-576 remains Backlog.
