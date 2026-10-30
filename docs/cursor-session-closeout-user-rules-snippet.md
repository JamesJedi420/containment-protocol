# Cursor User Rules — session closeout (paste block)

Paste into **Cursor → Settings → Rules → User Rules** (or merge into your post-merge rule). Full detail: `docs/agent-session-closeout.md`.

---

## Phase A — PR open, babysit blocked (interim only)

When commit, push, and PR are done but babysit/merge **cannot** finish in-session (blocker or explicit **do not merge**):

Do not implement the next issue. **Do not** write a next-issue implementation plan yet.

End using the **phase A** structure in `docs/agent-session-closeout.md`. Local-agent Linear handoff is **not** required while the PR is open.

## Phase B — After merge

After babysit → merge → `git checkout main` && `git pull origin main`:

- Do not implement the next issue in this merge closeout; a next implementation request belongs in a new agent session.
- Prepare a next-issue implementation plan **only when an already-approved next Linear issue exists**.
- If no already-approved next issue exists, stop and ask for the Linear issue, slice doc, and branch. Do not run delegated selection or set a new issue In Progress in the merge closeout session. Remind that a **new** Cursor agent chat may select/reconcile under `docs/cursor-autonomous-authority.md` on authorized continuation. ChatGPT candidate-derived scope uses its own Phase 1–4 approvals. Neither actor creates or reconciles new scope in this merge closeout.
- Use the phase B structure in `docs/agent-session-closeout.md`.

An approved next-issue plan includes: issue ID/title, smallest boundary, files to inspect, systems to reuse, risks/edge cases, required tests/docs, what not to change, and implementation sequence.

Remind: agent already synced `main` in-session; use a **new agent chat** for the next approved slice with Linear URL, slice doc, branch name, and `main` SHA.

---

Do not expand the current issue. Do not mark the slice **Done** until merge when the full approved boundary is satisfied. Keep parent issues open for partial child shipping. Preserve mistaken records + later corrections; do not silently overwrite.

When deferring work:
- approved in-boundary deferral → slice doc `## Deferred` + existing approved owner comment;
- new durable boundary → preserve candidate/provenance and actual authority state; ChatGPT routes it through Phase 1–4, while Cursor may create/fold ownership under its safeguards in a **subsequent authorized session**. Do not create a child in this closeout.

Canonical candidate workflow: https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf
