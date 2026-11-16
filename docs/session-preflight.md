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

| Exit | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | `ready`                                                       |
| `1`  | `blocked` or `unknown`                                        |
| `2`  | invalid arguments, malformed JSON, or invalid versioned input |

Arbitrary file-path arguments are not accepted. Use standard input so the tool does not become a repository handoff store.

On Windows, the trusted executable search includes the standard GitHub CLI installation at `%ProgramFiles%\GitHub CLI`. The collector still uses a fixed search path and never invokes a shell.

## Version 1 input

The JSON input is the portable machine envelope. Keep it with its source references, then refresh required observations in the receiving session. Evaluation results carry the repository/evaluation time and a copy of the named handoff snapshot separately from lifecycle and implementation evidence. Results and Markdown are derived reports, not replacement input or approval records.

### Human-readable projection

Add `--markdown` to the existing `--stdin` command, optionally with `--collect-local`, to render the evaluated result as labeled sections for readiness, boundary, lifecycle, implementation, repository, diagnostics, designations and follow-ups. Exit codes and validation are identical to JSON mode. Embedded source text remains quoted data in fenced JSON sections. Never parse the Markdown back into authority or use it instead of a fresh source read.

### Optional follow-up evidence

`followUps` has exactly `schemaVersion: 1`, `issueId` matching the handoff, and `items`. Every item has a unique `id`, `summary`, `sourceRef` and `kind`. This is a bounded handoff snapshot, not a queue or candidate register. Source references must exclude credentials and private payloads.

| Input kind                               | Additional required fields                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `in-boundary-deferral`                   | `ownerIssueId`, `canonicalOwner`, `deferralReason`, `remainingAcceptance`, `closureImpact`, `boundary`                                                  |
| `candidate-discovery` or `applied-scope` | `outsideBoundaryReason`, `provisionalWorkstream`, nullable `provisionalOwner`, `disposition`, `phase`, nullable `authorization`, nullable `application` |

`closureImpact` is `blocks-completion` or `does-not-block-completion`. The named owner and remaining acceptance must be verified against the existing approved boundary; sharing an agent or subsystem owner is insufficient. `provisionalWorkstream` is `CP-core`, `Academy`, `shared-system`, `cross-project` or `unknown`. `phase` is `unassessed`, `phase-1` through `phase-4`, or `actor-authorized`; preserve the actual observed phase rather than advancing it to fit a desired classification.

Observations are nullable. When present, each contains `status` (`verified`, `unverified` or `contradictory`), nullable UTC `checkedAt`, nullable `sourceRef`, and these exact additional fields:

