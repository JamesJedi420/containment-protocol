# Agent session handoff

Canonical standing policy for humans and agents. **User Rules:** paste the short block from `docs/cursor-user-rules-snippet.md` into Cursor Settings → Rules. **Repo:** summarized at the top of `AGENTS.md`.

Optional: copy sections below into a local `.cursor/rules/agent-session-handoff.mdc` with `alwaysApply: true` (that folder is gitignored; per-developer only). **Committed User Rules paste sources:** `docs/cursor-implementation-lite-user-rules-snippet.md` (normal coding), `docs/cursor-backlog-hygiene-user-rules-snippet.md` (hygiene only).

**Cursor rules in this repo:** `.cursor/rules/linear-always-update.mdc` and `.cursor/rules/implementation-lite.mdc` are tracked (`alwaysApply: true` on every agent session). `.gitignore` ignores other files under `.cursor/rules/`. For per-developer prefs, use **Cursor Settings → User Rules** (`docs/cursor-user-rules-snippet.md`), not extra `.mdc` files in that folder. If you need a per-developer local rule file, keep it untracked under `.cursor/rules/`; to add another shared repo rule, whitelist it explicitly: `!.cursor/rules/<name>.mdc` in `.gitignore`.

## Standing policy (repo + user)

| Layer                                              | What belongs there                                            |
| -------------------------------------------------- | ------------------------------------------------------------- |
| **Cursor User Rules**                              | Merge → `checkout main` → pull → **new agent** for next slice |
| **`AGENTS.md`**                                    | Repo scripts, Linear, doc hygiene, this handoff summary       |
| **Linear + `planning/*-slice.md` + first message** | One task only                                                 |

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
3. **Linear lifecycle** — mandatory every session (`AGENTS.md` + `.cursor/rules/linear-always-update.mdc`): In Progress before work → **pre-ship audit** (six passes + clean validation, `docs/agent-pre-ship-audit.md`) → **commit + push + open PR** (ship loop) → **phase A closeout** (no next-issue plan) → **Done on merge** + comment what shipped → **phase B closeout** (next-issue plan only). **Deferred work:** record in slice doc `## Deferred` + Linear comment same session (`docs/agent-session-closeout.md` § Deferred work recording; `implementation-lite.mdc`). **Harvest triage:** `docs/harvest-candidate-triage-agent.md`; Linear owner comments must include **mechanic + boundary + fold-in vs child reasoning** (`docs/harvest-fold-in-linear-comments.md`); owner map QA: `docs/harvest-mirror-owner-map-qa.md` — same session as mirror, not deferred.

## Session closeout (agents)

**Phase A (PR open):** committed, pushed, PR-linked, Linear current — **do not code the next issue**; **do not** write a next-issue plan. End with **phase A** structure in **`docs/agent-session-closeout.md`**.

**Phase B (after merge):** slice **Done**, merge comment posted — produce the **next-issue plan** only; end with **phase B** structure in that doc. Paste source for User Rules: **`docs/cursor-session-closeout-user-rules-snippet.md`**.

## Optional first message template

```
PR #____ merged. On main @ <sha>. Next: <Linear URL> — see planning/<slice>.md — branch <name>.
```
