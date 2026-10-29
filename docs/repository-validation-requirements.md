# Repository validation requirements (SPE-3348)

One machine-readable contract selects which **already-approved** validators are required or advisory for a change set. Local pre-ship and CI use the same resolver.

This orchestrator does **not** redefine what lint, Vitest, Playwright, governance, Academy authored-content, or other validators check. It only decides **whether** each registered validator must run.

## Canonical files

| Path | Role |
| --- | --- |
| `scripts/validation/validators.v1.json` | Registry: change classes, validators, activation, enforcement, unavailable policy |
| `scripts/validation/requirement-model.mjs` | Pure resolve / classify / missing-required detection |
| `scripts/validation/run-requirements.mjs` | Local + CI runner |
| `scripts/validation/requirement-model.check.mjs` | Deterministic selection tests |
| `scripts/validation/emit-playwright-gate.mjs` | CI helper for Playwright selected/enforcement outputs |

## Commands

| Task | Command |
| --- | --- |
| Resolve + run for changes vs `origin/main` | `npm run verify:requirements` |
| CI mode (uses `ciNpmScript` when declared) | `npm run verify:requirements -- --ci` |
| Explicit files | `npm run verify:requirements -- --files src/a.ts,planning/backlog.md` |
| Resolve only | `npm run verify:requirements -- --resolve-only --json` |
| Dry-run invocations | `npm run verify:requirements -- --dry-run` |
| Selection unit tests | `npm run verify:requirements:test` |

## Change classes

Paths map to one or more classes (`application`, `e2e`, `docs`, `planning`, `governance`, `academy`, `tooling`, `shared-config`, `architecture`). Validators activate when a changed file matches their `activation.pathGlobs` and/or `activation.changeClasses`.

## Registered validators (summary)

| Id | Enforcement | Owner | Notes |
| --- | --- | --- | --- |
| `lint` | required | SPE-10 (DX) | Application / e2e / tooling / shared-config / academy |
| `unit-tests` | required | SPE-10 (DX) | Application / shared-config; CI uses `test:run:ci` |
| `format-check` | advisory | SPE-10 (DX) | Broad docs/code paths |
| `audits-index` | required | SPE-10 (DX) | Audit docs + index paths only |
| `backlog-handoff` | required | SPE-10 (DX) | `planning/**` |
| `theme-contracts` | required | SPE-10 (DX) | Theme contract / audits index paths |
| `governance-contract` | required | SPE-3269 | Governance surfaces; SPE-3271 may register separately later |
| `architecture-index` | advisory | SPE-10 (DX) | `architecture/**` |
| `playwright-e2e` | advisory; **required** when `e2e/**` or `playwright.config.ts` changes | SPE-3458 | Player-path UI changes stay advisory |
| `academy-authored-content` | required when Academy content paths change | SPE-3304 | Unavailable until Academy ships its npm script; fail-closed |

## Local / CI parity

- Local: `npm run verify:requirements -- --base origin/main` (default base).
- CI `test` job: same resolver with `--ci --exclude=playwright-e2e`.
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
