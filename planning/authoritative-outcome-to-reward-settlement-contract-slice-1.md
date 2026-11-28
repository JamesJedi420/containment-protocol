# SPE-3514 — Authoritative outcome-to-reward settlement contract (slice 1)

Pure registry contract for terminal settlement receipts.

- Validates terminality before settlement.
- Maps source outcome class to disposition via authored policy.
- Enforces unique settlement identity for exactly-once semantics.
- No universal reward calculator, outcome enum, or domain mutation.

Fixtures and tests cover terminality rejection, disposition resolution, and idempotent identity.
