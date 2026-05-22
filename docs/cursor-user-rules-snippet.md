# Cursor User Rules snippet (paste into Settings → Rules)

Copy the block below into **Cursor → Settings → Rules → User Rules** so every new agent (local or cloud) gets the same standing workflow. Repo-specific detail stays in `AGENTS.md` and `docs/agent-session-handoff.md`.

---

## Containment Protocol — standing workflow

- **Linear is mandatory on every agent session** (implementation, harvest, PR babysit, review): In Progress before work, slice issue linked in PR, Done + comment on merge. Never skip because GitHub has a bot linkback. Repo rule: `.cursor/rules/linear-always-update.mdc`; detail in **`AGENTS.md`**. Harvest triage: **`docs/harvest-candidate-triage-agent.md`** + **`docs/harvest-mirror-owner-map-qa.md`** + **`docs/harvest-fold-in-linear-comments.md`**.
- After a PR **merges**: run `git checkout main` and `git pull origin main`, then **start a new agent chat** for the next slice. Do not continue the old thread—it keeps stale branches, CI context, and failed "Move to local" branch names.
- During an **open PR** on one branch: one agent session is fine until merge.
- Each new task: give the agent the **Linear issue**, **`planning/*-slice.md`**, **branch name**, and confirm **current `main` commit** in the first message.
- Standing repo rules: read **`AGENTS.md`** at repo root first.
- Prefer slice docs and backlog over re-explaining finished work in chat.
- When I merge, remind me to sync `main` and **switch to a new agent** before the next issue.

---

## Optional one-line first message (per task)

```
PR #____ merged. On main @ <sha>. Next: <Linear URL> — see planning/<slice>.md — branch <name>.
```
