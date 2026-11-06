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

## Executed snapshot at `de3f1eb6`

The separate [executed snapshot](../planning/spe-3352-release-evidence.de3f1eb6.v1.json) assesses full revision `de3f1eb6caa90be0b87d5e20297dd3d190500e0a`. Its [execution index](../planning/release-evidence/de3f1eb6/execution-index.json) records the clean-checkout provenance, commands, environment, results and SHA-256 references to retained host-local artifacts. The original bootstrap remains unchanged. Neither snapshot automatically advances with HEAD.

```text
node scripts/release-acceptance/report.mjs --manifest planning/spe-3352-release-evidence.de3f1eb6.v1.json --format json
node scripts/release-acceptance/report.mjs --manifest planning/spe-3352-release-evidence.de3f1eb6.v1.json --format markdown
```

This snapshot is **blocked** by its actual required unit-test failure: 999 files passed and one failed; 10,849 tests passed and one failed. The unchanged Agency-route maintenance-package test also failed in a separate four-test diagnostic run. Its cause and authoritative subsystem repair owner remain unverified. The reporter retains registry owner SPE-10 on the validator row; that organizational container is not proof of repair ownership, and AC08 remains unavailable.

The other four required validators passed, including all 14 Chromium tests with no retries and the Vite bundle. The standalone full production build exited 2 with 409 TypeScript error lines; SPE-3375 retains remediation ownership. The advisory census command passed by successfully publishing those diagnostics, while repository formatting failed as an advisory check. These results are distinct.

The [browser observations](../planning/release-evidence/de3f1eb6/browser-observations.json) retain connected replay and support attachments. Their assertions cover visible outcomes and selected carryover only. The support screenshot retains the previously documented partial-group/Resolved snapshot-label limitation. Broader canonical replay, whole-report equality, human evidence, thresholds and all eight owner dimensions remain unavailable. No exception is approved here.

The committed validator JSON is a formatted copy of the actual execution report for the historical change set from `265cf70b` to `de3f1eb6`; it is not a release-wide validator census. Artifact `revision` fields identify what was tested, even though these evidence files are published in a later commit. Publication checks assess that later diff separately and do not overwrite the pinned execution.

The bootstrap manifest deliberately assesses `265cf70ba2c6d14c5a583ba512333fff1e409736`, the main commit before this implementation. Running it on a later checkout still reports that snapshot. It does not automatically assess HEAD or current main. The CLI reads SPE-3348's registry from that exact commit using `git show`, without a shell, rather than reading a potentially changed working-tree registry. It reuses the repository's fixed-search-path spawn helper and requires an absolute Git executable; ambient PATH entries cannot supply Git. Registry lookup has a 15-second timeout; a timeout returns exit 2 through the same error path as unavailable history. Missing Git in the helper's supported install locations or missing Git history is an error; use an existing supported Git installation and fetch the intended commit through the normal repository workflow before retrying.

## Evidence contract v1

Top-level fields are `schemaVersion: 1`, `owner: "SPE-3352"`, `subjectRevision` (full lowercase 40-character Git SHA), `assessments` (array), and optional `validation` (null or the wrapper below). The twelve original issue acceptance criteria, seven controlled campaign comparisons and eight required owner dimensions have stable IDs in `CRITERIA` in the reporter. The separate `full-build` row belongs to SPE-3375. Omitted assessments remain visible as unavailable; unknown or duplicate IDs are rejected.

### Controlled campaign comparisons

These rows map to SPE-3352's approved **CP-wide emergent-story integrity — controlled campaign trajectories** requirements. Each remains owned by SPE-3352 for evidence aggregation; gameplay implementation and remediation stay with the authoritative subsystem owner named in the evidence.

| Stable ID                 | Required comparison evidence                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `comparison-intervention` | Legitimate intervention versus inaction or another supported choice, with causal differences only where the scenario supports them.                                                                          |
| `comparison-incidents`    | Existing incident activation, coexistence, exclusion, collision, deferral or expiry affects subsequent operational state; no artificial crisis is required.                                                  |
| `comparison-information`  | Changed discovery or information access preserves established history and distinguishes world truth, assessment, public belief and player knowledge.                                                         |
| `comparison-delayed`      | A relevant action, inaction or independent event causes a later consequential difference through existing owners.                                                                                            |
| `comparison-quiet`        | A supported low-crisis or no-new-major-incident interval retains ordinary decisions and independent world activity without forced drama.                                                                     |
| `comparison-divergence`   | Canonical outputs and downstream decisions differ causally where appropriate; legitimate convergence and irrelevant changes do not force divergence.                                                         |
| `comparison-continuity`   | Identical authoritative inputs reproduce outcomes, and each compared campaign preserves its own history, information, event identity and durable consequences across applicable reloads without duplication. |

Paired evidence must identify shared seeded/authored pre-campaign history, rules/configuration and applicable initial state, plus the single causally meaningful varied input. Reuse existing fixtures and SPE-2251 baseline evidence. This mapping introduces no new narrative engine, mandatory escalation, terminal-success state or Academy acceptance requirement.

The schema-v1 input shape is unchanged. Older manifests still parse, but current reporter output adds these seven rows as `unavailable-evidence` when omitted; a fully assessed original-only manifest is now `incomplete`. Historical manifests and their recorded execution counts remain unchanged. Running the current reporter evaluates the snapshot against this expanded criterion catalog; use the historical reporter revision to reproduce its original row set. Adding rows does not execute comparisons, refresh old evidence or establish that any comparison passed. Failure, exception, applicability and revision rules below apply equally to these rows.

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

For a parseable execution artifact, also set the existing `VALIDATION_JSON_ISOLATE=1` environment switch: the runner then sends captured child stdout/stderr to stderr, keeping its own stdout JSON clean. Use `--ci` for registered CI-shaped invocations and `CI=true` for the browser harness's isolated server behavior. Preserve the process exit code separately; a valid JSON report can contain required failures.

Required/advisory enforcement is recomputed from `report.files` and the subject commit's canonical registry. Supplied `ok`, `requiredIds`, `missingRequired`, result enforcement and excluded-result lists cannot suppress required rows. Duplicate/unselected validator results and unknown statuses are rejected. Missing, unavailable, selected-only and skipped executions remain unavailable, including skipped exceptions: validator-waiver policy is not added in v1. Historical execution reports cannot pass current rows.

Current policy distinguishes required `vite-build` (`build:bundle`) from advisory `typecheck`. `npm run build` includes `tsc -b` and is a separate observation. Passing Vite never proves a green full build. If an approved future registry selects the full build as required and its current result fails, this reporter classifies it as release-blocking. SPE-3348 retains policy authority; SPE-3375 retains build remediation.

## Read the summary

`blocked` means at least one release-blocking failure exists. Otherwise any unavailable row yields `incomplete`. Only fully assessed inputs yield `satisfied-for-declared-scope`; this is subject to all listed warnings, approved exceptions, applicability decisions and evidence limits. None of these labels closes SPE-3352, proves Milestone 2, or declares the whole release ready.

The report retains every source revision and scope, historical observed results, missing evidence, remediation owners, warnings and approval references in both formats. Every row includes its canonical owner issue URL even when evidence is unavailable; failures also include a remediation issue URL. Rows, evidence entries and JSON keys are deterministically ordered. Runtime timestamps and host paths are not generated. The bootstrap has no accepted exceptions, no current execution report and no invented performance thresholds. Its report stays incomplete. Fixtures remain independently executable through their existing Vitest/Playwright harnesses; their prior evidence is not rerun by generation.