| Observation     | Additional fields                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boundary`      | `issueId` for the existing owner, `boundaryIssueId` for the named handoff, `canonicalOwner`, `scopeRelation` (`within-approved-boundary`, `outside-approved-boundary` or `unknown`) |
| `authorization` | `itemId`, `actor` (`ChatGPT`, `Cursor`, `Codex` or `human`), `authorityRef`, `decision` (`authorized`, `not-authorized` or `unknown`), nullable target `issueId`, `canonicalOwner`  |
| `application`   | `itemId`, `outcome` (`applied`, `not-applied` or `unknown`), nullable created/updated `issueId`, nullable `canonicalOwner`                                                          |

`verified` means the collecting actor actually inspected the referenced current authoritative evidence. It is not an approval checkbox. `authorityRef` points to the existing authority's decision/provenance, not an authority minted by this tool. SPE-3272 retains mutation authorization; Cursor retains its separate approved safeguards. A ChatGPT authorization observation must represent the existing ordered Phase 1–4 approvals and explicit Phase 4 authorization; this reporter does not perform that adjudication or any write. Codex and human observations likewise require their actual explicit authority. A null authorization target issue is permitted for creation before the resulting issue ID exists; the verified application must still supply its actual issue and matching canonical owner.

Only fresh, verified, matching boundary evidence yields an `in-boundary-deferral`. Only fresh, verified authorization plus an actual applied outcome with matching item/owner/target evidence yields `applied-scope`; ChatGPT-originated scope also requires the reported phase to be `phase-4`. Missing, stale, contradictory or mismatched observations project `unverified-follow-up` with a reason and retained `reportedKind`. A `candidate-discovery` remains a candidate even when other observations exist; no automatic promotion occurs. Pending Phase 1 evidence cannot become applied scope for any actor. Other actors require the observed phase to be `actor-authorized` or `phase-4`; this does not impose ChatGPT phase gates on Cursor. These labels do not grant execution permission or close the parent. Unverified follow-up evidence does not change readiness for the independently approved named task.

Observation timestamps accept UTC seconds through milliseconds. The existing freshness window and 30-second future tolerance apply. An evaluation time finer than milliseconds makes follow-up observations unverified. Malformed schemas fail input validation rather than projecting claims. Revalidate every cited authority and actual application before relying on transferred evidence. The caller remains responsible for truthfully collecting observations through existing connectors; this module creates no transport, verification service, approval engine or lifecycle writer.

### Optional Linear connection diagnostics

An optional top-level `linearMcp` carries a versioned read observation. Existing v1 callers remain compatible when it is absent; absence is not evidence of a successful connection probe. The existing evaluator alone determines readiness. When supplied, unavailable, stale, future or mismatched diagnostics make readiness `unknown`.

Use `createLinearMcpDiagnostic` from `scripts/session-preflight-linear-diagnostics.mjs` after an authorized issue read through the existing Linear connector. Pass `status`, the UTC `checkedAt` recorded when that read began, `checkedBy` (`Codex`, `Cursor`, `ChatGPT` or `human`), and `evidenceRef: 'linear:SPE-3337'` for the actual issue. A successful read uses `status: 'ready'`; it says nothing about write capability. Refresh both the connection observation and authoritative issue state in the receiving session. `--collect-local` refreshes Git/GitHub only and preserves the caller's diagnostic timestamp.

The version 1 diagnostic contains `schemaVersion`, `status`, `checkedAt`, `checkedBy`, `operationChecked`, `failureCode`, `retryGuidance` and nullable `evidenceRef`. `createLinearMcpDiagnostic()` produces `unchecked` with null time/actor and `operationChecked: 'none'`. Executed reads use `operationChecked: 'read'`; successful reads require an issue evidence reference. Failure observations may omit the reference using null. When diagnostics are supplied, diagnostic `checkedAt` and envelope `observedAt` accept at most three fractional-second digits, matching the evaluator's millisecond precision. Finer precision is rejected rather than silently truncated into a fresh result.

Explicit provider evidence may classify `authentication-missing` or `authentication-expired` as `needsAuth`. `configuration-missing`, `permission-denied`, `timeout`, `service-failure` and `unknown` use `failed`. Do not guess a diagnosis from arbitrary text. If the probe never ran, retain `unchecked`. Recovery guidance is generated from the fixed category; raw provider errors, credentials, arbitrary URLs and extra fields are rejected. No new transport, credential lifecycle, write probe or mutation authorization is introduced. CP core and Academy use this same contract.

### Optional agent designation provenance

`agentDesignations` carries issue-scoped preference evidence through the same input and output. It is not the Linear human assignee, issue approval, agent acceptance or session activity. A Codex preference is nonexclusive and never excludes an otherwise authorized Cursor session. CP and Academy consume this same contract. Omit the packet when no evidence was collected; the existing v1 readiness behavior remains unchanged.

The packet has exactly `schemaVersion: 1`, `issueId` matching the handoff, `sourceRef`, nullable `checkedAt`, and `entries`. Record `checkedAt` from the current source read, or null when unverified. Each entry has `id`, `agent`, `sourceRef`, nullable `designatedAt`, nullable `timestampSourceRef`, and nullable `supersedes` (the ID of the explicitly superseded entry). Retain superseded entries and their original provenance. Do not infer supersession from array order or timestamps. Duplicate IDs, missing references, cycles, reversed evidenced chronology and malformed fields are rejected.

`designatedAt` records only an explicitly evidenced UTC designation time, with its separate `timestampSourceRef`. Both are null for unknown historical time; neither issue creation time nor a current observation time may substitute for it. UTC timestamps accept seconds through milliseconds, never finer precision or invalid calendar dates. Free-text source references must contain no credentials or private payloads; retain references to the existing authoritative artifact, not copied secret-bearing responses.

The output sorts history by ID, marks superseded entries, and reports `current`, `absent`, `unknown`, `stale`, `from-future` or `conflicting`. Only fresh, consistent current evidence yields `preferredAgent`; `lastDesignationAt` remains null unless every current record has an explicit timestamp. Conflicting or stale preferences remain in history without inventing a winner. These optional evidence states do not change session readiness. Malformed or wrong-issue packets fail input validation. An evaluation time finer than milliseconds produces an unknown preference projection rather than rounding it into fresh evidence.

Output explicitly labels `authority: 'preference-only'` and `nonexclusive: true`; human assignment is not derived, and executor acceptance/session activity remain unverified. Refresh provenance from the authoritative source in a receiving session. The packet cannot select work, assign an executor, reserve a task, approve scope or close an issue.

The top-level envelope carries:

- `schemaVersion`: `1`;
- `repository`: GitHub `owner/name`;
- `observedAt`: timezone-qualified ISO-8601 evaluation time;
- `freshnessWindowSeconds`: maximum accepted evidence age;
- `requestedOperation`: `start` or `resume`;
- `executionMode`: `local-checkout` or `codex-managed-worktree`;
- `handoff`: approved issue, workstream, optional parent/slice reference, intended branch, expected base-main SHA, and blocker/dependency snapshot;
- `linear`: source-attributed lifecycle, approval, workstream, parent, blocker, and dependency evidence;
- `github`: source-attributed remote-main and open-PR evidence plus optional independently attributed implementation evidence;
- `git`: source-attributed local checkout/worktree evidence.
- optional `openPrTriage`: sourced, head-bound dispositions for other open PRs and the exact proposed boundary; observations only, never approval.

Every timestamp must end in `Z` or an explicit numeric offset such as `-06:00`. Ambiguous local timestamps are rejected.

Freshness comparisons preserve milliseconds: evidence exactly at the age limit is accepted, but even one millisecond beyond it returns `unknown`. The same precision applies to the 30-second future-clock tolerance and independent implementation evidence.

Ready Linear evidence must include `linear.workstream` matching `handoff.workstream`; missing or conflicting workstream evidence returns `unknown`. Ready Git evidence must include `git.originRepository` matching the requested `repository` (case-insensitive), independently of matching SHAs. The collector derives this identity with `git remote get-url origin`, accepting canonical `https://github.com/owner/repo`, `git@github.com:owner/repo`, and `ssh://git@github.com/owner/repo` forms, with optional `.git` suffix or trailing slash. Local paths, host aliases, credentials, and other hosts fail closed rather than being guessed. Raw remote URLs are not included in the result.

