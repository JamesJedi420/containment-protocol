# SPE-3745 Dependency Advisory Disposition

## Current main verification (2026-11-15, SHA 642a1fda66e16408faa7e32d16c30871ef11f1f7)

### minimatch

- Override in package.json: `"minimatch": "11.0.5"`
- Lockfile node_modules/minimatch: version 11.0.5
- Advisory GHSA-g3hv-75wg-m249 affects ranges >=7.0.0 <11.0.1
- Disposition: remediated by exact override to 11.0.5 (post-vulnerable range)

### zod

- Override in package.json: `"zod": "4.6.7"`
- Lockfile node_modules/zod: version 4.6.7
- [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) affects versions below 4.6.6; the first patched version is 4.6.6. The resolved 4.6.7 copy is outside that range. The GHSA is the canonical advisory identity used here.
- [GHSA-m95q-7qp3-xv42 / CVE-2023-4316](https://github.com/advisories/GHSA-m95q-7qp3-xv42) affects versions at or below 3.22.2; the first patched version is 3.22.3. The resolved 4.6.7 copy is outside that range.
- Disposition: these two advisories do not affect the identified lockfile-resolved 4.6.7 copy. This is version applicability evidence, not a claim that all bundled copies or repository execution paths are cleared.

## Validation

- package.json and package-lock.json already reflect the overrides
- Fresh evidence query on 2026-11-15: Sonatype `getComponentVersion` for `pkg:npm/minimatch@11.0.5` and `pkg:npm/zod@4.6.7` returned insufficient credits; it did not pass. The existing dependency-review fallback was used without purchasing credits.
- `npm audit --package-lock-only --ignore-scripts --json` exited 0 with zero reported vulnerabilities for the resolved lockfile (403 dependency entries). No dependencies were installed or changed by this query.
- GitHub Advisory Database queries on the same date verified the three advisory records above and exact-version `affects` searches for `zod@4.6.7` and `minimatch@11.0.5` returned no matches. GitHub and npm evidence can overlap; these are not independent proofs of safety.
- `package-lock.json` contains one resolved minimatch copy (11.0.5, development-only) and one resolved zod copy (4.6.7, not development-only). These observations do not inventory code embedded inside other packages.
- No additional lockfile change is indicated for those identified copies and advisories. This documentation PR does not prove compatibility of the earlier major minimatch override or satisfy the issue's full validation acceptance.
- Current bundled-copy evidence is reusable from [SPE-3751's exact-version inspection](https://github.com/JamesJedi420/containment-protocol/blob/642a1fda66e16408faa7e32d16c30871ef11f1f7/planning/spe-3751-dependency-maintenance-slice.md#L38-L66): Playwright 1.65.1 bundles minimatch 10.2.5, which remains in GHSA-g3hv-75wg-m249's affected range. That inspection records default optimization level 1, repository-controlled patterns and no attacker-pattern path in the approved headless harness; it also records bundle files byte-identical to 1.65.0. This is a bounded execution-chain disposition, not a patched vendor copy or a blanket clearance. This documentation PR inspected the existing evidence, not a new tarball reproduction.
- Residual: SPE-3745 must reconcile that existing bundled-copy evidence and the earlier major override's compatibility against its full acceptance. No new risk acceptance, dependency upgrade or permission to expose Playwright's server features is asserted here.
- Local documentation checks use Node 24 because Node 22 is not available in this shell. Required supported-environment checks must be taken from the exact-head GitHub CI run, which uses Node 22.

## Next

Merge only as partial documentation evidence after independent review and exact-head CI. Keep SPE-3745 open until its current bundled-copy, compatibility and full acceptance requirements are verified. This PR changes no package, lockfile, runtime behavior, policy or lifecycle state.

## Final assessment — 2026-11-16

Receiving actor: Codex/Cursor within the existing SPE-3745 shared-system dependency
remediation boundary. Source revision: `75b52faa4cf65cc9115fc8c218309bc11b293bcf`.
The preceding dated checkpoint is historical; the evidence below resolves its
remaining compatibility and bundled-copy assessment. Completion remains conditional
on independent final-diff review, required validation, merge and lifecycle readback.
No dependency, override, lockfile, runtime or CI-policy change is proposed.

### Bundled minimatch disposition

The current [upstream advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
requires attacker-controlled patterns and `optimizationLevel >= 2` to enter
`firstPhasePreProcess` and the subsequent pairwise processing. The installed
Playwright 1.65.1 copy is still version 10.2.5 and remains within the advisory's
package-version range. Its code has not been patched by the root override.

For this repository's configured use, the vulnerable execution path is
**demonstrably non-applicable**:

- `playwright/lib/util.js:97-125` and `playwright/lib/common/index.js:330-356`
  compile configured string patterns with only `nocase: true, dot: true`.
  The runner applies these to `testMatch` and `testIgnore` at
  `playwright/lib/runner/index.js:2315-2316`. CLI file filters are converted to
  RegExp by `forceRegExp`, rather than supplied as minimatch patterns.
- The second copy in `playwright/lib/transform/esmLoader.js:7682` calls minimatch
  with the same options. The preprocessing implementations in that loader and
  `playwright-core/lib/utilsBundle.js` are identical. Both select default level 1
  (respectively lines 7064 and 51433), leaving the affected level-2 branch unused.
  These are installed-package line anchors at the source revision above.
- `scripts/spe3745-minimatch-assessment.mjs` invokes Playwright's real
  `createFileMatcher` and instruments the exported bundled class: all three
  configured pattern forms compile at level 1 and enter the affected branch zero times;
  an explicit level-2 positive control enters it. The test also compares both
  preprocessing implementations. It runs no amplification/DoS payload.
- The repository's Playwright configurations contain committed pattern literals,
  use the existing headless harness, and do not expose a player/network pattern
  input or enable optimization level 2. No higher-level override of that option
  was found in the inspected Playwright call chain. Reuse the detailed
  [SPE-3751 execution-chain evidence](spe-3751-dependency-maintenance-slice.md).

This is an applicability disposition for the inspected configuration, not risk
acceptance for executing the vulnerable branch or a vendor-wide clearance.
Reassess if patterns, matching options, Playwright versions or execution modes
change. No Playwright upgrade, vendor patch or new service exposure is needed to
satisfy this issue's current bounded outcome.

The installed license/notice inventory also identifies Prettier's bundled
minimatch 11.0.6 (`prettier/THIRD-PARTY-NOTICES.md:5462`) and Playwright core's
bundled zod 4.6.7 (`playwright-core/lib/utilsBundle.js.LICENSE:86`). Both are
outside the identified advisory ranges. The assessment checks those notice
identities as well as both Playwright minimatch sidecars; the root lockfile has
one resolved minimatch 11.0.5 and one resolved zod 4.6.7.

### Root override compatibility

`minimatch@11.0.5` still resolves for ESLint's helper, `@eslint/config-array` and
TypeScript-ESLint's project-service matcher. The latter is not enabled by the
current ESLint config; its `dot: true` matching form was nevertheless included.
The actual consumers use `Minimatch`, `.match(path)`, `.match(path, true)` or the
`minimatch` function, with the options inspected in their installed source.

The assessment compares CJS and ESM 11.0.5 exports with the exact upstream
10.2.6 reference accepted by ESLint's pre-override range. The reference tarball's
SHA-512 matches official npm metadata; its repository is `isaacs/minimatch`,
license BlueOak-1.0.0, and it uses the already installed brace-expansion 5.0.12.
This affected reference is used only for bounded default-level comparisons in
an ignored local evidence directory; it is not adopted into the dependency graph.

At the initial source revision the corpus contains 3,607 tracked paths plus 151
directory prefixes, the nine flattened lint-config patterns, default lint/CLI
patterns and additional probes. Five option sets cover dotfiles, negation,
case-insensitivity, partial directory traversal and POSIX/Windows behavior.
The first run produced **1,409,250 actual-pattern/path comparisons with no
differences**. Counts grow when this assessment script becomes tracked; its JSON
output is the exact run evidence, rather than a fixed coverage requirement.
The final staged-file run produced 2,076,250 comparisons in total, including
1,409,625 actual-pattern/path comparisons with no differences; its three real
Playwright matcher calls observed levels `[1, 1, 1]` and the level-2 positive
control entered the affected branch as expected.

The broader probes deliberately retain a real major-version difference:
`src/**/../*.ts` against `src/a/../b.ts` with partial matching returns false in
10.2.6 and true in 11.0.5. It is reported, not discarded or counted as parity.
That pattern is absent from this repository's configured scope and ESLint
normalizes traversed paths before matching. The comparison establishes bounded
repository compatibility, not universal equivalence of the major versions.
The real full-repository lint run is also required; helper comparisons alone do
not establish that lint still selects and checks the application.

To reproduce after a scripts-disabled install, obtain and inspect the official
`minimatch-10.2.6.tgz` reference from npm, verify its registry SHA-512, and extract
it into `node_modules/.spe3745/minimatch10` (not over the installed package). Run
with Node 22 from the repository root:

```text
node scripts/spe3745-minimatch-assessment.mjs
```

This is an on-demand dated assessment, not a registered CI gate or dependency
policy. No script downloads, installs, rewrites dependencies or modifies the
bundle on disk. Its temporary instrumentation is restored in `finally`.
The reference location is fixed under that ignored directory; the tool accepts
no path argument. JSON uses aggregate counts and numeric probe case identifiers,
rather than logging repository path or configuration-pattern inventories. Git
enumeration uses the existing fixed-path process helper. Successful assertions
remain mandatory, and output results are derived from observed counters.

### Validation and remaining closeout

- Sonatype remains unavailable for insufficient credits as recorded earlier in
  this chat. No repeated exhausted call, credit purchase or passing scan is claimed.
  The existing dependency-review fallback applies; no new package is adopted.
- The current GHSA records above and both zod records were retrieved again on
  2026-11-16. The root minimatch 11.0.5 and zod 4.6.7 copies remain outside their
  identified affected ranges. The baseline lockfile audit reports zero known
  vulnerabilities; that result does not inventory embedded package code.
- Node 22.23.5 / npm 10.9.9 scripts-disabled clean installation passes. The literal
  TypeScript + Vite production build passes, retaining the existing chunk warning.
  The 207 focused event-schema tests pass with strict test-console checking.
- Final full-suite, lint, requirement selection, independent review and shipping
  results are recorded in the PR and on SPE-3745 before Done. The baseline's
  successful Node 22 CI run is
  [43945996508](https://github.com/JamesJedi420/containment-protocol/actions/runs/43945996508);
  its advisory formatting check failed, so no universal formatting pass is claimed.
- The final changed-path requirement selection requires `backlog-handoff` and
  `lint`; both pass locally on Node 22. The existing repository-wide format check
  remains advisory and reports 3,558 pre-existing file failures. The two changed
  files pass their focused formatting check. No requirement is weakened or added.
- The original `C:/Projects/containment-protocol` checkout and all 41 original
  modified/untracked files are preserved. Its unrelated MongoDB/wiki-audit
  proposal and missing-magicast lockfile regression are not imported into the
  clean baseline. No in-boundary implementation fix is indicated by the assessed
  consumers; new CI policies and unrelated dependency maintenance remain excluded.
