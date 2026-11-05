# SPE-3732 — Inventory quantity and Auto-Scrap processing limits

- Owner: [SPE-3732](https://linear.app/spectranoir/issue/SPE-3732/bound-imported-inventory-quantities-and-weekly-auto-scrap-work), In Progress.
- Parent: SPE-2749 remains Backlog; related shipped implementation: SPE-2799.
- Authorization: user requested “fix the quantity and processing limits” after the focused save-hydration review in this chat.
- Branch: `codex/spe-3732-auto-scrap-limits`.
- Initial base: `ed221e3fcc3e82af5e0dc6781cfe56f64c96dc3a`; final integration base: `04e0ca6495b672ee0cd68372161ec908f89bb58a` (PR #4870).
- Isolated checkout preserves the original checkout and unrelated edits. The one overlapping
  recovery error-type rename was integrated while retaining both typed rejection paths.
- Session preflight: `ready`; clean synchronized main and no open PRs at collection.

## Boundary and behavior

The shared domain quantity normalizer enforces exact-unit magnitude limits before truncation,
reusing the existing safe-integer capacity recognized by equipment reaggregation. Shared hydration
uses it for imported and fallback stock. Unsupported magnitudes reject explicit run/manual-save
imports before the store changes, and automatic restoration leaves existing campaign state and
stored bytes untouched. Existing supported normalization and legacy envelope versions remain.

The existing automatic-load recovery screen and persistence lock also cover typed quantity
rejections; subsequent store mutations and clear requests cannot overwrite rejected data.
Pending fabrication output quantities receive the same magnitude check. Fabrication and
recovery wait intact when their outputs cannot fit; immediate procurement refuses to spend
resources for an overflowing credit, and delayed deliveries remain pending until room exists.
This closes normal producer paths adjacent to the accepted-count/weekly-processing boundary.
Anonymous equipment returns/replacements also refuse atomically when returning stock cannot
fit. Capacity-blocked fabrication/recovery jobs retain one remaining week to satisfy the
existing pending-job hydration contract, so they survive save/load without a schema change.

Auto-Scrap uses the same guard for direct runtime input, plus a global 32-attempt weekly budget.
This fixed count keeps the synchronous deterministic week-close contract; it does not introduce
wall-clock timing, browser scheduling APIs, asynchronous simulation, or hidden randomness.
Work remains in code-unit item-ID order. Unprocessed stock persists and is reconsidered in later
weeks, with the existing same-week routing event preserving idempotence. Only a result that both
consumes one unit and appends one job is adopted. A non-progressing command stops that item.
The existing Equipment projection exposes the limit so its description states the batching rule.

No new protected-stock authority, event field, save version, dependency, or parallel queue exists.
Input collection/history-size limits are outside this numeric-iteration fix.

## Validation and review

- Before implementation: 8 of 9 bounded regressions failed, demonstrating unsupported-count acceptance, unbounded batching and repeated non-progress attempts. No excessive workload was executed.
- Initial implementation plus existing Auto-Scrap contracts: 24 tests passed.
- Expanded targeted store/domain/Equipment tests: 86 passed.
- Fresh candidate review found persistence-lock and fabrication-capacity gaps; both corrected
  with regressions. Correction and neighboring contracts: 66 tests passed.
- Initial full suite: 10,935/10,936 passed; one route timeout passed on isolated rerun (17/17
  route and correction tests). A repeated full run passed 10,939/10,940 with the same route
  timeout. The complete suite then passed 10,940/10,940 with two workers, without changing
  assertions or timeouts (`npm run test:run -- --maxWorkers=2`).
- Production build and full lint passed. Backlog handoff, audit index, theme contracts and
  changed-file formatting passed. Global format check found 3,272 existing files outside this
  bounded cleanup; no unrelated repository-wide formatting was applied. The final requirement
  selection includes Playwright because the persistence guard changed; its shared suite uses
  Vite dev-only hooks in four tests and must run against the dev server, not preview.
- Production-browser checks: 2 passed on isolated port 5193. Harness setup was corrected to
  await export and use the payload element ID after its nested label changed accessible name;
  application behavior required no change for the harness.
- After main integration: 70 affected tests and the production build passed. The shared
  Playwright suite passed all 20 tests on a strict, non-reused dev server at port 5173 (two
  fixtures hard-code that port). Earlier alternate-port failures were harness connection
  errors, not application failures. Temporary harness type annotations were corrected after
  full lint included those ignored local files. Final full lint and changed-file formatting
  passed; Node 22 CI evidence follows. The two focused production-browser checks also passed
  again after main integration.
- Local Node: 24.18.0; CI Node 22 evidence remains required before final acceptance.

Modern Web Guidance: `break-up-long-tasks` retrieved after search. The installed skill reported
an outdated version flag; current retrieval succeeded. A deterministic count budget is used
instead of its asynchronous yielding example because the repository owns a synchronous pure
simulation boundary. No Scheduler API/fallback is introduced, and existing focus/keyboard/motion
behavior is unchanged. Tool 0.0.197 review: Sonatype credits unavailable; npm advisory bulk lookup
returned no matches, registry metadata identified Apache-2.0 and the GoogleChrome source repo,
and no tooling dependency was added to the application or CI.

Freebuff: earlier policy refusal reused, no retry/model switch. Pre-patch independent investigator
completed source-backed boundary/compatibility review. Hermes checkpoints with small evidence
packets use direct checks where dispatch overhead exceeds evidence; no token savings claimed.

## Acceptance evidence

1. Reachable: a constructed 36-unit run was imported through the ordinary campaign panel, then
   processed through the top-bar Advance Week action. This is an imported fixture, not a claim
   that 36 units were acquired during an observed natural campaign.
2. Connected: actual persisted stock changed from 34 medkits / 2 seals to 2 / 2, then 0 / 0;
   canonical routing events reported 32 and 4 newly routed units.
3. Observable: the Equipment page rendered the 32-unit weekly description and remained usable
   after both closes. The captured screenshot is `test-results/spe-3732-browser/limits-passed.png`.
4. Persistent: a full browser reload between closes retained deferred stock and enabled policy.
5. End to end: both the import → week-close → reload → week-close flow and rejected automatic
   restoration → original-data recovery flow passed in Chromium against the production build.
   Unsafe explicit import also preserved the previous browser save bytes. Unit tests separately
   exercise maximum supported counts, alternate envelopes and subsequent-write blocking.

All six pre-ship passes covered scope/integration, malformed/empty/max/non-progress edges,
deterministic order and same-week replay, nearby consumers, schema/slice documentation, and
cleanup. No new policy gap was found in this slice; small documentation and policy checkpoints
were checked directly without another delegation cycle. Final CI/merge evidence remains pending.
Hosted PR review then identified the pending-recovery countdown/hydration mismatch and missing
anonymous equipment-return capacity checks. Both reproduced as failing bounded regressions;
the fixes preserve existing queue hydration and refuse return/replacement without changing stock
or equipment. All 42 directly affected/neighboring tests passed after those corrections, including
a blocked recovery → export/import → make room → complete flow.
CodeRabbit's distinct numeric-overflow encoding finding also reproduced: JSON `1e400` became
Infinity and previously fell back to starter stock/recipe output. Non-finite numeric values
now reject explicitly; nonnumeric fallback behavior remains. Both exponent signs and pending
fabrication output have regression coverage, in addition to the finite-magnitude cases.
All 465 quantity/run/save/equipment contract tests passed after the overflow correction.
The 10 focused store tests additionally verify fresh, independent version-1 and current-version
automatic overflow restoration, recovery errors and protection against later persistence writes.
The larger SPE-2749 protected-stock boundary remains open and is not implemented by this fix.
