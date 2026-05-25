# Cursor User Rules snippet (paste into Settings → Rules)

Copy the blocks below into **Cursor → Settings → Rules → User Rules** so every new agent (local or cloud) gets the same standing workflow. Repo-specific detail stays in `AGENTS.md` and `docs/agent-session-handoff.md`.

1. **Standing workflow** (this file, section below)
2. **Implementation lite** — full block in `docs/cursor-implementation-lite-user-rules-snippet.md` (normal coding sessions)
3. **Backlog hygiene** — on demand only: `docs/cursor-backlog-hygiene-user-rules-snippet.md`

---

## Containment Protocol — standing workflow

- **Linear is mandatory on every agent session** (implementation, harvest, PR babysit, review): In Progress before work, slice issue linked in PR, Done + comment on merge. Never skip because GitHub has a bot linkback. Repo rule: `.cursor/rules/linear-always-update.mdc`; detail in **`AGENTS.md`**. Harvest triage: post **rich** owner comments (mechanic + boundary + fold-in vs child) per **`docs/harvest-fold-in-linear-comments.md`** — not one-line notes.
- After a PR **merges**: run `git checkout main` and `git pull origin main`, then **start a new agent chat** for the next slice. Do not continue the old thread—it keeps stale branches, CI context, and failed "Move to local" branch names.
- During an **open PR** on one branch: one agent session is fine until merge.
- Each new task: give the agent the **Linear issue**, **`planning/*-slice.md`**, **branch name**, and confirm **current `main` commit** in the first message.
- Standing repo rules: read **`AGENTS.md`** at repo root first.
- Prefer slice docs and backlog over re-explaining finished work in chat.
- When I merge, remind me to sync `main` and **switch to a new agent** before the next issue.
- **Implementation lite:** paste the block from `docs/cursor-implementation-lite-user-rules-snippet.md` (scope, PR mapping, validation, Linear closure).
- **Backlog hygiene** (grooming only, not implementation): paste from `docs/cursor-backlog-hygiene-user-rules-snippet.md` when running hygiene passes.

---

## Optional one-line first message (per task)

```
PR #____ merged. On main @ <sha>. Next: <Linear URL> — see planning/<slice>.md — branch <name>.
```
