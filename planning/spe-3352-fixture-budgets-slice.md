# SPE-3352 — bounded campaign fixture budgets

## Boundary and plan

Codex continues the existing approved fixture-budget criterion at base `42015ef580697af464a6e052ccc06acd9aad81aa`, branch `codex/spe-3352-fixture-budgets`. Preflight returned ready at `2026-11-06T13:45:00.567Z`; main is clean/synchronized, no open PR, SPE-3352 In Progress with no blockers. This slice adds test-runner assertions and observations to the existing intervention, information-access and quiet-period comparisons. No browser implementation, gameplay, dependency, schema, new performance subsystem or historical acceptance snapshot changes.

## Contract and rationale

Each comparison retains its existing 240,000 ms Playwright timeout per attempt. That ceiling covers four fresh-context paths, UI navigation, two weekly advances per path, reloads, screenshots/attachments and assertions. It excludes server startup and can apply again to a configured retry; it is not a total-job budget, simulation-only benchmark or player latency promise. The pinned `438c8df7` baseline measured 40,447 ms intervention, 42,868 ms information-access and 34,583 ms quiet-period comparisons. Keeping the existing ceiling provides substantial machine/CI headroom without weakening the existing timeout.

`e2e/support/campaignBudget.ts` measures compact `JSON.stringify(GameState)` UTF-8 bytes in the Node test runner for the initial and final captured states of every path, including repetitions. It attaches measurements and limits before assertions. Final size must be at most 512 KiB (524,288 bytes); signed net growth must be at most 256 KiB (262,144 bytes). State shrinkage is legitimate. These are authored regression guardrails, not inferred browser storage quotas or universal campaign limits. They bound endpoint size and net two-week growth only, not intermediate peaks, heap allocation or the complete persistence envelope.

Retained raw attachments from subject `438c8df709cdb568d156c1581a44d1833983e576` provide baseline sizes: intervention/read/unread start 57,477 bytes and finish 199,117 (growth 141,640); inaction finishes 223,714 (growth 166,237); quiet paths start 49,067, hiring finishes 72,590 (growth 23,523), no-hire finishes 69,042 (growth 19,975). The absolute ceiling is over twice the largest observed endpoint; the growth ceiling leaves 95,907 bytes above the largest observed increase. This catches material expansion while tolerating ordinary content evolution. A future legitimate breach requires reviewed evidence and a deliberate budget change, not automatic baseline rewriting or state-field removal.

Budget data is attached separately from canonical comparison results, so timing/diagnostics do not contaminate deterministic state equality. Every previously asserted outcome and full saved-state replay remains intact. Measurements describe already-captured authoritative state; no simulation state is mutated for the checks.

## Validation and remaining scope

Targeted Chromium execution passed all three comparisons without retries: 41.2 seconds intervention, 40.5 seconds information-access, 34.7 seconds quiet-period (2.1 minutes total). All 12 budget attachments were extracted and checked; every initial/final/growth measurement equals the retained baseline above. Logs and HTML remain host-local at `C:/Users/james/.codex/tmp/spe3352-budgets-browser.log`, `spe3352-budgets-report.html` and `spe3352-budgets-measurements.json` in the same directory.

Six direct audit passes checked the narrow three-comparison boundary; signed shrinkage and explicit byte units/ceilings; unchanged canonical equality and no production mutation; all repetitions/consumers invoking the check; baseline/timeout/retry/endpoint limitations; and absence of dead code, dependency or unrelated changes. Invalid serialization fails normally rather than producing a passing measurement. This bounded helper reuses existing tests and retained measurements, so Hermes checkpoint mapping is a direct check; no Freebuff or measured savings claim. Full SPE-3348-selected checks and independent review remain merge requirements.

`npm run verify:requirements -- --base origin/main --exclude format-check` passed all selected required validators: backlog-handoff, lint and all 24 Chromium tests (4.4 minutes, no retries). Log: `C:/Users/james/.codex/tmp/spe3352-budgets-requirements.log`. All four touched files pass Prettier and the whitespace check. Unit/build validators were not selected for this test/docs-only diff; no new full-suite/build execution is claimed. Repository-wide formatting remains excluded advisory baseline work.

SPE-3352 remains open. These budgets cover three named comparisons, not every legacy fixture or whole-release performance. The earlier snapshot's required unit failure and missing owner/information/incident evidence remain unchanged. This slice does not claim AC-09 or release acceptance universally satisfied.
