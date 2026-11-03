# Current-main build recovery reconciliation — SPE-3375

> Historical reconciliation snapshot at ad21424a. The human later delegated phase
> approval and Linear updates; the eight approved import repairs and their
> **409 → 395** result are recorded in [the repair delta](../import-repair-2026-11-03/delta.json)
> and the [live session slice](../../../planning/spe-3375-current-build-reconciliation-slice.md).
> Pending-approval statements below describe the snapshot, not a current human gate.

## Result and authority

On clean main `ad21424a4804e22a40a6bbef10454cdc84835016`, two forced
Node 22.23.4 / TypeScript 6.0.3 compiles each report **409 diagnostic occurrences,
293 identities, 144 files**, including **157 production / 252 test-fixture**
occurrences. Both compiler exits are 2. The captures are byte-identical, with
SHA-256 `b51e9992f8ef750fb011d994d96bc545c26172786f9ac7659b46b7f6cb772715`.
The separate literal `npm run build` also exited 2 with 409 diagnostic lines;
Vite did not execute after the compiler failed. This is fresh failed-build
evidence, not build recovery or satisfaction of PR #4634's acceptance.

The user requested reconciliation-first recovery on November 3, 2026.
[SPE-3375](https://linear.app/spectranoir/issue/SPE-3375) remains In Progress and
owns this refresh. SPE-3376 and all previously approved repair children remain
Done. SPE-2995 / [PR #4634](https://github.com/JamesJedi420/containment-protocol/pull/4634)
remains In Progress/open with its literal green-full-build requirement intact.
No new issue, relationship, semantic decision, compiler setting or validation
policy was applied. This packet prepares candidate assessment; it does not
admit its proposed repairs as implementation scope.

## Evidence and complete coverage

- [census.json](census.json): exact commit, clean status, compiler-input and
  lockfile hashes, environment, two-run results and all diagnostic coordinates.
- [compiler.txt](compiler.txt): the identical raw transcript retained once.
- [reconciliation.json](reconciliation.json): every current occurrence mapped to
  its historical obligation, canonical contract, proposed repair, ownership
  disposition, test shortlist and sequencing. Indices are zero-based into the
  current census; historical indices refer to the immutable October baseline.
- [proposals.md](proposals.md): readable per-obligation proposal table.
- [execution.json](execution.json): separate full-build execution and limitations.

The historical 681-occurrence partition has **186 surviving rows**. Splitting
one incorrectly broad historical row produces **187 current obligations**:
146 repair-candidate obligations / 310 occurrences and 41 semantic-review
obligations / 99 occurrences. There are no unassigned or multiply assigned
occurrences. These obligations are not a request for 187 Linear issues.

All 409 currently lack a verified active bounded repair owner. Of these, 402
were historically unowned; seven were retained under the completed SPE-3444
helper row. Its committed evidence already identifies those seven independent
residuals: one incomplete completion-outcome fixture and six optional loaded-map
accesses. They are now separate proposals; neither reopens the helper issue.

The fresh compiler-input hash and diagnostic multiset agree with the earlier
`de3f1eb6` capture cited on SPE-3375. Against the immutable 681-occurrence
baseline, 272 occurrences are absent and none added. That is an observed
historical difference, not a reduction attributable to this evidence-only PR.
The latest merged mechanical-repair report also ends at 409; its summary alone
does not establish identity equality, so the comparisons remain distinct.

## Priority contract review

| Obligation                         | Current evidence                                                                                                                                                                                                           | Proposed next decision and required proof                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hydrated hub/runtime/report shapes | `runTransfer.ts` exposes `PersistedGame = Omit<GameState, 'templates'>`, while tests read unknown-typed hub, reward and strategic-option values.                                                                           | Separate raw persisted input from the validated normalized return contract. Check malformed saves, absent fields, legacy round trips and consumer access before approving any public return-type change. Do not turn raw input into trusted GameState by assertion.                                                                  |
| Market order accounting            | `market.ts`'s per-week listing totals switch handles buy/sell/favor/obligation, but not order/fulfill; `sim/market.ts` emits order when funding is charged and fulfill when inventory arrives.                             | Decide the availability accounting point and allocation week from the canonical procurement owner. Test order placement, delayed fulfillment, multiple orders, week rollover and prevention of double counting before changing totals. Existing runtime ignores the two actions; a numeric accounting change is a semantic decision. |
| Branch correction activation       | `BranchCorrectedRecord` omits optional `effectiveFromChoiceId`, although the activation predicate and four fixture families already consume it. Existing branch tests distinguish active and inactive corrections.         | Proposed type-contract repair: declare the already-consumed optional field, preserving unconditional activation when absent and prior-choice gating when present. Verify authoring/projection compatibility and hidden-truth behavior before admission.                                                                              |
| Weekly integrity state             | `weeklyReportInvariants.ts` exports append/clear helpers for a field absent from GameState. A repository-wide source search finds no consumers of either helper. The used pending-violation functions have existing tests. | Review removal of the unused helpers and export compatibility first. Do not add persisted GameState state merely to satisfy dead code. If an actual consumer requires the state, route schema/default/migration ownership before proposing it.                                                                                       |
| Market order denial projection     | The listing builder already constructs `orderBlockedReason`; detail consumers read it, but `MarketListingView` omits its declaration.                                                                                      | Proposed declaration-only repair: add the optional field to the existing listing interface. Validate distinct order/buy/sell blockers and preserve player-safe explanations.                                                                                                                                                         |

Source anchors and direct-consumer test candidates for these and every other
obligation are in the machine-readable packet. The historical semantic flag is
retained until review; it does not assert every flagged row requires a gameplay
change. Conversely, a repair-candidate label does not prove a behavior change
is unnecessary. Each cause must be confirmed against its current source before
implementation. Candidate test lists are nonexhaustive and are not coverage or
pass claims.

## Reconciliation and execution order

1. Review this Phase 1 assessment and proposed root-cause boundaries. Consolidate
   only when an actual shared root is demonstrated, not by directory or TS code.
2. Reconcile the existing SPE-3375 parent in Phase 2. In Phase 3, verify existing
   subsystem owners, resolve contradiction/compatibility questions and specify
   each repair's exact scope, acceptance and tests. Retain unresolved decisions
   as blockers; do not infer approval from this report or a passing unit suite.
3. Apply only explicitly approved Phase 4 backlog changes. The candidate-ledger
   record is not yet established; no new child or relationship was created here.
4. Repair approved type-local/shared roots before their consumers, in bounded
   PRs. A first reviewable root is the missing `EquipmentRecoveryOutcome` import
   in `runTransfer.ts`: its authoritative declaration is already in `models.ts`,
   and two missing-name diagnostics may account for two callback-inference
   diagnostics. The proposed repair is one `import type` addition; any cascade
   remains a hypothesis until an isolated paired census proves it.
5. After each approved repair, compare diagnostic multiplicities and unexpected
   additions, run targeted tests/lint and the existing SPE-3348 selector, and
   record actual results. Start a new agent chat after each merged slice.
6. Close SPE-3375 only after literal full-build and regression acceptance passes
   on main lineage. Then integrate recovery into #4634 and rerun its focused
   tests, full build and required hosted checks at the final head. Evaluate
   SPE-1434 separately; keep all current holds until their evidence passes.

## Reproduction and limits

Run `node scripts/report-typecheck.mjs --output .tmp/reconciliation-check` using
Node 22 on the pinned clean revision. The collector runs two forced builds and
returns the compiler's exit code; exit 2 is expected for this captured state.
Run `npm run build` separately for literal acceptance. Artifact integrity is
checked by `node scripts/typecheck-census.test.mjs`; successful integrity checks
prove consistency of the evidence, not semantic correctness of the proposals.

The installed dependency tree was reused through a local junction after
confirming identical lockfile hashes. No fresh `npm ci`, package change or clean
security verdict is claimed. Original compiler transcripts are preserved
without formatting. Test/source/browser behavior is unchanged by this packet.
Hermes supplied no evidence during the preceding bounded planning attempt.
A fresh pre-commit documentation checkpoint returned a consistency review of
this README and the slice document; its material claims were checked directly.
That bounded review does not establish semantic correctness of all proposals,
live Linear agreement or green-build acceptance. The session reference, actual
validation and PR status are recorded in the reconciliation slice and PR evidence.
