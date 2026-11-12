# SPE-3437 — dependency boundary regression enforcement

| Field             | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **Status**        | **Decision recorded — implementation pending**                      |
| **Issue**         | [SPE-3437](https://linear.app/spectranoir/issue/SPE-3437)           |
| **Parent**        | [SPE-3434](https://linear.app/spectranoir/issue/SPE-3434) — Backlog |
| **Branch**        | `freebuff/spe-3437-slice-decision-docs` (this documentation record) |
| **Main baseline** | `dc29694c0fa31c70cd3df0b1bd69ec56e1fb6cee`                          |
| **Patch base**    | `b930ddc2251d0dddc2a9d00e352e9df37e2489cb` (50 commits earlier)     |

Delivery status is effective on merge. This document records the decision and
recovery evidence for the bounded re-authoring. It does not implement, hook up,
or enforce anything.

## Decision and authority

SPE-3437 is approved for its currently recorded scope. Under manual §1, an
existing Linear issue is approved for its recorded Goal, Scope, Boundaries and
Acceptance Criteria; no original admission record, originating conversation,
approval label, or separate approval census is required.

- Decision comment:
  [`590ccce2`](https://linear.app/spectranoir/issue/SPE-3437/dependency-boundary-regression-enforcement-cp-core#comment-590ccce2),
  recorded `2026-11-09T03:52:52.875Z`.
- Working specification: matrix v2.0-final in
  [comment `908fc0b8`](https://linear.app/spectranoir/issue/SPE-3437/dependency-boundary-regression-enforcement-cp-core#comment-908fc0b8).
- The approval block in comment `908fc0b8` is withdrawn. No owner loss
  confirmation or separate approval is pending.
- The operator instruction of 2026-11-09 ("Don't ask the owner to make
  decisions. Make the decision yourself.") supersedes the 21:55 "do not
  recreate" hold for this bounded slice.

This document and its PR are docs-only. They do not change SPE-3437's
**In Progress** state, SPE-3434's **Backlog** state, or authorize any code,
test, dependency, CI, ESLint, enforcement, issue, or relationship change.

## Recovery evidence

The original five-file patch was lost. It comprised:

- `test/importBoundaryClassifier.ts`
- `test/importBoundaryFixtures.ts`
- `test/boundary-enforcement.test.ts` (replacement)
- `docs/dependency-boundaries.md` (bounded update)
- `planning/spe-3437-dependency-boundary-regression-slice.md` (this document)

Recovery sweep on 2026-11-09 from the Freebuff Cloud VM:

| Check                                                                   | Result                    |
| ----------------------------------------------------------------------- | ------------------------- |
| Branch `freebuff/0e556b7ddf514e94b648e852` among 49 origin heads        | absent                    |
| Session worktree                                                        | absent                    |
| `/tmp/spe-3437-review.diff`                                             | absent                    |
| `importBoundaryClassifier.ts` or fixtures in any ref or dangling object | absent                    |
| Reported SHA-256 comparison                                             | not possible; no artifact |

The owner-side Downloads copy and the originating session remain unverified and
inaccessible from this VM. They are not a precondition for this slice after the
decision above. If a usable original patch or partial classifier appears before
the slice is complete, stop and apply only the two corrections from the 21:55
spec; do not re-author and do not claim parity.

At `dc29694c`, the only related file present is the legacy 73-line
`test/boundary-enforcement.test.ts`. The classifier, fixtures, and this slice
document do not exist.

## Scope and boundary

Allowed files for the implementation slice:

1. `test/importBoundaryClassifier.ts` (new)
2. `test/importBoundaryFixtures.ts` (new)
3. `test/boundary-enforcement.test.ts` (replace the regex test)
4. `docs/dependency-boundaries.md` (bounded enforcement-limit update)
5. `planning/spe-3437-dependency-boundary-regression-slice.md` (this document)

Excluded: production source, other tests, dependencies or lockfile, CI, ESLint,
enforcement hookup, new issues or relationships, assignee or status changes,
and publication. The implementation replaces the legacy regex test with a
deterministic classifier; it does not fix production imports. The new inventory
is a new baseline. The original hash, 805-line diff, 19-count, and ten
violations are abandoned; no parity claim is permitted.

## Resolved decisions

| ID  | Resolution                                                                                                                                                | Consequence                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| D1  | Stable-interface allowance is UI-only.                                                                                                                    | A projection importing a sibling `View.ts` blocks even when it resolves. |
| D2  | A projection is a `.ts` file under a feature whose basename ends `View`, `Selectors`, `Projection`, or `IntelProjection`; the override list starts empty. | No silent reclassification.                                              |
| D3  | Test files (`**/*.test.ts(x)`, `src/test/**`) are excluded from production and reported in a separate `testImports` count.                                | Test doubles do not create blocking results.                             |
| D4  | Type-only relative imports are counted under the target rule.                                                                                             | `import type` cannot bypass a boundary.                                  |
| D5  | `import(expression)` with a non-literal argument is diagnostic; literal and no-substitution-template imports are classified normally.                     | Visible without false blocking.                                          |
| D6  | Fixtures are strict; the inventory asserts determinism and complete classification, not a fixed global count.                                             | No brittle 19-count snapshot or blanket exclusions.                      |
| D7  | UI → domain canonical summarizer imports are diagnostic (`ui-domain-import`), not blocking.                                                               | The docs exception remains unmechanized and is not silently allowed.     |
| D8  | Domain → store imports are diagnostic (`domain-store-import`), not blocking.                                                                              | The issue scope is domain→feature/UI and store→feature.                  |
| D9  | `test/**` must be typechecked explicitly.                                                                                                                 | `npm run build` does not check the classifier.                           |
| D10 | The new inventory is a new baseline; the original hash, 805-line diff, 19-count, and ten violations are abandoned.                                        | No parity or recovery claim is permitted.                                |

## Classification vocabulary

Source precedence: test → domain → store → shared → feature projection → feature
UI → out of scope.

- Domain: `src/domain/**`.
- Store: `src/app/store/**`.
- Shared: `src/features/shared/**` and root `src/features/*.ts`.
- Feature projection: `.ts` under `src/features/<feature>/` with basename suffix
  `View`, `Selectors`, `Projection`, or `IntelProjection`.
- Feature UI: any other `.ts`/`.tsx` under a feature.
- Test: `**/*.test.ts(x)` and `src/test/**`. The production inventory walks
  `src/**`; `test/**` files are not production.
- Out of scope as a source: `src/app/**` outside store, `src/components/**`,
  `src/styles/**`.

Target resolution order: exact, `.ts`, `.tsx`, `index.ts`, `index.tsx`. A stable
interface is a resolved, non-index `.ts` file whose basename ends `View`,
`IntelProjection`, or `Projection`. Explicit `.tsx`, index, unresolved, `.d.ts`,
and directory indexes never qualify.

Relative-only: only `./` and `../`. Bare packages, aliases, absolute paths,
triple-slash references, `require()`, and `import.meta` are out of scope.

## Rule matrix

| Rule ID                       | Source → target                                                     | Mode                | Fixture obligation                                                         |
| ----------------------------- | ------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| `domain-feature-import`       | Domain → `features/**`, `components/**`, `styles/**`                | Block               | One positive, one same-layer negative                                      |
| `domain-store-import`         | Domain → `app/store/**`                                             | Diagnostic          | One positive; excluded from blocking totals                                |
| `store-feature-import`        | Store → `features/**`, `components/**`, `styles/**`                 | Block               | One positive, one store→domain negative                                    |
| `projection-sibling-import`   | Projection → any sibling feature, including resolved `.ts` stable   | Block               | Include a stable `.ts` target to prove the UI-only exception               |
| `projection-ui-import`        | Projection → UI, same or sibling feature                            | Block               | Include a same-feature projection→component case                           |
| `sibling-feature-deep-import` | Feature UI → sibling non-stable, deep, `.tsx`, index, or unresolved | Block               | Defect-2 cases: `.tsx`, `index.ts`, unresolved; also sibling UI components |
| `shared-feature-back-import`  | Shared → any feature                                                | Block               | One positive, one shared→shared negative                                   |
| `stable-interface-allowed`    | Feature UI → sibling resolved non-index `.ts` stable                | Allow               | Positive; assert no violation                                              |
| `same-feature-import`         | Same-feature import, except projection→UI                           | Allow               | Positive; assert no violation                                              |
| `shared-target-allowed`       | UI or projection → shared                                           | Allow               | Positive; assert no violation                                              |
| —                             | Type-only relative import                                           | Same as target rule | A prohibited type-only import must still block                             |
| —                             | Literal `import('...')` or no-substitution template                 | Same as static      | Assert specifier and line                                                  |
| `dynamic-import-unresolved`   | `import(expression)`                                                | Diagnostic          | One positive; excluded from blocking totals                                |
| —                             | Test file import                                                    | Excluded            | Separate `testImports` count; assert exclusion                             |
| `ui-domain-import`            | UI → domain                                                         | Diagnostic          | One positive; excluded from blocking totals                                |
| —                             | Bare or external package                                            | Ignore              | Assert ignored                                                             |

`sibling-feature-deep-import` is the ID named by the correction spec and must be
preserved. Other IDs are proposed canonical names; if a recovered artifact uses
different names, the recovered names win.

Worked examples at `dc29694c` (static inspection, not classifier output):

| Import                                                                                   | Expected                            |
| ---------------------------------------------------------------------------------------- | ----------------------------------- |
| `src/features/dashboard/OperationsReportPanel.tsx:14` → `../report/operationsReportView` | Allow (`stable-interface-allowed`)  |
| `src/features/cases/caseIntelProjection.ts:2` → `../intel/intelView`                     | Block (`projection-sibling-import`) |
| `src/features/factions/factionView.ts:5` → `../dashboard/eventFeedView`                  | Block (`projection-sibling-import`) |
| `src/features/agents/hooks/useTabRegistry.ts:2` → `../tabs/VitalsTab`                    | Allow (`same-feature-import`)       |
| `src/app/store/gameStore.test.ts:20` → `../../features/operations/frontDeskChoices`      | Excluded (`testImports`)            |

The new inventory is expected to differ from the lost 19; that is accepted by
D10 and is not evidence of a defect.

## Parser and resolution contract

- Parse with `ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind)`,
  using `.tsx` for `.tsx` files.
- Visit `ImportDeclaration` and `ExportDeclaration` string module specifiers,
  plus `CallExpression` nodes whose expression is `ts.SyntaxKind.ImportKeyword`
  with a `StringLiteral` or `NoSubstitutionTemplateLiteral`.
- Lines come from
  `getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1`.
- Preserve source order; one record per import expression; do not deduplicate.
- Inert strings, templates, JSX text, regex literals, comments, and nested
  templates produce nothing. A real `import()` inside `${...}` produces one
  record.
- Resolution uses the virtual `fileExists` seam; fixtures must not read the real
  checkout. Unresolved sibling targets are classified lexically and remain
  blocking for `sibling-feature-deep-import`.
- Correction-spec target anchors: `test/importBoundaryClassifier.ts:29-30`,
  `:153-220`, `:195-206`, `:207-216`, `:226-242`; defect 2 at `:50-64`,
  `:66-83`. These are the lost spec's anchors and must be preserved when the
  classifier is re-authored.

The legacy test's regex is at `test/boundary-enforcement.test.ts:11`, with
`isProjectionInterfaceImport` and `isInternalFeatureImport` implementing the
current partial allowance. The replacement must not preserve the regex as the
classification mechanism.

## Diagnostics, inventory, and baseline

Every finding carries
`{ file, line, specifier, ruleId, sourceKind, targetKind, resolvedTarget, mode }`,
with repo-relative `/` paths, sorted by file, line, specifier. Modes: `block`,
`allow`, `diagnostic`, `ignore`, `excluded`.
`inventoryImportBoundaryViolations(root)` returns the blocking set; the test
also computes the full finding set and a
`{ blocking, diagnostic, testImports, unresolved, byRule }` summary.

Test assertions: exact fixture equality on rule ID, line, specifier, mode, and
resolved target; two consecutive inventory runs are deeply equal; every
production finding has a known rule ID; no fixed global count and no 19-count
assertion.

Baseline record: the planning slice doc lists every blocking production finding
at the implementation revision — file, line, specifier, rule, resolved target,
and disposition (`unresolved prohibited`, never waived). If the set is empty,
record the revision and command. The doc states the original artifact was lost
and this is a new baseline, not recovery.

## Validation and acceptance

Node 22 (SPE-3438 evidence uses 22.23.4), `npm ci` from the existing lockfile,
no dependency changes.

```bash
npm run test:run -- test/boundary-enforcement.test.ts
npm run lint
npm run format:check
npm run build
npm run verify:requirements -- --base origin/main
git diff --check
```

Mandatory D9 typecheck, because `npm run build` does not cover `test/**`:

```bash
npx tsc --noEmit --strict --skipLibCheck --target ES2022 \
  --module ESNext --moduleResolution bundler --allowImportingTsExtensions \
  --verbatimModuleSyntax --moduleDetection force \
  --forceConsistentCasingInFileNames --noUnusedLocals --noUnusedParameters \
  --erasableSyntaxOnly --types node,vitest/globals \
  test/importBoundaryClassifier.ts test/importBoundaryFixtures.ts \
  test/boundary-enforcement.test.ts
```

An independent reviewer who did not author the change must review the full diff,
rerun the targeted test and typecheck, and verify no fixture was weakened and no
production finding was suppressed. No enforcement hookup, ESLint rule, CI
validator, or SPE-3348 selection change is permitted.

This documentation VM cannot run acceptance: Node `26.13.0` only and no
`node_modules`. The docs-only PR can be checked with Prettier and the repository
handoff validators; no code, test, or build result is claimed here.

## Stop conditions

Stop if:

- a usable recovered patch or classifier appears;
- the matrix conflicts with the 21:55 spec or `docs/dependency-boundaries.md`;
- any production finding is unclassified;
- the baseline exceeds the recorded inventory without explanation;
- Node 22 or the explicit typecheck cannot be run;
- a later instruction contradicts the decision recorded in comment `590ccce2`.

## Current state and next action

- Linear: SPE-3437 **In Progress**; SPE-3434 **Backlog**.
- Main baseline: `dc29694c`; legacy `test/boundary-enforcement.test.ts` is 73
  lines and only checks bare sibling imports.
- This PR adds only this decision/recovery record. It creates no implementation
  branch and changes no code.
- Implementation follows when the authorized implementation actor picks up
  SPE-3437 under this recorded scope. Freebuff remains read-only for code and
  will review the resulting full diff.
