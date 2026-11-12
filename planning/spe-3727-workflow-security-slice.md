# SPE-3726 / SPE-3727 — dependency review fallback and workflow security

Owners: [SPE-3726](https://linear.app/spectranoir/issue/SPE-3726) (policy) and
[SPE-3727](https://linear.app/spectranoir/issue/SPE-3727) (workflow repair).
Base: `73197ec5b56719d410f12b81a396c9dee1c8a4dd`.
Branch: `codex/sonatype-fallback-workflow-security`.

The user expressly authorized revising the mandatory Sonatype requirement then
resuming PR 2. That instruction authorizes this continuation after PR 1 and the
policy prerequisite in this bounded PR. Both standalone shared-system boundaries
are recorded In Progress; admission/design, decomposition and contradiction
review were applied under that explicit authorization. Completed recovery issues
stay closed. Two existing unrelated feature PRs remain untouched.

## Policy prerequisite

`docs/dependency-review-policy.md` replaces vendor-only blocking with required
evidence. Sonatype is preferred when available; missing credits, access, coverage
or cost suitability permit the documented fallback. Exact-version advisory
checks, provenance/integrity, license/maintenance and execution-chain inspection
remain required. Material unresolved findings still block dependency adoption;
no unavailable scan is a pass. This is not a general restriction on paid tools.
AGENTS, CLAUDE, Cursor, Amazon Q, plugin/manual and Hermes active mirrors link to
that policy. Historical records and host-installed skills are not rewritten.

## Exact workflow boundary

- AGP workflow default `contents: read`; gate gets read + OIDC; AGP retains its
  existing contents/PR writes + OIDC explicitly at job level.
- Three action references pin `204590723e731baef51c5467e7f6a1afeb1e12c6`.
- Both test jobs use `npm ci --ignore-scripts`; browser installation invokes the
  already installed Playwright CLI directly.
- The existing validation registry selects its browser gate as required when
  `.github/workflows/test.yml` changes. A focused selection test covers that path
  and an unrelated workflow control. This necessary validation detail ensures
  Ubuntu CI exercises the changed browser installer; no browser assertion or
  parallel gate is introduced. Its install hint uses the same installed CLI.
- Job IDs, audience, dispatch, concurrency, governed config and pause/fail-closed
  conditions remain unchanged. No runtime, schema, version or lockfile changes.

## Fallback evidence and disposition

Sonatype `getComponentVersion` for the exact GitHub commit returned insufficient
credits. Fallback authorized by the user and policy above was applied before
accepting the pin. Upstream was cloned without executing AGP; detached HEAD and
peeled `v1` both resolve to the exact approved commit. GitHub repository advisory
and global `ecosystem=actions&affects=sonatype/agp-action` queries returned zero
records. These are repository-level results, not commit-level scan clearance.

Inspected upstream sources at that commit:
`gate/action.yml:43-70`, `scripts/gate.sh:460-506`,
`scripts/mint-oidc-token.sh`, `scripts/prepare-auth.sh`,
`action.yml:87-136,175-224,264-275,379-415`, and README permission examples.
Gate audience remains `https://guide.sonatype.com`; governed config and token
broker use the existing Guide endpoints/override. Gate rejects non-200 config
responses and unsafe paths; only its `run` directive enables AGP. Upstream README
documents gate read/OIDC and AGP write/OIDC grants, matching this repair.

Limitations retained from existing use: default container `sonatype/agp:latest`
and nested action tags remain mutable; wrapper pinning does not pin these.
Repository metadata has no detected license and source headers reserve rights;
this review does not grant license clearance or introduce a new vendor use.
Upstream last push inspected was 2026-10-23. No AGP repair mode was invoked;
live authentication, governed service availability and container contents are
unverified. This is a least-privilege/immutable-wrapper hardening of unchanged
existing use, not approval of a new action, container or license.

Fresh Node 22 installation with scripts disabled succeeded. `npm audit --json`
reported ten moderate affected packages in the unchanged lint-tool chain,
including minimatch advisory GHSA-g3hv-75wg-m249; zero high/critical. No automatic
fix was run. The manifest/lockfile are byte-identical to base, so these are
baseline findings, not introduced dependencies. They remain recorded rather than
being called cleared or folded into this repair. Full fallback artifacts are
retained outside the repo and summarized on the owners/PR.

## Validation and shipping

Six passes cover scope, edge cases, deterministic state (no simulation edits),
regression/install behavior, active policy mirrors and cleanup. Workflow/parser
inspection, build, lint, selected repository validators and fresh Ubuntu Node 22
CI install/regression/browser/coverage provide execution evidence. WSL is absent
locally; Ubuntu proof comes from hosted CI, not a claimed local Linux run.

Hermes Policy Refinement/source review is read-only using configured local Qwen
3.5 9B; claims are verified by the coding agent. Small documentation/communication
checks run directly; frontend guidance is not applicable. After green independent
review/CI: merge, sync main, record truthful Linear evidence, run closeout
validators and mandatory Hermes Linear Hygiene. No next-slice coding in closeout.

Acceptance: all nine targeted workflow findings fixed and main new-code
reliability/security A; older findings, gates, thresholds and new-code period
unchanged. PR 1/SPE-3724 remains Done. Actual results are posted in PR/Linear.
