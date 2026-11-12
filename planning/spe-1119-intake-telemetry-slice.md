# SPE-1119 — mission-intake context telemetry

Codex continues the authorized loop after #4901 closeout. Base `1918f3d5490d0ac8a9aa7e8e7f3ddeb2bdb66f4b`; branch `codex/spe-1119-intake-telemetry`. Fresh preflight ready 2026-11-06T21:05:04.857Z: clean synchronized main, no PRs, current SPE-1119 In Progress with no blockers. Current scope/relations/status refreshed and unchanged source context reused.

## Boundary

The existing harness ends `driveValidationAssignments` by recomputing canonical mission routing. Its opt-in pre-advance telemetry now copies a compact projection of that recorded routing state: ordered mission IDs, routing state, priority, deadline, priority reasons, routing blockers, player disposition and last triage/routing weeks. This captures source context without running routing again. Record arrays have stable identifier order; the separate ordered-ID list preserves the source's operational order. Missing routing is null and an explicitly empty routing state remains an empty object projection.

The synchronous event contract advances to version 3 and the existing analysis output to version 2. The current consumer rejects older event versions and retains detached per-week intake histories. Historical evidence/slice documents stay pinned to their original contracts. No persisted schema is involved.

This is ordinary mission-intake routing evidence, not the SPE-1287 timed-operations lifecycle. Inspection found producer handoff references and the existing Backlog owner, not an implemented timed queue to observe. No command slack, interruption, expiry consequence, cancellation or foregone-work metric is invented. A negative recorded deadline remains a source value, not proof that an expiry penalty executed. Stale source timing remains visible rather than being silently refreshed or asserted current.

## Checks and evidence limits

Direct fixtures compare the copied fields to their recorded source, preserve source order and stale timing, distinguish absent/empty state and verify nested detachment. These fixtures are constructed, not player gameplay. Actual multi-week harness tests require nonempty intake and current routing-week provenance, preserve observer-free/repeated outcomes and verify that observer mutations cannot alter simulation. Existing consumer tests compare entire intake histories to captured events and mutate returned nested data to verify detachment.

The applicable end-to-end path is existing routing → harness pre-advance capture → internal analysis. No player UI, source routing policy, assignment rules, persistence, dependencies or external service changes. Broader SPE-1119 risk/reward/cadence/strategy acceptance remains open.

Six audits cover source-owner reuse and versioned contracts, missing/empty/stale input, deterministic order/detachment, existing runner/consumer regressions, historical versus current documentation and diff cleanup. Direct bounded mapping reuses verified sources; no Freebuff or substantial new Hermes synthesis. No frontend or dependency guidance applies.

Node 22.23.4 results: 31 targeted tests / three files passed (8.65s); full strict-console/forks suite passed 11,003 tests / 1,010 files (508.28s). Explicit five-path SPE-3348 selection passed required backlog, lint, unit and Vite gates. Advisory 24 campaign browser checks (3.8m) and five synthetic-error checks (12.6s) passed without retries; typecheck recorded zero diagnostics. Literal TypeScript/Vite build passed with existing bundle-size warnings. Global advisory formatting was excluded, not counted green; focused test, consumer and slice formatting passes, preserving unrelated harness formatting. Host-local provenance, not shared downloads: `C:/Users/james/.codex/tmp/spe1119-intake-targeted.log`, `spe1119-intake-required.log` and `spe1119-intake-build.log` in that directory. Contributors can rerun the commands or inspect PR CI. Independent final-head review and CI remain merge gates.
