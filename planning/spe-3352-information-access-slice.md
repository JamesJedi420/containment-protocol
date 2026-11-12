# SPE-3352 — available-information convergence

## Approved boundary and preflight

Codex continues the existing SPE-3352 controlled campaign acceptance boundary after PR #4882. Base: `83e318b6a9722f5b6dd8d9db6bf9ceeaebee361e`; branch: `codex/spe-3352-information-access`. Current Linear read confirmed In Progress with no blocking relationships. The session preflight returned ready at `2026-11-06T12:14:45.619Z`, with clean synchronized main and no open PRs. This record describes the fixture at this branch, not a whole-release acceptance result.

## Implementation and checkable acceptance

Extend `e2e/intervention-comparison.spec.ts::runComparisonPath` rather than create another campaign harness. Two paths start from the same default campaign, assign Night Watch to the Vampire Nest and Green Tape to the Whispering Archive, advance two operational weeks and reload at the same checkpoints. The only varied action is opening the already-available Archive dossier before the first week and again after the first report exists.

`inspectArchiveDossier` checks the actual dossier heading and escalation-pathways region, then compares the entire persisted `GameState` before reading, while reading and after returning to Cases. In particular, the second observation protects the existing report/history from retroactive mutation. Both paths retain the existing partial-outcome, report reload and next-assignment assertions. Their entire final saved `GameState`, initial state, selected outcome and visible result must match. Repeat each path in a fresh browser context; the original intervention-versus-inaction test also gains full final-state repeat comparison.

No state is injected, no outcome is manufactured, and no canonical field is excluded from the equality assertions. Locale, timezone, shipped seed and rules remain identical. A divergence is a failure to investigate, not permission to strip inconvenient state from the comparison.

## Evidence limits

This is a normal UI information-access/convergence observation: reading a reference dossier provides player-visible information but must not change the simulation. It does not assert that human understanding changed, that discovery/reporting/witness or public-belief systems ran, or that the complete `comparison-information` criterion passes. The entire saved-state comparisons are between runs at equivalent checkpoints; they do not assert byte-for-byte equality before versus after hydration, which may normalize state. Immediate dossier reads separately assert complete state nonmutation.

The five gameplay evidence conditions are bounded here: reachable through Cases; connected to the existing template projection and ordinary weekly simulation; observable dossier, report and next assignment; historical state checked during reads and outcomes compared after reload; validated through the existing browser harness. No gameplay implementation, information-policy change, new state/schema, dependency, terminal-success assumption or Academy scope is included. SPE-3352 remains In Progress for its other criteria and authoritative-owner evidence.

## Validation and checkpoints

Targeted Chromium run: both tests passed without retries (40.6s original intervention comparison; 41.8s information-access comparison; 1.4m total). Each test executes four fresh contexts. Log: `C:/Users/james/.codex/tmp/spe3352-information-browser.log`. SPE-3348 selected required backlog-handoff, lint and Playwright, with repository-wide formatting advisory. `npm run verify:requirements -- --base origin/main --exclude format-check` passed all three required validators, including all 23 browser tests in 3.7m, with no retries needed. Log: `C:/Users/james/.codex/tmp/spe3352-information-requirements.log`. Independent PR review remains the publication checkpoint. Both touched files pass Prettier; the pre-existing repository-wide advisory formatting drift is excluded explicitly, not represented as passing. Unit tests and production build are not selected for this test/documentation-only diff; prior results are not relabeled as executions of this revision.

Six pre-ship passes: scope reuses the existing fixture; exact accessible names avoid same-title row ambiguity; complete saved-state equality preserves deterministic/history checks; the original causal comparison still passes; this record distinguishes information exposure from broader information-system acceptance; no unused imports, temporary debug behavior, runtime edits or unrelated changes remain. No new malformed-input API is introduced. Review must use the full diff against the stated base.

Hermes mapping, audit and documentation checkpoints: direct — delegation overhead exceeds this two-file evidence volume. No Freebuff or paid delegation. No frontend behavior is changed, so frontend implementation guidance and dependency adoption checks are not triggered by this test-only extension. Existing fixture and runtime owners are reused.
