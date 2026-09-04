# Cursor User Rules — session closeout (paste block)

Paste into **Cursor → Settings → Rules → User Rules** (or merge into your post-merge rule). Full detail: `docs/agent-session-closeout.md`.

---

## Phase A — PR open, babysit blocked (interim only)

When commit, push, and PR are done but babysit/merge **cannot** finish in-session (blocker or explicit **do not merge**):

Do not implement the next issue. **Do not** write a next-issue plan yet.

End using the **phase A** structure in `docs/agent-session-closeout.md`. Local-agent Linear handoff is **not** required while the PR is open.

## Phase B — After merge (normal session end)

After babysit (independent review + comment triage + CI) → merge, slice **Done**, merge comment on Linear, and **`git checkout main` && `git pull origin main`**:

Do not implement the next issue unless the user explicitly asks. Prepare a **next-issue implementation plan** only.

Next-issue plan must include: (1) issue ID and title, (2) smallest correct boundary, (3) files to inspect first, (4) systems to reuse, (5) risks/edge cases, (6) required tests, (7) required docs, (8) what not to change, (9) step-by-step sequence.

End with the **phase B** structure in `docs/agent-session-closeout.md` (merge closeout → next-issue plan → handoff).

Remind: agent already synced `main` in-session; **new agent chat** for the next slice with Linear URL, slice doc, branch name, and `main` SHA.

---

Do not expand the current issue. Do not mark the slice **Done** until merge when the full child boundary is satisfied. Keep parent issues open for child-only slices. Prefer small deterministic testable changes. Preserve mistaken records + later corrections; do not silent overwrite.

When deferring work: same session, record in the slice doc `## Deferred` + Linear parent/child comment (mechanic + boundary). Chat alone is not enough. See `docs/agent-session-closeout.md` § Deferred work recording.
