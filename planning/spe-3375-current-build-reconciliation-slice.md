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

## Remaining gates

This evidence-only deliverable does not complete the requested full-build
recovery. Concrete Phase 1 proposal approval remains pending; Phase 2 parent
reconciliation, Phase 3 child/contradiction review and Phase 4 application must
precede newly admitted repair implementation. Candidate-ledger record: none
established. Existing owners remain unchanged; SPE-3375 and SPE-2995 remain
In Progress. PR #4634 remains open under the build hold.

After approved repairs restore green main lineage, revalidate #4634's exact
integrated head with its six targeted suites, full build and required hosted
checks. Assess SPE-1434 separately. No merge or closure is implied by this packet.
