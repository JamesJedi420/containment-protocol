# Pre-ship audit (before commit + merge)

Mandatory audit for the **active approved slice** before commit, push, and PR. Run after implementation; fix all issues **inside the approved issue boundary** until validation is clean; then proceed to the **ship loop** (`implementation-lite.mdc`). **Do not** start coding the next issue.

Tracked rule: `.cursor/rules/implementation-lite.mdc` (`Pre-ship audit`). Paste duplicate: `docs/cursor-pre-ship-audit-user-rules-snippet.md`.

---

## Task

Audit the current implementation for the active approved issue, find gaps and edge cases, fix all issues inside the approved issue boundary until the repo comes up clean, then prepare a next-issue implementation plan at session closeout only when that next issue is already approved (`docs/agent-session-closeout.md`). Newly discovered durable scope is candidate input, not permission to create or implement another issue.

## Source of truth

Use the active approved Linear/GitHub issue, repository docs, tests, existing architecture, and current code. Durable issue comments are binding only when they clarify or document the already-approved boundary. A comment that introduces new or changed durable scope is **not** implementation authority: preserve it as candidate evidence and route it through Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4. **Preserve the approved issue boundary.** Do not expand scope.

---

## Before coding (first pass in session)

1. Inspect relevant files, tests, docs, routes, state models, schemas, fixtures, and existing patterns.
2. Identify the smallest correct implementation boundary inside the approved issue.
3. Confirm whether the issue is **already complete**, **partially complete**, **incorrectly implemented**, or **blocked**.
4. Report a **pre-coding summary** with:
   - relevant files
   - current behavior
   - expected behavior
   - implementation boundary
   - known risks
   - validation plan
   - docs that must be updated as part of this same boundary

---

## Six audit passes (re-run until clean)

Re-run **all six passes iteratively** — fixing and re-auditing each until a pass finds nothing new inside the boundary.

### Pass 1: Scope and integration

Match approved issue goal, acceptance criteria, architecture, naming, and project docs. Remove or revise code that adds parallel systems, source-specific subsystems, duplicated mechanics, unnecessary abstractions, or unapproved follow-on scope.

### Pass 2: Edge cases

Missing states; invalid inputs; empty or malformed data; absent optional fields; duplicate or stale records; failed lookups; disabled routes; permission gaps; hidden assumptions; race-like ordering; UI states with no data.

### Pass 3: Determinism and state

Reproducible, state-derived, testable behavior. No hidden randomness, implicit global state, silent mutation, hardcoded truth, or UI projections that reveal hidden state that should stay fallible.

### Pass 4: Regression

Nearby systems affected by the change. Existing tests still reflect intended behavior. Update tests only when the existing expectation is truly obsolete inside the approved boundary.

### Pass 5: Documentation and authoring

Update docs, comments, fixtures, schemas, or authoring guidance when part of the issue boundary. No broad documentation unrelated to the slice.

**Backlog handoff (mandatory when the approved slice closes or changes truthful status):**

- [ ] `planning/backlog.md` handoff block matches Linear: primary, **In progress**, **Recently shipped** (no issue listed in both in-progress and recently-shipped handoff lines).
- [ ] Active slice doc `| **Status** |` and backlog slice-doc table row agree.
- [ ] `planning/backlog-handoff-manifest.json` updated in the **same commit** as backlog/slice-doc status changes.
- [ ] `npm run verify:backlog-handoff` passes before commit/PR (CI enforces on `planning/**` changes).

Do **not** convert a discovered sibling/follow-up into a backlog issue or actionable slice during this audit. Record new durable scope as candidate evidence for the governance flow.

### Pass 6: Cleanup

Remove dead code, unused imports, duplicate helpers, debug logs, temporary comments, speculative TODOs, and overbroad abstractions. Keep the final diff minimal and coherent.

---

## Validation

1. Run the **most specific** test command first.
2. Then run broader relevant validation (lint, typecheck if in scope, integration tests for touched flows).
3. If a command fails, fix the cause and rerun. Continue until clean or a **real blocker** is identified.

If validation cannot run: state which command, why, and what remains unverified. **Do not** claim the work is complete.

---

## Completion criteria (ready for commit / PR)

Ready for review only when **all** are true:

1. Implementation matches the approved issue boundary.
2. Edge cases are addressed or, when still inside the approved boundary, explicitly deferred on the existing owner; newly discovered durable scope is candidate evidence instead.
3. Tests cover changed behavior.
4. Docs updated if required.
5. Validation commands pass.
6. No unrelated or unapproved scope added.
7. Final diff is clean and explainable.
8. Backlog handoff + `planning/backlog-handoff-manifest.json` match Linear; `npm run verify:backlog-handoff` passes when `planning/**` changed.

Then run the **ship loop**: commit → push → open PR → lifecycle/evidence comment on the approved slice.

---

## Session flow (order)

| Phase | Doc / rule |
| --- | --- |
| Pre-coding summary | This doc — Before coding |
| Implement | `implementation-lite.mdc` — Implementation rules |
| Pre-ship audit | This doc — Six passes + validation |
| Ship loop | `implementation-lite.mdc` — Commit / push / PR |
| Closeout | `docs/agent-session-closeout.md` — approved next-issue plan when one exists; otherwise candidate/governance handoff |
