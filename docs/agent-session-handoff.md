# Agent session handoff

Read [the Agent Operating Manual](agent-operating-manual.md) for the shared standing procedure. This page routes continuity evidence to the correct format; it grants no authority.

## Authority boundary

See manual §1 and [Cursor autonomous authority](cursor-autonomous-authority.md). A handoff does not supply missing approval or expand an issue. Linear owns approved scope/lifecycle; repository and GitHub evidence do not approve scope.

## Executable start/resume preflight

Before substantive implementation of an explicitly named approved boundary, use the [SPE-3337 session preflight](session-preflight.md). It evaluates source-attributed Linear, GitHub, and Git evidence and returns `ready`, `blocked`, or `unknown`.

Both `blocked` and `unknown` prohibit implementation. The preflight is read-only: it does not choose another issue, change lifecycle, reserve work, create a branch, or mutate a pull request. Local checkouts and Codex managed worktrees use separate branch-form checks while preserving the same current-base and one-active-slice policy.

A `ready` result does not itself move the issue In Progress. The authorized implementation agent performs the existing lifecycle action separately after the gate passes.

When transferring Linear connection observations, include the [versioned diagnostic metadata](session-preflight.md#optional-linear-connection-diagnostics). Revalidate the connection through an authorized read and refresh the issue evidence before relying on it. Preserve `unchecked` when no probe ran; a successful read never establishes write authority.

Carry sourced implementation-agent preferences using [designation provenance](session-preflight.md#optional-agent-designation-provenance). Preserve unknown historical timestamps, superseded records and conflicts; refresh the source before presenting a current preference. The preference remains nonexclusive and separate from human assignment, approval, executor acceptance and actual session activity. Optional unknown or stale designation evidence does not itself block authorized work.

Preserve [follow-up evidence](session-preflight.md#optional-follow-up-evidence) separately for verified in-boundary deferrals, new candidate discoveries and authorized-and-actually-applied scope. Record remaining acceptance and closure impact; shared ownership alone does not establish an in-boundary deferral. Keep pending Phase 1 candidates outside applied scope. Refresh authority/application observations through their existing owners, and retain unknown evidence without promoting it. The CLI's `--markdown` presentation derives from the same evaluated machine envelope and grants no authority.

## Codex local environment adapter

SPE-3337 Slice B uses an app-generated repository-local `.codex` environment file. The Windows app exposes the editor under Settings → Worktrees → Environments. The checked-in `.codex/environments/environment.toml` derives from the app-generated starter; setup invokes the adapter and four common actions are scoped to Windows (`win32`). Keep configuration changes synchronized with the focused contract tests. [Official local-environment documentation](https://learn.chatgpt.com/docs/environments/local-environment) describes setup on fresh managed worktrees and terminal actions. This adapter is tooling, not another authority or work-selection surface.

Select Node.js 22 in the shell used by the app before setup or actions run. The adapter rejects other Node majors and requires npm in the selected Node installation. It installs the existing lockfile with dependency lifecycle scripts disabled; it neither installs a runtime/version manager nor copies ignored files or secrets.

| Environment operation | Command                                        | Delegates to                                        |
| --------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Setup                 | `node scripts/codex-environment.mjs setup`     | `npm ci --ignore-scripts`                           |
| Development           | `node scripts/codex-environment.mjs dev`       | `npm run dev`                                       |
| Tests                 | `node scripts/codex-environment.mjs test`      | `npm run test:run:ci`                               |
| Required validation   | `node scripts/codex-environment.mjs validate`  | `npm run verify:requirements -- --base origin/main` |
| Named-task preflight  | `node scripts/codex-environment.mjs preflight` | `npm run session:preflight -- --collect-local`      |

Preflight still requires fresh, source-attributed evidence for an explicitly named approved task on standard input. For example, in PowerShell, pipe a verified external evidence file into the action:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding utf8 C:/private/session-preflight-input.json | node scripts/codex-environment.mjs preflight
```

The adapter forwards standard input and exit status to the existing CLI. It does not collect Linear through another transport, invent an issue or approval, close work, or select another task. An action invocation or successful dependency install is not a passing preflight or complete implementation acceptance. Use the original evaluator's `ready`, `blocked`, or `unknown` result and the existing session procedure.

The existing `.github/agents/codex.agent.md` is the **GitHub Copilot** custom-agent profile named **CP Sim Engine**, with `target: github-copilot`. Its domain/store specialist edit restrictions apply to that Copilot profile. OpenAI Codex App follows repository `AGENTS.md`, the approved Linear boundary and current governance; the profile creates no exclusive lock or global Codex App file boundary. See [GitHub's custom-agent reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration).

## Read-only session closeout

Use [the read-only template](read-only-session-handoff.md) only when no Linear, repository, or external writes occurred. Distinguish preliminary findings, pending durable transport, and verified canonical application.

## Standing policy

Manual §§1–6 centralize the procedure. Tracked Cursor rules retain their loading behavior; [User Rules](cursor-user-rules-snippet.md) direct pasted sessions to the same source. Linear and the slice doc carry active task details.

## After a PR merges

Follow manual §4: sync main, post truthful existing-boundary evidence, and complete merge closeout and required post-merge checkpoints. Related approved work may then continue in the same chat after the fresh checks in manual §2. Use that section's context criteria to decide when a new chat is needed; each implementation does not automatically require one. Full slice acceptance and parent completion are separate. Preserve the required gameplay-evidence follow-through in `AGENTS.md` across any handoff.

## During an open PR

Continue implementation, review fixes, and CI on the same active boundary. Use phase A if merge is blocked; do not start unrelated scope. A `resume` preflight is ready only when the sole open PR has a verified issue and branch matching the named handoff.

## Cloud / move to local

Verify current refs before checkout (manual §2). Use [the cloud-agent payload](cloud-agent-linear-handoff.md) only after an approved implementation is complete and merged and Linear was not updated. For authorized docs-only pending traceability, follow manual §4’s exact issue/evidence/operation/posting-state/next-step record; never claim it is posted.

## Each new implementation task

Use manual §§1–3 to verify actor authority, current issue/parent/children, clean main, pre-coding summary, lifecycle state, and validation boundary, whether continuing this chat or starting another. Preserve unrelated changes and worktrees. Run the session preflight before creating the implementation branch or changing lifecycle state. State the next authorized boundary explicitly; retained conversation context is not current-state evidence or permission to expand scope.

## Session closeout

Use [the phase A/B templates](agent-session-closeout.md). Carry the manual §4 implementation-handoff minimum: authorization, issue/parent, acceptance, slice, branch/base, PR/merge, validation, blockers, deferrals/candidates, actual/pending Linear writes, and next legal action.
