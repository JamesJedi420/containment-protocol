# SPE-2905 — Discussion-to-decision extraction and authoritative reconciliation

| Field | Value |
| --- | --- |
| Linear | SPE-2905 |
| Parent | SPE-1705 — Design doc routing ledger |
| Status | In Progress |
| Branch | `spe-2905-discussion-to-decision-reconciliation` |
| Base `main` SHA | `a440804c9c26073a84d099c15112478db06c8e37` |

## Boundary

Implement one pure deterministic reconciliation helper for normalized project-discussion
signals. Connector/agent callers remain responsible for reading conversations, Linear, and
GitHub; the domain helper receives those snapshots and emits dispositions without external
I/O or tracker mutations.

## Implementation order

1. Preserve discussion signal provenance and stable fingerprints.
2. Resolve explicit later-signal supersession before routing.
3. Treat Linear snapshots as planning/lifecycle authority.
4. Require verified GitHub evidence before an implementation promise can route as an
   implementation update.
5. Emit bounded dispositions: no-op, Linear update, GitHub update, documentation
   consequence, unresolved contradiction, or missing-boundary candidate.
6. Suppress same-pass duplicates and previously applied fingerprints.
7. Keep missing-boundary results non-mutating so normal reconciliation/approval remains
   mandatory before Linear creation.

## Out of scope

- Natural-language/LLM inference inside the client runtime.
- Linear or GitHub API clients in `src/domain`.
- Automatic Linear issue creation.
- Reopening completed/canceled issue boundaries.
- Player-facing UI, persistence, migration, balancing, accessibility, or simulation state.

## Validation

Targeted Vitest coverage:
`src/test/discussionDecisionReconciliation.test.ts`.

The suite covers provenance, supersession, Linear no-op authority, GitHub evidence gating,
documentation routing, contradiction disposition, completed-owner protection, duplicate
suppression, rerun idempotency, and deterministic output.