Every collector command has a 30-second timeout and disables Git/GitHub credential prompts. Command failure or timeout produces unavailable evidence and an `unknown` result. The timeout applies per command, not to the whole multi-command collection.

`handoff.intendedBranch` must be a valid literal Git branch name. Invalid names (including spaces, `..`, `.lock` components, and `HEAD`) return `unknown` as malformed input before readiness evaluation. Checkout-history expressions such as `@{-1}` are rejected rather than resolved from local history. Nested and Unicode branch names remain supported.

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
    "workstream": "shared-system",
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
    "originRepository": "JamesJedi420/containment-protocol",
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

A `resume` requires the issue to remain In Progress and exactly one open pull request to match the named issue and branch. Additional PRs require the sourced triage contract below; legacy input retains the sole-open-PR restriction.

### Local checkout

For `start`, the tracked working tree must be clean, the current branch must be `main`, and local `main`, remote `main`, `HEAD`, and the authorized expected base must agree.

For `resume`, the tracked working tree must be clean and the current branch must be the handoff's intended branch. Current remote and local `main` must still match the expected base; incompatible base movement blocks the resume rather than silently rebasing or merging.

### Codex managed worktree

For `start`, detached `HEAD` is permitted only when the tracked worktree is clean and `HEAD` exactly equals the authorized expected base. This branch-form exception does not waive the open-PR gate or current-base verification.

For `resume`, the worktree must be on the intended branch. The preflight never creates that branch or transfers the chat.

### Pull requests

Inspect every open PR, including drafts, and prioritize those the executor can advance. An actionable PR blocks starting another slice. A PR that genuinely cannot progress may permit otherwise authorized non-overlapping work only with a current concrete blocker or evidenced accepted active executor, a next action and verified dependency independence. Draft status, authorship, assignment, preference or an old comment alone provides no exemption. Retain explicit holds, one active owned boundary, clean current main and all existing scope, lifecycle, validation, independent-review and merge gates.

