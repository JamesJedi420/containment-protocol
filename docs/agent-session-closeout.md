# Agent session closeout (implementation)

Canonical closeout after the **current approved slice** is committed, validated, and Linear lifecycle evidence is current. **Do not implement the next issue** in the same session.

Tracked rule: `.cursor/rules/implementation-lite.mdc` (`Session closeout`). Paste duplicate: `docs/cursor-session-closeout-user-rules-snippet.md`.

---

## Session order (mandatory)

1. Pre-ship audit → commit → push → open PR → Linear PR comment (approved slice **In Progress**).
2. **Babysit → merge (same session):** watch CI (`gh pr checks`), triage comments, fix in-boundary failures, push until green; merge when mergeable.
3. **`git checkout main` && `git pull origin main`** — agent syncs local `main` before closeout.
4. Linear slice **Done** only when its full approved boundary is satisfied + merge comment.
5. **Phase B closeout** — next-issue plan only when an already-approved next issue exists; otherwise report the candidate/governance continuation. **Do not** code the next issue.

**Next-issue implementation planning is phase B only** — after merge and local `main` sync, not while the PR is open, and only for already-approved issue scope.

## Two phases (closeout format)

| Phase | When | Agent does | Agent does **not** |
| ----- | ---- | ---------- | ------------------- |
| **A — Babysit blocked** | PR open; merge cannot complete in-session | Interim status, PR URL, CI/blocker | Next-issue plan; mark slice **Done** |
| **B — After merge** | PR merged; current slice lifecycle updated when justified; local `main` synced | Plan an already-approved next issue, or report candidate/governance continuation | Code the next issue; create a new issue/child/parent from follow-up discovery |

Phase B reminder: **new agent chat** for the next approved slice (Linear URL, slice doc, branch name, `main` SHA). If there is no approved next slice, route useful follow-up through the governance workflow instead of inventing one.

---

## After merge: next slice (phase B)

When the current slice PR is **merged** and its approved boundary is satisfied:

1. **Do not** start coding the next Linear issue in the merge/babysit session unless the user explicitly asks for implementation.
2. If an **already-approved next issue** is explicitly identified by the authoritative queue/user, produce its implementation plan.
3. If the only next work comes from a deferred row, review finding, or newly discovered durable boundary that is not already approved, preserve it as candidate input and report its current governance phase. Do **not** create or select a new issue merely to populate closeout.
4. Remind the human: sync `main`, then **new agent chat** to implement the next approved slice.

### Next-approved-issue plan content (research only)

1. Issue ID and title
2. Smallest correct implementation boundary
3. Relevant files to inspect first
4. Existing systems likely to reuse
5. Risks and edge cases
6. Required tests
7. Required docs
8. What not to change
9. Proposed step-by-step implementation sequence

---

## Deferred work recording (mandatory)

Agents do not retain deferred work across new chats. When something is **out of slice** or **left for later**, write it down in the **same session** before ending, but distinguish approved scope from candidate scope:

| Where | What to write |
| ----- | --------------- |
| **Active slice doc** | `## Deferred` — item, existing approved owner if one truthfully owns it, one-line boundary, and whether it is in-boundary deferral or a new candidate. Never write “create child” as an instruction. |
| **Linear existing owner** | Comment with mechanic/repo anchor only when the deferred work remains inside that already-approved boundary. |
| **Candidate/reconciliation ledger** | New durable boundary, missing owner, contradiction, or scope expansion: provenance + candidate disposition + current approval phase. |
| **Parent issue** | Keep **In Progress** / **Backlog** until its existing approved acceptance/completion rule is truly met. |
| **This closeout block** | `Remaining risks or deferred work` must match the durable record and separate approved deferral from candidate scope. |

Optional: add a **Backlog** row in `planning/backlog.md` only when the referenced issue already exists and the queue update itself is authorized. Do not turn a candidate into a backlog issue from closeout.

**Do not** rely on: chat history, PR description only, GitHub linkback bots, or closeout text with no durable anchor.

Tracked rule: `.cursor/rules/implementation-lite.mdc` § Deferred work recording.

---

## Session rules (closeout)

- Do not expand the current issue.
- Do not implement the next issue.
- Do not create a new Linear issue, child, parent, contradiction issue, relationship, or durable scope from deferred work or closeout.
- New or changed scope returns to Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4.
- Do not create a parallel system when an existing system can absorb the approved work.
- Do not mark the issue complete unless implemented and validated work satisfies the **full** issue boundary.
- Keep parent issues open when this is only a child slice.
- Prefer small, deterministic, testable changes.
- Preserve old mistaken records and later corrections instead of overwriting them silently.
- If Linear lifecycle updates are part of the workflow, apply the smallest accurate status change supported by validated evidence.

---

## Final response format (mandatory)

Return **only** the structure for the current phase (no extra sections, no preamble).

### Phase A — PR open, babysit blocked (interim only)

Use when the slice is committed, pushed, PR is open, and babysit/merge cannot finish in-session (external blocker or explicit **do not merge**).

```text
Current issue status:
- Partially complete (PR open) / blocked / …

Changes made:
- concise list of changed files and what changed

Audit passes:
- scope and integration:
- edge cases:
- determinism and state:
- regression:
- documentation:
- cleanup:

Validation:
- command:
- result:

Remaining risks or deferred work:
- approved in-boundary deferral(s): … / none
- new candidate scope deliberately not created: … / none

PR:
- URL:

Local-agent Linear handoff:
- none (handoff fires only after an implementation PR merges; see docs/cloud-agent-linear-handoff.md)

Next issue implementation plan:
- Deferred until after merge (phase B). Do not fill this section when the PR is only open.
```

### Phase B — After merge

Use when the PR is **merged**, the agent has run **`git checkout main` && `git pull origin main`**, and backlog handoff updates are **on `main`** (`npm run verify:backlog-handoff` passes when applicable). The Linear merge comment may still be **pending** when Linear MCP was unavailable — fill **Local-agent Linear handoff** in that case (`docs/cloud-agent-linear-handoff.md`). Do not block phase B on Linear tooling availability.

```text
Merge closeout:
- PR URL:
- What shipped (one line):
- Parent issue status (open / done):

Local-agent Linear handoff:
- none — unless this merge completed an implementation plan and Linear was not updated (docs/cloud-agent-linear-handoff.md)
- Linear MCP / already posted / issues / status / verbatim comments / Do not: (fill only on that trigger)

Next approved issue implementation plan:
- Issue: <approved issue or “none”>
- Boundary:
- Files to inspect:
- Existing systems to reuse:
- Risks and edge cases:
- Tests:
- Docs:
- What not to change:
- Implementation sequence:

Candidate/governance continuation:
- <newly discovered candidate + current phase, or “none”>

Handoff:
- Agent already synced main in-session; remind human: new agent chat with approved Linear URL, slice doc, branch name, main SHA. If there is no approved next issue, continue the governance flow instead of starting implementation.
```

Fill every subsection for the active phase. Use `none` only when truly empty. **Phase A:** **Audit passes** summarize the six pre-ship passes from `docs/agent-pre-ship-audit.md`. **Phase B:** skip audit/validation unless re-run for merge fixes — focus on the next approved issue or the governance continuation. **Local-agent Linear handoff** is required only after an implementation plan is complete and that PR is merged, when Linear was not updated in-session (`docs/cloud-agent-linear-handoff.md`).
