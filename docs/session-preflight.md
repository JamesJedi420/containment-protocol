# Session-conflict and handoff-readiness preflight

**Owner:** [SPE-3337 — Approved implementation session continuity](https://linear.app/spectranoir/issue/SPE-3337/approved-implementation-session-continuity), Slice A.

The preflight evaluates one already-approved, explicitly named implementation boundary against current Linear, GitHub, and local Git evidence. It returns `ready`, `blocked`, or `unknown`. It does not select work, reserve an issue, write Linear, change branches, mutate pull requests, or persist an execution queue.

`blocked` and `unknown` both prohibit substantive implementation. `unknown` means required evidence was unavailable, stale, contradictory, malformed, or could not be attributed safely.

## Commands

Evaluate a complete evidence envelope supplied on standard input:

```sh
npm run session:preflight < session-preflight-input.json
```

Collect the local Git state and current GitHub `main`/open-PR state through fixed read-only `git` and `gh` commands, while retaining caller-supplied read-only Linear and implementation evidence:

```sh
npm run session:preflight -- --collect-local < session-preflight-input.json
```

Local collection stamps Git and GitHub evidence at collection start and sets `observedAt` only after both collectors finish. This makes the freshness calculation conservative. The Git status probe uses `--no-optional-locks` so the read-only preflight does not refresh or write the index.

The command writes one JSON result to standard output.

| Exit | Meaning |
| --- | --- |
| `0` | `ready` |
| `1` | `blocked` or `unknown` |
| `2` | invalid arguments, malformed JSON, or invalid versioned input |

Arbitrary file-path arguments are not accepted. Use standard input so the tool does not become a repository handoff store.

## Version 1 input

The top-level envelope carries:

- `schemaVersion`: `1`;
- `repository`: GitHub `owner/name`;
- `observedAt`: timezone-qualified ISO-8601 evaluation time;
- `freshnessWindowSeconds`: maximum accepted evidence age;
- `requestedOperation`: `start` or `resume`;
- `executionMode`: `local-checkout` or `codex-managed-worktree`;
- `handoff`: approved issue, workstream, optional parent/slice reference, intended branch, expected base-main SHA, and blocker/dependency snapshot;
- `linear`: source-attributed lifecycle, approval, parent, blocker, and dependency evidence;
- `github`: source-attributed remote-main and open-PR evidence plus optional independently attributed implementation evidence;
- `git`: source-attributed local checkout/worktree evidence.

Every timestamp must end in `Z` or an explicit numeric offset such as `-06:00`. Ambiguous local timestamps are rejected.

With `--collect-local`, the caller may omit current GitHub open-PR and Git observations; the command replaces them with fresh read-only observations. Linear evidence remains caller supplied because SPE-3337 does not introduce another Linear transport or credential path. Supplied `implementationEvidence` is preserved rather than replaced with an invented negative result.

Evidence with `collectionStatus` other than `ready` may omit current source-specific fields. The evaluator reports it as unavailable and returns `unknown`. Malformed residual payloads on an unavailable source are not projected into the result.

### Minimal start example

```json
{
  "schemaVersion": 1,
  "repository": "JamesJedi420/containment-protocol",
  "observedAt": "2026-11-03T03:30:00.000Z",
  "freshnessWindowSeconds": 300,
  "requestedOperation": "start",
  "executionMode": "local-checkout",
  "handoff": {
    "issueId": "SPE-3337",
    "workstream": "shared-system",
    "parentId": null,
    "sliceRef": "planning/spe-3337-session-preflight-slice.md",
    "intendedBranch": "codex/spe-3337-session-preflight",
    "expectedBaseMainSha": "1111111111111111111111111111111111111111",
    "blockerIds": [],
    "dependencyIds": []
  },
  "linear": {
    "collectionStatus": "ready",
    "checkedAt": "2026-11-03T03:29:30.000Z",
    "sourceRef": "linear:SPE-3337@2026-11-03T03:29:30Z",
    "issueId": "SPE-3337",
    "parentId": null,
    "status": "Backlog",
    "statusType": "backlog",
    "approvalState": "approved",
    "blockerIds": [],
    "dependencyIds": []
  },
  "github": {
    "collectionStatus": "ready",
    "checkedAt": "2026-11-03T03:29:30.000Z",
    "sourceRef": "github:JamesJedi420/containment-protocol:open-prs",
    "remoteMainSha": "1111111111111111111111111111111111111111",
    "openPullRequests": [],
    "implementationEvidence": {
      "checkedAt": "2026-11-03T03:29:20.000Z",
      "sourceRef": "github:JamesJedi420/containment-protocol:implementation:SPE-3337",
      "mergedCurrentMain": false,
      "mergedPrUrls": []
    }
  },
  "git": {
    "collectionStatus": "ready",
    "checkedAt": "2026-11-03T03:29:30.000Z",
    "sourceRef": "git:1111111111111111111111111111111111111111",
    "headSha": "1111111111111111111111111111111111111111",
    "currentBranch": "main",
    "detachedHead": false,
    "trackedDirty": false,
    "localMainSha": "1111111111111111111111111111111111111111",
    "remoteMainSha": "1111111111111111111111111111111111111111"
  }
}
```

## Start and resume policy

### Linear lifecycle

A `start` may target a Backlog/unstarted issue. It may also target an In Progress parent when the handoff explicitly names the next approved non-child slice through `sliceRef`; this supports SPE-3337’s sequential Slice A/Slice B delivery without closing the parent between slices. A `start` on an In Progress issue without an explicit slice reference is blocked.

A `resume` requires the issue to remain In Progress and the sole open pull request to match the named issue and branch.

### Local checkout

For `start`, the tracked working tree must be clean, the current branch must be `main`, and local `main`, remote `main`, `HEAD`, and the authorized expected base must agree.

For `resume`, the tracked working tree must be clean and the current branch must be the handoff's intended branch. Current remote and local `main` must still match the expected base; incompatible base movement blocks the resume rather than silently rebasing or merging.

### Codex managed worktree

For `start`, detached `HEAD` is permitted only when the tracked worktree is clean and `HEAD` exactly equals the authorized expected base. This branch-form exception does not waive the open-PR gate or current-base verification.

For `resume`, the worktree must be on the intended branch. The preflight never creates that branch or transfers the chat.

### Pull requests

Any open pull request blocks `start` under the current one-active-slice policy.

`resume` is ready only when there is exactly one open pull request and its verified issue ID, head branch, and `main` base match the handoff. Ambiguous ownership returns `unknown`; an unrelated or additional PR returns `blocked`.

The GitHub collector resolves issue ownership from one issue identifier in the PR title. Only when the title contains none does it accept one unique identifier from the body. Multiple identifiers at the selected level are not guessed. Empty or malformed PR output fails closed rather than being interpreted as an empty list.

## Evidence and output

Linear lifecycle remains separate from GitHub implementation evidence. A merged/current-main implementation does not close an open Linear issue. When independently attributed implementation evidence says work is on current `main` while Linear is not completed, the result is `unknown` with a lifecycle/evidence conflict rather than inferred completion.

Implementation evidence carries its own `checkedAt` and `sourceRef`; its freshness is evaluated independently from open-PR collection. When no implementation check was supplied, the output reports `mergedCurrentMain: null` rather than inventing `false`.

Reasons use stable codes, source names, and details, sorted deterministically by code point. The result also preserves source references and the inspected lifecycle, pull requests, and Git state. It grants no authority beyond the approved issue boundary.

## Explicit exclusions

This implementation contains no:

- approved-work queue or next-work selector;
- persistent lock, lease, reservation, scheduler, or session database;
- Linear writer, issue creator, or approval service;
- branch, commit, push, PR-create, PR-close, or merge command;
- GameState, campaign persistence, week-close, report, or player-UI integration;
- `.agents/skills`, `.codex`, or `.worktreeinclude` work from Slice B.
