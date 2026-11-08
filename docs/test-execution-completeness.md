# Test-execution completeness (SPE-3427)

`npm run test:run:ci` runs the full Vitest suite **once** and then verifies that every
test file recorded in the reviewed inventory was actually collected and reported by
that run. A run that silently discovers fewer files, reports nothing, or never writes
results fails the guard instead of passing with a smaller test count.

This page is the operator procedure. The gate is implemented in
`scripts/test-execution-completeness/` and does not add a second suite, change the
Vitest configuration, `coverage:ci`, or coverage thresholds.

## What it does and does not prove

- **Proves:** each expected test file was collected and appears in the run's per-file
  JSON results, and no unreviewed test file was collected.
- **Does not prove:** that every test body executed. Vitest reports a file whose tests
  are all skipped as `status: "passed"` with exit code 0. The guard therefore certifies
  _collected and reported_, not _executed_, and it never derives completeness from a
  test count.
- **Does not prove:** that tests passed. A failing suite is reported by the runner and
  the guard preserves the runner's exit code; the guard only adds an accurate
  per-file diagnostic.

## Command

```bash
npm run test:run:ci                 # full suite + completeness gate (CI and local parity)
npm run verify:test-completeness    # unit fixtures for the evaluator itself (fast)
```

CI invokes this through the existing requirement resolver
(`npm run verify:requirements -- --ci --exclude=playwright-e2e`), which selects the
`unit-tests` validator and therefore `test:run:ci`. No workflow change is required.

### Subset runs

Passing file paths or narrowing flags (`--changed`, `-t`, `--testNamePattern`,
`--project`, `--dir`, `--exclude`, `--shard`) is a **subset run**: the suite runs, but
completeness is not evaluated and the run is labelled as such.

```bash
npm run test:run:ci -- src/test/math.test.ts      # local subset, no completeness claim
CI=true npm run test:run:ci -- src/test/math.test.ts   # fails: narrowed-run
```

Under `CI=true` any narrowing invocation fails closed, because the report itself cannot
distinguish "a repository with one test file" from "a filtered run"
(`filterMeta` is absent from the Vitest 5 JSON report).

## Inventory

`scripts/test-execution-completeness/test-file-inventory.v1.json` records, in sorted
order:

- `discovery.include` / `discovery.exclude` — the literal `test.include` and
  `test.exclude` arrays from `app.vite.config.ts`
- `files` — every expected test-file identity, repository-relative with POSIX
  separators

The inventory stores **identities, not outcomes**. Seeding it does not attest that any
test passed.

### Refreshing after an intentional change

1. Add, remove, rename or move test files as the task requires.
2. Run `node scripts/test-execution-completeness/run-ci-suite.mjs --update`. The
   inventory is rewritten from that run's report and the discovery contract.
3. Review the inventory diff. A move must show exactly one removal and one addition; a
   deletion must show the removed line; a new file must show the added line.
4. Commit the test change **and** the inventory change together. A test change without
   the inventory change fails the next run, which is the point.

`--update` refuses to write when the run reported no suites, when a suite path cannot be
normalized, or when the report contains duplicates. It exits 0 after writing even if
tests failed, and prints a note: a failing run still yields a complete file identity
set, but the failures must be fixed before the change is reviewed.

## Failure codes

| Code                       | Meaning                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `inventory-invalid`        | Missing/empty inventory, unknown keys, wrong `schemaVersion`, unsorted, duplicate, or non-normalized paths |
| `discovery-contract-drift` | `app.vite.config.ts` include/exclude literals no longer match the recorded contract                        |
| `empty-execution`          | The run reported zero suites (note: `--passWithNoTests` makes this exit 0 with `success: true`)            |
| `missing-expected-file`    | An expected file was not collected or not reported                                                         |
| `unreviewed-test-file`     | A discovered file is not in the inventory                                                                  |
| `report-malformed`         | No parsable report, partial report, duplicated suite entry, or `success: false` with no failed suite       |
| `suite-failed`             | A collected file failed; the runner's own message is quoted                                                |
| `narrowed-run`             | Narrowing flags or file filters were used under `CI=true`                                                  |

Exit codes: `0` complete, `1` completeness failure, `2` untrustworthy observation
(missing/malformed report, interruption, narrowed CI run). A genuine Vitest failure
keeps the runner's exit code.

## Recovery

- **"no report written"** — the suite was interrupted or the runner crashed before
  finishing. Re-run; do not treat the absence of a report as a pass.
- **`missing-expected-file` after an intentional delete/move** — run with `--update`,
  review the diff, commit it with the test change.
- **`unreviewed-test-file`** — a new test file exists but was not reviewed into the
  inventory. Either add it with `--update` or remove the file.
- **`discovery-contract-drift`** — `app.vite.config.ts` changed. If the change is
  intentional, refresh the inventory with `--update` so the new contract is recorded;
  otherwise revert the narrowing.
- **`narrowed-run` in CI** — the CI invocation must be the unfiltered full suite. Check
  the workflow for stray arguments.

## Platform notes

Report paths are absolute in Vitest 5 and are relativized against the repository root,
with both separators normalized, so a Windows checkout and a POSIX CI runner produce the
same identities. Windows separator handling is covered by unit fixtures; it has not been
observed on a real Windows runner.
