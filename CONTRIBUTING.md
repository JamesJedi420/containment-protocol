# Contributing to Containment Protocol

Thanks for working on Containment Protocol. This guide covers what you need to know before opening an issue or a pull request.

For project orientation, start with [README.md](README.md), [docs/game-loop.md](docs/game-loop.md), and [docs/index.md](docs/index.md). For terminology, see [docs/glossary.md](docs/glossary.md).

## Ground rules

- Containment Protocol is a deterministic systems sim. Prefer bounded, inspectable rules over hidden randomness or bespoke one-offs.
- Keep canonical state authoritative. UI, reports, and projections should surface domain decisions, not recompute them.
- Respect dependency boundaries. See [docs/dependency-boundaries.md](docs/dependency-boundaries.md).
- Implementation-first. Documentation describes shipped or actively-implemented behavior, not aspirations.

## Agent / contributor ownership

This repo splits work between two automated agents (and humans following the same rules):

| Owner       | Files                               | Responsibilities                                          |
| ----------- | ----------------------------------- | --------------------------------------------------------- |
| **Codex**   | `src/domain/**`, `src/app/store/**` | Rules, math, state transitions, persistence, engine tests |
| **Copilot** | `src/features/**`, `src/styles/**`  | Components, layout, Tailwind, copy, static content        |

Hard rule: if a change modifies shared types in `src/domain/models.ts`, all parallel work pauses until that change merges and tests pass.

Full agent guidance lives in [.github/copilot-instructions.md](.github/copilot-instructions.md) and [.github/instructions/](.github/instructions/).

## Branches and PRs

- Branch naming: `<author>/spe-<linear-id>-<short-slug>` for issue work; otherwise `<author>/<short-slug>`.
- Keep PRs focused. One slice per PR; split unrelated changes.
- Reference the Linear issue (SPE-####) and any related issues in the PR description.
- Do not bypass safety checks (e.g., `--no-verify`).

## Local development

Setup and common commands are listed in [README.md](README.md). Most often:

```bash
npm install
npm run dev          # local Vite dev server
npm run lint         # ESLint
npm run format:check # Prettier verification
npm run test:run     # Vitest, single-pass
npm run build        # production build
```

Before opening a PR, run lint, format check, and the test suite.

## Tests

- Domain, regression, and determinism tests live under `src/test/`.
- Feature and UI tests live alongside their components as `*.test.tsx`.
- Cross-scale handoff contracts are covered by `src/test/crossScaleContracts.test.ts` and `src/test/campaignToIncidentHook.integration.test.ts`.
- New behavior should be covered by deterministic tests. Snapshot-only coverage is not sufficient for domain changes.

## Documentation changes

- Player-facing docs: [docs/game-loop.md](docs/game-loop.md), [docs/rules-and-objectives.md](docs/rules-and-objectives.md), [README.md](README.md).
- System design notes: audit notes under [docs/](docs/) — keep one note per system, link via [docs/index.md](docs/index.md).
- Terminology: [docs/glossary.md](docs/glossary.md). Add new terms only when they are already in use in code or content.
- If you change shared behavior, also update the relevant audit note(s) and the changelog.

## Filing issues

Use the templates under [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/):

- **Bug** — implementation defects.
- **Playtest Finding** — observations from a structured playtest session (see [docs/playtest-prompts.md](docs/playtest-prompts.md)).
- **Docs Gap** — missing, wrong, or unclear documentation.
- **System Proposal** — design proposals for new or changed simulation behavior.

For where to ask for help vs. file an issue, see [SUPPORT.md](SUPPORT.md).

## Security

For vulnerability reports, follow [SECURITY.md](SECURITY.md). Do not file security issues in public templates.

## Changelog

Add user-visible changes under the `## [Unreleased]` section in [CHANGELOG.md](CHANGELOG.md). Keep entries short and reference the relevant Linear issue or PR.
