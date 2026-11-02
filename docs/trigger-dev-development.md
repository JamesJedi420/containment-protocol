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

The exported `helloWorldTask` logs a message, waits five seconds through
Trigger.dev, and returns the message. An optional `message` payload overrides
the default greeting. The configured task runtime is Node 22.

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
