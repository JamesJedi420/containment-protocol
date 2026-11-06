# SPE-1119 — pressure and unused-capacity validation examples

Codex continues after #4905 closeout. Base `dd889d07d09e96ff8e27c01f172496ae4bf1799c`; branch `codex/spe-1119-pressure-fixtures`. Fresh ready preflight 2026-11-06T23:21:05.499Z: clean synchronized main, no PRs, owner In Progress/no blockers. Existing approved acceptance-fixture boundary only.

## Scope and evidence distinction

Existing telemetry already carries the component histories needed for bounded pressure/unused-capacity examples; this slice adds tests and documentation only. No runtime fields, schemas, state authority, thresholds, UI or dependency changes.

- Actual baseline/high-budget-pressure harness runs retain their authoritative unresolved-case and budget-pressure histories and distinguish initial budget pressure. Neither is called a universally healthy campaign.
- A separately constructed packet trace holds funding constant with zero unresolved/budget-pressure components. The consumer distinguishes it from the actual trace. Other packet fields remain baseline observations; this is not a reconstructed valid campaign or proof of cost-free gameplay.
- Three separately constructed weekly states use canonical staff posts and `commitStaffTime`, then the real before-close capture and consumer. One stream retains unused eligible staff while operations are committed; another retains usable staff claims with an explicit displaced alternative; unavailable allocation data remains explicitly unavailable. These examples prove component distinguishability, not actual player scheduling or exhaustive resource scarcity.

No recorded claim is not proof of zero opportunity cost. Available staff capacity is not a newly defined surplus band. Existing source semantics remain authoritative; broader SPE-1119 pressure/queue/aftermath and actual gameplay coverage remain open.

## Verification

Targeted consumer/allocation/harness tests, SPE-3348 path-selected checks, and independent review before merge. Six direct audits cover approved acceptance scope, missing/unknown distinctions, deterministic nonmutation, existing consumer/source integration, honest fixture claims and cleanup. Bounded existing-source checkpoint handling; no Freebuff or new substantial Hermes synthesis. Node22.23.4 validation passed: 24 targeted tests/three files (4.79s); full strict-console forks suite 11,021 tests/1,014 files (503.91s); 24 campaign browser checks (3.8m) plus five error checks (12.4s), no retries. Explicit two-path requirements passed backlog, lint, unit tests, Vite build, browser and zero-diagnostic typecheck. Global advisory formatting excluded, not claimed green. Independent review and hosted CI pending.

Review follow-up: added an explicit nonempty baseline-capture assertion before fixture indexing. Targeted 24 tests/three files passed again (4.89s); touched-test lint and both-file format check passed. Final-head hosted checks and independent rereview remain required.
