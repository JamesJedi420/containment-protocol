# SPE-2222 — Staff role signature capability registry (slice 1)

Bounded schema only. No GameState, progression tree, or live staff instantiation.

- `src/domain/staffRoleSignatureCapability.ts`: capability id, role-package ref, niche, optional recruitment-assessment family, validation, and deterministic lookup.
- `src/test/staffRoleSignatureCapability.test.ts`: one signature per fixture role, distinct recruitment families, duplicate-role rejection, unknown ids, and order-independent lookup.

Recruitment families authorize an assessment channel only. Confidence, provenance, contradiction, and hidden truth remain with SPE-1910 / SPE-3025. Source job titles are rejected as capability authority.

Shipping repair: normalization retains the trimmed values accepted by validation. Malformed or source-specific identifiers consistently return `invalid_capability_id`; `unknown_capability_id` means a legal authorable identifier is absent from the supplied registry. Regression coverage exercises validation → normalization → both lookups, duplicate ids, and rejection classifications. This is schema evidence only; live gameplay integration remains outside slice 1 (SPE-3719).
