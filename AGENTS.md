# Containment Protocol — Agent Instructions

## Cursor Cloud specific instructions

This is a client-side-only React/TypeScript SPA (no backend, no database, no external services).
All simulation logic is pure TypeScript; state is managed via Zustand with `localStorage` persistence.

### Running services

| Service | Command | Notes |
|---------|---------|-------|
| Dev server | `npm run dev` | Vite on http://localhost:5173 with HMR |
| Lint | `npm run lint` | ESLint 9 |
| Tests | `npm run test:run` | Vitest (302 files, ~2700 tests, ~55s) |
| Format check | `npm run format:check` | Prettier |

### Non-obvious caveats

- **`npm run build` has pre-existing TS errors** in test files (`squadKitAssignment.test.ts`, `siteGeneration.pipeline.test.ts`, `supportLoadout.test.ts`). These do not affect tests or the dev server. The Vite dev server transpiles TypeScript without strict type checking.
- **Vite 8 / Rolldown** strips type-only exports at the ESM boundary. If you import an `interface` or `type` alias as a value import, the dev server will throw `SyntaxError: does not provide an export named '...'`. Always use `import type { ... }` for type-only imports in source files that the Vite dev server loads.
- **Tests use `--pool vmThreads`** and the `jsdom` environment. The full suite runs in ~55s.
- **No environment variables or secrets** are required. The only optional env var is `STRICT_TEST_CONSOLE=1` (used in CI to fail on console warnings in tests).
- **Node.js 22** is required (matches CI configuration in `.github/workflows/test.yml`).

### Standard scripts reference

All scripts are documented in `README.md` under the **Scripts** section and in `package.json`.
