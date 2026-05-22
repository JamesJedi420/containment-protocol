# Agent session handoff

Canonical standing policy for humans and agents. **User Rules:** paste the short block from `docs/cursor-user-rules-snippet.md` into Cursor Settings → Rules. **Repo:** summarized at the top of `AGENTS.md`.

**Repo-wide Cursor rule (tracked):** `.cursor/rules/linear-always-update.mdc` — `alwaysApply: true` on every agent session. Add new shared rules by name in `.gitignore` (`!.cursor/rules/<name>.mdc`). Other files in `.cursor/rules/` stay gitignored for personal prefs.

## Standing policy (repo + user)

| Layer | What belongs there |
| --- | --- |
| **Cursor User Rules** | Merge → `checkout main` → pull → **new agent** for next slice |
| **`AGENTS.md`** | Repo scripts, Linear, doc hygiene, this handoff summary |
| **Linear + `planning/*-slice.md` + first message** | One task only |

## After you merge a PR (human)

1. `git checkout main` and `git pull origin main`.
2. **Start a new agent chat** before the next slice—not the thread that opened or babysat the merged PR.
3. First message: Linear issue URL, `planning/…-slice.md`, new branch name, current `main` commit (short SHA).

Agents should remind you when merge is complete: sync `main`, then **start a new agent** for the next issue.

## During an open PR

One agent session on the **same branch** is fine (implement, CI, review). Start a new session when the task changes or after merge.

## Cloud / Move to local

- Verify `git ls-remote origin <branch>` before checkout; migrated branch names from old sessions are often deleted after merge.
- If Move to local fails (`couldn't find remote ref`), use updated **`main`** and a new branch.

## Each new implementation task

1. `planning/backlog.md` or assigned Linear issue.
2. `planning/<topic>-slice.md` for bounded scope.
3. **Linear lifecycle** — mandatory every session (`AGENTS.md` + `.cursor/rules/linear-always-update.mdc`): In Progress before work → PR links slice issue → Done on merge → comment what shipped. Harvest triage posts Linear closure in the same turn, not deferred.

## Optional first message template

```
PR #____ merged. On main @ <sha>. Next: <Linear URL> — see planning/<slice>.md — branch <name>.
```
