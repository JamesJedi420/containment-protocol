# Cursor User Rules — session closeout (paste block)

Paste into **Cursor → Settings → Rules → User Rules** (or merge into your post-merge rule). Full detail: `docs/agent-session-closeout.md`.

---

After the current issue is committed and Linear is updated:

Do not implement the next issue. Prepare a next-issue implementation plan only.

Next-issue plan must include: (1) issue ID and title, (2) smallest correct boundary, (3) files to inspect first, (4) systems to reuse, (5) risks/edge cases, (6) required tests, (7) required docs, (8) what not to change, (9) step-by-step sequence.

End the session using **only** the final response structure in `docs/agent-session-closeout.md` (Current issue status → Changes made → Audit passes → Validation → Remaining risks → Next issue implementation plan).

Do not expand the current issue. Do not implement the next issue. Do not mark complete unless the full issue boundary is satisfied. Keep parent issues open for child slices only. Prefer small deterministic testable changes. Preserve mistaken records + later corrections; do not silent overwrite.
