# Containment Protocol

A React + TypeScript + Vite gameplay prototype for a small containment-response
simulation. The live app is the squad assignment and weekly simulation flow
mounted from `src/main.tsx` into `src/app/App.tsx`.

The repository also still contains an older incident-shell prototype under
`docs/archived/incident-shell/`. Those files are preserved as an archived
reference build with their own tests, but they are not the runtime entrypoint.

## Stack

- React 19
- TypeScript
- Vite 8
- ESLint 9
- Vitest + Testing Library

## Scripts

- `npm run dev` starts the local Vite dev server
- `npm run build` runs TypeScript build mode and produces a production bundle
- `npm run lint` runs ESLint across the repo
- `npm run format` rewrites files with Prettier
- `npm run format:check` verifies formatting without changing files
- `npm run test -- --run` executes the Vitest suite once
- `npm run test:ui` opens the Vitest UI
- `npm run coverage` runs tests with coverage output

## Structure

- `src/main.tsx` mounts the live gameplay app
- `src/app/App.tsx` defines the gameplay routes for dashboard, cases, teams, and reports
- `src/app/store/gameStore.ts` holds the simulation state and gameplay actions
- `src/domain/models.ts` defines the core simulation types
- `src/domain/sim/*` contains assignment, resolution, spawn, raid, and week-advance logic
- `src/domain/templates/*` contains starter content sources for class tables, roster/team setup, case templates, and seeded opening cases
- `src/data/startingState.ts` assembles the initial game state from the template modules
- `src/data/caseTemplates.ts` re-exports the template catalog for compatibility with existing imports
- `src/app/App.test.tsx` covers the live gameplay routes
- `src/test/sim.*.test.ts` covers simulation regressions and deterministic behavior
- `docs/archived/incident-shell/*` contains the archived incident-shell prototype and its preserved tests

## Next Useful Steps

- Expand route-level tests around multi-week navigation and report drill-down
- Expand simulation tests around raid staffing limits, unassign flows, and fail escalation variants
- Keep the archived incident-shell prototype out of active runtime and test paths unless it is intentionally revived
