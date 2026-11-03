# SPE-3352 — release-evidence matrix and summary v1

## Approved boundary

The user authorized this bounded implementation on November 2, 2026 (America/Chicago), on `codex/spe-3352-release-evidence-matrix` from freshly fetched main `265cf70ba2c6d14c5a583ba512333fff1e409736`. [SPE-3352](https://linear.app/spectranoir/issue/SPE-3352) remains **In Progress**; this is partial delivery of its existing report-generation scope, with no new issue or relationship. The isolated managed worktree preserves unrelated primary-checkout changes and other active worktrees.

Implement five files: native Node report module/CLI and targeted tests under `scripts/release-acceptance/`, `planning/spe-3352-release-evidence.v1.json`, this slice record and `docs/cp-core-release-evidence.md`. The existing SPE-3348 pure resolver supplies validator selection. No packages, runtime/browser behavior, fixture scenario, persistence rules, CI enforcement or milestone methodology are changed. Modern Web Guidance and external research are not applicable to Node-only reporting and documentation.

## Acceptance mapping

1. Version a reviewed evidence snapshot with all twelve SPE-3352 criteria, eight explicit owner dimensions, a separate full-build observation and repository execution evidence. Stable missing rows cannot disappear when assessments are omitted.
2. Generate stable JSON and Markdown, retaining source, tested revision, assertion scope, rationale, historical observations and authoritative remediation owner. No clocks, random values or network retrieval affect generation.
3. Distinguish six criterion statuses. Missing/revision-mismatched evidence cannot pass. Accepted exceptions require approval references and reasons; applicability decisions require source evidence.
4. Consume actual SPE-3348 execution reports and derive enforcement from the subject revision's registry. Required failures block; missing/unexecuted requirements remain unavailable; advisory census, Vite bundle and full production build remain distinct.
5. Keep the initial snapshot incomplete and preserve outstanding human, canonical replay, schema-valid carryover, threshold and owner-evidence work. Report generation is not whole-release readiness, a milestone decision or Linear closure.

## Source and execution limits

The bootstrap deliberately assesses the pre-implementation base. Source relationships can be assessed at that commit; historical runs retain their original tested heads. PR #4626's connected browser result is at `b3b9825491489301459a4077638e747485085cfc`; PR #4628's pressure result and last full-build observation are at `cd26b305c0edf06ee1b6e82dba59e94e80a700c7`. No current result is inferred from merge ancestry. The pressure fixture's calibrated stat cap and shortfall-normalization limitation remain explicit. No recovering-to-active-duty assertion or human understanding is claimed.

SPE-2251's helper imports are baseline consumption evidence, not a recreated harness. Completed SPE-2607, SPE-3522, SPE-1464, SPE-25 and SPE-26 remain completed evidence sources. SPE-1080/1245/1119/3162 retain their own acceptance authority. SPE-3403 and SPE-3171 retain unresolved persistence-policy and terminal-success questions. The matrix does not decide those questions. Source text, exception authority and declared validator change-set completeness still require reviewer verification; the tool validates the report structure, not external truth.

## Validation and review record

Use cached Node 22.23.4 and the already-installed dependencies from the clean TypeScript-census worktree, whose lockfile matches this base. No dependency fetch or version change is needed. Run targeted native Node tests including both real CLI formats, changed-file formatting, lint, backlog-handoff, audit-index, theme-contracts and the SPE-3348 requirement selection for the exact changed files. Preserve actual results in this record and the PR/Linear lifecycle evidence.

The planning Hermes packet was reviewed against primary sources; incorrect validator-selection claims were rejected. Reuse verified source limits. Research is not applicable. Run simple validators directly; assess documentation/PR communication and post-merge checkpoints under `docs/hermes-shipping-checkpoints.md`. Never count an unsupported Hermes report as a passed check.

Pre-commit Node 22.23.4 targeted run: **17 passed**, including real CLI JSON/Markdown, missing/invalid input, missing commit, omitted criteria, required/advisory failures, skipped/unexecuted checks, historical evidence, approval provenance and deterministic ordering. SPE-3348 execution for the five staged paths exited 0: required lint and backlog-handoff passed, with no missing required checks. Advisory global format-check failed on 3,210 files; all five changed files pass formatting. Audit-index passed (41 audits), theme-contracts passed (108 IDs), and staged diff whitespace check passed. The bootstrap emits 22 rows: three source-based passes and 19 unavailable rows; no accepted exceptions. Logs: `C:/Users/james/AppData/Local/Temp/spe3352-matrix-evidence/`.

Hermes documentation/communication checkpoint `local-1a3e08191e117895d39e94a63066d726775511538a4cb07d0502c8a77bddd4d9` returned a packet. Its historical-build/no-current-execution caveats were verified and preserved. Its claims of 20 rows, all rows unavailable and tests living elsewhere were rejected against the actual 22-row output and the 17 tests in `scripts/release-acceptance/report.test.mjs`. Direct full-diff/documentation/PR review supplies the corrected evidence; no unsupported Hermes clean verdict is claimed. Small validation and incremental owner-link/test changes use direct review because another delegation adds overhead.

Six direct pre-ship passes assessed scope/integration, malformed/missing/historical/duplicate edge cases, deterministic non-mutating output, canonical-resolver and CLI integration, documentation/ownership accuracy, and cleanup. No game/runtime/browser behavior or package changes require a simulation suite, browser inspection, Modern Web Guidance or Sonatype package fetch review. The existing backlog queue, slice-status map, audit index and theme mirrors are unchanged; local consistency checks do not claim a full live-backlog reconciliation.

## Deferred

| Item                                                                                          | Existing owner                            | Disposition                                                                                |
| --------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Current golden executions and broader schema-valid replay/carryover                           | SPE-3352                                  | Outside this reporting slice; historical bounded assertions remain visible.                |
| Fixture runtime/state-growth thresholds and complete release aggregation                      | SPE-3352                                  | Approved parent work remains open; no arbitrary budgets or reusable performance subsystem. |
| Human comprehension, usefulness and recognizable weekly-loop evidence                         | SPE-1245                                  | Unavailable, not waived by automated assertions.                                           |
| Accessibility, telemetry, canonical replay and current completed-owner evidence applicability | SPE-1080 / SPE-1119 / SPE-3162 / SPE-3352 | Gather from authoritative owners; no subsystem repair here.                                |
| Full production-build repair and validator enforcement                                        | SPE-3375 / SPE-3348                       | Consume results without changing repair ownership or gate policy.                          |

No new durable boundary is created. This slice does not select the next implementation task or close the parent/milestone.
