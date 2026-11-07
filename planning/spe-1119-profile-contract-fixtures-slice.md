# SPE-1119 — profile-segmented contract outcome fixtures

Codex continues after #4908 closeout, base `d98e4ef0d9ae6eb9890125a4b2a834aaa52b1508`, branch `codex/spe-1119-profile-contract-fixtures`. Fresh preflight ready 2026-11-07T00:59:26.365Z; clean synchronized main, no open PRs, owner In Progress/no blockers.

## Boundary

Use canonical profile resolution/ledger binding, actual `launchContract`, the supplied-state validation runner and existing telemetry consumer to compare Cozy and Normal captures. Verify authored contract risk grouping, recorded consequences against actual report snapshots, outcome totals, deterministic complete repeats and source isolation. These are domain-command/harness interactions, not additional browser or exact player-action replay evidence. The baseline harness still makes its own assignments and directives.

This test-only slice joins previously separate profile and contract observations without introducing a new analysis API or duplicating difficulty/risk/reward semantics. Distinct configurations need not yield distinct results: deeper producer-modifier integration remains unverified as documented by the original profile slice. This does not establish difficulty balance or complete the broader telemetry owner, timed queue, selector or release evidence boundaries. No runtime, UI, schema or dependency changes.

## Audit and validation

Six direct passes cover approved scope/source reuse, missing launch/result prerequisites, deterministic capture/internal audience, existing runner/consumer regressions, accurate evidence limits and cleanup. Direct checkpoint: delegation overhead exceeds this bounded reused-source comparison. Freebuff remains disabled. Node 22.23.4: 11 targeted tests/three files passed (8.56s). Final explicit-path requirements passed: 11,030 tests/1,016 files (521.78s), 24 campaign browser tests (4.0m) and five error-reporting checks (13.4s), no retries; lint, backlog handoff, zero type diagnostics and Vite build. Advisory global formatting excluded, not claimed green. Independent review/hosted CI remain merge gates.

The first targeted run exposed an incorrect test join on case ID alone: repeated case outcomes differ by week. The assertion now joins by canonical report week and case ID. The initial broader run was canceled before full acceptance; final results above are from the corrected fixture. No runtime correction was required.
