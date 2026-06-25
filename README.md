# Containment Protocol

[![Test](https://github.com/JamesJedi420/containment-protocol/actions/workflows/test.yml/badge.svg)](https://github.com/JamesJedi420/containment-protocol/actions/workflows/test.yml)

**Containment Protocol** is a deterministic, domain-driven containment operations simulation built as a React and TypeScript single-page app. It models weekly incident response, squad assignment, procurement, recruitment, faction pressure, reports, and explicit cross-system state handoffs.

The project is intentionally client-only: no backend, database, external services, or secrets are required to run the app locally.

## Table of Contents

- [Quick Start](#quick-start)
- [Requirements](#requirements)
- [Common Commands](#common-commands)
- [Validation](#validation)
- [Architecture](#architecture)
- [Current Status](#current-status)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Planning and Documentation](#planning-and-documentation)

## Quick Start

```bash
npm ci
npm run dev
```

Open the Vite dev server at:

```text
http://localhost:5173
```

On Windows PowerShell, `npm.cmd run dev` is also fine.

## Requirements

- Node.js 22
- npm
- A modern browser

No environment variables are required. CI sets `STRICT_TEST_CONSOLE=1` so unexpected console output fails tests.

## Common Commands

| Command                          | Purpose                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                    | Start the Vite development server with HMR.                                           |
| `npm run lint`                   | Run ESLint across the repository.                                                     |
| `npm run test:run`               | Run the full Vitest suite once using the local `vmThreads` pool.                      |
| `npm run test`                   | Run Vitest in watch mode. Pass a file path to narrow scope while iterating.           |
| `npm run test:run:ci`            | Run the CI test command using the `forks` pool.                                       |
| `npm run coverage`               | Run tests with coverage output.                                                       |
| `npm run format`                 | Rewrite files with Prettier.                                                          |
| `npm run format:check`           | Check formatting without editing files.                                               |
| `npm run verify:audits-index`    | Verify `docs/design-audits-index.md` matches top-level `docs/*audit*.md` files.       |
| `npm run verify:theme-contracts` | Verify SPE mirror coverage against `architecture/external-design-theme-contracts.md`. |
| `npm run build`                  | Run the TypeScript project build and Vite production bundle. See the note below.      |

`npm run build` is a type-contract gate, not the current day-to-day development gate. The app, tests, and dev server use Vite successfully, but strict project build can expose known type-contract drift that should be fixed in scoped follow-up slices before treating build as a deployment blocker.

## Validation

Before opening a pull request, run the checks that match the scope of your change:

```bash
npm run lint
npm run test:run
npm run format:check
```

Documentation and planning changes may also need:

```bash
npm run verify:audits-index
npm run verify:theme-contracts
```

GitHub Actions runs lint, audit verification, theme-contract verification, tests, and coverage on pull requests.

## Architecture

The app keeps simulation rules, state orchestration, projections, and UI separate.

| Layer               | Location                                               | Responsibility                                                                              |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Domain              | `src/domain/**`                                        | Deterministic simulation logic, rule evaluators, event contracts, and weekly orchestration. |
| Store and hydration | `src/app/store/**`                                     | Zustand state, save/load compatibility, and run transfer.                                   |
| View models         | `src/features/*View.ts`                                | Pure projections for UI surfaces.                                                           |
| UI                  | `src/features/**`, `src/styles/**`                     | React routes, pages, panels, and presentational components.                                 |
| Starter data        | `src/data/startingState.ts`, `src/domain/templates/**` | Canonical initial state and authorable content templates.                                   |
| Tests               | `src/test/**`, `src/features/**/*.test.tsx`            | Determinism, domain, regression, view-model, UI, and boundary coverage.                     |

Important design rules:

- Simulation output must be deterministic and testable.
- Shared explanatory output should live in canonical domain helpers where possible.
- Optional modules integrate through explicit contracts, not hidden mutable state.
- Type-only imports must use `import type` in Vite-loaded source files.
- Dependency boundaries are enforced by guardrail tests; see `docs/dependency-boundaries.md`.

## Current Status

Recent shipped work includes:

- **Durable affiliation/person-status records** for SPE-1046, including persistence, read-only surfacing, weekly progression, and exact-match mission-routing evidence through existing clearance gates.
- **Publish and contribution operations** for SPE-75, including publish-queue persistence, execution receipts, manual approval, webhook, and modifiable data-pack orchestration.
- **Registry umbrella grooming** for SPE-947 and SPE-1046, with parent issues kept in Backlog until full parent acceptance is satisfied.
- **Mission triage and hidden-state slices** for concealment, intake signal chips, modality tells, and deterministic report notes.

The canonical live queue is `planning/backlog.md`. Avoid duplicating long tactical lists in this README.

## Project Structure

```text
.
|-- architecture/            # Long-lived architecture and contract docs
|-- docs/                    # Audits, handoffs, contribution docs, and references
|-- planning/                # Canonical backlog and slice plans
|-- scripts/                 # Repository verification scripts
|-- src/
|   |-- app/                 # App shell, routes, and Zustand store
|   |-- data/                # Copy and starting-state assembly
|   |-- domain/              # Deterministic simulation domain
|   |-- features/            # React feature surfaces and view models
|   |-- styles/              # Shared styling
|   `-- test/                # Domain and integration test coverage
|-- app.vite.config.ts       # Vite app/test configuration
|-- package.json             # Scripts and dependencies
`-- README.md
```

Archived prototype work lives in `docs/archived/incident-shell/` and is not part of the active runtime.

## Contributing

Work is tracked in Linear, not GitHub Issues:

- Linear team queue: [SpectraNoir SPE](https://linear.app/spectranoir/team/SPE/all)
- PR template: `.github/pull_request_template.md`
- Contribution and release policy: `docs/contribution-and-release-operations.md`
- Agent/session handoff: `AGENTS.md` and `docs/agent-session-handoff.md`

Expected PR flow:

1. Start from updated `main`.
2. Create or find the Linear slice issue and set it In Progress.
3. Keep the implementation boundary small and testable.
4. Run targeted checks, then full validation as appropriate.
5. Link the Linear issue in the PR body.
6. Merge only after CI is green.

After a PR merges, sync local `main` before starting the next slice.

## Planning and Documentation

- Canonical near-term queue: `planning/backlog.md`
- Deferred deep design: `planning/deferred-design-documents.md`
- Documentation curation rhythm: `planning/documentation-curation.md`
- Schema ownership: `SCHEMA_REGISTRY.md`
- Cross-scale handoff contracts: `docs/cross-scale-integration.md`
- Dependency boundaries: `docs/dependency-boundaries.md`

When adding a new top-level `docs/*audit*.md`, update `docs/design-audits-index.md` in strict alphabetical order and run `npm run verify:audits-index`.
