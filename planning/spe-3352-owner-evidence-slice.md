# SPE-3352 — authoritative owner evidence

Base/subject `cb37c23afdf71a42a695f21e08497118d31d3efe`; branch `codex/spe-3352-owner-evidence`. Codex continues the user-authorized shipping loop after PR #4889 closeout. Fresh preflight returned ready at 2026-11-06T14:57:41.526Z: synchronized clean main, no open PR, owner In Progress/no blockers. A lowercase workstream typo first produced invalid-input; corrected to the documented CP-core value before branch creation.

## Plan and acceptance

Consume current scope/comments from all eight authoritative owners and verify cited merged evidence, source anchors and relevant existing tests. Publish a complementary manifest using the existing report schema, with a pinned owner assessment. Preserve all historical manifests, the existing reporter and subsystem ownership. Missing evidence stays unavailable; narrow executable evidence cannot imply whole-owner or whole-release completion.

Changed files are this slice, the cb37c23a owner manifest/assessment and the existing release-evidence documentation index. No application, test, schema, dependency, policy, backlog shape or completed-owner lifecycle change. Risks are stale revisions, incomplete pagination, treating Done as proof, and treating automation as observed human behavior.

Acceptance: all eight dimensions have checkable sources and explicit boundaries; current bounded owner checks are executed; the unchanged reporter generates deterministic JSON/Markdown with three bounded passes, four warnings and one unavailable owner; other unassessed release rows remain unavailable. This is not a combined current release result and does not supersede prior failures.

## Evidence and audit

See [owner assessment](release-evidence/cb37c23a/owner-assessment.md) for exact revision, source symbols, verified PR ancestry, all-comment coverage, commands, log hashes and limitations. Existing targeted tests passed 594 tests across 13 files; five browser checks passed without retries. SPE-1080's Done label conflicts with its latest partial closeout; the report preserves this uncertainty without changing that owner's lifecycle. SPE-1245's Playwright-only methodology is retained without inventing a human-test gate.

Hermes mapping was bounded but inaccurate and rejected; direct source verification supplied the fallback. No Freebuff, paid worker or provider switch. Modern Web Guidance is not triggered by evidence/docs-only publication.

Six audit passes: scope and integration retain the existing reporter/owners; edge cases retain missing and historical evidence; deterministic state is untouched and reports are checked for byte stability; regression uses existing contracts and targeted owner executions; documentation distinguishes current checks from historical ancestry; cleanup preserves prior snapshots and excludes generated browser outputs. Publication validation and independent review remain required before merge. SPE-3352 remains open.

Publication checks passed: 19 existing reporter contract tests; JSON and Markdown each generated twice with byte-identical output; both retained log hashes verified; all four changed files pass Prettier and diff whitespace checks. The registered explicit-path selector identified docs/planning and required only backlog-handoff, which passed. The owner report contains 29 rows: three pass, four warning and 22 unavailable (one owner plus twenty other criteria and repository validation). No full production-suite/build result is manufactured for this evidence-only publication. Independent review and final-head hosted CI remain merge gates.
