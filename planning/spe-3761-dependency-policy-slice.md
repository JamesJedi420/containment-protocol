# SPE-3761 — exact dependency specifications and native audit gates

Owner: [SPE-3761](https://linear.app/spectranoir/issue/SPE-3761). Shared-system-owned;
receiving implementation actor: Codex. No parent or children. Approved through
Phase 4. State at implementation start: In Progress. Linear retains the current
lifecycle; publication/merge acceptance is recorded there from actual evidence.

Branch: `codex/spe-3761-dependency-policy`.
Base/main: `9c123c01dae0ea4dfe6eff4b86203af629e0ac42` (2026-11-16).
Anchors describe that revision and must be refreshed after later changes.

## Boundary and implementation

- Pin all 30 current direct production/development versions to their existing
  lockfile versions; support optional direct sections in the verifier. Edit only
  manifest/root lock specifications. Preserve every non-root package record,
  integrity, override and nested `magicast` entry.
- Add `save-exact=true` and accurately describe the moderate audit threshold.
- Node-only `dependency-policy.mjs` checks exact SemVer and manifest/root/resolved
  agreement; native `dependency-audit.mjs` uses the reviewed Windows/npm process
  adapter, explicit prod/dev/optional/peer inclusion, lockfile-only, no scripts or
  fixes, moderate threshold, bounded execution and fail-closed result checks.
- Extend `requirement-model.mjs` with optional boolean OR activation, default
  false, and validate activation shapes. Required `dependency-policy` and
  `dependency-audit` registrations run even for empty change sets; existing
  selector/exception/advisory/unavailable behavior stays intact.
- Update existing script/validation/security documentation and fixture tests.
  Existing Test workflow already invokes the resolver; no workflow change is needed.

Not in scope: package additions/upgrades/re-resolution, runtime/schema/save-policy
changes, additional scanning services/secrets/schedules, Actions pinning policy,
or SPE-3762's contract gate. That approved owner follows this slice's completed
merge/main-sync closeout; it is not activated by this PR.

## Review and validation evidence

Acceptance requires stable graph/root-only lock changes; exact/prerelease positive
cases; range/tag/malformed/missing/mismatch negatives; controlled audit command
failure cases plus live audit; unconditional selection and invalid-setting tests;
Node 22/npm 10.9.9 scripts-disabled clean installation; required validators, full
tests, lint and literal build; independent review, green CI, merge and main sync.
Done requires all of that evidence on the Linear owner.

- Initial targeted run: 48 Node tests passed (policy/audit/requirement model).
- Sonatype credits were already exhausted in this session. The SPE-3726 fallback
  remains in force; no retry or unavailable-scan pass is claimed. This is unchanged
  dependency hardening, with no new adoption or exposure. Exact installed versions,
  lock integrity/provenance and SPE-3745's bundled/override assessment are retained;
  native audit evidence is bounded by its advisory coverage.
- Preimplementation Hermes checkpoint returned unsupported claims (missing
  lockfile, engine validation and other lockfile formats outside the boundary).
  Rejected; direct source/acceptance mapping used under the documented fallback.
  Session: `local-fa8aa5390f60dea7f89860012fe53ae001d590b84342a2f8454ae32d31c7facc`.
  No repository changes occurred during that checkpoint. No provider/model change
  or worker delegation was used. Usage totals were unavailable; no savings claim.
- Node 22.23.5/npm 10.9.9 scripts-disabled clean install passed, lockfile unchanged.
  Structural comparison confirms all 397 non-root records, both `magicast`
  records, root identity and overrides unchanged.
- `verify:requirements:test`: 69 passing tests; final policy/audit fixtures and
  changed tooling lint passed after checker cleanup. Actual CI-mode resolver
  selection verified for empty, documentation-only and application changes.
- Live dependency policy and native audit passed (zero reported findings).
  Other selected required validators passed: backlog handoff, environment,
  engineering summaries, lint, requirement tests, session preflight and bundle
  build. Typecheck advisory produced zero diagnostics in both runs. Whole-repo
  format advisory has 3,550 existing failures; all changed files pass formatting.
- Initial full VM-thread suite retained two simulation timeouts (11,532 passed).
  Both unchanged suites passed in isolation (15 tests). Full strict-console
  `test:run -- --maxWorkers=4 --reporter=json --outputFile=<local report>` passed
  all 11,534 tests / 1,055 files in 193.82 seconds. Existing completeness evaluator
  confirms 1,055 expected/observed/matched, zero missing/unreviewed/failed. Timeout
  limits, assertions, pool convention and repository CI configuration are unchanged.
- Literal `npm run build` passed. Six pre-ship passes checked scope/integration,
  malformed/empty/failure inputs, deterministic checks without runtime state,
  regressions/integration, documentation semantics and dead-code/diff cleanup.
- Read-only Linear UI check: SpectraNoir Automations has merge transition
  **No action**, with parent/sub-issue auto-close off. No setting was changed;
  final Done still requires verified merge/acceptance evidence.
- Publication/closeout checkpoint applicability: short PR/doc evidence checks
  direct; no large-log or multi-owner curation needed. Unsupported Hermes mapping
  was not reused as approval or a passing review. Independent review and required
  CI are still publication-to-merge gates, recorded on the PR/Linear owner.
- Review fixes: split activation validation to meet the existing complexity gate;
  use explicit build-component length checks, an explicit locale comparator and
  the required digit-class spelling. No validator semantics or gates were weakened.
- Devin's offline-audit bypass finding was reproduced against npm 10.9.9: offline
  mode skips advisory retrieval and returns an empty successful report. Explicit
  `--offline=false --prefer-offline=false --prefer-online=true` now overrides
  inherited config. A controlled unavailable local registry with offline
  preferences set fails with visible `ECONNREFUSED`; the forced-online live audit
  passes with zero findings. Fixtures assert these explicit invocation flags.

## Preservation

Work is isolated in `C:/Projects/cp-ci-baseline-20261116`. Original checkout
`C:/Projects/containment-protocol`, its unrelated 41 changed/untracked files and
other worktrees remain outside the edit boundary. The original state snapshot
and local detailed logs are retained outside the repository.
