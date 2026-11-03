# CP-core release evidence (SPE-3352)

Generate a deterministic, reviewable acceptance matrix from an explicitly authored evidence snapshot. This command does not execute campaign fixtures, fetch Linear or CI artifacts, verify source contents, approve applicability or exceptions, or decide whole-release readiness. Review the evidence before publishing its results. SPE-3352 and Milestone 2 remain open.

## Run

Use Node 22 and an existing Git checkout containing the assessed commit. No package installation or environment variables are needed.

```text
node scripts/release-acceptance/report.mjs --manifest planning/spe-3352-release-evidence.v1.json --format json
node scripts/release-acceptance/report.mjs --manifest planning/spe-3352-release-evidence.v1.json --format markdown
node --test scripts/release-acceptance/report.test.mjs
```

Output goes to stdout; redirect each format to a separate artifact when needed. Default format is JSON. `--help` prints usage. Exit 0 means a valid report was generated, including an **incomplete** or **blocked** report. Exit 2 means invalid input, unreadable input, or an unavailable/invalid registry. This CLI is a reporting tool, not a new release or CI gate.

The bootstrap manifest deliberately assesses `265cf70ba2c6d14c5a583ba512333fff1e409736`, the main commit before this implementation. Running it on a later checkout still reports that snapshot. It does not automatically assess HEAD or current main. The CLI reads SPE-3348's registry from that exact commit using `git show`, without a shell, rather than reading a potentially changed working-tree registry. Missing Git history is an error; fetch the intended commit using the normal repository workflow before retrying.

## Evidence contract v1

Top-level fields are `schemaVersion: 1`, `owner: "SPE-3352"`, `subjectRevision` (full lowercase 40-character Git SHA), `assessments` (array), and optional `validation` (null or the wrapper below). The twelve issue acceptance criteria and eight required owner dimensions have stable IDs in `CRITERIA` in the reporter. The separate `full-build` row belongs to SPE-3375. Omitted assessments remain visible as unavailable; unknown or duplicate IDs are rejected.

Each assessment contains:

- `id`, `result`, and a nonempty `rationale`.
- `evidence`: an array of `{ source, revision, scope }`. Source is a reviewable URL or artifact reference, revision is the commit actually evidenced, and scope states exactly what that evidence establishes. Scope is reviewed prose, not an automatically verified assertion. Except for `unavailable`, results require at least one evidence entry.
- `remediationOwner`: an existing `SPE-*` owner when result is `fail`. The reporter validates syntax; the reviewer must verify ownership in Linear. Completed historical evidence owners are not reopened.
- `approval: { reference, reason }` when result is `accepted-exception`. The reference must identify explicit approval; supplying text does not confer approval. `not-applicable` also requires rationale and source evidence, including the authority for applicability.

Results map to `pass`, `release-blocking-failure`, `warning`, `accepted-exception`, `unavailable-evidence`, and `not-applicable`. `fail` blocks for the fixed acceptance criteria. The standalone full-build observation maps a current failure to a warning because it cannot independently grant required-validator authority. Required build failures from SPE-3348 are separately blocking validator rows.

Evidence from any different revision makes the assessment unavailable for the subject revision, while retaining the observed result, source, scope, owner and approval record. This is deliberately conservative: ancestry, an unchanged file, or a previously green CI job is not automatically a reconciled current result. To reconcile evidence, supply a reviewed result for the actual assessed revision with its traceable justification; do not relabel the original execution's revision. No age-based expiration or automatic waiver is invented.

## Consume SPE-3348 execution evidence

Capture the actual execution JSON, preserving its source artifact and assessed revision. Resolution-only and dry-run output are not execution evidence. Set `validation` to:

```json
{
  "revision": "<full commit actually tested>",
  "source": "<CI artifact or retained execution-report reference>",
  "report": {
    "policyOwner": "SPE-3348",
    "files": ["<actual declared change-set path>"],
    "results": [
      { "id": "<selected validator>", "status": "passed", "detail": "<invocation/result>" }
    ]
  }
}
```

Use the runner's full JSON report here; its additional fields are accepted. For example, retain stdout from `npm run verify:requirements -- --base <recorded-base> --json` with `--silent` passed to npm so npm's command banner does not enter the JSON. Preserve stderr separately. Review the declared changed files and any exclusions against the actual run. This reporter does not authenticate artifacts or infer a release-wide validator set from a narrow change set.

Required/advisory enforcement is recomputed from `report.files` and the subject commit's canonical registry. Supplied `ok`, `requiredIds`, `missingRequired`, result enforcement and excluded-result lists cannot suppress required rows. Duplicate/unselected validator results and unknown statuses are rejected. Missing, unavailable, selected-only and skipped executions remain unavailable, including skipped exceptions: validator-waiver policy is not added in v1. Historical execution reports cannot pass current rows.

Current policy distinguishes required `vite-build` (`build:bundle`) from advisory `typecheck`. `npm run build` includes `tsc -b` and is a separate observation. Passing Vite never proves a green full build. If an approved future registry selects the full build as required and its current result fails, this reporter classifies it as release-blocking. SPE-3348 retains policy authority; SPE-3375 retains build remediation.

## Read the summary

`blocked` means at least one release-blocking failure exists. Otherwise any unavailable row yields `incomplete`. Only fully assessed inputs yield `satisfied-for-declared-scope`; this is subject to all listed warnings, approved exceptions, applicability decisions and evidence limits. None of these labels closes SPE-3352, proves Milestone 2, or declares the whole release ready.

The report retains every source revision and scope, historical observed results, missing evidence, remediation owners, warnings and approval references in both formats. Every row includes its canonical owner issue URL even when evidence is unavailable; failures also include a remediation issue URL. Rows, evidence entries and JSON keys are deterministically ordered. Runtime timestamps and host paths are not generated. The bootstrap has no accepted exceptions, no current execution report and no invented performance thresholds. Its report stays incomplete. Fixtures remain independently executable through their existing Vitest/Playwright harnesses; their prior evidence is not rerun by generation.
