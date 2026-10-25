# SPE-3436 — store-to-feature projection dependency recovery

| Field             | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                |
| **Issue**         | [SPE-3436](https://linear.app/spectranoir/issue/SPE-3436)           |
| **Parent**        | [SPE-3434](https://linear.app/spectranoir/issue/SPE-3434) — Backlog |
| **Branch**        | `spe-3436-investigation-dependency-only`                            |
| **Main baseline** | `c135ffd5dd755773945c527de7b16589bb0bfb40`                          |

Delivery status above is the intended main state **effective on merge**. Keep Linear
In Progress until the PR merges and its completion evidence is verified.

## Authority and ownership

Resume the existing investigation implementation at `16e84caf` with the user's
explicit implementation authorization on 2026-10-25. Apply SPE-3436's approved
2026-10-24 Phase 4 affiliation work-queue reconciliation. Preserve SPE-45's separate
store business-rule extraction scope and its unresolved historical closure evidence.

## Approved boundary

- Keep investigation eligibility canonical in `investigationEconomy.ts`; the store
  and case-prep projection consume that predicate.
- Resolve affiliation work-queue decisions from canonical person-status snapshots,
  existing record identifiers, builders and permissions in a domain adapter.
- Replace the feature projection dependency across the ten existing affiliation
  store commands. Preserve guard conditions, current reason-code fingerprints,
  recommendations, record joins, durable fulfillment fallback and delivery modes.
- Keep explanatory text, labels, display ordering and the full mirror in the
  feature projection. Reuse the domain interpretation instead of copying it.
- Preserve GameState, schema, hydration, action behavior and simulation rules.

The current welfare policy does not grant allowed file access. Test the retained
allowed command branch with an isolated authored snapshot; do not change policy
to manufacture a production allowed row. Durable allowed fulfillment can still
feed package/delivery handling after the live row becomes restricted.

## Protected work

Use the isolated `C:/Projects/containment-protocol-spe-3436` worktree. Preserve the
original checkout's local `AGENTS.md` and `.gitignore` changes, maintenance files,
stashes and worktrees. PR #4356 / SPE-3181 remains outside this issue.

## Operational input inventory

`getAffiliationFileWorkQueueEntry(game, entryId)` consumes
`projectAffiliationPersonStatusSnapshots` with the same current-candidate/legacy-pool
fallback as the mirror. Its `reasonCodes` retains the former `reasonCodeLabels`
token values, including missing-decision fallback. No display copy enters guards.

| Existing command                                       | Canonical decision inputs retained                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `recordAffiliationFileWorkQueueAction`                 | Subject identity, recommended action identity/label, bucket and source reasons                   |
| `recordAffiliationFileWorkQueueEvidenceResolution`     | Missing-review bucket and current missing-reason fingerprint                                     |
| `recordAffiliationFileWorkQueueRepairAction`           | Current resolution's repair candidates and recorded-repair flags                                 |
| `recordAffiliationFileWorkQueueReleaseAction`          | Bucket-selected release action and existing-action flag                                          |
| `recordAffiliationFileWorkQueueReleaseOutcome`         | Recorded release action, action kind and existing-outcome flag                                   |
| `recordAffiliationFileWorkQueueReleaseFulfillment`     | Allowed bucket, action/outcome flags, outcome kind and durable fulfillment flag                  |
| `recordAffiliationFileWorkQueueReleasePackage`         | Durable fulfillment/outcome kinds, original source reasons and package flag                      |
| `recordAffiliationFileWorkQueueFileReleaseDelivery`    | Matching package kind/reference/reasons; existing receipt checks remain in store                 |
| `recordAffiliationFileWorkQueueNonMissionEnforcement`  | Current bucket/reasons; canonical enforcement helper and duplicate guard remain in store         |
| `recordAffiliationFileWorkQueueEvidenceRepairWorkflow` | Missing welfare-reference reason; canonical workflow builder and duplicate guard remain in store |

## Validation

Use Node 22 and an exact `npm ci` installation in the isolated worktree. Run the
domain decision contract, existing affiliation mirror and investigation tests,
all affected store tests, save/load coverage, lint and affected formatting checks.
Compare normalized baseline/branch TypeScript diagnostics; existing build drift
remains with SPE-3375/SPE-3376. Record final counts and independent review before
commit/PR; keep the parent open after this child ships.

### Local evidence

- Node 22.23.4; isolated `npm ci` uses the unchanged tracked lockfile (Vitest 5.0.5).
- Regression command: `npm run test:run -- src/test/affiliationFileWorkQueueDecisions.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/test/investigationCasePrepView.test.ts src/app/store/gameStore.test.ts src/app/store/saveSystem.test.ts src/test/affiliationPersonStatusRecordsPersistence.test.ts src/app/App.affiliationPersonStatus.route.test.tsx --maxWorkers=2`.
- Result: 7 files / 154 tests passed, including every store test, domain decision
  coverage, UI route rendering, repair integrity and save/load continuation.
- Temporary tests compared the complete original-main and new mirror outputs
  across the exercised real/authored snapshots and ledger transitions. The final
  differential plus existing mirror run passed 31 tests. Temporary original
  source/test copies were removed; no parallel implementation is retained.
- `npm run lint`, audit-index, backlog-handoff, theme-contract and governance-contract
  checks passed. Affected source, tests, interface docs, slice and manifest pass
  Prettier. The large backlog index keeps a minimal handoff/table diff instead of
  a repository-wide formatting rewrite.
- Baseline and branch `npm run build` exit 2 with 685 diagnostics each. The comparison
  uses file/code/diagnostic source identity to ignore moved line numbers and
  TypeScript's namespace/ellipsis rendering. No source repair or compiler weakening
  is folded into this issue; build recovery stays with SPE-3375/SPE-3376.
- Independent read-only review covered the adapter, both recovered imports,
  projection omission/label semantics, durable fulfillment/delivery joins and the
  latest operational-field spread; no actionable P0/P1 findings. The reviewer did
  not independently review its own store-test additions.
- Six pre-ship passes cover scope/integration, edge cases, deterministic immutable
  reads, regressions, documentation/authoring and cleanup. No unresolved
  in-boundary correction remains; hosted full-suite/review evidence follows in PR.

## Deferred

| Item                                      | Existing owner      | Disposition                                   |
| ----------------------------------------- | ------------------- | --------------------------------------------- |
| General store business-rule extraction    | SPE-45              | Outside this import correction                |
| Broad cross-layer/deep-import enforcement | SPE-3437            | Only the recovered interfaces are tested here |
| Other sibling-feature import corrections  | SPE-3438            | Independent approved boundary                 |
| Repository TypeScript/build repair        | SPE-3375 / SPE-3376 | Preserve the existing recovery sequence       |
| Required-validator selection              | SPE-3348            | No CI/orchestration policy change             |
