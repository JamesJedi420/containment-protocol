# SPE-1119 — recorded mission-result components

Codex continues the authorized loop after #4902 closeout. Base `64c02fcf1236478331dcc063fb8b96d5efc7856d`; branch `codex/spe-1119-outcome-telemetry`. Fresh preflight ready 2026-11-06T21:39:20.477Z: clean synchronized main, no PRs, SPE-1119 In Progress/no blockers. Current scope text compared unchanged; prior comments/source context retained.

## Source and contract

`advanceWeek` already finalizes mission results and attaches them to `WeeklyReport.caseSnapshots`. The existing opt-in harness now copies selected recorded components after close: case ID, outcome, rewards, penalties, injuries, fatalities and spawned consequences. It does not recalculate rewards, infer missing results or change gameplay state. Missing report snapshots produce null; present snapshots without results produce an empty array. Canonical case-ID sorting gives deterministic record order.

Internal event version 4 and analysis version 3 change together. The consumer retains detached result histories and explicit component counts: recorded result occurrences, weeks without snapshots, occurrences with nonzero funding/containment/strategic/reputation/agency-standing/faction-standing changes, and occurrences containing inventory/injury/fatality/spawned-consequence records. Each component counts at most once per result, regardless of amount or record count. Positive and negative deltas both count as recorded changes. The same case may contribute a result in multiple weeks; this is not a unique-case or new-selection count. Penalty values remain source records, not added again to reward deltas.

Inventory/consequence presence does not prove delivery or later execution. Missing optional standing/fatality metadata remains visible in source histories; absence is not proof of no real-world effect. The agency-standing danger band is retained only inside its canonical reward record, not promoted to a universal risk classification. No opaque value/fun score, low-risk dominance claim or exhaustive aftermath coverage is introduced. Other unrecorded consequence dimensions remain unverified.

## Validation and scope limits

Actual baseline reports are compared field-for-field with captured components and consumer histories. Existing repeated/default-run tests protect observational behavior. Direct capture and analysis tests verify nested detachment and order independence. Separately constructed result packets isolate nonzero/negative/component-presence counting and duplicate/non-finite/missing-field rejection; they are not player campaign evidence. The consumer remains a typed internal contract, not an arbitrary JSON parser or provenance authenticator.

The applicable end-to-end path is authoritative recorded report → optional capture → internal component analysis. Persistence is inapplicable to ephemeral telemetry; normal player knowledge and later consequence execution are not proven by these records. No saved-game schema, UI, reward rules, packages or external services change. Historical versioned evidence remains pinned and unchanged; broader SPE-1119 acceptance stays open.

Six direct audits cover source ownership and scope, missing/empty/duplicate inputs, deterministic detachment and audience, producer/consumer regressions, historical/current claims, and diff cleanup. Direct bounded mapping of existing report/consumer sources; no Freebuff or substantial new Hermes synthesis. No frontend/dependency guidance applies.

Node 22.23.4 validation: 38 targeted tests across four files passed (8.91s); full strict-console forks suite passed 11,010 tests across 1,011 files (501.70s). All 24 campaign browser checks (3.8m) and five synthetic-error browser checks (12.4s) passed without retries. Explicit six-path requirements passed backlog, lint, typecheck, unit tests and Vite build; literal TypeScript/Vite production build also passed. Global advisory formatting was excluded, not claimed green. Independent PR review and hosted CI remain required before merge.
