# SPE-3751 — Playwright and Lucide maintenance

## Approved boundary and sequence

James explicitly approved one shared-system Containment Protocol Tooling / Developer
Experience owner for existing PRs #4987 and #4986. Codex executes; James Dye is the
human assignee. SPE-3751 stays In Progress until both upgrades ship and main syncs.
SPE-3737 stays Done; SPE-3745 retains its separate minimatch/zod acceptance.

Starting main: `78cab65c1272f3ee0d5b881b4d5a6cf9edab541a`. First repair #4987,
original head `0e6727a8afe30ca85fd8855e367b3eb478a12167`, preserving
`@playwright/test`, `playwright` and `playwright-core` 1.65.0 → 1.65.1. Restore only
the exact existing nested Prisma/config `magicast` 0.3.5 lock entry. The original
PR deletes it and fails CI's Node 22/npm 10.9.9 scripts-disabled clean installation.
No package regeneration or unrelated resolved-version change is needed.

After review, CI, merge, main sync and closeout, refresh #4986, original head
`c88b2567fcab9cd9de6259dc5a699c89d5073cf2`, preserving only `lucide-react`
1.72.0 → 1.73.0. Explicitly retain the nested entry: its stale branch could delete
it again without a conflict. Recheck author/competing activity before each repair.

## Security evidence and bounded dispositions — 2026-11-14

Sonatype exact-version retrieval failed for exhausted credits; no retry, purchase
or scan pass is claimed. The fallback in `docs/dependency-review-policy.md` applies.
Official old/new tarballs match the exact lock SHA-512 values. All four proposed
package versions had no OSV matches. Isolated resolved-lock metadata audits of
main and restored-entry proposals returned zero findings using existing Node 22
and npm 10.9.8; those are not npm 10.9.9 installation evidence.

