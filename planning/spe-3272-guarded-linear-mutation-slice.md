# SPE-3272 — Phase-gated Linear mutation authorization (in progress)

## Approved boundary

This is child **SPE-3272**, under **SPE-3261**. It enforces the existing phase-gated rules for **project-controlled authenticated Linear writes only**. It does not grant new scope, act as a planning authority, alter GameState, or claim to intercept independent ChatGPT/Linear MCP, external agent, or direct website writes. The upstream contract remains owned by completed SPE-3269. A read-only `eligible-...` diagnostic is never independently a write authorization.

## Verified repository writer inventory (2026-10-21)

| Surface examined | Finding | Classification |
| --- | --- | --- |
| `scripts/governance/authority-contract.mjs` | Static contract validation plus read-only diagnostic; no Linear API mutation | Upstream dependency, not writer |
| `scripts/materialize-linear-external.mjs` | Converts an exported `get_document` JSON payload into repository Markdown | Filesystem-only projection, not Linear writer |
| `scripts/write-linear-external-json.mjs` | Writes local `tools/linear-external-get-document.json` from local source text | Filesystem-only projection, not Linear writer |
| `.cursor/rules/linear-always-update.mdc`, `docs/cloud-agent-linear-handoff.md` | Agent instructions and authenticated external-MCP handoff | Externally executed writes, not interceptable by repository JS |
| Indexed `main` search: `api.linear.app`, `@linear/sdk`, `LinearClient`, `LINEAR_API_KEY`, `LINEAR_TOKEN`, `linear-mcp`, `save_issue`, `updateIssue` | No project-authenticated Linear network writer implementation identified; `save_issue` references are instructions | **No live repository writer found to adopt yet** |

This is a source-search/inspection inventory, not proof that every local Cursor agent, remote workflow, unindexed file, or externally hosted connector has been intercepted. Any writer discovered later must be assessed against the same approved SPE-3272 boundary without inventing a parallel policy framework.

## Implemented branch-only seam

- `scripts/governance/linear-mutation-guard.mjs`: allowlisted operation classification; exact canonical SHA-256 operation digest; immutable submitted payload; fail-closed resolver exceptions; current authenticated evidence contract; ordered Phases 1–4 for scope; truthful existing-boundary lifecycle review; completion checks; review-state contradiction rejection; guarded writer wrapper.
- `scripts/governance/linear-mutation-guard.check.mjs`: Node regression fixtures for scope/lifecycle, stale approvals, status closure, review contradictions, caller-mutation races, malformed/accessor payloads, resolver outage and adapter factory.
- `npm run verify:linear-mutation-guard`, included in the Test CI workflow.
- The exported `createGuardedLinearWriter` dependency-injection factory is **not a credential system**: a caller could still pass fake functions. It must only be instantiated inside a verified authenticated project-controlled adapter. Merely using this helper in an untrusted process does not prove governance enforcement.

## Integration contract required before completion

1. Inventory each actual authenticated **project-controlled** Linear mutation adapter and its operation coverage. Treat external writers as policy/conformance obligations; do not falsely retrofit `src/` or CI with invented Linear secrets.
2. Bootstrap the guarded writer inside the trusted adapter, never with caller-controlled `resolveCurrentAuthority` or raw write callbacks. Independently query current Linear issue/project state, existing approval evidence and content/boundary identity; never accept caller-provided booleans or fabricated `source` strings as sufficient proof.
3. Bind a concrete authorized payload digest to one current Phase-4 change set. Missing, stale, contradictory or superseded approval evidence, wrong owner, different payload, partial phases, ambiguous comments or unknown operations must fail closed **without invoking the mutation provider**.
4. Before writing, the authenticated provider must enforce current revision/approval freshness at the commit boundary (optimistic revision matching or equivalent trusted serialization). The helper alone has a time-of-check/time-of-use gap; merely rereading then writing is not atomic.
5. Verify actual issue/child creation, reparenting, relations, scope update, status and comment adapter coverage with forbidden writes and permitted evidenced lifecycle updates. Verify partial failure, retry/replay, audit reasons, and no duplicate side effects. The existing SPE-3274/SPE-3340 remain owners of their distinct outbox/transport programs.
6. Only after authenticated integration, regression tests, independent review, CI, and a PR that meets the full approved issue boundary may SPE-3272 move to Done. SPE-3261 remains open until all six children satisfy its completion rule.

## Important limitations

- Known post-merge contract conformance findings are preserved with SPE-3269. The guard adds local fail-closed checks but does not rewrite its completed contract or solve all upstream provenance problems.
- The current implementation is a **verified library seam**, not currently enforcing live project-owned writes.
- No new parent/child, durable obligation, relationship or acceptance expansion is created by this implementation note.
