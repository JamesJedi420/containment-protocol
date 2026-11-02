# SPE-3444 — workshop fixture state typing

Owner: [SPE-3444](https://linear.app/spectranoir/issue/SPE-3444). Parent: [SPE-3375](https://linear.app/spectranoir/issue/SPE-3375). Implementation authorized by the user's CP-core milestone continuation; SPE-3376's complete partition is Done. Base: `326c65b4d33c41854702fcb3e9c3d02b19ddbd57`.

## Boundary

Use canonical `GameState` for the existing test helper's input and output, retaining investigator-to-hunter remapping, staff clearing, state identity, and unrelated data. The helper's five consumers already use canonical state. No production code, dependency, compiler policy, or persistence schema changes.

The previous agent-record constraint required an index signature absent from canonical `Agent`, losing the rest of the state contract at callers. An explicit entry tuple preserves the role union while constructing the replacement agent map; no assertion or suppression is needed.

## Acceptance and checks

- Exercise all five existing consumer suites plus operator-slot persistence and agent/staff materialization contracts.
- Add regression coverage for complete state preservation and absent versus explicitly empty operator slots.
- Run lint, required unit validation, and two forced compiler runs; compare diagnostic identity multiplicities against clean base.
- Review the full diff, resolve reviews, pass required CI, merge, and record exact evidence on the existing owner. Parent stays open until repository-wide build acceptance.

## Causal reconciliation

The first comparison removes 54 existing occurrences: workshop persistence 16, live integrity 12, layout staging 12, local staging 8, section staging 6. Of the original 47-file cohort, 40 disappear; all 14 additional consumer errors disappear.

Seven unchanged persistence diagnostics are independent of the helper: line 705 passes completion outcomes missing canonical `quality`/`safety`; lines 1978, 1981, 2056, 2059, 2134 and 2137 read optional completion outcomes without narrowing. Those tests do not pass their affected values through this helper. They remain visible in the SPE-3375 recovery census; this slice does not claim their removal or invent a separate repair owner. SPE-3444 acceptance explicitly permits reconciliation of remaining identities. Exact final evidence follows after committed-source capture.

## Pre-ship audit

Six passes cover scope/consumers, absent/present slots, unchanged fixture mutation semantics, neighboring personnel tests, documentation, and cleanup. The original checkout and accessibility worktree are preserved. Documentation/acceptance/PR checkpoints are direct — delegation overhead exceeds evidence volume. External research is not applicable. No new durable scope or issues are created.
