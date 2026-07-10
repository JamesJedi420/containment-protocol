# Containment Protocol — Agent Instructions

## Session handoff (read first)

**Standing policy** is split three ways so new agents do not rely on an old chat:

| Layer | What belongs there |
| --- | --- |
| **Cursor User Rules** (Settings → Rules) | Personal workflow: merge → `checkout main` → pull → **new agent** for next slice. Paste from `docs/cursor-user-rules-snippet.md`. |
| **`AGENTS.md` + `docs/agent-session-handoff.md`** | Repo-wide agent behavior (this file; full handoff doc). |
| **Linear + `planning/*-slice.md` + first message** | One task: issue link, slice doc, branch name, `main` SHA. |

### After you merge a PR (human)

1. `git checkout main` and `git pull origin main`.
2. **Start a new agent chat** before the next slice—not the thread that opened or babysat the merged PR.
3. First message: Linear issue, `planning/…-slice.md`, new branch name, confirm current `main` commit.

Agents: when merge is complete, sync `main` in-session, then remind the user to **start a new agent** for the next task.

### Linear — mandatory (every session, every agent)

**Non-negotiable** for all agents (local, Cloud, background, subagents) and all task types: implementation, harvest reconciliation, PR babysit, reviews, and docs-only slices. Cursor loads **`.cursor/rules/linear-always-update.mdc`** (`alwaysApply: true`) on every session.

Linear is the system of record for issue state and closure. **Do not** skip Linear because a PR has a GitHub linkback bot comment or because the task feels "metadata only."

| When | Action |
| --- | --- |
| **Before substantive work** | Find or create the slice issue; set **In Progress**. |
| **Harvest / triage closure** | Follow **`docs/harvest-candidate-triage-agent.md`**. Post **rich** owner comments (mechanic, repo anchor, ownership, boundary, fold-in vs child reasoning) per **`docs/harvest-fold-in-linear-comments.md`** — not one-line notes; mirror table must match. Owner-map QA: **`docs/harvest-mirror-owner-map-qa.md`**; SPE-2110 intake same session — not "table only." |
| **Slice ready** | **Commit**, **push**, and **open PR** on the named branch before claiming the slice complete (`docs/cursor-implementation-lite-user-rules-snippet.md` ship loop; tracked rule `.cursor/rules/implementation-lite.mdc`). |
| **PR opened** | Link the **slice** issue in the PR body (not only the parent epic); comment PR URL on the slice issue. |
| **Babysit → merge** | Same session: watch CI until green, fix in-boundary failures, merge PR; then `git checkout main` && `git pull origin main`. |
| **On merge** | Slice issue **Done**; parent **Done** only if full parent scope shipped, else parent **Backlog**. |
| **After merge** | Short Linear comment: PR URL + what shipped. |

If Linear MCP is unavailable, report the exact comments or status changes that would have been posted; do not treat that as permission to skip updates indefinitely.

Paste **`docs/cursor-user-rules-snippet.md`** into Cursor User Rules so personal sessions inherit the same expectation.

### During an open PR

One session on the **same branch** is fine (implement, CI, review). New session when the task or merged PR changes.

### Cloud / Move to local

If checkout of a migrated branch fails (`couldn't find remote ref`), use updated **`main`** and a new branch; do not chase deleted remote branch names from old sessions.

---

## Cursor Cloud specific instructions

This is a client-side-only React/TypeScript SPA (no backend, no database, no external services).
All simulation logic is pure TypeScript; state is managed via Zustand with `localStorage` persistence.

### Running services

| Service         | Command                          | Notes                                                               |
| --------------- | -------------------------------- | ------------------------------------------------------------------- |
| Dev server      | `npm run dev`                    | Vite on http://localhost:5173 with HMR                              |
| Lint            | `npm run lint`                   | ESLint 10                                                           |
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

### Documentation hygiene

