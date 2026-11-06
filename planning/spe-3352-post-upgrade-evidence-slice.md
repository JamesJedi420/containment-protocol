# SPE-3352 — post-upgrade release evidence

## Boundary

Codex continues the user-authorized shipping loop within SPE-3352's existing CP-core fixture/evidence ownership. Fresh preflight was ready at 2026-11-06T17:38:31.169Z: clean synchronized main `63188aec19eba68c56b125da078908d92c100dc4`, no open PR, SPE-3352 In Progress and no recorded blockers. Branch: `codex/spe-3352-post-upgrade-evidence`.

This publication adds one pinned snapshot, its execution index/original validator report/browser observations, and documentation. It changes no runtime, fixture assertions, dependencies, reporter semantics, owner policy, Academy scope or historical snapshot. The prior Agency readiness defect was repaired under SPE-3283 in #4894; the two dependency upgrades shipped under SPE-3737 in #4892/#4893. Their passing slice checks do not substitute for this separate release-window execution.

## Clean execution

Subject: `63188aec19eba68c56b125da078908d92c100dc4`. Collection ran from 2026-11-06T17:38:55.4228223Z to 2026-11-06T17:54:54.3927593Z, before tracked publication edits, with clean status before and after. Windows x64, Node 22.23.4, CI=true, STRICT_TEST_CONSOLE=1, VALIDATION_JSON_ISOLATE=1; existing verified dependencies reused: Zustand 5.1.0, Vitest 5.0.5, Playwright 1.65.0 and Vite 8.3.5. Lockfile SHA-256: `9f88df3b3633204e5c8f7e3c091a6a4ad24a36c81fe27332789ad66bb92111ed`.

The original release window remains base `8596b04efc82a807d0a334c195e73d8e533ba58e` through this subject. `npm --silent run verify:requirements -- --base <base> --ci --json` selected seven validators and exited 0. Required backlog, lint, unit tests, browser and Vite bundle passed; advisory typecheck passed with zero diagnostics; advisory repository formatting failed and is retained. No exclusions or waiver were applied. `npm run build` separately passed TypeScript plus Vite; the existing bundle-size warning remains. Native reporter/validator contracts passed all 55 tests.

Full strict-console/forks execution passed 10,972 tests across 1,007 files (500.09s). Browser execution passed 24 campaign checks (250.899206s) and five separate synthetic error checks (13.764677s), with zero skipped, flaky or unexpected tests. Both embedded browser-report time windows fall within the collection window. Synthetic error capture is not gameplay evidence.

All twelve comparison paths met the existing 240-second per-attempt comparison timeout, 524,288-byte final compact GameState limit and 262,144-byte net-growth limit. Intervention paths ended at 199,117 bytes (growth 141,314); inaction at 223,714 (165,911); quiet hiring at 72,590 (23,523); quiet no-hire at 69,042 (19,975). Repeats retain identical measured values. These are fixture limits, not peak-memory or player-latency claims.

## Classification and source limits

The deterministic report contains 35 rows: 28 criteria/owner dimensions and seven validators. It is **incomplete**, with 23 passes, ten warnings, two unavailable rows and no current release-blocking failure. Broader information-model comparison and telemetry-owner applicability remain unavailable. Dossier viewing preserves complete saved state and later outcomes, but does not establish witness/report/public-belief transitions. The three-incident fixture proves distinct identities, planner selection and constrained options, not successful three-team deployment in a two-team campaign.

Eight owner descriptions/statuses and their latest updated comments were refreshed through Linear and compared with the earlier fully paginated packet; scope and checked comments were unchanged. Existing persistence, accessibility, UX and replay warnings remain. The Playwright-only UX methodology is preserved without inventing a human-testing gate. The accessibility lifecycle discrepancy and actual speech limitation remain explicit. Calibration, simulation validation and authored-path continuity retain their bounded passes, not broader feature-completion claims.

Historical owner merges and #4894 are verified ancestors. Inspected domain/store/layout/feature/E2E paths are unchanged since the historical owner assessment, while current full execution corroborates them with the upgraded dependencies. The Agency test readiness edit and dependency changes are listed in the execution index. No historical execution is relabeled as current. The old b121d4f2 failure and separate earlier App.test.tsx failure remain in their immutable snapshots; the latter's repair ownership is still unverified. The current clean run passes, but does not retroactively explain every prior failure.

SPE-3737's documented unchanged dependency advisory findings are not erased by green release tests. This publication adds no security exception or new release gate. SPE-3352 and broader release acceptance remain open; all subsystem remediation stays with its canonical owner.

## Artifact verification and publication

Retained raw collection: `C:/Users/james/.codex/tmp/spe3352-evidence-63188aec`. The committed index records sixteen artifact hashes/sizes, commands, environment, owner refresh and provenance. These are host-local locators, not public downloads; another host may need to rerun. Original validator JSON is deep-equal to both the standalone committed report and embedded manifest copy. Repeated JSON/Markdown generation is byte-stable, and historical snapshots are unchanged.

Six direct audit passes check scope, empty/stale/missing evidence, deterministic classification, nearby reporter/validator consumers, accurate provenance/docs and diff cleanup. Reuse previously verified owner evidence; the prior failed Hermes mapping is not promoted to approval, and Freebuff is not used. Publication validation, independent PR review, final-head CI, merge and synchronized main remain shipping gates. This evidence-only PR cannot infer a green whole release or close the broader owner boundaries.

Publication checks passed on Node 22: explicit six-path requirement selection ran the required backlog-handoff validator; all six files passed formatting; nineteen reporter contracts passed; original validator copies, all sixteen hashes and byte-stable JSON/Markdown were rechecked after formatting. An initial pre-commit `--base origin/main` invocation selected zero files and is not counted as coverage; the explicit-path run supplies publication evidence. The clean release-window execution above remains separate and retains its advisory formatting failure. Logs: `C:/Users/james/.codex/tmp/spe3352-post-upgrade-publication.log` and `spe3352-post-upgrade-contracts.log` in that directory.
