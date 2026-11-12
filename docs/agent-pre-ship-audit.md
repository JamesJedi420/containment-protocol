# Pre-ship audit (before commit + merge)

Checklist entry point for [Agent Operating Manual §3](agent-operating-manual.md#3-implement-and-validate-the-current-boundary). The tracked loader is [implementation-lite](../.cursor/rules/implementation-lite.mdc); [the paste snippet](cursor-pre-ship-audit-user-rules-snippet.md) points to the same procedure.

## Before coding (first pass in session)

Apply manual §2: inspect issue/evidence/files and report current vs expected behavior, smallest boundary, completion state, risks, validation, and docs.

## Six audit passes (re-run until clean)

1. **Scope and integration:** acceptance, architecture, naming, consumers; no parallel systems or unapproved scope.
2. **Edge cases:** empty/malformed data, absent fields, duplicates, stale records, failed lookups, ordering and permissions.
3. **Determinism and state:** seeded/reproducible outcomes, no silent mutation or hidden-information leaks.
4. **Regression:** real integration paths and nearby consumers; change expectations only within the approved boundary.
5. **Documentation and authoring:** in-boundary docs, schemas, fixtures; synchronize live backlog/manifest/slice status when changed, preserving frozen history.
6. **Cleanup:** dead code, unused imports, debugging noise, speculative TODOs and overbroad abstractions.

## Validation

Follow manual §3 and [the requirement matrix](repository-validation-requirements.md). Record exact commands/results, fix in-boundary failures and repeat the passes. State unavailable checks and unverified outcomes.

## Completion criteria (ready for commit / PR)

Boundary satisfied; edge cases handled or durably deferred to the appropriate owner/candidate route; meaningful tests pass; required docs and projections updated; no unrelated changes. Proceed through manual §4’s ship loop and [closeout formats](agent-session-closeout.md). Do not implement the next issue.

Read [Hermes shipping checkpoints](hermes-shipping-checkpoints.md) for local-model evidence delegation during the authorized ship loop, including pre-ship and post-merge curation. Record direct checks or bounded fallback where applicable; retain the existing actor-specific authority and closeout triggers.
