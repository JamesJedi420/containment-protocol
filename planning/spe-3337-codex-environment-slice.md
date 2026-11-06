# SPE-3337 Slice B — Codex local environment and Copilot profile

| Field      | Value                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linear     | [SPE-3337 — Approved implementation session continuity](https://linear.app/spectranoir/issue/SPE-3337/approved-implementation-session-continuity) |
| **Status** | **In Progress**                                                                                                                                   |
| Ownership  | Shared-system-owned; Containment Protocol Tooling / Developer Experience                                                                          |
| Branch     | `codex/spe-3337-environment-adapter`                                                                                                              |
| Base main  | `c395192309b1ed2b129d9ebe39a785e68e2dc983`                                                                                                        |
| Dependency | Slice A merged in [PR #4630](https://github.com/JamesJedi420/containment-protocol/pull/4630)                                                      |
| Delivery   | Second approved non-child slice; partial parent delivery                                                                                          |

## Boundary

Configure fresh Codex managed-worktree setup and bounded project actions through the app-generated `.codex` local environment. Reuse the existing Node 22, npm lockfile, scripts, session preflight and SPE-3348 resolver. Correct the existing GitHub Copilot profile's frontmatter, target and applicability. Keep focused tests and affected operator guidance in this boundary.

Excluded: gameplay, GameState, player UI, new dependency managers or runtime services, required secrets/environment variables, ignored-file copying, `.worktreeinclude`, `.agents/skills` migration, queues/selectors, a new Linear transport, lifecycle writers, new authority, and the parent's still-outstanding original handoff/provenance/MCP diagnostic work.

The user authorized continuing the shipping loop on 2026-11-06. The fresh named-task preflight returned `ready` with no reasons in the actual app-created managed worktree at the recorded base; source-attributed Linear remained In Progress, GitHub had no open PRs and local/remote main matched. Workstream is shared-system. No child, relationship or priority change was made.

## Implementation

- `scripts/codex-environment.mjs`: finite operation allowlist; Node 22 guard; npm CLI resolved beside the trusted current runtime; lockfile setup with lifecycle scripts disabled; inherited terminal/standard input and truthful exit propagation. No shell-built commands or replacement readiness evaluator.
- Existing fixed-path process helper: include the directory of the current Node executable, preserving the chosen Node runtime for nested validators while retaining a fixed executable search path.
- `.github/agents/codex.agent.md`: three-hyphen frontmatter, explicit Copilot target and CP Sim Engine display name; domain/store specialist restrictions remain local to the Copilot profile.
- `.codex/**` classified as tooling; required adapter/profile contract checks and existing preflight selected for affected configuration paths.
- Existing handoff/capability docs and queue projection synchronized with this slice.

## Acceptance evidence and pending gates

| Criterion                                  | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App-generated environment file             | Human-generated starter found at `C:/Projects/containment-protocol/.codex/environments/environment.toml`; original preserved. Owned copy retains generated version/table/string structure and configures existing adapter setup plus four Windows actions.                                                                                                                                                                                     |
| Fresh managed-worktree setup under Node 22 | Actual app-managed worktree created; existing locked dependency installation completed under Node 22.23.4 through the adapter, with `--ignore-scripts`, exit 0.                                                                                                                                                                                                                                                                                |
| Runtime identity across actions            | Reproduced parent v22.23.4 launching child v24.18.0 through the existing fixed-path helper; after the narrow fix, parent and child both report v22.23.4. Regression covers actual child execution.                                                                                                                                                                                                                                             |
| Bounded actions and failure reporting      | Native tests cover existing command references, runtime/npm absence, Windows PATH casing, POSIX layout, unsupported/extra arguments, child exits/errors/signals and preflight stdin delegation. The real helper development action returned HTTP 200 with all observed Node processes using Node 22. The real preflight action rejected a dirty, non-detached start with exit 1 and the expected reason codes. No app button click is claimed. |
| Copilot profile                            | Physical profile and adversarial four-hyphen/duplicate/unsupported-target cases covered.                                                                                                                                                                                                                                                                                                                                                       |
| Focused validation                         | The final configuration-inclusive selected run passed all five required validators: backlog-handoff, codex-environment (14 native tests), lint, requirements-model-tests (55 tests) and session-preflight (39 tests). Earlier focused runs are retained as historical evidence. Repository-wide formatting remains an advisory failure.                                                                                                        |
| Fresh setup/actions from final environment | Configured setup passed under Node 22.23.4. Development command returned HTTP 200 and its owned terminal process was stopped. Stdin preflight returned blocked/exit 1 for the dirty checkout as expected. Four action references and failure paths pass 14 native tests. No app button execution or new full Vitest run is claimed.                                                                                                            |
| Independent review and CI                  | Final environment-inclusive independent review and hosted CI remain pending. The generated artifact blocker is resolved; draft remains open until those gates pass.                                                                                                                                                                                                                                                                            |

The literal production command `npm run build` also passed with the shell and npm runtime pinned to Node 22.23.4. This is build/adapter evidence, not gameplay or app-button observation.

## Dependency baseline

No dependency or lockfile version changed. Fresh setup reported 10 moderate audit entries rooted in existing `minimatch@10.2.5` via the lint toolchain. Sonatype exact-version analysis and recommendations were attempted first and rejected for exhausted credits; neither is counted as a completed scan. The documented fallback uses the saved `npm audit --json` output and [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249), whose affected range includes that version and whose patched release is 11.0.1. These baseline findings remain unresolved; this slice does not introduce versions, broaden tool privileges, or perform upgrades. Setup success is not security clearance.

## Execution limitation

The app identifies as ChatGPT. The installed Computer Use skill prohibits automating that app's UI, and the available app connector has no local-environment editor. The human was asked to generate a starter through settings in this managed worktree. The human generated the starter in the original checkout; its original contents are preserved. Screenshots verified the current Windows path is Settings → Worktrees → Environments. The artifact blocker is resolved; app button execution is still not claimed.

Hermes mapping session `local-46ccf0cc88bd9f43e5192e1d610416ae2be7047c5a4ee6b9c80f53bc42e7b473` returned useful source references but also unsupported configuration paths, an incorrect mandatory-target claim and incorrect validator-change restrictions. Those suggestions were rejected against the actual source/approved issue and official docs; bounded direct fallback used. Usage was not returned; no savings claim. Freebuff remains off.

## Completion and continuation

Ship only after the generated environment, final managed-worktree setup/actions smoke, focused tests, selected validators and independent full-diff review pass. SPE-3337 remains In Progress until its complete original handoff/provenance and MCP diagnostic acceptance also passes. Do not infer parent Done from this slice or its eventual merge.

Related approved work may continue after merge closeout and fresh checks under manual section 2; this record grants no selection, approval or mutation authority.
