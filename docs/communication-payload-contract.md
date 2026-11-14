# SPE-2268 — communication payload contract

## Boundary

This is the existing SPE-2268 payload-schema and selector-input slice. Communication acts classify what a message purports to do. An `order`, `authorization`, approver or authorizer reference never grants authority, establishes truth/consent, executes a command, or proves delivery. SPE-1034 remains the umbrella; SPE-1093 owns routing/delivery/acknowledgement, SPE-1094 transmission, SPE-1096 execution authority, SPE-1097 legitimacy and SPE-855 crisis release clearance. This module adds no GameState fields or actor/provenance registry.

The payload contains stable caller-provided identity, speaker/source/recipients, semantic act, speech/text/nonverbal mode and surface, optional opaque pool/log references, state keys, inert trigger references, urgency, qualified observations and optional protective-action and provenance references. Distinct author, requesting, sponsoring, approving and authorizing actors remain optional origin/control metadata. Identity is not rehashed when those roles differ.

## Eligible knowledge input

`SenderKnownCommunicationInputs` is an already-eligible producer view supplied by the existing knowledge/provenance owner. It is an explicit trust boundary, not authentication or a new knowledge-policy evaluator. Callers must not fill it by dumping otherwise-hidden authoritative state. SPE-3364 remains relevant to any future direct truth query; this implementation neither queries GameState nor imports a truth-query API.

Builders resolve requested event references only within that view and permit only supplied speaker state keys. Validation requires a matching speaker and exact source, statement, claim and confidence qualifiers for each known observation. Unknown events, forged state keys, changed qualifiers, malformed/nonfinite inputs and conflicting event identities fail closed with bounded codes. A verified-observation claim requires a verified/escalated-confidence source qualifier; it still describes the sender's evidence, not omniscient world truth. Claims and semantic acts remain separate: a directive may refer to an allegation without converting it into a verified fact.

The caller owns message identity. Exact duplicates collapse deterministically; different canonical content under one identity is a conflict. Canonical arrays use explicit code-unit order; sparse arrays reject. Parsed records copy and freeze nested data. Unknown extra input properties are not copied. There is no wall-clock, random selection or payload-trigger execution.

## Existing contract adapters

The intake adapter first uses `validateInformationIntakeReport`, requires explicit event eligibility and an unambiguous source event in the report history, and retains its event/source identity, verification status and confidence. It does not make a report public or invent knowledge for another actor.

The guidance handoff validates the payload and constructs the existing `PublicGuidanceMessagePacket`, with the payload id as message id and its bounded protective action. It invokes the existing SPE-862 service validator and returns an immutable envelope retaining the original payload, qualifiers and provenance. `serviceFeasibility.disposition = release` means only that the service-feasibility check passed. It is not release authorization, transmission, receipt or successful compliance. Failed feasibility retains the payload and block diagnostics; it does not execute an instruction. Serialization/forwarding tests verify this data handoff, not an unimplemented transport lifecycle.

`buildCommunicationSelectorInputs` exposes only eligible state/event references. Pool ids are opaque upstream selections. Grok's SPE-2238 branch and selector algorithm remain untouched and are not imported from an unmerged branch.

## Acceptance and validation

Tests cover speaker-state/event variation, unchanged-input determinism, non-speech surfaces, every semantic act, non-executing authorization, stable identity with distinct provenance roles, unknown facts and qualifier forgery, allegations versus verified observations, deterministic duplicates/conflicts, immutable copies, malformed/nonfinite/sparse inputs, intake validation and the real service-guidance consumer. Provenance survives payload parsing and serialization through the guidance envelope. These are pure contract integrations, not normal gameplay, release-clearance or delivery evidence.

Run the targeted payload/intake/service tests, requirement-selected checks and applicable full regressions. Independent latest-head review, green CI, merge, main sync and truthful Linear closeout remain required. SPE-2268 completion is separate from SPE-1034 or SPE-855. The six audit passes and validation results are recorded with the PR and existing issue. Checkpoints use direct bounded verification under the session's external-dispatch restriction.
