# SPE-1119 — same-week contract result groups

Codex continues after #4909 closeout, base `3e2b6f584398df810639fb8ed323f9275d7bd767`, branch `codex/spe-1119-contract-result-groups`. Preflight ready 2026-11-07T01:30:17.924Z: clean synchronized main, no open PRs, owner In Progress/no blockers.

## Contract

The existing internal analysis consumer joins recorded mission-result occurrences to the same case's committed contract metadata from immediately before that same week-close. It groups by the exact authored template/risk tuple and reuses existing result-component presence counters plus explicit outcome counts. No metadata is inferred from earlier/later weeks, and unknown authored fields remain null. `resultsWithoutCommittedContract` counts unmatched and ordinary non-contract records; it is not a claim that those cases were never contracts.

These are recorded result occurrences, not distinct completions or player selections. A case can appear in multiple weekly reports; each observation counts. Existing distinct-case and case-week exposure groups remain separate. Missing snapshot weeks stay explicit in the global result counters; per-group counters only describe matched records and cannot infer unavailable group observations.

Analysis schema advances from 5 to 6; event v6 is unchanged. Profile identity remains the canonical configuration on each trace. Actual Cozy/Normal contract fixtures verify producer→harness→consumer matching. Constructed low/high/unknown and temporally unmatched packets isolate counting and attribution, not campaign balance. No gameplay, producer, save, UI, dependency, difficulty, reward or risk-policy changes. Broader SPE-1119 and deeper modifier integration remain open.

## Verification

Six direct audits: approved risk/consequence scope and source reuse; unmatched/null/duplicate and temporal edge cases; deterministic ordering/input ownership/internal audience; existing consumer/actual profile fixture regression; schema and documentation consistency; diff cleanup. Direct bounded checkpoint reuses inspected sources; no Freebuff. Node22.23.4: 27 targeted tests/four files passed (4.88s). Explicit-path requirements passed: 11,033 tests/1,017 files (511.44s); 24 campaign browser checks (3.8m) plus five error checks (12.6s), no retries; lint, backlog handoff, zero type diagnostics and Vite build. Separate literal production build passed. Global advisory formatting excluded, not claimed green. Independent review and hosted CI remain merge gates.
