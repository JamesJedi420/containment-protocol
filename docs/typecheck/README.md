# TypeScript diagnostic census — SPE-3376

Owner: [SPE-3376](https://linear.app/spectranoir/issue/SPE-3376). Recovery parent: [SPE-3375](https://linear.app/spectranoir/issue/SPE-3375).

## Capture and compare

Use Node 22 and the committed lockfile (`npm ci`). Run:

```sh
node scripts/report-typecheck.mjs
node --test scripts/typecheck-census.test.mjs
```

The report command runs the existing TypeScript solution build twice with `--pretty false --force`. It writes each compiler transcript and `census.json` under ignored `.tmp/typecheck-census/`; `--output` accepts another ignored directory. A red compiler result remains a nonzero command result: exit 2 is expected for the recorded baseline. The command does not run Vite after failed TypeScript checks, change compiler settings, or activate a production-build CI gate.

The collector fails on unparsed output, ambiguous file/project attribution, unexpected compiler process failure, checkout changes during capture, or unequal repeated runs. Project ownership comes from the referenced tsconfig file lists. The current two-project layout has no overlapping roots. Newly overlapping/import-only roots require explicit attribution support; do not silently assign them to a project.

`identity` is SHA-256 of JSON `[project, file, code, completeMessage]`. It ignores coordinates for comparison across line movement. Every occurrence retains line and column; repeated fingerprints are **not** discarded. `compareCensuses` compares fingerprint multiplicities, not sets. The same fingerprint at a different location is not proof of the same causal defect. Message changes appear as removals/additions, not automatically as fixes/regressions. Historical archives used different identity rules; compare raw evidence before claiming a historical identity delta.

Compiler transcripts preserve exact bytes (including Windows CRLF) using a narrowly scoped Git attribute. JSON is normalized for review. Package-lock and transcript hashes describe captured bytes, not a platform-independent dependency identity. Node, TypeScript, platform, revision, and working-tree status accompany every capture.

The required `typecheck-census-tests` validator tests reporting integrity only. SPE-3348 retains production-build enforcement authority.

## Advisory CI budget (Phase 0)

`docs/typecheck/budget.json` records the 681-occurrence / 466-fingerprint baseline at revision `1108c4b…`. The `typecheck` validator is registered as **advisory**: CI publishes the census on application, shared-config, and census-tooling changes without blocking on the red baseline. The [TypeScript debt triage](../typescript-debt-triage.md) proposes a later enforcement phase; it does not authorize that change. SPE-3348 retains validation-orchestration authority. Reporting integrity remains enforced by `typecheck-census-tests`.

The advisory command is `node scripts/typecheck-advisory.mjs`. It delegates capture to `scripts/report-typecheck.mjs`, prints the counts and top files, compares them with the budget, and exits nonzero only when capture or budget parsing fails.

## Verified baseline: 41873280

Captured November 2, 2026 against `4187328072490639bfab16fbfb530a60fa067678` using Node **22.23.4**, TypeScript **6.0.3**, Windows x64, and `npm ci --ignore-scripts`. Node was downloaded from the official distribution and verified against its published SHA-256. No dependency versions changed. Compiler inputs (`src`, tsconfigs, package/lockfile, Vite config) match that commit; the working-tree status records the reporting-only changes present at capture time.

| Evidence                                                       |                                               Result |
| -------------------------------------------------------------- | ---------------------------------------------------: |
| Forced runs                                                    | 2, byte-identical transcripts; both compiler exits 2 |
| Diagnostic occurrences                                         |                                                  681 |
| Files                                                          |                                                  178 |
| Location-independent fingerprints                              |                                                  466 |
| Repeated fingerprint occurrences                               |                                                  215 |
| Exact duplicate occurrences (same fingerprint and coordinates) |                                                    0 |
| Production-source occurrences                                  |                                                  218 |
| Test/fixture occurrences                                       |                                                  463 |
| `tsconfig.app.json`                                            |                                                  681 |
| `tsconfig.node.json`                                           |                                                    0 |
| Unparsed records                                               |                      0; capture fails if encountered |

All current diagnostic paths are in the CP application source tree. The repair program is shared-system tooling; no Academy-specific source/configuration was observed in this census. This does not establish Academy implementation completeness.

Evidence: [compiler transcript](41873280/compiler.txt), [normalized census and hashes](41873280/census.json). The committed integrity test reparses the transcript and reconciles every record, summary count, and both run hashes.

The latest SPE-3376 F-cluster merge comment reports 681 / 178 on the same commit; this capture confirms that count. Older counts (including 673, 685, and 744) describe different revisions and are preserved as historical evidence, not a current regression calculation.

## Initial inspected repair partition (superseded by complete partition)

These are evidence-backed cohorts, not guaranteed repair deltas. Existing remediation children remain subject to their prerequisite and implementation-authorization rules. No remediation issue is created or unblocked by this report.

| Existing owner | Current cohort                                                                                                                                     | Occurrences | Cause and causal confidence                                                                                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPE-3442       | `events.producerValidation.test.ts`                                                                                                                |          68 | Generic `createFactoryDraft<TType>` loses payload/type correlation across its switch. Repeated return/argument failures share the dispatcher; projected cascade reduction remains unmeasured.                                                                                         |
| SPE-3443       | `hiddenStateModality.test.ts`                                                                                                                      |          40 | Readonly scouting inputs conflict with mutable consumer contracts. Keep production semantics and readonly guarantees; do not remove readonly solely to compile.                                                                                                                       |
| SPE-3444       | Three originally captured workshop fixtures plus `departmentLocalStaging.contract.test.ts` and `facilitySectionStagingProjection.contract.test.ts` |          61 | `withoutMappedArchiveAnalystPersonnel` constrains agents with a broad index signature, rejecting canonical Agent and losing full GameState inference. The original 47 plus 14 additional consumer occurrences share that helper; attributable reduction needs an isolated repair run. |
| SPE-3450       | `protocols.ts`                                                                                                                                     |           7 | `Pick<GameState['agency'], ...>` selects keys from an optional union; `never` keys and downstream filter/implicit-any failures follow. Independent from event/scouting cohorts.                                                                                                       |
| SPE-3448       | `volatileActionPhasePipeline.ts`                                                                                                                   |          12 | Exhaustive branches access `.kind` after narrowing the whole value to `never`; paired property/assignment diagnostics at the exhausted branches.                                                                                                                                      |
| SPE-3454       | `affiliationPersonStatusWeeklyProgression.ts`                                                                                                      |           8 | Writes to readonly evidence fields through an accumulator. Preserve readonly output and evidence semantics.                                                                                                                                                                           |
| SPE-3455       | `hiddenStateActivationAuthoring.ts`                                                                                                                |           8 | Incremental writes into readonly trigger/output shapes. Construction typing requires a bounded repair, not relaxed canonical contracts.                                                                                                                                               |
| SPE-3456       | `authorityGraphPersistence.ts`                                                                                                                     |           5 | Unknown persisted enum values reach string-only Set membership checks. Preserve fail-closed runtime validation.                                                                                                                                                                       |

The initial pass covered **209 occurrences**. The [complete provisional partition](partition.md) now assigns every one of the 681 occurrences, including the other 472, with code authority, owner disposition and cascade assessment. The following paragraph records the earlier partial-pass limit.

At that initial pass, these eight cohorts covered **209 occurrences**. The other **472 remained outside the inspected partition**; the census retains their exact files, coordinates, codes, and complete messages. They are not silently assigned to the nearest folder or treated as one repair. Other existing children SPE-3446/3447/3449/3453 were available for scope reconciliation; their existence alone does not attribute every remaining diagnostic.

## Semantic questions found during inspection

- `missionIntakeRouting.ts:1331–1332`: duplicate `lastCandidateTeamIds` / `lastRejectedTeamIds` assignments. The earlier rejected-team value is an ID array; the later value is rejected-team records. Removing a duplicate chooses runtime behavior. Reconcile the canonical routing contract before repair; do not categorize both TS1117 diagnostics as harmless cleanup.
- `divisionMetrics.ts:41–46`: consumers read `availabilityState` and `deployable`, while `AgentReadinessProfile` exposes `state`, `band`, `deploymentEligible`, `recoveryRequired`, and `riskFlags`. Determine whether legacy compatibility is intended before deleting checks or expanding the model.
- `weeklyReportInvariants.ts:33–46`: code reads/writes `weeklyReportIntegrityIssues`, absent from GameState. Establish intended state/persistence ownership before adding a field or removing behavior.
- `advanceWeek.ts`: its local `WeeklyCaseResolutionStrategy` omits `terminalDisposition` already present in the canonical `caseResolutionOrchestration.ts` contract. This is a candidate local-contract drift cluster, distinct from the routing and report-state semantic questions above.

These observations are provisional evidence under SPE-3376, not new approved repair scope or canonical gameplay decisions. The reporting script deliberately does not infer root cause from error code alone.

## Partition completion and recovery status

See [the complete provisional partition](partition.md), [machine-readable assignments](partition.json), and [fresh main verification](verification-1108c4b9.json). Every occurrence is assigned exactly once. The 472 previously unpartitioned diagnostics now have explicit provisional causes or semantic-review questions.

SPE-3376 is ready for completion only after this partition is reviewed and merged. SPE-3375 remains Backlog: the build is still red and all repairs require their normal approved boundaries. No repair children or relationships are created or changed. Semantic decisions and measured repair deltas remain outstanding in the recovery program.

The prior Chromium duplicate buildReportCaseSnapshots startup failure is historical: existing harness documentation records its removal, and this compiler transcript does not reproduce that declaration. No new browser verification is claimed.
