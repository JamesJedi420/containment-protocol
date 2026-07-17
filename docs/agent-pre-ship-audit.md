# Pre-ship audit (before commit + merge)

Mandatory audit for the **active slice** before commit, push, and PR. Run after implementation; fix all issues **inside the issue boundary** until validation is clean; then proceed to the **ship loop** (`implementation-lite.mdc`). **Do not** start coding the next issue.

Tracked rule: `.cursor/rules/implementation-lite.mdc` (`Pre-ship audit`). Paste duplicate: `docs/cursor-pre-ship-audit-user-rules-snippet.md`.

---

## Task

Audit the current implementation for the active issue, find gaps and edge cases, fix all issues inside the issue boundary until the repo comes up clean, then prepare a **next-issue plan** only at **session closeout** (`docs/agent-session-closeout.md`) — not by implementing the next issue.

## Source of truth

Use the active Linear/GitHub issue, repository docs, tests, existing architecture, and current code. If issue comments contain durable scope, constraints, acceptance criteria, deferred work, or implementation notes, incorporate them into your working summary. **Preserve the issue boundary.** Do not expand scope.

---

## Before coding (first pass in session)

1. Inspect relevant files, tests, docs, routes, state models, schemas, fixtures, and existing patterns.
2. Identify the smallest correct implementation boundary.
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

Match issue goal, acceptance criteria, architecture, naming, and project docs. Remove or revise code that adds parallel systems, source-specific subsystems, duplicated mechanics, or unnecessary abstractions.

### Pass 2: Edge cases

Missing states; invalid inputs; empty or malformed data; absent optional fields; duplicate or stale records; failed lookups; disabled routes; permission gaps; hidden assumptions; race-like ordering; UI states with no data.

### Pass 3: Determinism and state

Reproducible, state-derived, testable behavior. No hidden randomness, implicit global state, silent mutation, hardcoded truth, or UI projections that reveal hidden state that should stay fallible.

### Pass 4: Regression

Nearby systems affected by the change. Existing tests still reflect intended behavior. Update tests only when the existing expectation is truly obsolete.

### Pass 5: Documentation and authoring

Update docs, comments, fixtures, schemas, or authoring guidance when part of the issue boundary. No broad documentation unrelated to the slice.

**Backlog handoff (mandatory when the slice closes or reopens a sibling):**

- [ ] `planning/backlog.md` handoff block matches Linear: primary, **In progress**, **Recently shipped** (no issue listed in both in-progress and recently-shipped handoff lines).
- [ ] Active slice doc `| **Status** |` and backlog slice-doc table row agree.
- [ ] `planning/backlog-handoff-manifest.json` updated in the **same commit** as backlog/slice-doc status changes.
- [ ] `npm run verify:backlog-handoff` passes before commit/PR (CI enforces on `planning/**` changes).

Do **not** put the shipping slice under **In progress** in backlog when opening the merge PR — move it to **Recently shipped** in the same branch before merge.

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

1. Implementation matches the issue boundary.
2. Edge cases addressed or explicitly deferred in-issue.
3. Tests cover changed behavior.
4. Docs updated if required.
5. Validation commands pass.
6. No unrelated scope added.
7. Final diff is clean and explainable.
8. Backlog handoff + `planning/backlog-handoff-manifest.json` match Linear; `npm run verify:backlog-handoff` passes when `planning/**` changed.

Then run the **ship loop**: commit → push → open PR → Linear comment.

---

## Session flow (order)

| Phase | Doc / rule |
| --- | --- |
| Pre-coding summary | This doc — Before coding |
| Implement | `implementation-lite.mdc` — Implementation rules |
| Pre-ship audit | This doc — Six passes + validation |
| Ship loop | `implementation-lite.mdc` — Commit / push / PR |
| Closeout | `docs/agent-session-closeout.md` — Next-issue plan + final response |
