# SPE-3103 — Canonical personnel relationship substrate

Existing approved owner: SPE-3103; parent SPE-208 remains separate. Codex continues from main `4ea02cd3f07d3c43c645d1b9ace1eaf841a5a807` on `codex/spe-3103-personnel-relationships`. This implements the existing slice, not the parent relationship-trajectory system or SPE-3122 actor-intrinsic profiles.

## Authority and integration

`Agent.relationships` remains the sole directional numeric authority in `[-2, 2]`. Shared operations create, mutate, query and explicitly remove edges. Separate optional metadata contains only owner-authored typed tags and stable reason/source/week/event references, never another relationship value. Tags support trust, strain, loyalty, rivalry, mentorship, dependence and betrayal; they are not inferred from kinship, shared-universe facts or a scalar threshold. SPE-208 and existing social rules retain those semantic decisions.

The existing Training Division action invokes store reconciliation, then shared edge mutation and canonical `agent.relationship_changed` events. Event delivery commits metadata through the shared operation without replaying an earlier event over newer simulation values. Existing chemistry/cohesion reads use the shared value query and existing tier thresholds. Intermediate producer calculations remain with their existing rules; canonical event delivery records their final edge provenance. Team drills now emit directional relationship events with the `training` reason. External chemistry emits both changed directions, including sub-cent changes, while recording one historical snapshot per pair. Pair-history snapshots are not current directional state.

History bonds are a compatibility/history mirror: the changed counterpart is updated, unrelated historical entries remain history, and chemistry never reads them as an alternate current value. Removal clears the current edge and its bond mirror while retaining structured terminal provenance and operation history. Removing an absent edge is a no-op; explicit re-creation requires new valid provenance. No death/departure decision or automatic severing is invented; SPE-1068 retains that policy.

References remain opaque stable IDs owned by existing Agent/staff/social records. The substrate can reference an existing non-Agent staff record without creating an actor registry or copying actor-intrinsic fields. The staff-reference persistence test constructs an existing instructor contract; it does not prove a new authority-interaction gameplay flow. No new such interaction is claimed or selected. Shared-universe relationship facts never initialize local chemistry.

## Persistence and acceptance

Agent normalization and run transfer preserve valid metadata, tags and terminal records; malformed, orphaned, self, unknown-reason and future-week metadata is discarded deterministically. Missing legacy metadata remains unknown rather than acquiring invented historical events. Import never inherits missing metadata from a fallback campaign. Canonical legacy chemistry reconciliation and reason validation from SPE-2655 remain in use; training is an additive permitted reason with the same payload shape and numeric checks.

Tests exercise asymmetric creation/mutation, bounded adjacency queries, tier changes, terminal handling, typed references, malformed/legacy repair and save/load. Constructed-campaign integration uses the actual store reconciliation action, canonical events, chemistry/cohesion consumer and run export/import. Team-training integration queues an actual drill and advances the normal week loop. This is store/simulation evidence, not an observed browser session. No UI is changed.

Validation and reviewed/merged revisions are recorded in the PR and Linear. Required checks are selected by SPE-3348; the new suite belongs in the test-completeness inventory. No SPE-3055 implementation, 27-diagnostic cleanup, new issue/relationship, second graph, hidden probability rule or unrelated social policy is included. Hermes checkpoints use bounded direct verification under the no-external-dispatch restriction; configured independent PR review remains a separate shipping gate.
