# Type-contract recovery — approved mechanical repairs

## Ownership and authorization

User authorized implementation on November 2, 2026. Recovery parent:
[SPE-3375](https://linear.app/spectranoir/issue/SPE-3375). The prerequisite
[SPE-3376](https://linear.app/spectranoir/issue/SPE-3376) census/partition is Done.
This branch covers existing children SPE-3442, SPE-3443, SPE-3446, SPE-3447,
SPE-3450, SPE-3453 and SPE-3456. SPE-3449 shipped separately in PR #4618; its upstream repair is not attributed to this branch.

Baseline: `25b6a063bd35f0b8590cb06a2b8f1337ec5baa01` (`main`). Branch:
`codex/build-type-contract-recovery`. Unrelated changes in the original checkout
are preserved; implementation uses a clean managed worktree. Before publication, the branch fast-forwarded main to `d7f11e48ac50c7e09c00ac2baa0db1666bae3e9d`, including README/images PR #4620 and the independently merged simulation-experiment tooling. The repair contribution remains bound to the captured `25b6a063` base. Two additional forced Node 22 integration runs on `d7f11e48` plus the repair reproduce the identical 409-diagnostic multiset and raw transcripts; no upstream integration diagnostics were added or removed. Integration input hashes and revision are recorded separately in the evidence.

## Bounded plan and implementation

| Child    | Repair                                                                                                                                                   | Baseline diagnostics | Result |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------: | -----: |
| SPE-3442 | Discriminated event-draft union, concrete factory payloads and exhaustive test dispatcher; remove generic assertion casts and assert returned event type |                   68 |      0 |
| SPE-3443 | Fresh mutable scouting inputs copied from a retained readonly seed, checked against the existing API                                                     |                   40 |      0 |
| SPE-3446 | Migrate 13 test files to `team.status.assignedCaseId`; preserve existing explicit statuses and represent release with null                               |                   22 |      0 |
| SPE-3447 | Filter canonical event types using payload discrimination; retain malformed extra-field integrity data through structural fixture construction           |                   15 |      0 |
| SPE-3450 | Narrow unknown persisted protocol fields without selecting keys from optional agency state; preserve field absence, filtering and selection caps         |                    7 |      0 |
| SPE-3453 | Constrain four local comparison helpers to GameState, preserving exact omissions and generic return inference                                            |                   12 |      0 |
| SPE-3456 | Guard five raw graph enum fields as strings before membership checks; preserve the existing enum sets and fail-closed sanitization                       |                    5 |      0 |

No gameplay, event-schema, persisted-format, compiler-option, dependency or CI
enforcement changes. Production changes are restricted to the existing protocol
and authority-graph sanitizers. Added tests exercise invalid enums, valid siblings,
aliases, protocol trimming/deduplication, invalid limits and independent field absence.

Independent review follow-up in SPE-3446 preserves the resolving phase while clearing assignment in the release/recovery fixture and removes the redundant assignment override after `assignTeam`. Both affected suites pass (97 tests); two new forced Node 22 captures retain exactly the same 409-diagnostic multiset.

## Compiler evidence

Use the committed collector: `node scripts/report-typecheck.mjs --output <ignored-directory>`.
It runs `tsc -b --pretty false --force` twice and compares normalized diagnostic
multiplicities while preserving coordinates and raw transcripts.

Before: `.tmp/current-main-before/`; clean current-main revision, two identical forced runs, **578 occurrences / 394 fingerprints / 165 files**.
After: `.tmp/current-main-after/`; the same base plus this worktree's repairs, two identical forced runs, **409 / 293 / 144**. Both captures use **Node 22.23.4 / TypeScript 6.0.3**; all four compiler exits are 2. The normalized delta removes exactly **169 occurrences** across 101 fingerprints and adds **zero**. Production: 169 → 157; tests/fixtures: 409 → 252.

Portable evidence: [diagnostic identity delta](../docs/typecheck/recovery-2026-11-02/delta.json), including compiler-input/lockfile hashes and two-run reproducibility. The exact committed result revision is recorded in PR and Linear merge evidence. Counts in the acceptance table refer to assigned cohorts; unrelated diagnostics in touched test files remain. Ignored local captures are evidence locations, not uploaded attachments.

The earlier pre-sync check at b349739c recorded 581 → 412 with the same 169 removals. Upstream PR #4618 independently removed three capability-gap diagnostics, producing the clean 578-error baseline above; none is counted as this branch's contribution.

The historical 689-error handoff is a different revision, not this branch's baseline.
The parent remains open: existing unowned/semantic-review partition entries remain
outside these seven children. SPE-3348 retains validator-enforcement authority. Its separately merged required Vite bundle gate is honored; strict type checking remains advisory.

## Validation and review

- Final updated-base acceptance run: **39 suites / 640 tests passed** on Node 22.23.4, including event coverage and validation. Earlier targeted run: 36 suites / 459 tests.
- Added edge-case and scouting fixture verification: 3 suites / 73 tests passed.
- Initial VM-thread full run: 990 suites / 10,771 tests passed; the unchanged archived-prototype source scan timed out. Its isolated rerun passed all three tests with the existing timeout; a repeat reproduced the timeout and was stopped. About 550 MB of 32 GB RAM was free during that failure. A single-worker forks attempt was interrupted to sync the five upstream merges. The updated-base two-worker forks run was stopped after more than 15 minutes without a reported failure; it is not counted as passed. The full required regression result comes from hosted CI and is recorded in the PR. No test or timeout was changed.
- Full lint on the updated lockfile and the required Vite bundle gate passed. Ten census integrity tests and all documentation validators passed. All 26 canonical staged Git blobs pass Prettier; Windows checkout CRLF alone explains local CLI warnings. No formatting configuration was changed; final required validation is recorded in the PR. Required validators were selected with `--base 25b6a063bd35f0b8590cb06a2b8f1337ec5baa01 --resolve-only`; the PR records their final execution results.
- Direct documentation checks: backlog handoff, audit index and theme contracts passed.
- Six audit passes: scope/contracts, malformed/optional input, determinism/state,
  regressions, documentation and cleanup. Full-diff review and hosted CI are required
  before merge; final results belong in PR/Linear evidence.

The main sync included the previously approved typescript-eslint 8.72.1 lockfile update. Sonatype was attempted for all 12 changed packages but returned insufficient credits. No dependency choice or lockfile change is part of this PR; the local install follows committed main. This is an unavailable Sonatype check, not a clean security verdict.

## Hermes checkpoints

Pre-implementation acceptance/source mapping was dispatched through the configured
local Hermes CLI with a 120-second run budget. It produced no evidence/session ID
within the bound and was stopped; it is not counted as a passed checkpoint.
Codex performed the source/acceptance mapping and reviews directly. The small source-scan timeout investigation was also direct: inspect the unchanged synchronous filesystem scan, then rerun it without the concurrent compiler capture; no test or timeout changes. External research
and new-owner reconciliation are not applicable. Documentation validation, PR draft
review and closeout use the direct fallback; no provider/model configuration changed.

## Remaining recovery

No in-boundary deferrals. The review fixture follow-up is included and its input hashes/reproducibility are recorded under `reviewFollowup` in the diagnostic evidence. The remaining diagnostics are retained under SPE-3375's
existing partition, including semantic/test-intent questions without approved repair
owners. No issues, relationships or expanded backlog scope are created here, and
no claim of a green repository build is made. A subsequent implementation slice uses
a new agent session after this PR merges, following repository handoff policy.
