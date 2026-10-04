# Cursor User Rules — session closeout (paste block)

Paste into **Cursor → Settings → Rules → User Rules** (or merge into your post-merge rule). Full detail: `docs/agent-session-closeout.md`.

---

## Phase A — PR open, babysit blocked (interim only)

When commit, push, and PR are done but babysit/merge **cannot** finish in-session (blocker or explicit **do not merge**):

Do not implement the next issue. **Do not** write a next-issue implementation plan yet.

End using the **phase A** structure in `docs/agent-session-closeout.md`. Local-agent Linear handoff is **not** required while the PR is open.

## Phase B — After merge

After babysit → merge → `git checkout main` && `git pull origin main`:

- Do not implement the next issue unless the user explicitly asks.
- Prepare a next-issue implementation plan **only when an already-approved next Linear issue exists**.
- If the only follow-up is a deferred/new durable boundary with no approved issue, report it as candidate/governance continuation instead of creating or selecting a child.
- Use the phase B structure in `docs/agent-session-closeout.md`.

An approved next-issue plan includes: issue ID/title, smallest boundary, files to inspect, systems to reuse, risks/edge cases, required tests/docs, what not to change, and implementation sequence.

Remind: agent already synced `main` in-session; use a **new agent chat** for the next approved slice with Linear URL, slice doc, branch name, and `main` SHA.

---

Do not expand the current issue. Do not mark the slice **Done** until merge when the full approved boundary is satisfied. Keep parent issues open for partial child shipping. Preserve mistaken records + later corrections; do not silently overwrite.

When deferring work:
- approved in-boundary deferral → slice doc `## Deferred` + existing approved owner comment;
- new durable boundary → persist candidate/provenance to the canonical Linear candidate ledger and return it to Phase 1; **do not create a child**.

Canonical candidate workflow: https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf
