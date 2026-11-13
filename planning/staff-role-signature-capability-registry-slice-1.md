# SPE-2222 — Staff role signature capability registry (slice 1)

Bounded schema only. No GameState, progression tree, or live staff instantiation.

- `src/domain/staffRoleSignatureCapability.ts`: capability id, role-package ref, niche, optional recruitment-assessment family, validation, and deterministic lookup.
- `src/test/staffRoleSignatureCapability.test.ts`: one signature per fixture role, distinct recruitment families, duplicate-role rejection, unknown ids, and order-independent lookup.

Recruitment families authorize an assessment channel only. Confidence, provenance, contradiction, and hidden truth remain with SPE-1910 / SPE-3025. Source job titles are rejected as capability authority.
