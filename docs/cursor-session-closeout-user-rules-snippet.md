# Cursor User Rules — session closeout (paste block)

Paste into **Cursor → Settings → Rules → User Rules** (or merge into your post-merge rule). Full detail: `docs/agent-session-closeout.md`.

---

## Phase A — PR opened (implementation session end)

After commit, push, PR opened, and Linear updated (PR URL on slice; slice **In Progress**):

Do not implement the next issue. **Do not** write a next-issue plan yet.

End the session using **only** the **phase A** structure in `docs/agent-session-closeout.md` (status → changes → audit passes → validation → deferred → PR URL). Under **Next issue implementation plan**, write only: deferred until after merge.

## Phase B — After merge

After the PR is **merged**, slice **Done**, and merge comment on Linear:

Do not implement the next issue unless the user explicitly asks. Prepare a **next-issue implementation plan** only.

Next-issue plan must include: (1) issue ID and title, (2) smallest correct boundary, (3) files to inspect first, (4) systems to reuse, (5) risks/edge cases, (6) required tests, (7) required docs, (8) what not to change, (9) step-by-step sequence.

End with the **phase B** structure in `docs/agent-session-closeout.md` (merge closeout → next-issue plan → handoff).

Remind: `git checkout main` && `git pull`, then **new agent chat** with Linear URL, slice doc, branch name, and `main` SHA.

---

Do not expand the current issue. Do not mark the slice **Done** until merge when the full child boundary is satisfied. Keep parent issues open for child-only slices. Prefer small deterministic testable changes. Preserve mistaken records + later corrections; do not silent overwrite.

When deferring work: same session, record in the slice doc `## Deferred` + Linear parent/child comment (mechanic + boundary). Chat alone is not enough. See `docs/agent-session-closeout.md` § Deferred work recording.
