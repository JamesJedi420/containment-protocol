# Trigger.dev development

Trigger.dev project `proj_nqtjupmbfusgzufhnobk` runs the standalone developer
smoke task in `src/trigger/example.ts`. It is independent of the browser game,
simulation, store, and CI. Ownership: SPE-3516.

## Run locally

1. Install dependencies with `npm ci`.
2. If authentication is needed, the human runs `npx trigger.dev@4.8.3 login`.
3. Run `npx trigger.dev@4.8.3 dev` and keep the worker running.
4. In another terminal, run:

   ```sh
   npx trigger.dev@4.8.3 tasks trigger hello-world --payload '{}' --wait --timeout 60
   ```

Use Node 22 and npm 10.9.9, matching CI, when regenerating the lockfile.
Newer npm versions can omit an optional peer entry that npm 10 requires during
`npm ci`; retain the nested Prisma/c12 `magicast@0.3.5` lock entry.

The exported `helloWorldTask` logs a message, waits five seconds through
Trigger.dev, and returns the message. An optional `message` payload overrides
the default greeting. Missing or null payloads use the default greeting.
The configured task runtime is Node 22.

The [development dashboard](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/test?environment=dev)
lists `hello-world` while the worker is connected. CLI authentication is
sufficient for this workflow. If an SDK caller is added later, obtain the
development `TRIGGER_SECRET_KEY` from the human and store it only in the ignored
`.env`; never expose it through a `VITE_` variable or browser code.

SDK and build packages are pinned together to `4.8.3` because the CLI rejects
caret ranges during its compatibility check. Check matching package and CLI
versions with Sonatype before future upgrades. Generated `.trigger` files are
ignored by Git and ESLint.

## Verified development run

On 2026-11-02, worker `20261102.1` registered `hello-world` and
[run_06gpnrvi6cq5hc6fhpdmifcma2](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/runs/run_06gpnrvi6cq5hc6fhpdmifcma2)
completed successfully in 5.01 seconds.

After patching dependencies and reinstalling, worker `20261102.3` registered the
same task and
[run_06gpo0vn8afcedkvb9bfdus9a2](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/runs/run_06gpo0vn8afcedkvb9bfdus9a2)
completed in 5.01 seconds with the default greeting.

## Dependency compatibility checks

The initial installation exposed high-severity advisories in `deepmerge-ts`
and `zod`, plus a TypeScript peer mismatch. Sonatype-reviewed npm overrides
resolve these without changing the application compiler:

- `zod` is pinned to `4.6.7`, which also patches the existing lint tooling's
  shared dependency. Its consumers accept Zod 4.
- Only the build package's Prisma config receives `deepmerge-ts@8.0.2`.
  This crosses a major version, so the compatibility check exercises Prisma's
  actual TypeScript config loader with schema and migration paths.
- Only the build package's `tsconfck` peer resolution references `$typescript`.
  The repository remains on TypeScript 6.0.3. This is a locally validated
  compatibility override; upstream still declares optional TypeScript 5 support.
  The check exercises Trigger.dev's decorator build extension, including config
  parsing and metadata emission through the repository compiler.

Run `npm run verify:trigger-compatibility` after changing these overrides.
Reassess them when upgrading Trigger.dev and remove them when upstream provides
compatible patched dependencies. Do not use `--force` or `--legacy-peer-deps`.

A clean `npm ci` succeeds without peer-resolution warnings. On 2026-11-02,
`npm audit` reports zero high or critical advisories; the 13 moderate advisories
also exist in the unchanged main lockfile. Upstream deprecation notices for
`tsconfck`, OpenTelemetry trace packages, and `prom-client` remain. Replacing
those APIs belongs upstream and is outside this isolated setup.

## Simulation experiments (SPE-3521)

`cp-simulation-experiment` is a Development-only, read-only-to-production batch
task. Its sole fixture, `starter-no-commands` at `spe-3521.v1`, creates fresh
in-memory starter campaigns with the existing `createRunFromCurrentConfig`
helper and advances them through `advanceWeek` without player commands. The
fixture is deliberately small; it is not one of the pressure-validation
scenarios and does not apply SPE-3397 scenario directives.

