# Cursor User Rules — implementation lite (paste into Settings → Rules)

Paste the block below into **Cursor → Settings → Rules → User Rules** so every implementation session gets lightweight guardrails. User Rules apply globally (equivalent to `alwaysApply: true` on a project rule).

Tracked copy: `.cursor/rules/implementation-lite.mdc` (`alwaysApply: true` in this repo).

Full repo detail: `AGENTS.md`. Pre-ship audit paste: `docs/cursor-pre-ship-audit-user-rules-snippet.md`. Closeout paste: `docs/cursor-session-closeout-user-rules-snippet.md`. Backlog grooming: `docs/cursor-backlog-hygiene-user-rules-snippet.md`.

---

## Containment Protocol — Implementation Lite Rules

Use this rule for ordinary implementation work. Do not perform full backlog hygiene unless explicitly asked.

### Source of truth

Linear is authoritative for scope, status, and closure. Also use repo docs, tests, architecture, and current code. Fold durable issue comments into scope. Preserve boundary; do not expand scope.

Before coding: read Linear (and GitHub mirror); parent/child when relevant; treat Goal, Scope, Constraints, Acceptance criteria as binding. If chat diverges from Linear, follow Linear and call out mismatch.

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

Inspect files, tests, docs, routes, state, schemas, fixtures, patterns. Confirm: already complete / partial / wrong / blocked.

Report: relevant files; current vs expected behavior; boundary; risks; validation plan; in-boundary docs to update.

### Implementation rules

Prefer existing systems over new abstractions.

Keep changes inside the issue boundary.

When adding or changing behavior:
- update targeted tests
- preserve deterministic behavior
- keep domain logic out of UI unless the existing architecture already does otherwise
- update in-boundary docs when the implementation would make docs stale

### Pre-ship audit (mandatory — before commit)

Six passes iteratively until clean: scope/integration, edge cases, determinism/state, regression, docs/authoring, cleanup. Validation: specific tests first, then lint/broader; fix and rerun. Ready for commit only when boundary, tests, docs, validation, and minimal diff all satisfy. Full checklist: `docs/agent-pre-ship-audit.md`.

### Ship loop (mandatory)

An implementation slice is **not complete** until it is on GitHub as a pull request.

Run only **after** pre-ship audit passes:

1. **Commit** all in-boundary changes on the branch named in the slice doc or task message (focused message; SPE-* in title when team workflow applies).
2. **Push** the branch to `origin` (`git push -u origin HEAD` when the remote branch is new).
3. **Open a PR** against `main` with the PR mapping body below.
4. **Linear:** comment the PR URL on the **slice** issue; keep the slice **In Progress** until merge (then **Done** + merge comment).
5. **Babysit → merge (same session):** after the PR opens — **independent review** of full diff vs `main` from scratch (slice doc + Linear acceptance; optionally use `code-reviewer` / `bugbot` subagents when available on non-trivial diffs); fix in-boundary findings and push; **triage external comments** (Greptile, CodeRabbit, Amazon Q, Copilot, Codex, Gemini, humans); `@greptileai` or `/q review` after material fixes if needed; **CI loop** (`gh pr checks`) until green; merge when mergeable. Do **not** rely only on existing PR comments. Do **not** end the session or write a next-issue plan while the PR is still open.
6. **Sync `main`:** `git checkout main` && `git pull origin main`.

Do **not** end an implementation session with only local files, uncommitted work, an open unmerged PR, or "say if you want a PR."

**Exceptions** (explicit user words only): "no commit," "no PR," "local only," "plan only," "do not push," or "do not merge."

Repo ship loop overrides a generic "commit only when asked" preference for Containment Protocol **implementation** sessions on a named slice branch.

### PR mapping

When opening or updating a PR, use `.github/pull_request_template.md`. Put `@coderabbitai summary` under **Summary** (CodeRabbit replaces it on review); fill Linear, what shipped, docs, parent status, validation, and scope boundary.

The PR body must name: canonical Linear slice issue; parent (if any); each child covered; what shipped; validation run; docs updated; whether the parent remains open. If the PR satisfies a child issue, do not reference only the parent.

### Linear updates

After implementation evidence exists:

- Move the child issue to the truthful status.
- Mark Done only when the full child acceptance bar is satisfied.
- Add a concise Linear comment with PR URL, what shipped, and validation.
- Keep parent issues open unless the completed children satisfy the full parent body.
- If work is partial, add a progress comment instead of closing.

If Linear tooling is unavailable, emit a **local-agent Linear handoff** (`docs/cloud-agent-linear-handoff.md`) with verbatim comments and status (**or do not change**). Do not treat GitHub as Linear closure.

### Session closeout (mandatory)

**Order:** ship loop → babysit (independent review + comment triage + CI) → merge → `checkout main` && pull → closeout. **Phase B (after merge):** slice Done + merge comment — next-issue plan only. **Phase A (interim):** only when babysit/merge is blocked in-session. Formats: `docs/agent-session-closeout.md`. Paste: `docs/cursor-session-closeout-user-rules-snippet.md`.
