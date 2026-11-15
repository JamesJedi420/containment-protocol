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
- Prior evidence indicated non-applicability or resolved for identified paths
- Disposition: pinned to 4.6.7; no residual applicable advisory identified in current lock

## Validation
- package.json and package-lock.json already reflect the overrides
- No further dependency changes required for these two advisories
- Residual: bundled copies in transitive packages (e.g. Playwright) remain as previously documented non-applicable for repo-controlled patterns

## Next
Independent review by Codex/Cursor to confirm CI and merge if accepted.
