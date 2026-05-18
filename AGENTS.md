# Containment Protocol — Agent Instructions

## Cursor Cloud specific instructions

This is a client-side-only React/TypeScript SPA (no backend, no database, no external services).
All simulation logic is pure TypeScript; state is managed via Zustand with `localStorage` persistence.

### Running services

| Service         | Command                          | Notes                                                               |
| --------------- | -------------------------------- | ------------------------------------------------------------------- |
| Dev server      | `npm run dev`                    | Vite on http://localhost:5173 with HMR                              |
| Lint            | `npm run lint`                   | ESLint 9                                                            |
| Tests           | `npm run test:run`               | Vitest (302 files, ~2700 tests, ~55s)                               |
| Format check    | `npm run format:check`           | Prettier                                                            |
| Audit index     | `npm run verify:audits-index`    | `docs/design-audits-index.md` ↔ `docs/*audit*.md`                   |
| Theme contracts | `npm run verify:theme-contracts` | mirror SPE list ↔ `architecture/external-design-theme-contracts.md` |

### Non-obvious caveats

- **`npm run build` currently has baseline TS errors outside dev-environment setup.** Treat those as known type-contract drift, not as production-ignored failures; fix them in scoped follow-up changes before using `build` as a deployment gate. They do not block tests or the dev server because Vite transpiles TypeScript without strict type checking.
- **This repo is pinned to Vite 8 (`vite` `^8.0.1`) with the native config loader.** Type-only exports are stripped at the ESM boundary. If you import an `interface` or `type` alias as a value import, the dev server will throw `SyntaxError: does not provide an export named '...'`. Always use `import type { ... }` for type-only imports in source files that the Vite dev server loads.
- **Tests use `--pool vmThreads`** and the `jsdom` environment. The full suite runs in ~55s.
- **No environment variables or secrets** are required. The only optional env var is `STRICT_TEST_CONSOLE=1` (used in CI to fail on console warnings in tests).
- **Node.js 22** is required (matches CI configuration in `.github/workflows/test.yml`).

### Standard scripts reference

All scripts are documented in `README.md` under the **Scripts** section and in `package.json`.

### Linear (always update)

For every implementation task tied to an SPE or backlog item:

1. **Before coding** — create or find the Linear issue (child slice under parent when the parent is large); set **In Progress**.
2. **When opening a PR** — link the **slice issue** in the PR body (not only the parent epic).
3. **On merge** — set the slice issue **Done**; leave the parent **Done** only if the full parent scope shipped, otherwise return parent to **Backlog**.
4. **After merge** — add a short Linear comment with PR URL and what shipped.

Do not skip Linear because the PR has a linkback bot comment.

### Documentation hygiene

- **Near-term priorities:** `planning/backlog.md` (single queue; update there instead of duplicating long tactical lists).
- **Deferred deep design:** `planning/deferred-design-documents.md` (SPE-186+ mirror checklist, knowledge child issues SPE-529 / 587 / 588 / 589).
- **New design audits:** when adding `docs/*audit*.md`, insert a bullet in **strict alphabetical order** in `docs/design-audits-index.md`; `npm run verify:audits-index` must pass (also enforced in CI).
- **External theme map:** when the SPE-186+ mirror or `architecture/external-design-theme-contracts.md` changes, run `npm run verify:theme-contracts` (CI enforces after audit index).
- **Curation rhythm:** `planning/documentation-curation.md` (what to update per PR, milestone, or Linear mirror change).
