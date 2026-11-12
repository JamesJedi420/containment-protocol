# SPE-3352 — integrated execution at b121d4f2

## Boundary

Codex continues the authorized shipping loop after PR #4890 closeout. Branch `codex/spe-3352-integrated-evidence`; clean base/subject `b121d4f2a977309a120804b154ee596784d44f59`. Fresh preflight returned ready at 2026-11-06T15:10:02.143Z: clean synchronized main, no open PR, SPE-3352 In Progress/no blockers. The release change window remains based at `8596b04efc82a807d0a334c195e73d8e533ba58e`, rather than narrowing collection to the last documentation PR.

This evidence-only slice publishes one separately pinned execution with all 28 criteria and seven validator rows. It reuses the existing reporter, fixtures, validator policy and owner assessments. No application, test, dependency, schema, lifecycle, policy or historical evidence is changed. SPE-3352 remains open. A valid blocked report is not release readiness.

## Actual execution

Collection ran from 2026-11-06T15:10:22.4144857Z to 2026-11-06T15:27:06.7592167Z. Git status was empty before and after execution; publication edits began afterward. Node 22.23.4, Windows, existing installed dependencies, CI=true, STRICT_TEST_CONSOLE=1 and VALIDATION_JSON_ISOLATE=1. Unlike the older 438c8df7 collection, strict console was enabled. No dependency fetch or lockfile change occurred.

- Existing reporter/validator contracts: 55 passed.
- Registered release-window run: exit 1. Required backlog, lint, campaign/error browser and Vite bundle checks passed. Required unit tests failed: 10,971 passed, one failed; 1,006 files passed, one failed; 512.63s. Typecheck reported zero diagnostics. Advisory repository formatting failed and is retained.
- Campaign browser suite: all 24 passed, no flaky/skipped/unexpected tests, 266.506s. Separate synthetic error-capture suite: all five passed without retries; this is not extra gameplay evidence.
- Literal `npm run build`: exit 0; TypeScript and Vite passed with the existing chunk-size warning.
- Unchanged focused Agency-route diagnostic: four tests passed in 5.01s with the same CI/strict-console settings. This is not a replacement for the full failed run.

The [execution index](release-evidence/b121d4f2/execution-index.json) retains exact commands, original unit summary, environment, clean-checkout evidence, owner applicability and SHA-256 references to 17 host-local artifacts. The [validator JSON](release-evidence/b121d4f2/requirements-execution.json) is the original execution report, not a reconstructed green result. Raw logs/report paths are local provenance, not public downloads.

## Failure and existing owner

`src/app/App.systemBoundary.route.test.tsx:27`, “purchases a maintenance package through the production Agency route,” could not find the button named “Buy maintenance package.” The test is the first cold lazy-route render in that file and uses the default Testing Library wait. The full-run DOM excerpt is truncated before the route body, so it does not prove a specific fallback state. The passing isolated file is consistent with load-sensitive readiness, but does not establish root cause or prove a fix.

Live [SPE-3283](https://linear.app/spectranoir/issue/SPE-3283) explicitly owns the paid Agency maintenance purchase, persistence and production-route tests. Its current Done status is not substituted for acceptance evidence; the finding and exact diagnostic were posted there without changing status or implementation in this publication. The registry's SPE-10 remains the validator's organizational owner, not the asserted repair owner. The different historical `App.test.tsx` navigation failure retains its unresolved cause/owner in the old snapshot. No purchase-mechanic defect or historical repair is invented.

## Current campaign and owner evidence

The existing intervention/inaction fixture now verifies three naturally generated same-title incidents through distinct dossier/planner links, keyboard activation, selected ID after reload and the three-team launch requirement. The campaign has two teams; successful launch or complete arbitration is not claimed. This supplies a bounded representative incident-coexistence pass.

All twelve compact GameState endpoint measurements passed the shipped fixture budgets: final size at most 524,288 bytes, net growth at most 262,144 bytes, each comparison at most 240 seconds per attempt. Maximum observed final size was 223,714 bytes and growth 165,911 bytes. Initial intervention-path size is now 57,803 bytes; the front-desk readiness check includes its initial route diagnostic, so older initial-size measurements are not silently reused. Quiet-period hiring retains nine versus eight agents at week 3. These are bounded fixture costs, not peak memory or player-latency promises.

All eight owner scopes/statuses were refreshed after collection and matched the preceding assessment. `git diff cb37c23a..b121d4f2 --name-only` contains only the four owner-evidence/docs files: no underlying application, test, configuration or dependency changed. The current full execution includes those existing owner test files; its sole failure is the separate Agency-route test. Current browser execution includes the four accessibility and connected campaign checks. The preceding owner document remains explicitly historical to cb37c23a; the new index supplies current corroboration rather than relabeling the old test execution.

Three bounded owner rows pass; four retain warnings and telemetry remains unavailable. Wider history/information propagation remains unavailable. The complete report is **blocked**, with 35 rows: 22 pass, ten warning, two unavailable and one release-blocking unit-validator failure. No accepted exception, completed owner reopening, whole-release readiness, terminal-success assumption or Academy criterion is introduced.

## Audit and publication validation

Six direct passes check scope/owner separation, missing/stale/retry handling, deterministic report generation, original-report equality, documentation/provenance and diff cleanup. Seventeen artifact hashes and sizes match; both embedded and standalone validator reports deep-equal the original. JSON and Markdown each reproduce byte-identically. Older snapshots remain unchanged. Required publication checks use this documentation/planning diff separately from the broad failed release-window execution; a green publication check cannot erase that failure.

The earlier bounded Hermes owner mapping was rejected and its corrected source evidence reused. Current execution interpretation is a short explicit failure/summary extraction: direct checks, delegation overhead exceeds evidence volume. No Hermes approval or measured savings is claimed; no Freebuff used. Modern Web Guidance is not triggered by this docs/evidence-only slice. Independent full-diff review and final-head CI remain required before merge.

Publication selection identified docs/planning and required only backlog-handoff; it passed. All six publication files pass Prettier, diff whitespace validation and the original-report/hash/determinism checks above. These green publication results do not change the blocked release assessment.
