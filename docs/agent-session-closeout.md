# Agent session closeout (implementation)

Canonical closeout after the **current slice** is committed, Linear is updated, and validation has run. Applies at the end of an implementation session (PR opened or merged). **Do not implement the next issue** in the same session — prepare a **next-issue plan only**.

Tracked rule: `.cursor/rules/implementation-lite.mdc` (`Session closeout`). Paste duplicate: `docs/cursor-session-closeout-user-rules-snippet.md`.

---

## After current issue: next slice

When the current slice is shipped (commit + push + PR) and Linear reflects the truthful status:

1. **Do not** start coding the next Linear issue.
2. **Do** produce a **next-issue implementation plan** from `planning/backlog.md`, the parent issue, or the user's stated "next" issue.
3. Remind the human: after **merge**, `git checkout main` && `git pull`, then **new agent chat** with Linear URL, slice doc, branch name, and `main` SHA.

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

Return **only** this structure (no extra sections, no preamble):

```text
Current issue status:
- Complete / partially complete / blocked / already complete

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
- command:
- result:

Remaining risks or deferred work:
- list only real follow-ups, or write “none”

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
```

Fill every subsection. Use `none` only when truly empty. **Audit passes** summarize the six pre-ship passes from `docs/agent-pre-ship-audit.md` (scope/integration through cleanup). For **Validation**, list each command and its result on separate `- command:` / `- result:` pairs.
