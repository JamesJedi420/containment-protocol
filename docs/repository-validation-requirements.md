# Repository validation requirements (SPE-3348)

One machine-readable contract selects which **already-approved** validators are required or advisory for a change set. Local pre-ship and CI use the same resolver.

This orchestrator does **not** redefine what lint, Vitest, Playwright, governance, Academy authored-content, or other validators check. It only decides **whether** each registered validator must run.

## Canonical files

| Path                                             | Role                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `scripts/validation/validators.v1.json`          | Registry: change classes, validators, activation, enforcement, unavailable policy |
| `scripts/validation/requirement-model.mjs`       | Pure resolve / classify / missing-required detection                              |
| `scripts/validation/run-requirements.mjs`        | Local + CI runner                                                                 |
| `scripts/validation/requirement-model.check.mjs` | Deterministic selection tests                                                     |
| `scripts/validation/emit-playwright-gate.mjs`    | CI helper for Playwright selected/enforcement outputs                             |

## Commands

| Task                                       | Command                                                               |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Resolve + run for changes vs `origin/main` | `npm run verify:requirements`                                         |
| CI mode (uses `ciNpmScript` when declared) | `npm run verify:requirements -- --ci`                                 |
| Explicit files                             | `npm run verify:requirements -- --files src/a.ts,planning/backlog.md` |
| Resolve only                               | `npm run verify:requirements -- --resolve-only --json`                |
| Dry-run invocations                        | `npm run verify:requirements -- --dry-run`                            |
| Selection unit tests                       | `npm run verify:requirements:test`                                    |

## Change classes

Paths map to one or more classes (`application`, `e2e`, `docs`, `planning`, `governance`, `academy`, `tooling`, `shared-config`, `architecture`). Validators activate when a changed file matches their `activation.pathGlobs` and/or `activation.changeClasses`.

Repository-local `.codex/**` environment configuration is tooling. Changes to it, the Copilot specialist profile, or the Codex adapter select the existing named-task preflight tests and the focused SPE-3337 adapter/profile contract checks.

## Registered validators (summary)

| Id                         | Enforcement                                                                                                                                                                                                                                                      | Owner                                     | Notes                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lint`                     | required                                                                                                                                                                                                                                                         | SPE-10 (DX)                               | Application / e2e / tooling / shared-config / academy                                                      |
| `unit-tests`               | required                                                                                                                                                                                                                                                         | SPE-10 (DX)                               | Application / shared-config; CI uses `test:run:ci`                                                         |
| `vite-build`               | required                                                                                                                                                                                                                                                         | SPE-3348                                  | Application / shared-config / academy, plus `index.html` / app entry; `npm run build:bundle` (no `tsc`)    |
| `format-check`             | advisory                                                                                                                                                                                                                                                         | SPE-10 (DX)                               | Broad docs/code paths                                                                                      |
| `typecheck`                | advisory                                                                                                                                                                                                                                                         | SPE-3376 (SPE-3375 recovery)              | Publishes the TypeScript census; non-blocking; later enforcement requires authorization                    |
| `audits-index`             | required                                                                                                                                                                                                                                                         | SPE-10 (DX)                               | Audit docs + index paths only                                                                              |
| `backlog-handoff`          | required                                                                                                                                                                                                                                                         | SPE-10 (DX)                               | `planning/**`                                                                                              |
| `theme-contracts`          | required                                                                                                                                                                                                                                                         | SPE-10 (DX)                               | Theme contract / audits index paths                                                                        |
| `governance-contract`      | required                                                                                                                                                                                                                                                         | SPE-3269                                  | Governance surfaces; SPE-3271 may register separately later                                                |
| `architecture-index`       | advisory                                                                                                                                                                                                                                                         | SPE-10 (DX)                               | `architecture/**`                                                                                          |
| `playwright-e2e`           | advisory; **required** for e2e harness edits and player-critical / smoke-path surfaces (Front Desk, Advance Week shell, `gameStore`, `AppShell`, Cases + caseView / Case detail, Agents, Recruitment, Agency maintenance, Containment Site `SystemBoundaryPage`) | SPE-3458 / SPE-3481 / SPE-3482 / SPE-3483 | Other UI paths stay advisory unless listed in `requiredWhen`; deep sim remains Vitest                      |
| `academy-authored-content` | required when Academy content paths change                                                                                                                                                                                                                       | SPE-3304                                  | Available via `npm run verify:academy-authored-content`; see `docs/academy-authored-content-validation.md` |

`vite-build` is a bundle-integrity gate, not a typecheck gate: it runs Vite production bundling so missing imports, invalid config, or an unbuildable entry (`index.html` / `src/main.tsx`) fail before merge. An entry-only change selects this gate without widening lint or unit-test activation. `npm run build` remains `tsc -b && vite build`, and the advisory `typecheck` census is unchanged; the required gate neither replaces nor weakens either.

Changes to `.github/workflows/test.yml` select the existing Playwright gate as
required so installer and browser execution changes are exercised on Ubuntu.

## Local / CI parity

The required `codex-environment` validator (SPE-3337) runs the native environment/adapter/profile contract tests. It checks the finite action mapping, current Node 22 launch/failure behavior the physical environment's reviewed setup/Windows actions and the Copilot profile's restricted frontmatter. The environment check intentionally supports only this repository's generated single-line TOML subset, not general TOML; unsupported configuration edits fail closed. It does not authorize work, replace the session preflight, or certify that unobserved app UI actions ran.

- Local: `npm run verify:requirements -- --base origin/main` (default base).
- CI `test` job: same resolver with `--ci --exclude=playwright-e2e`; `vite-build` needs no workflow-specific step because the resolver selects it.
- CI `playwright-e2e` job: `emit-playwright-gate.mjs` sets `selected` + `enforcement`; install/run only when selected; `continue-on-error` only when enforcement is not `required`.

## Adding a validator

1. Ensure the validator’s **semantics** remain owned by their Linear issue (do not copy rules here).
2. Add one entry to `validators.v1.json` with stable `id`, `ownerIssue`, `npmScript` or `command`, `enforcement`, `activation`, `whenUnavailable`.
3. Extend `requirement-model.check.mjs` for the new activation cases.
4. Do not duplicate selection logic in workflow YAML beyond invoking this runner.

## Unavailable / missing required

- `whenUnavailable: fail` + unavailable probe → missing required validation (process fails).
- `whenUnavailable: report-unavailable` → reported; blocking only if enforcement is required and policy is fail.
- Results must include every required id; omitted required ids are detected as `required-validator-not-executed`.

## Explicit exceptions

`--exception id=reason` marks a selected validator `skipped-exception` for that run (tests / rare operator override). Prefer fixing the validator or narrowing activation over standing exceptions.