Licenses/notices are unchanged: Playwright Apache-2.0 with bundled notices, Lucide
ISC plus MIT Feather attribution. Registry publish/SLSA subject digests match the
tarballs and identify official upstream workflows. Independent signature checking
was not claimed during inspection; installation signature checking is a shipping
checkpoint. Exact official sources are the [Playwright release](https://github.com/microsoft/playwright/releases/tag/v1.65.1)
and [Lucide release](https://github.com/lucide-icons/lucide/releases/tag/1.73.0).

Current OSV/GitHub review of 164 unchanged bundled Playwright identities finds
**nine matches: eight medium, one low**. Zero lockfile findings do not clear them.
The following dispositions concern only this repository's existing test usage:

| Exact bundled identity  | Advisory                                                                 | Applicability evidence                                                                                    |
| ----------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| hono 4.13.12            | [GHSA-3gg2-335m-rxc6](https://github.com/advisories/GHSA-3gg2-335m-rxc6) | Affected CSS helper absent from bundle.                                                                   |
| hono 4.13.12            | [GHSA-46wx-v44x-9hh2](https://github.com/advisories/GHSA-46wx-v44x-9hh2) | Affected csrf middleware absent.                                                                          |
| hono 4.13.12            | [GHSA-4h7h-rv7c-7m2v](https://github.com/advisories/GHSA-4h7h-rv7c-7m2v) | Affected form validator absent.                                                                           |
| hono 4.13.12            | [GHSA-4m76-xfj5-7975](https://github.com/advisories/GHSA-4m76-xfj5-7975) | Affected mount/base/router absent.                                                                        |
| hono 4.13.12            | [GHSA-h7mg-cq63-vhpq](https://github.com/advisories/GHSA-h7mg-cq63-vhpq) | Affected RegExpRouter absent.                                                                             |
| @hono/node-server 2.1.5 | [GHSA-jpvv-r467-5p4w](https://github.com/advisories/GHSA-jpvv-r467-5p4w) | Proxy/path-rule prerequisite absent from configured localhost Vite harness.                               |
| @hono/node-server 2.1.5 | [GHSA-qv5m-9pm6-hqp3](https://github.com/advisories/GHSA-qv5m-9pm6-hqp3) | Async server WebSocket upgrade use outside configured harness.                                            |
| ip-address 10.7.2       | [GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5) | Observed SOCKS Address6 calls guarded by Node net.isIPv6; no proxy configured.                            |
| minimatch 10.2.5        | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Affected optimizationLevel ≥2/attacker-pattern prerequisites absent; default 1, repo-controlled patterns. |

In exact `playwright-core` 1.65.1 tarball `lib/utilsBundle.js`, IPv6 guards are at
10142/10361/10736, optimization defaults at 51433/51692, request adapter at 90775
and SDK HTTP transport at 91768. Only Hono's websocket helper is included, not the
five affected APIs. `utilsBundle.js` and `serverRegistry.js` are byte-identical to
1.65.0. Repository `playwright.config.ts` and `playwright.errors.config.ts` bind
Vite to 127.0.0.1, with no exposed MCP HTTP service, reverse proxy or remote
WebSocket service introduced. No material new exposure is established for this
bounded use; vendor records remain unresolved, and no general security guarantee
or permission to expose those server/proxy features follows. Contrary material
evidence must hold the affected action for a separate scoped decision.

The complete published per-advisory rationale is on SPE-3751 and both PRs. Detailed
host-local inspection artifacts are under
`C:/Users/james/.codex/reviews/dependency-fallback-4986-4987/`; these are evidence
locators, not public downloads. No new override or bundled-vendor patch is in scope.

## Validation and exclusions

Use existing Node 22/npm 10.9.9 for scripts-disabled clean install. Run current
required validators, full tests, literal build with truthful baseline accounting,
and actual isolated headless Chromium campaign/error checks. Playwright changes
Chromium r1254/158.0.8127.18 to r1255/159.0.8154.6, so old-browser results cannot
substitute. Lucide's static AST comparison found three added icons, no changed or
removed existing icons/exports and an unchanged runtime preamble.

Six direct audit passes cover scope/deltas, install/compatibility edges,
deterministic and persistent consumers, regression, documentation and cleanup.
External worker dispatch is excluded. Independent exact-final-head review and
green CI precede each normal merge. Record actual results in the PR and owner.

No source/UI/gameplay/schema change, unrelated package refresh, compiler cleanup,
CI/security policy change, force push, paid tool change, desktop/active-browser
control, Freebuff/Codebuff or parallel implementation. Preserve other workers,
Cursor SPE-2226, Grok work and all other existing issue boundaries. No in-boundary
deferral is authorized merely to call a failed check complete.

## Playwright local checkpoint

Node 22.23.5/npm 10.9.9 `npm ci --ignore-scripts` passed (354 installed,
zero lock audit findings). `npm audit --json` also exited 0. Signature checking
verified 360 registry signatures and 164 attestations. Chromium/headless shell
r1255 was installed into an isolated host-local browser cache.

Required backlog handoff, lint and Vite bundle passed. Literal `npm run build`
exits 2 with 27 baseline diagnostics; both compiler censuses report the same 27.
No application or test source changes are included, and compiler success is not
claimed. Repository-wide formatting remains advisory; broad cleanup is excluded.

The initial full strict-console/forks run executed 11,447 tests and failed only
the existing App navigation test's return-to-Cases heading wait at
`src/app/App.test.tsx:384`. No source, assertion, timeout or retry setting changed.
The isolated App file passed all 44 tests. The complete strict-console/forks rerun
with `--maxWorkers=2` then passed all **11,447 tests / 1,050 files**; the unchanged
completeness guard confirmed 1,050 expected/observed and zero failed suites.
The first failure is retained as observed timing-sensitive validation evidence,
not a claimed fixed application defect. Fresh final-head CI remains mandatory.

Additional exact 1.65.1 execution-chain anchors: `playwright/lib/program.js:38-55`
registers ordinary test execution; `:128-144` starts the separate MCP command.
`playwright/lib/cli/testActions.js:60-91` selects UI mode only for explicit UI
options, otherwise running tests normally. The approved headless test invocation
does not activate those MCP/UI server commands. This further bounds the server
advisory dispositions; general server use is not approved.

Evidence logs under `C:/Users/james/.codex/reviews/` use the
`spe3751-playwright-` prefix: `install.log`, `signatures.log`, `audit.json`,
`required.log`, `literal-build.log`, `app-recheck-corrected.log` and
`full-recheck.log`. Browser execution and exact-head review/CI are pending at this
checkpoint; SPE-3751 stays In Progress until both authorized portions ship.

The subsequent actual headless browser run passed all 51 campaign checks (6.5m)
and five error checks (19.0s), without retries. A separate headless version probe
confirmed Chromium **159.0.8154.6** from the isolated r1255 cache. No user's active
browser or desktop was controlled. Browser logs use `browser.log` and
`runtime-version.log` with the same evidence prefix. The intentional harness and
error-reporting fixture exceptions are expected passing assertions, not hidden
application failures.

The six direct pre-ship audit passes are complete: exact authorized dependency
graph and shared owner; restored-peer/install/version edges; unchanged deterministic
and persistent consumers; full guarded tests and actual browser regressions;
accurate schema-free documentation/security evidence; minimal diff and touched-file
formatting. No assertion, timeout, validator, policy or unrelated dependency change.
Final committed-head independent review and hosted CI remain mandatory before
normal merge; the first portion does not complete the two-PR issue.