The initializer applies each requested seed to both `rngSeed` and `rngState`.
`runSimulationValidationScenario` still has no seed parameter.
`launchIsolatedScenario` creates an isolated configuration packet, not a
multiweek `GameState`; the experiment does not pretend otherwise. Existing
`buildCurrentSimulationPressureSummary` observations supply the report metrics.
No domain mechanics, RNG implementation or telemetry definitions are added.

### Development invocation

Use Node 22. Start from a clean committed checkout and restart the development
worker after committing. A build extension captures the actual Git commit and
dirty flag in the worker bundle. Missing, dirty or mismatched build identity
fails closed, without loading the simulation. A commit supplied by the caller
alone is never evidence of the worker revision. A change from the captured Git
identity fails a watch rebuild before publishing it; restart the worker after
editing/committing instead of allowing changed code to retain clean provenance.

1. Run `node --experimental-strip-types scripts/prepare-simulation-experiment.mjs`.
   This prints a bounded example payload and its canonical idempotency key;
   it does not submit anything or read credentials.
2. Save the printed `payload` object to an ignored file such as
   `.trigger/experiment-request.json`. Keep the printed `idempotencyKey`.
3. Start `npx trigger.dev@4.8.3 dev --branch spe-3521-experiments` in that checkout.
   The separate Development branch preserves any existing default worker.
   Wait for registration.
4. Invoke the task using the existing CLI login:

   ```sh
   npx trigger.dev@4.8.3 tasks trigger cp-simulation-experiment --env dev --branch spe-3521-experiments --payload-file .trigger/experiment-request.json --idempotency-key <printed-key> --ttl 5m --wait --timeout 90
   ```

