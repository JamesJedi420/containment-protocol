# Cursor User Rules — implementation lite (paste into Settings → Rules)

Paste this block into **Cursor → Settings → Rules → User Rules** for normal Containment Protocol implementation sessions. Tracked repo copy: `.cursor/rules/implementation-lite.mdc` (`alwaysApply: true`).

Full detail: `AGENTS.md`. Pre-ship audit: `docs/cursor-pre-ship-audit-user-rules-snippet.md`. Closeout: `docs/cursor-session-closeout-user-rules-snippet.md`.

---

## Containment Protocol — Implementation Lite

### Source of truth

Linear is authoritative for **already-approved** scope, status, and closure. GitHub code/tests/PRs provide implementation evidence. Current CP governance decides whether newly discovered scope may enter the backlog.

Before coding: read the approved Linear issue, relevant comments, parent/children, linked implementation evidence, and slice doc. Treat Goal, Scope, Constraints, Acceptance criteria, and approved reconciliation records as binding.

If no approved issue boundary exists for feature work, stop that implementation and route the finding through candidate governance. Do not create an issue merely to make the task actionable.

### Scope discipline

Implement the smallest coherent deterministic slice that satisfies the approved issue.

Do not:
- expand scope;
- create parallel systems;
- create a new Linear issue, child, parent, contradiction issue, relationship, or durable obligation discovered during implementation;
- rewrite unrelated code;
- fix nearby issues unless required by current acceptance criteria;
- close a parent because only one child shipped.

New or changed scope is candidate input and must pass Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4.

### Deferred work

- Approved in-boundary deferral: record it in the slice doc and the smallest existing approved owner.
- New durable boundary: preserve candidate/provenance in the canonical Linear candidate ledger and return it to Phase 1. Do **not** create a child.

Canonical candidate workflow: https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf

### Pre-coding summary

Inspect files, tests, docs, routes, state, schemas, fixtures, and patterns. Report relevant files, current vs expected behavior, approved boundary, risks, validation plan, and in-boundary docs to update.

### Implementation rules

Prefer existing systems over new abstractions. Update targeted tests, preserve deterministic behavior, respect architecture boundaries, and update in-boundary docs when required.

### Pre-ship audit

Run the six passes in `docs/agent-pre-ship-audit.md` iteratively until clean: scope/integration, edge cases, determinism/state, regression, docs/authoring, cleanup. Run specific tests first, then lint/broader validation. Do not weaken tests or CI to pass.

### Ship loop

For an approved implementation slice, after the pre-ship audit:

1. Commit focused in-boundary changes.
2. Push the named branch.
3. Open a PR against `main`.
4. Link/comment the approved Linear slice issue.
5. Independently review the full diff, triage external review comments, and run CI until green/mergeable.
6. Merge unless the user explicitly says not to.
7. Sync `main`.

Explicit user exceptions such as `no commit`, `no PR`, `local only`, `plan only`, `do not push`, or `do not merge` override the corresponding step.

### PR mapping

PR body names the canonical approved slice, parent if any, approved children covered, what shipped, validation, docs, parent status, and any newly discovered candidate scope deliberately not implemented. Do not list a new candidate as a child unless Phase 4 already authorized and created it.

### Linear updates

After implementation evidence exists, update lifecycle/evidence on the already-approved boundary: truthful status, PR/validation comment, Done only when full acceptance is satisfied, parent closure only when full parent completion is satisfied. Do not convert follow-up candidates into issues from this implementation flow.

### Session closeout

Order: review/CI → merge → sync `main` → closeout. Phase A while merge is blocked: no next-issue plan. Phase B after merge: plan only an already-approved next issue; otherwise report candidate/governance continuation. Full format: `docs/agent-session-closeout.md`.
