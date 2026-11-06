# SPE-3352 — current campaign evidence publication

## Boundary and plan

Codex publishes a separate snapshot for clean subject/base `438c8df709cdb568d156c1581a44d1833983e576` on `codex/spe-3352-current-campaign-evidence`. Preflight was ready at `2026-11-06T13:09:55.259Z`; main was synchronized and clean with no open PR. Linear SPE-3352 remains In Progress with no blocking relationships. The receiving implementation/review agent must assess these anchors at that revision, not infer that later HEAD was executed.

Collect native reporter/model tests, the actual SPE-3348 release-window execution, literal production build and existing browser attachments before editing tracked files. Preserve the historical `de3f1eb6` snapshot. Publish the new manifest, original validator JSON, compact execution index and browser observations, then check deterministic generation and publication validators. No runtime, test, dependency, policy, accepted exception or owner-status change belongs in this slice.

## Executed results and limits

Collection ran from `2026-11-06T13:10:36.0337631Z` to `2026-11-06T13:29:37.2157313Z`, with empty before/after Git status. Node 22.23.4 and existing dependencies were reused. The execution index records the lockfile hash and retained host-local artifact hashes. The release-window base is `8596b04efc82a807d0a334c195e73d8e533ba58e`; this differs deliberately from the evidence-publication base.

- Native reporter/model contracts: 55 passed.
- Full required validation: exit 1. Backlog, lint, browser and Vite bundle passed; unit tests failed (1,006 files passed / one failed; 10,968 tests passed / one failed). Advisory typecheck passed with zero diagnostics; advisory formatting failed.
- Literal `npm run build`: exit 0, with the existing chunk-size warning.
- Campaign browser suite: 24 passed, no retries/skips, 267,527.565 ms. Separate synthetic error-reporting suite: five passed. These are automated fixtures, not observed human UX evidence.
- Failure: `src/app/App.test.tsx:384`, “moves directly between the live pages without routing back through the dashboard”, failed to find the Cases heading on return from Reports. Unchanged focused `npm run test:run:ci -- src/app/App.test.tsx` passed 44 tests in 24.22 seconds. Full collection left `STRICT_TEST_CONSOLE` unset; diagnostic enabled it. Cause and specific repair owner remain UNVERIFIED. SPE-3723 covers another file and remains Done; registry owner SPE-10 is not asserted as the repair owner.

The matrix must remain blocked by `validator-unit-tests`. Successful report generation means valid input, not green acceptance. Other missing rows remain unavailable. AC-08 cannot pass without verified remediation ownership. No runtime/test readiness repair or waiver is absorbed here.

At the subject revision, `e2e/intervention-comparison.spec.ts` exercises real assignment versus inaction: Archive stage one/no spawned cases versus stage five/three spawned cases and later team requirements. Dossier read/unread runs retain matching complete outcomes; this does not prove all public-belief/institutional-information contracts. `e2e/quiet-period.spec.ts` compares naturally available hiring during a two-week authored pending-case interval, with identical initial/first-week states, nine versus eight final agents and repeated complete outcomes. Hiring can also change wages, funding and history; agent count is not claimed as its sole effect. Older pressure/hydration evidence retains its selected-field limitations.

## Audit and publication checks

Six direct passes cover the existing owner boundary; missing evidence and required-failure preservation; pinned revisions and deterministic generation; existing reporter consumers and unchanged historical files; traceable source/command/environment documentation; and removal of generated bulk logs from the tracked diff. Native reporter code is unchanged. Full-suite output uses compact reporting, so aggregate counts and the sole named failure establish the execution result; no individual passing-test log is invented.

Hermes read-only mapping used the configured local model in session `local-dcec464bb64e18db8fec716f0a619b1d1366316053cf621080aebc40e43b922a`. Its partial output misstated criterion count (41 instead of 28), overclaimed information coverage and understated hiring effects. Those conclusions were rejected and replaced with bounded direct source/attachment checks. This is not an independent audit pass or a measured savings claim. Freebuff was not used.

Publication validation passed: `verify:requirements -- --base origin/main --exclude format-check` selected and passed required backlog-handoff for the six-file docs/planning diff. All six files pass Prettier. Repeated JSON and Markdown output is byte-identical; the 35-row report remains blocked only by `validator-unit-tests`. Both embedded and standalone execution JSON equal the original parsed report; all 16 retained artifact sizes and SHA-256 hashes match. Native reporter/model contracts were rerun: 55 passed. These checks validate publication integrity, not release readiness.

Independent PR review remains required before merge. SPE-3352 stays open for missing owner reconciliation, incident/information coverage, explicit budgets and the unresolved execution failure. Follow-through must select the next existing approved boundary after merge and fresh preflight; this evidence record does not authorize subsystem repair.
