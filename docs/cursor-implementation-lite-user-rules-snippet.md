# Cursor User Rules — implementation lite (paste into Settings → Rules)

Paste the block below into **Cursor → Settings → Rules → User Rules** so every implementation session gets lightweight guardrails. User Rules apply globally (equivalent to `alwaysApply: true` on a project rule).

Optional local copy: `.cursor/rules/implementation-lite.mdc` (folder is gitignored).

Full repo detail: `AGENTS.md`. Backlog grooming only: `docs/cursor-backlog-hygiene-user-rules-snippet.md`.

---

## Containment Protocol — Implementation Lite Rules

Use this rule for ordinary implementation work. Do not perform full backlog hygiene unless explicitly asked.

### Source of truth

Linear is the authoritative source for scope, status, and closure.

Before coding:
1. Read the target Linear issue.
2. Read the issue comments if they contain implementation-relevant decisions.
3. Read parent/child issues when the issue sits under a broader umbrella.
4. Treat Goal, Scope, Constraints, Acceptance criteria, and reconciliation comments as binding.

If Linear and chat instructions diverge, follow Linear and call out the mismatch.

### Scope discipline

Implement the smallest coherent deterministic slice that satisfies the issue.

Do not:
- expand scope
- create parallel systems
- rewrite unrelated code
- fix nearby issues unless required by the current acceptance criteria
- close parent issues because a child slice shipped

If the issue boundary is unclear, stop and report the ambiguity instead of guessing.

### Pre-coding summary

Before substantive edits, provide:

- relevant files
- current behavior
- proposed boundary
- validation plan
- docs that must be updated as part of this same boundary

### Implementation rules

Prefer existing systems over new abstractions.

Keep changes inside the issue boundary.

When adding or changing behavior:
- update targeted tests
- preserve deterministic behavior
- keep domain logic out of UI unless the existing architecture already does otherwise
- update in-boundary docs when the implementation would make docs stale

### PR mapping

If opening or updating a PR, the PR body must name:

- the canonical Linear issue
- any parent issue
- each child issue covered by the branch
- what shipped
- validation run
- docs updated
- whether the parent remains open

If the PR satisfies a child issue, do not reference only the parent.

### Validation

Before finishing, run the most targeted validation that proves the issue boundary.

Prefer:
- targeted tests for touched behavior
- relevant lint/type checks
- repo-specific verification scripts when docs or indexes are touched

Do not claim completion from helper-level tests alone if the issue requires real-flow behavior.

### Linear updates

After implementation evidence exists:

- Move the child issue to the truthful status.
- Mark Done only when the full child acceptance bar is satisfied.
- Add a concise Linear comment with PR URL, what shipped, and validation.
- Keep parent issues open unless the completed children satisfy the full parent body.
- If work is partial, add a progress comment instead of closing.

If Linear tooling is unavailable, report the exact status/comment update that should be made.

### Final report

End every implementation session with:

- issue worked
- files changed
- what changed
- validation run
- docs updated, if any
- Linear update made or needed
- remaining follow-up