Repeat the same command to retrieve the original run rather than submit duplicate
work. SDK callers must use `experimentIdempotencyKey(payload)` as their trigger
option. Direct dashboard submissions do not enforce payload deduplication.
Idempotency is provided by Trigger.dev's trigger API, not a local process cache;
its [default key retention is 30 days](https://trigger.dev/docs/idempotency).
A failed run retains its key too. Use the
dashboard's explicit replay operation for an intentional rerun after diagnosing
an infrastructure failure; do not promise automatic retry of failed computations.

### Contract, limits and outcomes

All fields are required; unknown fields are rejected before bootstrap imports.
The example contains `fixture`, `version`, full 40-character `commit`, `seeds`,
`weeks`, `budgetMs`, `concurrency`, `maxAttempts`, and `replay`.

- Seeds: one to eight distinct integers in `[1, 4294967295]`, sorted for execution
  and idempotency. Zero/negative/fractional aliases are rejected rather than
  silently normalized into another experiment.
- Weeks: one to four per seed, stopping at canonical game-over. Each seed is
  executed twice, so the maximum batch is 64 week transitions.
- Concurrency: exactly one seed at a time, with a task queue concurrency of one.
- Budget: 1–30,000 milliseconds shared across imports, seeds and replay passes.
  Cooperative checks run between canonical operations. A synchronous operation
  can overrun that deadline; the platform's 60-second compute limit is the outer
  stop. Cancellation is checked between operations, with event-loop yields.
- Attempts: exactly one. The simulation has no transient remote operation to
  retry; invariant errors, invalid requests and unavailable capabilities are never
  retried. Idempotent submission may be retried safely after transport failure.
- Replay: `same-commit` compares SHA-256 fingerprints of the full JSON state
  after two independent executions. This proves only the observed same-commit
  run; it does not promise cross-version replay, call-order isolation or scoped
  stochastic identities. `scoped` fails with `replay_unavailable`, owned by
  SPE-3162. A differing repeat fingerprint also returns `replay_unavailable`.

Reports contain task/run identity, build commit, normalized request, requested
and actually initialized seeds, completed seed observations and fingerprints.
If a seed is initialized and later fails, it remains in `executedSeeds` but has
no completed result. Reports distinguish `success`, `invalid_input`,
`missing_capability`, `replay_unavailable`, `invariant_failure`,
`infrastructure_failure`, `budget_exhausted`, and `cancelled`.
Non-success reports are serialized into an `AbortTaskRunError`, so the dashboard
shows a failed run and the CLI exits unsuccessfully. Hard platform timeout,
cancellation or worker death can prevent a report; inspect the dashboard status
and run ID in those cases. Platform [hard stops do not guarantee cleanup hooks](https://trigger.dev/docs/runs/max-duration).

### Isolation and confidentiality

No request accepts campaign data, arbitrary configuration, commands, file paths
or credentials. The runtime uses fresh disposable state, never `gameStore`,
Zustand, `localStorage`, save import/export or campaign writes. No state is cached
or written to disk, so normal return, failure and process termination leave no
experiment save to clean up. The canonical initializer resides in `runTransfer`
but does not invoke its persistence/import functions.

The [Development worker runs locally](https://trigger.dev/docs/how-it-works); Trigger.dev receives task metadata,
synthetic request parameters, numeric summaries, digests and failure reports.
Full state, authored case/agent text and raw domain exceptions are not emitted.
These digests and metrics are still external experiment evidence. Development
is not an offline environment; use the project's existing access controls and
never submit private saves or sensitive payloads through the dashboard, which
can retain input before the task validates it. Production/staging execution is
rejected. This slice does not authorize deployment, schedules or a source/lore
upload to a third-party worker.

### Verification

Run focused tests for `src/tooling/simulationExperiment.test.ts` and
`src/tooling/simulationExperimentTask.test.ts`, then
`npm run verify:trigger-compatibility` and the existing requirements selector.
The Node test blocks browser globals, checks fresh-state isolation across runs,
proves seed application and replay, and exercises malformed/unavailable inputs,
budgets, cancellation, failure classification and idempotency construction.
`src/tooling/simulationExperimentBuild.test.ts` verifies stale identity rejection
on watch rebuilds, mid-build edits and missing Git provenance.

Preflight at main `30e3f92441cf818d832aed819ef8ce4424bce8bb` on Node 22.23.4
executed seeds 11, 22, 11 for two weeks. Seed 11 repeated the full-state digest
`9b9574cc947a8c88ab679ffc1cffcde3f7505e5c7097544eb11ff798946fe4b2`;
seed 22 produced
`ae4650540de3653ae5ea3bb6acf87f4aff0c15b36ba23b48944526f3573df729`.
This is local preflight evidence, not a Trigger.dev integration run.

Development integration on 2026-11-03 UTC used clean commit
`78aa6c874c5989d665335c24f2ef263c20d090d0`, Node 22.23.4 and worker
`20261103.2` on branch `spe-3521-experiments`. The successful run completed in
1.17 seconds with requested and executed seeds `[11, 22]`, two weeks each,
and matching independent replay fingerprints. Its complete compact output is
recorded in [the evidence JSON](evidence/spe-3521-development-run.json).

| Check                | Run ID                                                                                                                                | Observed result                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Seeded proof         | [run_06gptqivct049ghrindpb9ava2](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/runs/run_06gptqivct049ghrindpb9ava2) | `success`; both seeds executed and replay matched                        |
| Duplicate submission | Same run as above                                                                                                                     | CLI returned the existing run for the canonical key; no second execution |
| Scoped replay        | [run_06gptqus6umgf83a7u6rrs72a2](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/runs/run_06gptqus6umgf83a7u6rrs72a2) | `replay_unavailable`; no executed seeds                                  |
| 1 ms budget          | [run_06gptr03jml2ngov8o683u9ka2](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/runs/run_06gptr03jml2ngov8o683u9ka2) | `budget_exhausted`; no executed seeds                                    |
| Malformed payload    | [run_06gpti92a4k8pao51lucaho5a2](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/runs/run_06gpti92a4k8pao51lucaho5a2) | `invalid_input`; no executed seeds                                       |
| Uncommitted build    | [run_06gptjpcrb1l84hdg308ubl6a2](https://cloud.trigger.dev/projects/v3/proj_nqtjupmbfusgzufhnobk/runs/run_06gptjpcrb1l84hdg308ubl6a2) | `missing_capability`; no executed seeds                                  |

The last two checks preceded the clean commit. All rejected runs were visibly
failed with computational retries skipped. Seed 11 ended at week 3 with seven
unresolved cases and no game-over; seed 22 ended at week 3 with nine unresolved
cases and canonical game-over. Their full-state digests match the preflight
values above. These observations demonstrate seed diversity, not balance quality
or cross-version replay guarantees.
