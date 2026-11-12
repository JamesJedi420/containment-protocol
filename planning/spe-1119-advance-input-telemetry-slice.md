# SPE-1119 — conditions at time advancement

## Boundary

Codex continues the approved telemetry issue after #4897, under the user's shipping-loop instruction. Base `f1975920a727ccebcb22046a341131200861fd04`; branch `codex/spe-1119-advance-input-telemetry`. Fresh preflight returned ready at 2026-11-06T18:55:29.125Z with clean synchronized main, no PRs, SPE-1119 In Progress and no recorded blockers. Current scope and relations were refreshed; prior comment evidence is unchanged apart from this run's lifecycle records.

## Contract

`src/domain/sim/validation.ts::captureSimulationValidationAdvanceInput` observes the current campaign week and funding, the existing `projectStrategicActionBudget` result, effective difficulty from `getResolvedDifficultyRunConfiguration`, and case/template/team identities for committed in-progress operations. Identifiers are sorted for deterministic inspection; original state and its ordering are unchanged. Template IDs identify authored operations, not invented risk bands or mission-family classifications.

The existing runner captures these conditions after its normal assignments and immediately before `advanceWeek`. Its opt-in callback emits the detached input alongside the unchanged after-week-close snapshot. The envelope is explicitly version **2**, distinguishing it from #4897's version-1 post-week-only payload. No persisted schema changes; the only current hook consumer is the validation test. The previous slice document describes its historical revision.

This preserves the distinction between conditions at time advancement and consequences after it. The action-budget owner determines configured/unconfigured state, demand, remaining budget, deficit and pressure lanes; telemetry copies its result rather than calculating a competing score. Difficulty fallback/resolution remains with the existing owner. Funding is the authoritative balance, not a declaration that money is surplus or sufficient. The input phase and the outer output phase are labeled separately.

Capture remains internal, synchronous and opt-in. Difficulty configuration and all nested collections are detached from canonical state. No callback means no input capture. A callback reference is selected once per scenario run; errors still propagate. No UI, network service, persistent field, dependency, simulation rule, new runner or release gate is added.

## Acceptance and limits

The existing telemetry integration tests exercise actual multi-week production-rule runs, matching the input week to the resulting report week, matching committed identities to action-budget demand, and asserting nonempty real commitments. Complete observed/default runs and repeated events remain equal; mutation of input collections and output snapshots cannot affect state or summaries.

Constructed source-equivalence checks cover Cozy and Normal resolved difficulty profiles, exhausted configured action budget, unconfigured budget, empty commitments, collection ordering and nested copy isolation. These are explicitly constructed validation inputs, not two full player campaigns under different difficulty profiles. No low-risk band, reward breadth, queue expiry, displaced-use threshold, dominant-strategy verdict or player behavior is inferred. Those broader SPE-1119 requirements remain open, as does SPE-3352's release judgment.

Gameplay evidence applicability: the existing validation runner invokes the capture during real simulation advancement and an internal consumer verifies the observations. There is no player-facing telemetry integration to claim. Persistence is inapplicable to this ephemeral observer; existing complete-state equality checks protect against added mutations.

Six direct audit passes cover canonical-owner reuse, phase/order and empty commitments, detached-copy determinism, unchanged callers and default outcomes, versioned evidence limits and diff cleanup. Direct — this bounded extension reuses the previous slice's verified mapping; no substantial new Hermes synthesis is required. Freebuff remains disabled. No frontend implementation or package review is triggered.

Validation completed: targeted existing/new tests, required selection and literal build passed. The first build caught an optional-agency dereference in the new test, corrected with a guarded delete; that failed attempt is not counted as passing evidence.

Final local results on Node 22.23.4: 13 targeted tests in two files passed in 22.48 seconds; full strict-console/forks suite passed 10,978 tests across 1,008 files in 512.50 seconds. Explicit three-path SPE-3348 selection passed required backlog, lint, unit tests and Vite bundling; advisory browser checks passed 24 campaign tests (4.2 minutes) and five synthetic-error checks (14.0 seconds), with no retries, and advisory typecheck recorded zero diagnostics. Literal TypeScript/Vite build passed. Existing bundle-size warning remains. Advisory repository formatting was explicitly excluded, not reported green; test and slice formatting pass and unrelated existing harness formatting is preserved. Host-local provenance locators (not shared downloads): `C:/Users/james/.codex/tmp/spe1119-input-required.log`, `spe1119-input-targeted.log` and `spe1119-input-build.log` in that directory. Other contributors can rerun the commands or inspect PR CI. Independent review and final-head hosted checks remain merge gates.
