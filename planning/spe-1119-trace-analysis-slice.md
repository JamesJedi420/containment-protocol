# SPE-1119 — bounded internal trace analysis

## Boundary

Codex continues the existing telemetry owner after #4898 under the user's shipping-loop authorization. Base `d3305bd3037a5a14a1e5d7b6ec0e9ef20fee8950`; branch `codex/spe-1119-trace-analysis`. Current Linear scope/status/relations were refreshed. Preflight was ready at 2026-11-06T19:32:44.112Z: clean synchronized main, no PRs, SPE-1119 In Progress and no recorded blockers. No child or durable scope is added.

## Consumer and evidence meaning

`src/domain/sim/validationTelemetry.ts::analyzeSimulationValidationTelemetry` consumes one version-2 internal snapshot trace and the actual runner summary's scenario/week count. It returns a version-1 internal analysis with detached budget/funding histories, existing outcome totals and sorted template-level operation counts. It imports only types; the existing simulation runner and metric owners remain unchanged.

Each distinct case is counted once per observed template, while `committedCaseWeeks` records repeated weekly presence. A long-running case therefore contributes one distinct case and several observed commitments. If a case legitimately changes templates, it can appear once under each template while the global distinct-case count remains one. These are observed cases, not player selections, new activation counts or risk bands. The first observation may already contain ongoing work. Reassignment of the same case is not counted as a new distinct case.

Funding remains an observed balance, not a declaration of surplus. Action-budget fields retain their canonical source values. Post-week budget pressure and unresolved cases remain separately labeled. The consumer does not invent risk thresholds, displaced-use scores, reward classifications, difficulty semantics or an opaque engagement metric.

Checks reject a capture count inconsistent with its supplied actual run summary; missing, duplicate or reordered sequence; mixed scenarios or resolved configurations; inconsistent week/phase/audience/version; continuation after game over; duplicate case IDs within a week; mismatch with canonical committed demand; non-finite consumed resource observations; and invalid outcome counts. Empty observation is explicit with no profile, history or fabricated counts. This is a typed internal consumer, not a general JSON validator or provenance-authentication system. Callers must supply one actual run and its real summary; metadata checks do not authenticate arbitrarily forged or spliced records.

## Validation approach

`src/test/sim.validationTelemetryAnalysis.test.ts` captures actual baseline and high-budget-pressure multi-week runs. It compares repeated analysis, source histories and existing summary totals, distinguishes their observed funding histories, and proves nested output mutation leaves source events unchanged. Constructed packets separately verify continuing-versus-distinct case counting and invalid-capture rejection. Those packets are not new gameplay evidence.

The gameplay-evidence boundary is internal validation: the existing runner invokes telemetry and this consumer reads actual simulation-derived traces. No player-facing surface is introduced. Persistence is inapplicable to the ephemeral analysis; no state/schema, UI, package, network service, scheduler or second runner changes. Broader concentration/risk-band, cadence/queue, reward-breadth and player-strategy conclusions remain open under SPE-1119; SPE-3352 owns release applicability separately.

Six direct audit passes cover source-owner reuse, incomplete/duplicate/mixed inputs, deterministic counting and detached outputs, unchanged producer/default callers, precise evidence limits and diff cleanup. Direct — the bounded consumer reuses the prior verified mapping; Freebuff remains disabled and no substantial new Hermes synthesis is needed. No frontend implementation or dependency change occurs.

Targeted and full local validation passed. Independent review and final-head CI remain merge gates.

Node 22.23.4 results: 22 targeted tests in two files passed in 8.41 seconds. Explicit three-path SPE-3348 selection passed required backlog, lint, strict-console/forks unit suite (10,994 tests / 1,009 files, 532.67 seconds) and Vite bundling. Advisory browser checks passed 24 campaign tests (4.3 minutes) and five synthetic-error checks (14.4 seconds) without retries; advisory typecheck recorded zero diagnostics. Literal TypeScript/Vite build passed; existing bundle-size warnings remain. Advisory repository formatting was explicitly excluded, not counted green; all three new files pass formatting. Host-local provenance locators, not shared downloads: `C:/Users/james/.codex/tmp/spe1119-analysis-required.log`, `spe1119-analysis-targeted.log` and `spe1119-analysis-build.log` in that directory. Other contributors can rerun the commands or inspect PR CI.
