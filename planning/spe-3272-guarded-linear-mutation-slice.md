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


## Canonical writer ownership and integration authority — resolved 2026-10-21

**Disposition: retain the existing approved SPE-3272 boundary.** Canonical mutation-authorization logic, the guarded-write interface, and adoption by any actual **project-controlled authenticated Linear mutation adapter** belong to SPE-3272 (Codex), under SPE-3261. This is CP-core-hosted, shared governance tooling for CP and Academy; Academy must consume this one gate instead of implementing another writer or approval classifier. There is no basis for another governance parent/child merely to name the same authorization seam.

Separate the following authorities; none may impersonate another:

| Responsibility | Canonical owner or source |
| --- | --- |
| Policy and scope approval | Current user-approved CP/Academy governance and explicit Phase 1–4 approvals |
| Issue planning, owner, status and relationships | Fresh authoritative Linear records |
| Implementation/CI/PR validation evidence | GitHub current source and checks |
| Versioned policy projection and static evidence inspection | Completed SPE-3269; **not** an authorization token |
| Guard, classification, authorized-operation digest, write-interface contract | **SPE-3272 / Codex** |
| Active rule projection/conformance and policy bypass detection | SPE-3271 (not a substitute writer) |
| Candidate-ledger queue and lifecycle outbox | SPE-3274 and SPE-3340 respectively; consumers, not independent authorization owners |
| Provider authentication and actual Linear mutation execution | Already authenticated Linear connector/provider used by the trusted host session; connector identity does not grant planning authority |

**Integration authorization split.** SPE-3272 already approves *adopting its guard into verified, existing, project-controlled authenticated mutation adapters*, including adapter-specific read/revalidation/testing and in-boundary documentation. It does **not** automatically approve inventing a new standalone service, new credentials, new provider API deployment, new queue, or changing the behavior/permissions of external ChatGPT/Cursor/Linear MCP connectors. The inspected repository does not currently contain a project-controlled authenticated Linear network writer to retrofit. Therefore provider integration is **not implemented**; no writer is nominated by fiction.

**Required execution model where a genuine project-controlled adapter is later verified:**

1. The trusted host/provider authenticates its own session and binds its own Linear read/write client. The caller may submit only a proposed typed mutation, not an approval snapshot, writer callback, credential, or `verified` flags.
2. The adapter resolves current user/governance approvals, exact Phase-4 change-set authorization where required, current issue/project identity, current boundary and terminal status, and relevant GitHub evidence for lifecycle changes. The candidate ledger, PR body, repository mirror, and caller text are evidence **inputs**, never authority by themselves.
3. SPE-3272 guards **the exact immutable payload** and denies missing, ambiguous, stale, contradictory, wrong-target, wrong-owner, or changed evidence. It must not equate the upstream `eligible-...` diagnostic with permission.
4. The provider **must enforce freshness at the actual write** by a supported revision precondition/transaction or genuinely serialized trusted execution with revalidation. The current JavaScript helper cannot provide this property merely by checking earlier. Where no reliable provider commit-time freshness strategy exists, scope writes fail closed instead of claiming race-safe authorization.
5. The provider owns successful write acknowledgment, audit references and provider-side retry semantics. Do not move SPE-3274 candidate replay or SPE-3340 lifecycle outbox into SPE-3272. Denials must never invoke a writer; a failed/unknown provider result must not be recorded as a successful mutation.
6. Keep direct external connector/agent writes classified as **outside repository mechanical interception**. Existing workflows must continue the explicit phase-gated policy. SPE-3271 may inventory and detect bypass/conformance drift but cannot truthfully block arbitrary external writes.

**No-new-scope test:** implementing a fresh host service, persistent auth/credential broker, independent provider transport framework, or broad cross-product writer service that did not previously exist is a *new durable implementation boundary*. Its candidate must undergo Phase 1 design, approved Phase 2 parent selection and Phase 3 supporting-work reconciliation, and Phase 4 approval before mutation/implementation. That hypothetical work is **not** silently assigned to this slice. Meanwhile, no separate project-controlled writer should be created solely to make the current guard's test passing look like universal enforcement.

**Completion truth:** SPE-3272 remains In Progress. The present branch offers a validated guard library and CI checks only. The full SPE-3272 completion rule additionally requires verified official automation writer-path coverage (or an explicit approved boundary change) and provider-enforced freshness. Neither is established by source-search absence or by a dependency-injection mock.
