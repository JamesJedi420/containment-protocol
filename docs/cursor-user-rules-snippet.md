# Cursor User Rules snippet (paste into Settings → Rules)

Copy the standing-workflow block below into **Cursor → Settings → Rules → User Rules** so every new agent (local or cloud) gets the same standing workflow. For implementation-lite or backlog-hygiene blocks, use the sources listed below. Repo-specific detail stays in `AGENTS.md` and `docs/agent-session-handoff.md`.

1. **Standing workflow** (this file, section below)
2. **Implementation lite** — full block in `docs/cursor-implementation-lite-user-rules-snippet.md` (normal coding sessions)
3. **Pre-ship audit** — `docs/cursor-pre-ship-audit-user-rules-snippet.md` (six passes + validation before commit/merge)
4. **Session closeout** — `docs/cursor-session-closeout-user-rules-snippet.md` (phase A after PR open: no next-issue plan; phase B after merge: next-issue plan only)
5. **Backlog hygiene** — on demand only: `docs/cursor-backlog-hygiene-user-rules-snippet.md`

---

## Containment Protocol — standing workflow

- **Git exception:** For Containment Protocol **implementation slices**, follow repo **`implementation-lite` ship loop** (commit → push → open PR → **babysit: independent review + triage Greptile/CodeRabbit/Amazon Q/bot comments + CI until green → merge** → `git checkout main` && `git pull origin main`) even when another rule says "only commit when requested." Do **not** plan the next slice until merge and local `main` sync complete. Tracked repo rules: `.cursor/rules/implementation-lite.mdc` and `.cursor/rules/linear-always-update.mdc` (`alwaysApply: true`). Honor explicit **no commit** / **no PR** / **local only** / **do not merge** only when the user says so in that session.
- **Linear is mandatory on every agent session** (implementation, harvest, PR babysit, review): In Progress before work, **commit + push + open PR** before claiming an implementation slice complete, slice issue linked in PR, Done + comment on merge. Never skip because GitHub has a bot linkback. Repo rules: `.cursor/rules/linear-always-update.mdc`, `.cursor/rules/implementation-lite.mdc`; detail in **`AGENTS.md`**. Harvest triage: post **rich** owner comments (mechanic + boundary + fold-in vs child) per **`docs/harvest-fold-in-linear-comments.md`** — not one-line notes.
- After a PR **merges**: run `git checkout main` and `git pull origin main`, then **start a new agent chat** for the next slice. Do not continue the old thread—it keeps stale branches, CI context, and failed "Move to local" branch names.
- During an **open PR** on one branch: one agent session is fine until merge.
- Each new task: give the agent the **Linear issue**, **`planning/*-slice.md`**, **branch name**, and confirm **current `main` commit** in the first message.
- Standing repo rules: read **`AGENTS.md`** at repo root first.
- Prefer slice docs and backlog over re-explaining finished work in chat.
- When I merge, remind me to sync `main` and **switch to a new agent** before the next issue.
- **Implementation lite:** `docs/cursor-implementation-lite-user-rules-snippet.md` (scope, **pre-ship audit**, **ship loop**, PR mapping, Linear).
- **Pre-ship audit:** before commit/merge — six passes until clean; `docs/agent-pre-ship-audit.md`.
- **Session closeout:** babysit (independent review + comment triage + CI) → merge → sync `main`, then phase B (next-issue plan only). Phase A only if babysit blocked. Final reply per `docs/agent-session-closeout.md`.
- **Backlog hygiene:** remind me to use the block from `docs/cursor-backlog-hygiene-user-rules-snippet.md` when running hygiene or grooming passes (not implementation).

---

## Optional one-line first message (per task)

```
PR #____ merged. On main @ <sha>. Next: <Linear URL> — see planning/<slice>.md — branch <name>.
```
