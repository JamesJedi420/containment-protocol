# SPE-1119 — supplied starting-state validation fixtures

Codex continues after #4907 closeout. Base `3282f8beea8565ff09efee43b6c2533426757836`; branch `codex/spe-1119-starting-state-telemetry`. Fresh preflight ready 2026-11-07T00:01:10.137Z: clean synchronized main/no PRs, owner In Progress/no blockers. Existing telemetry/validation-fixture scope only.

## Boundary

The existing runner accepts an optional typed `startingState`, cloned before its existing scenario setup and normalization. Omission still calls the normal starting-state factory. Scenario modifiers, automatic harness assignments, directives, stop conditions and maximum duration remain in force; baseline is the appropriate unmodified scenario setup for a canonical command-produced fixture. This is harness continuation under its decision policy, not replay of the player's exact actions or a new save import API.

Supplied terminal campaigns are rejected before observation. Explicit `difficulty` cannot accompany a supplied campaign, avoiding a new mid-campaign configuration override route; the supplied canonical ledger remains its configuration source. The suite clones the input once at entry and each scenario clones again, preventing observer mutation of caller input from changing later scenarios.

The harness note timestamp offset now follows the canonical campaign week rather than restarting at invocation index zero. A red/green regression showed that continuation previously reused report-note IDs from the preceding harness-timestamped week. Absolute-week offset preserves the original week-one scenario snapshots while preventing that restart collision; it does not introduce a new gameplay clock or change report-note authority.

No production gameplay, profile transition, risk, save schema, player knowledge, UI or package changes. Event v6/analysis v5 remain unchanged. Existing source-normalization contracts apply to typed fixtures; this option does not authenticate arbitrary imported JSON or replace canonical loading.

## Verification

Use an actual `launchContract` command to produce a starting campaign, then run the existing harness and verify authored contract metadata, recorded result presence and analysis grouping. Repeat captures and compare full outcomes; verify caller state and returned states are isolated. Continue from an actual advanced week, preserve omitted/default behavior, test suite callback mutation and fail-before-observation for terminal/override misuse. This demonstrates the domain command→harness→telemetry consumer path, not additional browser or player-choice coverage.

Six direct audits cover scope and caller ownership, invalid option/terminal states, deterministic capture and audience, default/suite regression, API/documentation consistency and cleanup. Bounded source checkpoint handling; no Freebuff/new substantial Hermes synthesis. Post-fix targeted validation passed 28 tests/four files (22.09s), including all existing scenario snapshots. Final explicit-path requirements passed: 11,027 tests/1,015 files (541.68s), 24 campaign and five error-reporting browser checks without retries, lint, backlog handoff, zero type diagnostics and Vite build. A separate literal production build passed. Global advisory formatting was excluded, not claimed green. Independent review remains pending. Broader SPE-1119 acceptance remains open.

## Review correction

CodeRabbit identified supplied-roster attrition setup overwriting terminal starter statuses. Both high-attrition and mixed-pressure regressions failed with dead becoming recovering before the fix. Setup now skips dead/resigned agents and selects up to three eligible stress targets, preferring the original starter IDs and then code-unit-sorted roster IDs. Default snapshots remain unchanged. Post-fix targeted validation passed 39 tests/four files (16.58s), including full scenario snapshots and terminal-state preservation through the final run. The full local results above describe the initial PR head; hosted CI validates the review correction before merge.
