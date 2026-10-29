# Containment Protocol — Claude Code

Canonical agent policy: **`AGENTS.md`**. Linear is the system of record for already-approved scope/lifecycle. Implementation: `.cursor/rules/implementation-lite.mdc`.

## Stack

Client-only React/TypeScript SPA. Pure sim in `src/domain/`; Zustand in `src/app/store/`; projections in `src/features/*View.ts`; UI in `src/features/**/*.tsx`. No backend, DB, or required env vars. Node 22.

## Commands

| Task | Command |
| --- | --- |
| Dev | `npm run dev` |
| Lint | `npm run lint` |
| Tests | `npm run test:run` |
| Format | `npm run format:check` |
| Audit index | `npm run verify:audits-index` |
| Theme contracts | `npm run verify:theme-contracts` |

`npm run build` has known baseline TS drift — do not treat as a green deployment gate; do not expand that drift in-slice.

## Architecture (hard)

- **Domain** (`src/domain/**`): pure; no React/store/features imports; seeded RNG only.
- **Store** (`src/app/store/**`): orchestration; domain only.
- **Projections** (`*View.ts` / `*Selectors.ts`): pure; no UI or cross-feature imports.
- **UI**: presentational; use projections.
- **Vite 8:** `import type { ... }` for type-only imports in files the dev server loads.
- Week-close hooks belong on week-close (`src/domain/sim`). Mid-week mutations that should run at close are P0.
- New persisted fields need normalization + event schema/migration per `SCHEMA_REGISTRY.md`.

## Scope and ship

1. Implement the active Linear slice (`SPE-####`) + `planning/*-slice.md` when present. Cursor may select or create bounded Linear scope under `docs/cursor-autonomous-authority.md` (ChatGPT Phase 1–4 gates do not bind Cursor). Codex designations are preferences, not exclusive locks.
2. Pre-ship audit: `docs/agent-pre-ship-audit.md` (six passes) before commit.
3. Ship loop: commit → push → PR (`.github/pull_request_template.md`) → babysit (independent review + Greptile/CodeRabbit/Amazon Q/bot triage + CI) → merge → `git checkout main` && `git pull origin main`.
4. Linear: In Progress before owned work; PR URL on slice issue; Done + merge comment only after the full slice boundary ships. Evaluate the parent separately. Cloud Agents that cannot auth Linear emit a local-agent handoff after an implementation merge (`docs/cloud-agent-linear-handoff.md`).
5. Deferred work: in-boundary deferral → slice doc `## Deferred` + owner comment. New durable boundary → Cursor creates/folds Linear under autonomous-authority safeguards.

Lifecycle/evidence updates never require ChatGPT phases. Cursor backlog-shape writes use autonomous-authority safeguards (`docs/governance/authority-contract.v1.json` CP-GOV-009).

## Review bar

Same as `AGENTS.md` Review guidelines. Flag P0/P1: correctness, determinism, hydration, layer boundaries, week-close order, hidden UI truth, migrations, missing required tests, security. Do not flag style nits, drive-by refactors, scope expansion, or pre-existing `build` TS drift unless this change worsens it.

AI review config also lives in: `.greptile/`, `.amazonq/rules/`, `.coderabbit.yaml`, and this file (`CLAUDE.md`).

## Live web research

Prefer repo sources first. Use **Tavily** (MCP / CLI) only when live web research is required and repo sources are insufficient. MCP must be authenticated; if unavailable, report that and fall back — do not wire Tavily into the game runtime.

## Cursor plugins

Keep-list and workflows: **`docs/agent-cursor-plugins.md`**. Before adding or upgrading npm deps: **required** Sonatype `/check-dependency`; optional Snyk package health (does not replace Sonatype). Do not wire vendor scan/search SDKs into `src/` or CI without an approved Linear slice.

## Do not

- Expand the active PR past its Linear acceptance without updating Linear first
- Parallel subsystems, speculative frameworks, or unrelated refactors
- Weaken CI, lint, or tests to pass
- Skip lifecycle updates because GitHub has a bot linkback
- End an implementation session with only local files or an open unmerged PR (unless user says no commit / no PR / do not merge)
- Treat ChatGPT Phase gates as a ban on Cursor creating justified Linear scope