- **Near-term priorities:** `planning/backlog.md` (single queue; update there instead of duplicating long tactical lists).
- **Deferred deep design:** `planning/deferred-design-documents.md` (SPE-186+ mirror checklist, knowledge child issues SPE-529 / 587 / 588 / 589).
- **New design audits:** when adding `docs/*audit*.md`, insert a bullet in **strict alphabetical order** in `docs/design-audits-index.md`; `npm run verify:audits-index` must pass (also enforced in CI).
- **External theme map:** when the SPE-186+ mirror or `architecture/external-design-theme-contracts.md` changes, run `npm run verify:theme-contracts` (CI enforces after audit index).
- **Curation rhythm:** `planning/documentation-curation.md` (what to update per PR, milestone, or Linear mirror change).
- **Implementation lite (default coding):** tracked `.cursor/rules/implementation-lite.mdc` (`alwaysApply: true`); paste duplicate from `docs/cursor-implementation-lite-user-rules-snippet.md` into Cursor User Rules if needed.
- **Pre-ship audit:** before commit/PR — six iterative passes + validation until clean; `docs/agent-pre-ship-audit.md`; User Rules paste: `docs/cursor-pre-ship-audit-user-rules-snippet.md`.
- **Session closeout:** phase A after PR open (audit closeout only — **no** next-issue plan); phase B after merge (next-issue plan only). Formats in `docs/agent-session-closeout.md`; User Rules paste: `docs/cursor-session-closeout-user-rules-snippet.md`.
- **Deferred work:** same session — slice doc `## Deferred` + Linear parent/child comment; see `docs/agent-session-closeout.md` § Deferred work recording and `.cursor/rules/implementation-lite.mdc`.
- **Backlog hygiene passes:** paste from `docs/cursor-backlog-hygiene-user-rules-snippet.md` (optional local `.cursor/rules/backlog-hygiene.mdc`; grooming only, not implementation).

---

## Review guidelines

Codex (`@codex review`), **Greptile** (`@greptileai`), **CodeRabbit**, **Amazon Q Developer** (`/q review`), Copilot code review, Gemini Code Assist, CharlieHelps, and other PR reviewers should enforce the same bar. Read the PR description for the Linear slice issue, `planning/*-slice.md`, and stated boundary before commenting.

AI review repo config: `.greptile/` (`config.json`, `rules.md`, `files.json`), `.amazonq/rules/*.md`, `.coderabbit.yaml`. Dashboard or marketplace settings may also apply; in-repo files are version-controlled and reviewed in PRs.

### Severity

- **P0 / P1 (flag):** correctness bugs, determinism breaks, persistence/hydration gaps, layer-boundary violations, week-close ordering errors, hidden-state leaks through UI, event schema/migration regressions, missing tests when acceptance requires coverage, security issues.
- **Do not flag:** style-only nits, drive-by refactors, scope expansion suggestions, or pre-existing `npm run build` baseline TS drift unless this PR makes it worse (see caveats above).

### Architecture

Per `docs/dependency-boundaries.md` and `test/boundary-enforcement.test.ts`:

- **Domain** (`src/domain/**`): pure simulation; no store/projection/UI imports.
- **Store** (`src/app/store/**`): orchestration; may import domain only.
- **Projections** (`src/features/*View.ts`): pure selectors; no UI or cross-feature imports.
- **UI** (`src/features/**`): presentational; use projections. Do not re-derive canonical domain summaries when a domain helper or projection already owns them.
- **Vite 8:** type-only imports must use `import type { ... }` in dev-server-loaded files.

### Simulation and state

- Outcomes must be reproducible (seeded RNG; no hidden randomness or silent mutation).
- Week-close hooks belong on week-close — flag mid-week mutations that should run at close as P0.
- New persisted fields need normalization defaults and event schema/migration updates per `SCHEMA_REGISTRY.md`.

### Scope discipline

- PR must match linked Linear/slice acceptance; flag scope creep as P1.
- Do not request unrelated refactors, renames, or parallel subsystems.
- Do not duplicate feedback already fixed in the same PR unless the fix is wrong.

### Tests and docs

- New domain or user-visible behavior needs targeted Vitest coverage; flag missing tests P1 when acceptance implies it.
- In-boundary docs, fixtures, and schemas must stay current; typos in touched docs are P1.
- Validation expectation: most specific tests first, then lint; full suite `npm run test:run` on non-trivial sim changes.

### Review process

1. Review the **full diff against `main`**, not isolated hunks.
2. Cite file paths; explain **why** something fails acceptance.
3. Prefer the smallest in-boundary fix when suggesting changes.
4. Do not weaken tests, CI, or lint rules to pass.
