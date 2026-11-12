# Literal-context repair evidence — SPE-3375

The human explicitly approved this four-root mechanical cohort on November 3, 2026. Children **SPE-3538–SPE-3541** were created In Progress before source edits.
The ordered phase and ownership review is recorded on SPE-3375 in comment
`8512e8f9-047e-4797-baf7-9612cda38044`. Historical completed owners remain Done.

## Measured result

Clean synchronized main `0a092029c685cbefe7b3a87bc60b3b72e391294d` reproduces the
last import cohort's **395 occurrences / 280 identities / 138 files**, with no
identity-multiset difference. Two forced Node 22.23.4 / TypeScript 6.0.3 runs
before and two after the final source edits each agree exactly within their pair.

The after-state has **388 occurrences / 273 identities / 137 files**: seven
production-source removals, zero additions, 138 production and 250 test-fixture
occurrences remaining. All four compiler invocations exit 2. This is partial
recovery; it does not satisfy the full repository build acceptance.

The allocation diagnostic differs from the older 409-occurrence reconciliation
snapshot only in the compiler-rendered ordering of the same six action literals.
Its explicit identity mapping verifies the complete messages otherwise match.
The fresh 395-occurrence baseline already contains this ordering; the prior
context change is not counted as a removal by this cohort.

| Child    | Reconciliation root           | Measured removals |
| -------- | ----------------------------- | ----------------: |
| SPE-3538 | allocation-literal-inference  |                 1 |
| SPE-3539 | grade-visibility-inference    |                 2 |
| SPE-3540 | fallout-literal-inference     |                 3 |
| SPE-3541 | candidate-potential-inference |                 1 |

## Contracts and artifacts

The allocation sanitizer uses `ProcurementAllocationPacket | undefined`;
production grade reconciliation uses the existing grade-field `Pick` from
`ProductionQueueEntry`; fallout reconciliation uses its canonical event payload
without `week` and `institutionKey`; the frozen candidate object uses
`satisfies Candidate`. Necessary imports are type-only.

- [delta.json](delta.json) binds each root to its exact removed diagnostics,
  canonical contract, tests and captured source/emitted-JavaScript hashes.
- [before/census.json](before/census.json) and [census.json](census.json) retain
  revision, clean/dirty state, compiler inputs, lockfile hash and both run hashes.
- [before/compiler.txt](before/compiler.txt) and [compiler.txt](compiler.txt)
  preserve the raw transcripts, one copy per identical pair.

All three edited files emit byte-identical JavaScript with TypeScript 6.0.3,
ES2022/ESNext and `verbatimModuleSyntax`. Every runtime expression, literal,
fallback, branch and freeze is preserved. No dependency, schema, compiler-policy
or browser behavior change is included. The after-census records the baseline
HEAD plus three dirty source paths, rather than claiming those edits were already
committed. Final PR/CI evidence belongs on the PR and children.

The integrity test checks raw hashes, normalized multiplicities, per-root
historical provenance, unchanged test-fixture diagnostics and all 99 retained
semantic-review occurrences. Remaining repairs are outside this cohort.

## Validation

Five existing targeted suites passed **470 tests**, using Node 22.23.4 and the
repository's forks script with two workers. They cover hydration, fabrication
grade snapshots, emergency procurement and affiliation repair/decision behavior.
Full local lint and Vite bundling passed; the existing bundle-size warning remains.
Additional literal-build, evidence/document checks, independent review and hosted
regression results are recorded in the recovery slice and PR.

Literal `npm run build` exits **2** with the same 388 normalized diagnostic
occurrences; Vite does not execute after that compiler failure.
[execution.json](execution.json) binds the separate [build.txt](build.txt)
transcript using an LF-normalized hash. The integrity test checks it against the
paired after-census. All 14 evidence-integrity tests and the audit-index,
backlog-handoff and theme-contract validators pass. SPE-3348 selects backlog
handoff, lint, census tests, full unit tests and Vite bundling; the full unit run
will be supplied by exact-head hosted CI rather than inferred from targeted tests.

The first test command was rejected before execution because it supplied two pool
options; the repository's `test:run:ci` command then passed. A preliminary after
capture was stopped after its first 388-diagnostic run to format new annotations;
the final two-run pair above supersedes it. Neither incomplete attempt is counted
as completed validation. Whole-file formatter drift in `runTransfer.ts` predates
this cohort; its untouched body is preserved. The other two source files pass
Prettier.
