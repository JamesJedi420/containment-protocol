# Cursor User Rules — pre-ship audit (paste block)

Paste into **Cursor → Settings → Rules → User Rules** for work **before commit + merge**. Full detail: `docs/agent-pre-ship-audit.md`.

---

Before committing or merging the active approved slice:

Audit the current implementation for the active approved issue; fix all gaps inside its approved boundary until validation is clean; do not code the next issue.

Source of truth: active approved Linear/GitHub issue, repo docs, tests, architecture, current code. Incorporate durable issue comments only when they clarify/document the already-approved boundary. A comment that introduces new or changed durable scope is candidate evidence and must go through Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4 before backlog mutation. Preserve the approved boundary; do not expand scope.

Before coding: inspect relevant files/tests/docs/patterns; smallest approved boundary; status (complete / partial / wrong / blocked); pre-coding summary (files, current vs expected behavior, boundary, risks, validation plan, docs).

Re-run all six passes iteratively until each finds nothing: (1) scope and integration, (2) edge cases, (3) determinism and state, (4) regression, (5) documentation and authoring — including backlog handoff + `planning/backlog-handoff-manifest.json` + `npm run verify:backlog-handoff` when `planning/**` changes, (6) cleanup.

Do not create or promote a sibling/follow-up during pre-ship. Approved in-boundary deferrals stay on the existing owner; newly discovered durable scope becomes candidate evidence.

Validation: most specific tests first, then lint/broader checks; when `planning/**` changed run `npm run verify:backlog-handoff`; fix and rerun until clean. If a command cannot run, say which, why, and what is unverified.

Ready for commit/PR only when: approved-boundary match, edge cases handled or legally deferred, tests cover changes, docs updated if required, validation passes, no unrelated/unapproved scope, clean diff. Then ship loop per `implementation-lite.mdc`. Closeout per `docs/agent-session-closeout.md`; prepare a next-issue implementation plan only when the next issue is already approved.
