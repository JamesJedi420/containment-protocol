# Agent session closeout (implementation)

Canonical closeout after the **current slice** is committed, validated, and Linear is current. **Do not implement the next issue** in the same session.

Tracked rule: `.cursor/rules/implementation-lite.mdc` (`Session closeout`). Paste duplicate: `docs/cursor-session-closeout-user-rules-snippet.md`.

---

## Session order (mandatory)

1. Pre-ship audit → commit → push → open PR → Linear PR comment (slice **In Progress**).
2. **Babysit → merge (same session):** watch CI (`gh pr checks`), triage comments, fix in-boundary failures, push until green; merge when mergeable.
3. **`git checkout main` && `git pull origin main`** — agent syncs local `main` before closeout.
4. Linear slice **Done** + merge comment.
5. **Phase B closeout** — next-issue plan only; **do not** code the next issue.

**Next-issue plan is phase B only** — after merge and local `main` sync, not while the PR is open.

## Two phases (closeout format)

| Phase | When | Agent does | Agent does **not** |
| ----- | ---- | ---------- | ------------------- |
| **A — Babysit blocked** | PR open; merge cannot complete in-session | Interim status, PR URL, CI/blocker | Next-issue plan; mark slice **Done** |
| **B — After merge** | PR merged; slice **Done**; local `main` synced | Next-issue implementation plan only (research) | Code the next issue in this thread |

Phase B reminder: **new agent chat** for the next slice (Linear URL, slice doc, branch name, `main` SHA) — even though this session already ran `checkout main`.

---

## After merge: next slice (phase B)

When the current slice PR is **merged** and Linear reflects **Done** (child boundary satisfied):

1. **Do not** start coding the next Linear issue in the merge/babysit session unless the user explicitly asks for implementation.
2. **Do** produce a **next-issue implementation plan** from `planning/backlog.md`, the parent issue, deferred rows in the slice doc, or the user's stated "next" issue.
3. Remind the human: sync `main`, then **new agent chat** to implement the next slice.

### Next-issue plan content (research only)

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

Agents do not retain deferred work across new chats. When something is **out of slice** or **left for later**, write it down in the **same session** before ending:

| Where | What to write |
| ----- | --------------- |
| **Active slice doc** | `## Deferred` — bullet or table: item, target Linear issue (or “create child”), one-line boundary |
| **Linear parent or child** | Comment with mechanic, repo anchor, fold-in vs new child — not “deferred to later” alone |
| **Parent issue** | Keep **In Progress** / **Backlog** until parent acceptance is truly met |
| **This closeout block** | `Remaining risks or deferred work` must match the slice doc + Linear comment |

Optional: add a **Backlog** row in `planning/backlog.md` when the next slice is already named.

**Do not** rely on: chat history, PR description only, GitHub linkback bots, or closeout text with no slice/Linear anchor.

Tracked rule: `.cursor/rules/implementation-lite.mdc` § Deferred work recording.

---

## Session rules (closeout)

- Do not expand the current issue.  
- Do not implement the next issue.  
- Do not create a parallel system when an existing system can absorb the work.  
- Do not mark the issue complete unless implemented and validated work satisfies the **full** issue boundary.  
- Keep parent issues open when this is only a child slice.  
- Prefer small, deterministic, testable changes.  
- Preserve old mistaken records and later corrections instead of overwriting them silently.  
- If Linear status updates are part of the workflow, recommend the smallest accurate status change from the validated result.  

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
- list only real follow-ups, or write “none”

PR:
- URL:

Next issue implementation plan:
- Deferred until after merge (phase B). Do not fill this section when the PR is only open.
```

### Phase B — After merge

Use when the PR is **merged**, the slice issue is **Done**, the merge comment is on Linear, the agent has run **`git checkout main` && `git pull origin main`**, and backlog handoff updates are **on `main`** (`npm run verify:backlog-handoff` passes).

```text
Merge closeout:
- PR URL:
- What shipped (one line):
- Parent issue status (open / done):

Next issue implementation plan:
- Issue:
- Boundary:
- Files to inspect:
- Existing systems to reuse:
- Risks and edge cases:
- Tests:
- Docs:
- What not to change:
- Implementation sequence:

Handoff:
- Agent already synced main in-session; remind human: new agent chat with Linear URL, slice doc, branch name, main SHA.
```

Fill every subsection for the active phase. Use `none` only when truly empty. **Phase A:** **Audit passes** summarize the six pre-ship passes from `docs/agent-pre-ship-audit.md`. **Phase B:** skip audit/validation unless re-run for merge fixes — focus on the next-issue plan.