This includes an owned PR explicitly left paused because it is genuinely blocked: record its blocker and next action on the existing owner, retain its incomplete status and report phase A for that boundary. A fresh separately authorized independent boundary may then start under the same checks. A paused PR is not merged or completed; there is at most one active owned boundary and no additional queue, scheduler or lock.

Without `openPrTriage`, any open PR still blocks `start`; `resume` requires the sole open PR's verified issue, head branch and `main` base to match. No legacy flag waives this restriction. With triage supplied, `resume` identifies exactly one matching verified issue/branch, checks its actual head against local HEAD and includes its actual changed paths in the overlap check. Other PRs require exactly one disposition each. Ambiguous ownership on the resumed PR remains `unknown`; another PR occupying the named issue or branch blocks competing work.

The GitHub collector resolves issue ownership from one issue identifier in the PR title. Only when the title contains none does it accept one unique identifier from the body. Multiple identifiers at the selected level are not guessed. Empty or malformed PR output fails closed rather than being interpreted as an empty list.

### Sourced per-PR triage contract

The optional root `openPrTriage` uses `schemaVersion: 1` within the existing version-1 envelope. Its strict fields are:

- `boundary`: `issueId`, `workstream`, `branch`, `baseMainSha`, `executor`, `paths`, `checkedAt`, `sourceRef`. Identity must match the handoff exactly. `executor` identifies this accepted session, not merely its model or human assignee. `paths` is a nonempty list of literal repository files/directory prefixes; globs, absolute paths, traversal and backslashes are rejected. Check scope completeness against the authoritative issue and intended edits before collection.
- `items`: exactly one row per other open PR, including drafts. Each row has `number`, current `headSha`, `updatedAt`, `isDraft`, `disposition`, concrete `reason`, `nextAction`, `checkedAt`, `sourceRef`, and `dependency`.
- `dependency`: `status` (`independent`, `dependent`, `unknown`), `checkedAt`, `sourceRef`, established from current Linear relationships and the actual scope. Known handoff dependency/blocker IDs override an independent claim; a dependent PR blocks and unknown evidence returns `unknown`.
- For `disposition: 'blocked'`, require `blocker`: `kind` (`explicit-hold`, `external-dependency`, `permission`, `service-unavailable`), responsible `actor`, concrete `detail`, `checkedAt`, `sourceRef`. An actionable review finding or failing check alone is not an external blocker.
- For `disposition: 'active-owner'`, require `activity`: accepted `executor`, `acceptedAt`, `acceptanceSourceRef`, `status: 'active'`, `checkedAt`, `sourceRef` to actual current progress/session evidence. An executor identical to this boundary's executor blocks a second active boundary. Acceptance alone does not prove current activity.
- `actionable` blocks a fresh `start`. For `resume`, the selected authorized matching PR may advance beside other independently actionable PRs after all dispositions and path/dependency checks pass; two actionable drafts must not mutually deadlock continuation. No fabricated blocker or owner is needed for the unselected PR. `unknown` fails closed for either operation. Supplying activity or blocker fields with the wrong disposition is contradictory and invalid. Unsupported packet fields and duplicate PR numbers are invalid.

### Caller checklist and template

The direct CLI and Codex environment action consume the same caller-supplied envelope.
Neither constructs dispositions or infers permission from PR authorship. If an open PR
causes `open_pr_blocks_start`, or extra PRs cause `multiple_open_prs`, first check whether
`openPrTriage` was omitted. Those legacy reasons are not an instruction to merge or close
all PRs. Recover by collecting the evidence below, not by adding a bypass flag.

1. Inspect the complete current open/draft inventory, exact heads and full changed paths,
   reviews/checks, current owners and actual blockers. Prioritize actionable PR work.
2. Refresh the named Linear scope, lifecycle and dependencies; describe the complete
   intended boundary paths and the actual accepted executor. Do not substitute an
   assignment or a model name for current activity evidence.
