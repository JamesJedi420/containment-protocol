# SPE-3762 — unconditional CP event/save contract gate

Owner: [SPE-3762](https://linear.app/spectranoir/issue/SPE-3762), CP core;
receiving implementation actor: Codex. No parent or supporting issue.
Base: clean main `9667b7fc3f9790fb1b37970fe326d942b0393dff`, after
SPE-3761 / PR #5047 completed. Branch: `codex/spe-3762-cp-contracts`.
At preflight, main matched origin/main, no PRs were open, SPE-3761 was Done
and this owner transitioned from Backlog to In Progress before implementation.

## Boundary and anchors

At the base revision, `package.json` owns the existing local `vmThreads` and
CI `forks` conventions; `scripts/validation/requirement-model.mjs` owns
`activation.always` and mode-specific command resolution. This slice consumes
those primitives through `scripts/validation/validators.v1.json`, registering
required `cp-contracts`, owner SPE-3762, `whenUnavailable: fail`.

`scripts/validation/cp-contracts.mjs` declares only the eight existing test-file
identities approved by Linear. It runs Vitest once, refuses narrowing arguments,
checks required files and verifies the actual report set with the existing
completeness evaluator and an ephemeral scoped inventory. Each suite must report
passed with an executed passing assertion. Report paths are fresh per invocation
and removed afterwards. Native configuration, jsdom/globals and the inherited
strict-console environment are preserved. The canonical full-suite inventory,
runner and Test workflow remain unchanged.

Existing schemas, normalization, event/save versions, migrations, fixtures and
all eight test suites are evidence sources, not edit targets. SPE-3403 continues
to own broader CP save compatibility policy; SPE-3352 owns integrated release
acceptance. This gate does not establish gameplay acceptance or Academy ownership.
No new package, graph change, override, OpenAPI/PactFlow model, service, secret,
schedule or Actions pinning policy is authorized. SPE-3761 policies are retained.

## Validation and audit

- Targeted Node fixtures cover script/pool wiring, exact suite identities,
  unconditional empty/docs/application selection, ownership, unavailable failure,
  unchanged selection for other gates, missing/extra/duplicate/failed/skipped or
  unexecuted suites, malformed/missing reports, process errors and fresh reports.
- Local contract command: **758 tests / eight files passed**, `vmThreads`, 44.07s.
- Strict-console CI contract command: **758 tests / eight files passed**, `forks`,
  28.44s; the selected requirement run independently repeated it successfully.
- Node 22.23.5/npm 10.9.9 `ci --ignore-scripts` with explicit production,
  development, optional and peer inclusion passed, zero vulnerabilities. Lockfile
  and dependency-policy source/configuration remained unchanged.
- Required resolver run in CI mode over all eight changed paths passed every
  required validator: backlog, Codex environment, CP contracts, dependency audit
  and policy, engineering summary, lint, requirement fixtures, session preflight,
  full unit suite and Vite bundling. `VITEST_MAX_WORKERS=4` bounded local resource
  use; pools, test assertions/timeouts and hosted CI configuration were unchanged.
- Full suite: **11,534 tests / 1,055 files passed**, 759.94s. Existing completeness
  guard: 1,055 expected/observed, zero missing or failed suites. Existing guard
  fixtures: 31 passed. Tooling/selection fixtures: 79 passed before the final
  null-assertion robustness check; affected fixtures were rerun afterwards.
- Advisory typecheck census: zero diagnostics. Repository-wide format check:
  3,549 pre-existing advisory failures; all touched files pass formatting.
- Literal `npm run build` (`tsc -b` and Vite) passed; existing bundle-size warning
  remains. Final null-assertion/process-failure fixtures passed again. Independent
  full-diff review and PR/main CI are pending at this pre-ship record; observed
  results will be linked on the existing owner.

Six pre-ship passes cover scope/integration; malformed/missing execution;
deterministic tooling and no runtime-state change; nearby resolver/full-suite
consumers; README/validation documentation; and final diff/dead-code review.
All six passes found no remaining in-boundary defect after the null-assertion
guard/fixture correction and strengthened process-failure fixture (valid reports
cannot mask process failure). No application/test semantics changed. Literal
build and publication checks passed before commit/PR; independent review and CI
remain merge gates rather than claims made by this pre-ship document.

Hermes checkpoints: this is a small bounded adapter/registration, with unchanged
runtime suites and directly checkable report fixtures. Direct source/command
checks are appropriate; no substantial multi-document comparison or large-log
failure triage is currently needed. No Freebuff or paid worker delegation.
Documentation curation inspected `planning/documentation-curation.md`; searched
tracked README/docs/planning/architecture for changed commands and activation
descriptions. No ADR or canonical schema changes are warranted. Private/external
artifacts are excluded. Neither owner appears in the near-term backlog mirror,
so no queue/manifest status edit is required; consistency validation still runs.

Original checkout `C:/Projects/containment-protocol` and other worktrees are
preserved. Implementation is isolated at `C:/Projects/cp-ci-baseline-20261116`.
No in-boundary deferral or new candidate scope is presently identified.
Anchors describe the base revision and must be refreshed for later reuse.

PR review correction: CodeRabbit identified duplicated validator semantics in
the orchestration guide. That guide now retains registration/command information
and links to SPE-3762 and the validator for its suite/report rules. No execution
behavior changed; affected documentation checks passed before the review commit.
