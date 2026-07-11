# SPE-2567 — Wire repo-side Cursor plugin config (keep-list)

**Linear:** [SPE-2567](https://linear.app/spectranoir/issue/SPE-2567/wire-repo-side-cursor-plugin-config-keep-list)  
**Parent:** [SPE-10](https://linear.app/spectranoir/issue/SPE-10/tools-and-dev) (Tools and Dev)  
**Branch:** `docs/spe-2567-agent-cursor-plugins`

## Goal

Version-control how agents use the Cursor plugin keep-list without wiring vendor APIs into the game runtime or CI.

## Scope

- `docs/agent-cursor-plugins.md` — keep-list, workflows, do-nots
- `.cursor/rules/agent-cursor-plugins.mdc` — thin always-apply pointer (whitelist in `.gitignore`)
- Pointers in `AGENTS.md`, `CLAUDE.md`, `docs/agent-session-handoff.md`, `docs/cursor-user-rules-snippet.md`
- CodeRabbit `package.json` path instruction for dependency PRs

## Out of scope

- Installing/uninstalling Cursor marketplace plugins
- Snyk/Sonatype/Tavily CI gates or SPA runtime SDKs
- Subtext auth, Netlify/Render deploy
- Enabling skipped enterprise plugins

## Acceptance

- [x] Agents reading `AGENTS.md` find the keep-list and review config paths
- [x] Dependency-add workflow points at Sonatype and/or Snyk
- [x] No new runtime secrets or CI vendor scan gates
- [x] Docs/rules-only PR

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Hosting plugin wiring (Netlify or Render) | Future SPE under SPE-10 | Blocked on `tsc` / `npm run build` baseline drift |
| Subtext MCP auth + usage notes | Optional | Needs human auth; not required for keep-list |
| Snyk CI gate | Future security slice | Requires token + explicit product decision |

## Validation

- Docs/rules only — no `src/` changes
- `npm run format:check` on touched markdown/yaml if needed
- Manual read of keep-list doc for consistency with SPE-2566 Tavily policy