3. Add the root `openPrTriage` packet to the existing version-1 input before invoking
   `npm run session:preflight -- --collect-local` or the Codex environment preflight action.
   Include every other PR exactly once. For `resume`, omit the selected matching PR from
   `items`; the collector/evaluator still checks its verified identity and actual head.
4. Supply fresh current-head dispositions, dependencies and required blocker/activity
   evidence. If any evidence is unknown, leave it unknown and remain stopped. Never copy
   the illustrative hold below as a real disposition or change timestamps without rereading
   their sources. Collection refreshes Git/GitHub, not caller-supplied triage provenance.
5. Inspect the resulting status and every reason. Start/resume only when `ready`; local
   dirt, stale main, overlap, dependent work and authorization/lifecycle gates still apply.
   A missing packet is not the only possible blocker, and a packet never grants approval.

This applies equally to a PR previously authored by Codex or another agent. A genuinely
blocked owned PR can remain explicitly paused with truthful incomplete lifecycle, actor
and next action while one separately authorized independent boundary proceeds. An
**active** owned PR cannot be relabeled blocked merely to start another boundary. A
selected authorized PR can resume beside independently actionable PRs under the same
contract. Authorship alone never permits or forbids either operation.

Illustrative complete root packet, to merge into the required version-1 envelope above.
These fictional values are a schema example, not current evidence or permission:

```json
{
  "openPrTriage": {
    "schemaVersion": 1,
    "boundary": {
      "issueId": "SPE-3337",
      "workstream": "shared-system",
      "branch": "codex/spe-3337-session-preflight",
      "baseMainSha": "1111111111111111111111111111111111111111",
      "executor": "codex-session:this",
      "paths": ["scripts/session-preflight-core.mjs"],
      "checkedAt": "2026-11-03T03:29:30Z",
      "sourceRef": "example:verified-approved-boundary"
    },
    "items": [
      {
        "number": 42,
        "headSha": "2222222222222222222222222222222222222222",
        "updatedAt": "2026-11-03T03:29:00Z",
        "isDraft": true,
        "disposition": "blocked",
        "reason": "The current instruction reserves this repair to its author",
        "nextAction": "Author corrects the identified finding and requests fresh review",
        "checkedAt": "2026-11-03T03:29:30Z",
        "sourceRef": "example:current-explicit-author-only-hold",
        "dependency": {
          "status": "independent",
          "checkedAt": "2026-11-03T03:29:30Z",
          "sourceRef": "example:current-scope-and-relationship-check"
        },
        "blocker": {
          "kind": "explicit-hold",
          "actor": "author-session:42",
          "detail": "Taking over the repair is explicitly excluded",
          "checkedAt": "2026-11-03T03:29:30Z",
          "sourceRef": "example:current-explicit-author-only-hold"
        }
      }
    ]
  }
}
```

Ready GitHub evidence must have `openPullRequestsComplete: true` and each PR's current `headSha`, `updatedAt`, `isDraft`, and complete `changedPaths`. Compare literal paths conservatively, case-insensitively, including directory-prefix overlap. A different issue or branch name does not prove independence. Semantic dependencies still require the separately sourced relationship check.

The collector uses paginated REST reads for all open PRs. With a triage packet it also collects every PR's file list (both previous and new rename paths), rechecks metadata after files, verifies the returned file count and re-reads the complete inventory. Changed heads/state, an incomplete file list, GitHub's 3,000-file cap or command failure makes collection unavailable. No draft filter or default 30-PR limit applies. The collector retains caller-supplied dispositions and timestamps; collecting GitHub again never refreshes their provenance.

All observations use the envelope's freshness window and 30-second future tolerance, at millisecond precision or coarser. Disposition, dependency, blocker and activity observations must not predate the PR's current update; acceptance must not follow the activity observation. Head, update or draft-state changes invalidate prior triage. Missing, stale, mismatched or contradictory evidence returns `unknown`; overlap and known dependencies remain blockers. Refresh before starting/resuming and after relevant state changes.

The evaluator checks the supplied evidence's consistency; it cannot authenticate prose source references, prove that planned paths cover all future edits, or discover undeclared semantic dependencies. The receiving executor must actually read the cited authoritative sources, inspect the full diff, reviews, CI and merge state, and keep planned paths truthful. The packet is neither a lock nor an approval system. JSON and Markdown preserve the observations and source references explicitly as evidence, not authority.

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
