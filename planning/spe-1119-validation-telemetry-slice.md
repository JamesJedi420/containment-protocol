# SPE-1119 — opt-in validation snapshot hook

## Boundary

Codex implements this bounded slice of the existing telemetry owner under the user's shipping-loop authorization. Base: `e6f6022591342921e314c40d9eefb87ca1b8cfbc`; branch: `codex/spe-1119-validation-telemetry`. Fresh preflight returned ready at 2026-11-06T18:13:18.561Z, with synchronized clean main, no open PRs, no recorded blockers or children, and SPE-1119 In Progress. The issue description and all twelve comments were checked. SPE-3352 remains the separate release-evidence consumer.

## Implementation

`src/domain/sim/validation.ts::runSimulationValidationScenario` accepts an optional synchronous `onSnapshot` observer. The existing suite forwards the same option. Each completed week emits a version-1 envelope identifying the internal-validation audience, existing weekly-snapshot source, after-week-close phase, scenario and one-based sequence. Sequence restarts for each scenario run; callers distinguish separate runs. The snapshot retains its existing report-week meaning and component metrics; telemetry does not recompute pressure, decisions, outcomes or knowledge.

The hook receives a detached copy, including nested pressure scores, after the original snapshot is retained and before the existing game-over stop. No observer means no event construction or clone. Observer errors propagate: callers must not mistake an interrupted capture for a complete run. Callbacks are trusted local synchronous validation consumers, not a sandbox or an async transport.

The ordinary player experience receives no hook or telemetry surface. The explicit audience label describes this internal contract; it is not an authorization system or a redaction filter. No canonical GameState is passed to the observer. Existing harness limits bound capture to at most twelve snapshots per scenario. Callers retaining multiple runs own their storage lifetime.

This reuses SPE-26's runner and snapshots rather than adding a second runner, persistent telemetry state, schema, network service, dependency or gameplay rule. It does not implement the broader operational concentration, cadence, persona, pressure-selector or multi-channel information metrics in SPE-1119. Those remain open under their existing authority. No whole-issue or release-completion claim.

## Evidence and audit

`src/test/sim.validationTelemetry.test.ts` consumes real production-rule multi-week validation runs. It compares complete default, observed and repeated runs; compares repeated event streams; mutates consumer-owned nested fields and verifies unchanged simulation/summary/snapshots; checks suite forwarding and final-week retention; derives budget-pressure histories from events and compares distinct scenarios; and verifies observer failure propagation. These are constructed validation scenarios, not observed player sessions. No golden-browser fixture or ordinary gameplay path is claimed by this slice.

Gameplay evidence applicability: the existing validation harness invokes the hook, real simulation outputs feed it, and an internal validation consumer checks its results. Persistence is not applicable to this ephemeral observer; it neither adds save fields nor substitutes for persistence-owner acceptance. Complete harness runs provide end-to-end evidence for this debug/validation boundary only.

Initial targeted run: eleven tests across the existing validation suite and new telemetry file passed in 27.17 seconds on Node 22.23.4 using forks. Required full validation passed; independent PR review remains the next shipping gate. Pre-existing formatting elsewhere in the harness is preserved to avoid unrelated changes.

Six direct audit passes cover the existing-runner integration, bounded ordering and observer errors, detached-copy determinism, unchanged default consumers, accurate source/audience documentation and minimal diff. Direct — delegation overhead exceeds this bounded contract's evidence volume; prior failed Hermes mapping is not reused as approval, and Freebuff remains disabled. No frontend implementation or dependency change occurs.

Final local validation on Node 22.23.4: explicit three-path SPE-3348 selection passed required backlog, lint, strict-console/forks unit tests (10,976 tests, 1,008 files, 536.57 seconds) and Vite bundling. Advisory Chromium campaign checks passed 24/24 in 4.6 minutes, separate synthetic-error checks 5/5 in 15.6 seconds, and typecheck recorded zero diagnostics. Literal `npm run build` also passed; existing bundle-size warnings remain. Advisory repository formatting was explicitly excluded, not reported green; new test and slice files pass formatting, existing unrelated harness formatting is preserved. Host-local provenance locators, not shared downloads (other contributors rerun the commands or inspect PR CI): `C:/Users/james/.codex/tmp/spe1119-required.log`, `spe1119-targeted.log` and `spe1119-build.log` in that directory.
