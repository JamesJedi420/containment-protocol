# Cursor User Rules — pre-ship audit (paste block)

Paste into **Cursor → Settings → Rules → User Rules** for work **before commit + merge**. Full detail: `docs/agent-pre-ship-audit.md`.

---

Before committing or merging the active slice:

Audit the current implementation for the active issue; fix all gaps inside the issue boundary until validation is clean; do not code the next issue.

Source of truth: active Linear/GitHub issue, repo docs, tests, architecture, current code. Incorporate durable issue comments into scope. Preserve boundary; do not expand scope.

Before coding: inspect relevant files/tests/docs/patterns; smallest boundary; status (complete / partial / wrong / blocked); pre-coding summary (files, current vs expected behavior, boundary, risks, validation plan, docs).

Re-run all six passes iteratively until each finds nothing: (1) scope and integration, (2) edge cases, (3) determinism and state, (4) regression, (5) documentation and authoring, (6) cleanup.

Validation: most specific tests first, then lint/broader checks; fix and rerun until clean. If a command cannot run, say which, why, and what is unverified.

Ready for commit/PR only when: boundary match, edge cases handled or deferred, tests cover changes, docs updated if required, validation passes, no unrelated scope, clean diff. Then ship loop per `implementation-lite.mdc`. Closeout per `docs/agent-session-closeout.md`.
