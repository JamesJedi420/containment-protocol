# SPE-3375 — current-main reconciliation for PR #4634

## Authorized boundary

The user requested implementation of reconciliation-first full-build recovery on
November 3, 2026. This deliverable refreshes evidence and prepares concrete
repair proposals under existing [SPE-3375](https://linear.app/spectranoir/issue/SPE-3375).
It does not admit unowned repairs, decide gameplay contradictions, reopen
completed children or weaken SPE-2995's full-build acceptance.

Branch: `codex/spe-3375-build-reconciliation`. Pinned main:
`ad21424a4804e22a40a6bbef10454cdc84835016`. The original checkout has unrelated
changes; all session edits are confined to the managed reconciliation worktree.
PR #4634's existing worktree and adapter source are untouched.

## Deliverable

- Commit the [fresh census and reconciliation packet](../docs/typecheck/reconciliation-2026-11-03/README.md),
  preserving immutable prior evidence and the existing collector.
- Map every surviving occurrence to historical provenance, a current source
  anchor, canonical contract, proposed repair, ownership disposition, tests and
  sequencing. Keep proposed scope distinct from approved implementation.
- Split SPE-3444's seven independent residual fixture diagnostics from its
  completed helper repair. Record unresolved semantic/compatibility questions.
- Extend existing census-integrity checks to verify current raw captures,
  provenance, exact one-time coverage, identities, test paths and residual split.
- Publish the reviewable packet and existing-boundary Linear evidence. Do not
  change Linear backlog shape before the ordered approval workflow is complete.

## Observed result

Fresh paired forced Node 22.23.4 / TypeScript 6.0.3 captures on clean pinned main:
**409 occurrences / 293 identities / 144 files**, including **157 production /
252 test-fixture** occurrences. Both compilers exit 2 with identical transcripts.
Literal `npm run build` also exits 2 with 409 diagnostics. No repair delta is
claimed. Existing installed dependencies were reused with matching lockfiles;
no clean-install or security verdict is claimed.

186 historical rows survive; the independent residual split yields **187 current
obligations**, not 187 issues. All 409 lack a verified active bounded repair
owner: 402 were historically unowned and seven remained under a completed-owner
label. The packet retains 41 semantic-review obligations / 99 occurrences.

## Validation and checkpoints

Validation results, exact PR head and hosted status belong in the PR and the
existing owner's evidence comment. The captured failed build is intentionally
retained; successful evidence-integrity tests do not imply build acceptance.
Run the existing SPE-3348 selector with the pinned pre-change base, the census
integrity tests and the three documentation validators. Check changed files with
Prettier and lint the changed Node test. No browser behavior changes, new package
or external fact requires a frontend guide, dependency decision or web research.

The six pre-ship passes reviewed scope/provenance, duplicate and optional evidence,
deterministic matching, historical regression evidence, documentation and diff
cleanup. JSON hashes bind parsed canonical values to survive Windows/Linux
checkout line endings; raw compiler bytes use the existing `.gitattributes`
preservation rule. All current occurrences are covered once. The two new evidence
tests also prove the separate literal build agrees with the forced census and
the seven residual identities agree with SPE-3444's committed residual evidence.

Actual local results on Node 22.23.4:

- Required SPE-3348 selection: **exit 0**; full lint, backlog handoff and all
  **12 census-integrity tests** pass.
- Audit index: **exit 0**, 41 audit files; theme contracts: **exit 0**, 108 SPE IDs.
- Changed Markdown/JSON/Node test Prettier check: **exit 0**.
- Literal production build: **exit 2**, 409 diagnostics, captured before edits.
  No Vite or full-regression pass is inferred. The selector does not require
  gameplay tests or bundling for this docs/Node-evidence-test change.
- The advisory format/census entries were explicitly excluded from the local
  required-validator execution. Fresh paired census evidence is recorded
  separately; repository-wide format drift was not rechecked or changed.
- The initial selector invocation could not locate npm beside the cached Node 22
  binary. A session-local `npm_execpath` pointing at the existing npm CLI fixed
  launch discovery; the successful rerun changed no repository configuration.

Hermes planning initially produced no result. A fresh pre-commit documentation
checkpoint completed in about 63 seconds:
`local-70b77c68e127c36189373034804899a10069e4b51485302086d0946982adc8f5`.
It reviewed the README/slice for evidence, approval and owner inconsistencies.
Direct inspection confirmed its material conclusions; its loose wording about
"SPE-3376 children" is not a verified hierarchy statement. It noted missing
validation results, now recorded above. This is a bounded documentation review,
not semantic approval of 187 proposals or independent live Linear verification.
The configured local provider/model was preserved. Usage totals were not
reported; no cost or token savings are claimed. External research, frontend
guidance and dependency decisions are not applicable to this evidence-only diff.

## Autonomous continuation — first repair cohort

The human subsequently authorized: “You can approve phases yourself. And update
linear autonomously.” That supersedes the earlier approval pause for this recovery
session. The preceding evidence-only deliverable and immutable census retain their
historical meaning. Codex assessed and approved the phases in order, retained the
existing parent, checked declaration ownership/compatibility, and admitted only
the following eight independent type-import repair roots. No global governance
policy, historical completed issue or unrelated semantic obligation was changed.

| Child    | Root                                                      | Measured diagnostic removals |
| -------- | --------------------------------------------------------- | ---------------------------: |
| SPE-3526 | Missing EquipmentRecoveryOutcome import in hydration      |                            4 |
| SPE-3527 | Squad types imported from non-exporting model surface     |                            3 |
| SPE-3528 | Missing hidden-state modality type in concealment preview |                            1 |
| SPE-3529 | Missing equipment instance type in simulation             |                            1 |
| SPE-3530 | Missing pattern blurb type in registry fixtures           |                            1 |
| SPE-3531 | Missing propagation graph map type in weekly fixtures     |                            1 |
| SPE-3532 | FundingState imported from non-exporting funding surface  |                            2 |
| SPE-3533 | Social visibility type uses a nonexistent exported name   |                            1 |

All eight children were created In Progress before source edits. Canonical
declarations already exist. The social visibility type has the six values already
consumed, and FundingState is owned by models rather than re-exported by funding.
All seven edited files emit byte-identical JavaScript before/after with TypeScript
6.0.3, ES2022/ESNext and verbatimModuleSyntax. No public contract, runtime branch,
persistence shape, event kind, compiler option or dependency changed. Unrelated
pre-existing formatter drift in three files was preserved instead of reformatted.

Current-main integration baseline: 65786fe501b53588672f2fb32e88e29244e6a43d,
including main 7547b9392081dc245cb83cbfcba05e6b5fa81cd6. Paired clean-before
captures report 409 occurrences; paired post-import captures report **395**,
with **14 removals and zero additions**. Twelve production and two fixture
occurrences clear. Fresh after-state: 280 identities / 138 files, including
145 production and 250 test-fixture occurrences. Both compiler exits remain 2.

The [portable repair evidence](../docs/typecheck/import-repair-2026-11-03/delta.json)
binds the before/after captures, each child's measured removals and emitted-JS
hashes. The new main changed two verbose diagnostic identities via union ordering
or property elision; attribution uses the fresh matched pair rather than the older
archive. These baseline-context changes are not counted as repairs or new failures.

Targeted regression validation: **12 suites / 645 tests passed**, Node 22.23.4,
forks pool with two workers. Exact suite paths are on the individual children and
in the repair evidence. Final registered validations and hosted full regression
results are recorded on the PR and Linear. Small import/source mapping and direct
delta checks use the Hermes policy's direct path; substantial documentation and
closeout checkpoints retain their normal evidence requirements.

Fresh repeated compilation disproved the parent's incidental Done state; restored
SPE-3375 to In Progress. Child completion still requires merge and validation.
The other reconciliation obligations, including 99 semantic-review occurrences,
remain outside this cohort. Further phase decisions and Linear work may proceed
autonomously under the human's delegation; no human approval pause remains here.
After this cohort merges, follow the repository's new-agent-session rule before
another slice. Full recovery and #4634 acceptance remain incomplete until literal
full build is green on main lineage and the integrated adapter head is revalidated.

## Import-cohort pre-ship verification

The literal `npm run build` exits 2 with 395 diagnostics. Full local lint,
required Vite bundle, backlog handoff, audit index and theme contracts pass.
All 13 evidence-integrity tests pass. No new formatting drift was introduced;
three edited files already fail whole-file Prettier on the baseline and retain
that unrelated body formatting. The complete regression suite is required and
will be supplied by exact-head hosted CI; it is not claimed from targeted tests.

Hermes checkpoint `local-2e6f19f539355b5094f6d2c12bf63a3eba9696f8ae8b1582345e61f7ff231a60`
returned bounded evidence/communication findings. Direct checks confirm measured
removals, existing contracts and emitted-output identity; its clean verdict is
not treated as approval or proof of unrun hosted checks. Six pre-ship passes
reviewed scope, optional/malformed contracts, determinism/state, regressions,
documentation/provenance and cleanup. No other repair roots were admitted.

## Literal-context cohort — SPE-3538 through SPE-3541

The human explicitly requested implementation of the next four-root plan.
Branch: `codex/spe-3375-literal-context`; clean pinned main:
`0a092029c685cbefe7b3a87bc60b3b72e391294d`. The original dirty checkout, adapter
PR #4634/worktree and independently active UI PR #4653 are preserved. This current
instruction authorizes the bounded recovery continuation; no unrelated PR is
merged or included here.

Ordered Phase 1–4 review retained SPE-3375 as the existing shared-system parent,
checked current contracts and overlapping owners, and admitted exactly four
children In Progress before source edits: SPE-3538 allocation return context,
SPE-3539 production grade snapshot return context, SPE-3540 emergency fallout
return context and SPE-3541 frozen candidate context. These correspond to the
four existing reconciliation roots; historical completed children stay Done.

The [immutable cohort evidence](../docs/typecheck/literal-context-2026-11-03/README.md)
records paired **395 → 388** compiles: seven removals, zero additions, 280 → 273
identities and 138 → 137 files. Each compiler exits 2. The baseline identity
multiset equals the preceding import cohort. Root removals are respectively
1 / 2 / 3 / 1. All 99 semantic-review occurrences remain unchanged.

Only three source files change, using existing canonical type context and two
type-only imports. Their transpiled JavaScript is byte-identical before/after;
no gameplay, hidden-information, persistence, schema, dependency, compiler-policy
or browser behavior change is introduced. Frontend guidance, external research
and package-security decisions are not applicable to this type-only diff.

Five targeted suites / 470 tests, full lint and Vite bundling pass. Final
registered checks, literal-build evidence, review, CI and Hermes disposition are
recorded below or on the cohort PR/children before completion. Census collectors
ran on stable inputs; preliminary incomplete attempts are distinguished in the
evidence README. The six pre-ship passes cover exact scope/provenance, retained
malformed/legacy branches, deterministic state, consumer regression, documentation
and cleanup. Source mapping and small checks use the direct Hermes path; the
documentation/communication and mandatory post-merge checkpoints still apply.

SPE-3375 remains In Progress and SPE-2995/#4634 retain literal full-build
acceptance. No other repair or semantic obligation is admitted. After merging
this cohort, complete current-slice closeout and start a new chat before another
implementation slice.

### Literal-context final local verification

All 14 census-integrity tests pass, including the separate literal build's exact
388-diagnostic agreement with the paired after-state. Full local lint, changed
Node-test lint, changed-file Prettier and whitespace checks pass. Audits-index
reports 41 files, backlog-handoff passes and theme-contracts reports 108 mirrored
IDs. SPE-3348 requires backlog-handoff, lint, census tests, unit tests and Vite
bundling; exact-head hosted CI supplies the full unit run. Local targeted evidence
remains five suites / 470 tests. Literal `npm run build` exits 2, while separate
Vite bundling exits 0. No full green-build or hosted-regression pass is inferred.

Hermes documentation/communication checkpoint
`local-086d7dcea136f1dae71385991f63182de2f7f5e632ae4af4dff7a0e9344790b9`
returned exit 0 but skipped requested delta/execution inspection and presented
prompt text as document quotations, with unsupported section anchors. Its clean
verdict is rejected as incomplete. Direct fallback inspected the actual appended
slice, README, delta and execution metadata against raw-bound integrity tests,
source diff, emitted-JavaScript hashes and live child/parent states. No unsupported
helper claim is promoted to evidence. Local provider/model were preserved; token
usage was not reported and no savings are claimed. The PR description is drafted
directly from verified results. Independent PR review and hosted checks remain
required before merge.

## Mechanical production cohort — SPE-3543 through SPE-3547

The human explicitly approved implementation of the five-root plan in this chat.
Branch: `codex/spe-3375-mechanical-type-contracts`; clean synchronized main:
`ceb706637c96697eeae8c5d67d58acde2483ebfb`. The original dirty checkout, adapter
PR #4634/worktree and independently active UI PR #4653 are preserved. The explicit
continuation instruction supersedes the generic open-PR startup restriction for
this bounded cohort; it authorizes no work on either unrelated PR.

Ordered Phase 1–4 reconciliation retained SPE-3375 as the canonical shared-system
parent and admitted exactly five children In Progress before source edits:
SPE-3543 candidate-source-disposition, SPE-3544 eligible-case-membership,
SPE-3545 institutional-flags-index, SPE-3546 town-tags-readonly and SPE-3547
store-inspection-drafts. Current parent inventory and prior targeted owner searches
identified no exact active repair owner. Completed children and historical waves
remain Done. Existing canonical declarations support all five changes without a
public contract, semantic, persistence or runtime decision.

The [immutable cohort evidence](../docs/typecheck/mechanical-contracts-2026-11-03/README.md)
records paired Node 22.23.4 / TypeScript 6.0.3 captures: **388 → 381 occurrences**,
**273 → 266 identities**, **137 → 134 files**, seven removals and zero additions.
Each compiler exits 2. Attribution is 3 / 1 / 1 / 1 / 1 across the five children.
All 250 fixture diagnostics and 99 semantic-review occurrences remain unchanged.
The earlier Node 24 in-memory planning probe is superseded by these Node 22
captures for implementation evidence.

Only four production files change, using annotations of existing contracts.
Their emitted JavaScript is byte-identical. Six targeted suites / 556 tests pass
under Node 22.23.4. Final registered validation, independent review, hosted full
regression and Hermes dispositions are recorded below or on the cohort PR and
children before completion. No other repair roots are admitted, and no in-boundary
work is deferred. SPE-3348 retains validator selection, SPE-3375 stays In Progress
and SPE-2995/#4634 retains its full-build hold.

The six pre-ship passes cover exact scope/attribution, unchanged malformed/optional
handling, deterministic state and event ordering, existing integration assertions,
historical evidence/docs and diff cleanup. The small source-to-contract mapping
uses the direct Hermes path; substantial documentation/communication and mandatory
post-merge Linear Hygiene checkpoints retain their normal requirements. External
research, package decisions and frontend guidance are not applicable to this
annotation-only diff. Follow the new-chat rule after merging this cohort; select
no next implementation scope during closeout.

### Mechanical-cohort final local verification

All 15 census-integrity tests pass, including exact historical root attribution,
one-time coverage of the seven removals, unchanged fixture/semantic multisets and
the separate literal build's 381-diagnostic agreement. Full local lint, changed
Node-test lint, Vite bundling, audits-index (41 files), backlog-handoff and theme
contracts (108 IDs) pass. Changed evidence/test/docs and gameStore formatting plus
whitespace checks pass. Whole-file Prettier checks fail both before and after in
runTransfer, publicSignalCoverage and townContractGeneration; unrelated baseline
formatting is preserved. The existing Vite chunk-size warning remains.

SPE-3348 selection against pinned base reports 14 paths and requires backlog
handoff, lint, Playwright, census tests, full unit tests and Vite bundling. This is
selection, not execution: exact-head hosted CI must supply full regression and
browser evidence. Local targeted evidence is six suites / 556 tests. Literal
`npm run build` exits 2 with 381 diagnostics, so no green full-build claim follows
from the independently passing bundle or evidence checks.

Hermes documentation/communication checkpoint emitted session reference
`local-5b7a3f5d2f8f226885b9dc1018d553d3277546591168cb3d80f5bc727ffc682b`
and process exit 0. Its numeric summary matches the raw-bound evidence, verified
directly by Codex. Its clean verdict lacks the requested source/delta anchors,
and its draft overstates formatting; it also repeats an older session ID and
unsupported token estimates. Those claims are rejected. Direct fallback reviewed
the complete four-source diff, new evidence/test and actual slice/README against
raw captures, emitted hashes and recorded validation. The PR draft uses verified
results and preserves the three known formatting limitations. Local provider/model
were preserved; actual token usage is unknown and no savings are claimed.
