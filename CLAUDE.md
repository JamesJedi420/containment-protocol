# Containment Protocol — Claude Code

Canonical agent policy: **`AGENTS.md`**. Linear is the system of record. Implementation: `.cursor/rules/implementation-lite.mdc`.

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

1. One Linear slice (`SPE-####`) + `planning/*-slice.md` when present. Do not expand scope.
2. Pre-ship audit: `docs/agent-pre-ship-audit.md` (six passes) before commit.
3. Ship loop: commit → push → PR (`.github/pull_request_template.md`) → babysit (independent review + Greptile/CodeRabbit/Amazon Q/bot triage + CI) → merge → `git checkout main` && `git pull origin main`.
4. Linear: In Progress before work; PR URL on slice issue; Done + merge comment after merge. Parent stays open unless full parent scope shipped.
5. Deferred work: same session — slice doc `## Deferred` + Linear parent/child comment.

## Review bar

Same as `AGENTS.md` Review guidelines. Flag P0/P1: correctness, determinism, hydration, layer boundaries, week-close order, hidden UI truth, migrations, missing required tests, security. Do not flag style nits, drive-by refactors, scope expansion, or pre-existing `build` TS drift unless this change worsens it.

AI review config also lives in: `.greptile/`, `.amazonq/rules/`, `.coderabbit.yaml`, and this file (`CLAUDE.md`).

## Do not

- Parallel subsystems or unrelated refactors
- Weaken CI, lint, or tests to pass
- Skip Linear because GitHub has a bot linkback
- End an implementation session with only local files or an open unmerged PR (unless user says no commit / no PR / do not merge)
