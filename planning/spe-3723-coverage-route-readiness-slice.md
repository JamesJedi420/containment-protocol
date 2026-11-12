# SPE-3723 — lazy-route coverage test synchronization

User authorized a bounded synchronization repair after establishing its owner. SPE-3723 is In Progress; related completed owners remain closed. Base: 82dc44d27e3ba71e1f81d14bfdedbc18c4dfb3b3. Branch: codex/coverage-route-readiness.

The unchanged case-navigation test fails at its default 1-second heading wait in main coverage runs 41802349680 and 41784597354. Isolated coverage reproduced one failed/two passed tests. A diagnostic 5-second wait passed all three, as did a warm unmodified repeat: load/cache sensitivity remains an observation, not isolated causality.

Apply the same existing 5-second page-readiness budget to asynchronous role queries in App.workflow.test.tsx. Preserve every navigation, heading, search and sort assertion. No sleeps, global timeout or coverage-threshold changes, lazy-route mocks, application changes, dependencies, or Sonar work.

Modern Web Guidance search used the installed skill version 2026_05_16-c5e7870; weak results led to list/retrieve and review of accessibility (including semantic roles/names). Installed-tool stale-version warning recorded. Existing cached tooling reused; Sonatype credits remain unavailable. No dependencies changed.

Validation pending: targeted instrumented tests, full coverage, selected validators, independent PR review and main verification. Targeted coverage of one file can pass tests while failing repository-wide coverage percentages; report those outcomes separately.

Six audit passes: scope limited to test synchronization; bounded asynchronous waits preserve missing-element failures; seeded state and application behavior unchanged; all original assertions retained; this slice records evidence; no debug code or global configuration changes. Small documentation/PR-draft checkpoints handled directly; prior systematic-debugging Hermes attempt exhausted its bounded calls without a report and was replaced by direct source/log comparison. Final validation and post-merge hygiene remain pending.

## Validation before PR

Node22.23.4. Patched targeted instrumented tests3/3 pass; single-file command exits1 only on unchanged global coverage percentage thresholds. Full STRICT_TEST_CONSOLE=1 npm run coverage:ci -- --maxWorkers=4 exits0:1000files/10851tests pass (783.38s); statements88.71%, branches78.15%, functions94.34%, lines90.24%, all thresholds satisfied. Existing dependencies reused; hosted clean-install validation remains necessary. Full build/lint exit0. Audit index41/backlog/theme108 pass. Required selector: backlog-handoff, lint, unit-tests, vite-build; advisory formatting/typecheck/browser checks unchanged. Precommit small docs/communication checks direct; diff reviewed for scope, bounded absence failures, deterministic state, assertions retained, evidence and cleanup. Hosted independent review/CI and merged-main proof pending.

## PR review follow-up

Amazon Q identified synchronous queries after dashboard return navigation. Convert remaining screen-level role queries to the same bounded asynchronous readiness waits; within-section queries follow awaited parent headings. All original assertions and role/name filters remain. Final targeted instrumented tests3/3 pass (9.15s); single-file global-percentage failure remains expected and unchanged. The full instrumented1000/10851 pass above precedes this additional wait-only change; latest hosted regression and merged-main coverage will verify the final revision. Touched-file lint passes.
