# Tests, docs, and CI

## Tests

- New domain or user-visible behavior **MUST** have targeted Vitest coverage when slice acceptance implies it.
- Tests **MUST** be deterministic (no order-dependent shared mutable state).
- Flag weakened assertions that mask root failures.

## Documentation

- New `docs/*audit*.md` **MUST** update `docs/design-audits-index.md` in strict alphabetical order.
- Typos in docs touched by the PR are **P1**.

## CI

- Node.js **22** in `.github/workflows/`.
- `STRICT_TEST_CONSOLE=1` in CI **MUST NOT** be removed or bypassed.
- Do not suggest skipping tests or weakening checks to pass review.

## Planning slices

When `planning/spe-*-slice.md` changes or the PR claims a slice:

- Flag scope beyond slice **Goal/Acceptance** as **P1**.
- Flag contradictions with the slice **## Deferred** table.
