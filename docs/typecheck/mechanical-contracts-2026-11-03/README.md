# Mechanical production type contracts — SPE-3543 through SPE-3547

## Measured contribution

Clean synchronized main `ceb706637c96697eeae8c5d67d58acde2483ebfb` reproduces the
previous literal-context cohort's **388 occurrences / 273 identities / 137 files**.
Two forced Node 22.23.4 / TypeScript 6.0.3 compiles before and two after the five
approved annotation repairs agree exactly within each pair.

The after-state has **381 occurrences / 266 identities / 134 files**: seven
production-source removals and zero additions. All **250 test-fixture diagnostics**
and **99 semantic-review occurrences** remain unchanged by identity and multiplicity.
Each compiler exits 2. This is partial recovery; SPE-3375 remains In Progress and
SPE-2995 / PR #4634 retains its literal full-build acceptance hold.

| Child    | Reconciliation root          | Measured removals |
| -------- | ---------------------------- | ----------------: |
| SPE-3543 | candidate-source-disposition |                 3 |
| SPE-3544 | eligible-case-membership     |                 1 |
| SPE-3545 | institutional-flags-index    |                 1 |
| SPE-3546 | town-tags-readonly           |                 1 |
| SPE-3547 | store-inspection-drafts      |                 1 |

## Contracts and evidence

Candidate disposition uses `Candidate['sourceDisposition']`; queue membership uses
`readonly CaseStatus[]` while retaining only `open` and `in_progress`. The private
flag-counting helper accepts its actual `InstitutionalChannelFlags` input, and
the nonmutating town tag merge accepts readonly inner arrays. The inspection
accumulator explicitly admits the two existing factory return types.

All four source files emit byte-identical JavaScript with TypeScript 6.0.3,
ES2022/ESNext and `verbatimModuleSyntax`. Runtime expressions, validation, defaults,
iteration, event order, payloads and conditional appends are preserved. No public
API, persistence/schema, dependency, compiler-policy or browser behavior changes.

- [delta.json](delta.json) records per-child removals, canonical contracts, tests
  and before/after source and emitted-JavaScript hashes. Source hashes use UTF-8
  text normalized to LF; compiler captures retain their exact original bytes.
- [before/census.json](before/census.json) and [census.json](census.json) bind the
  revision, dirty state, compiler inputs, lockfile and two-run hashes to the raw
  [before](before/compiler.txt) and [after](compiler.txt) compiler transcripts.
- [execution.json](execution.json) binds a separate literal `npm run build`
  [transcript](build.txt); its diagnostic multiset must match the after-census.

The baseline diagnostic multiset equals the prior literal-context after-state.
Each removal belongs to its original reconciliation root without identity
rewriting or new historical mappings. Captures were made on stable inputs before
adding evidence/tests/docs; the after-census truthfully records the four dirty
source paths against baseline HEAD. Final PR/CI evidence is posted on the children
and parent, rather than represented as already committed in these captures.

## Validation and limits

Six targeted suites passed **556 tests** under Node 22.23.4, using the existing
forks script with two workers: hydration, save system, game-store inspection,
public signal coverage, information-intake integration and town contract generation.
The integrity test verifies raw captures, exact seven-root attribution, unchanged
fixtures/semantic obligations, runtime hashes and separate literal-build agreement.

Final lint, bundle, document validators, formatting, independent review, hosted
regression and Hermes checkpoint results belong in the recovery slice and PR.
Whole-file Prettier drift already exists in runTransfer, publicSignalCoverage and
townContractGeneration; preserve unrelated formatting. No clean dependency install
or security verdict is claimed: existing installed dependencies were reused with
the same lockfile. Frontend guidance, dependency selection and external research
are not applicable to this annotation-only cohort.
