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
