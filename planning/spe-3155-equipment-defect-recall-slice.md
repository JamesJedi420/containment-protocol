# SPE-3155 — Equipment defect recall and remediation slice

Status: Ready to ship. Linear remains In Progress until merge.

## Boundary

Implement one deterministic fabricated-lot recall over canonical ordinary-equipment identities. Exact source-lot matches are affected, different retained lots are unaffected, and missing provenance is unknown. Confirmed affected containment identities route through the existing SPE-877 hard-stop command. The recall observes SPE-2851 condition repair and SPE-2862 deficiency stabilization; it does not perform those operations or own inventory, lot, procurement, logistics, or replacement state.

## Plan and evidence

1. Store stable campaign/obligation identity, applicability, reason, lifecycle, and observed condition.
2. Reconcile in instance-ID order from `equipmentInstances` and `fabricationOrigin`; never infer identity from aggregate quantity.
3. Hydrate the optional registry fail-closed without replaying disposition or remediation.
4. Focused tests prove affected, unaffected, unknown, partial completion, authoritative remediation, idempotency, and save/load behavior.

`batch-a` identities are affected; a sibling retained lot is excluded; absent provenance stays `unknown`. Affected containment identities use `applyContainmentClassDeficiency(..., 'hard_stop')`. A repaired and fully stabilized identity becomes remediated while its affected sibling remains dispositioned. Repeated reconciliation is byte-stable.

Validation: focused integration 141 tests; full lint; full suite 969 files / 10,560 tests; backlog handoff and scoped formatting clean.

## Out of scope

SPE-3404 material composition, new identity/provenance, aggregate stock scanning, repair execution, replacement/procurement/logistics, UI, and parent SPE-877 lifecycle changes remain separate.
