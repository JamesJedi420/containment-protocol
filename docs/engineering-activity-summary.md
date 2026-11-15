# Engineering activity summary contract — SPE-3512

This tooling implements deterministic summaries of **supplied snapshots** and pure adapters for captured GitHub PR/check-run responses. It performs no live reads, source authentication, credential setup, writes, scheduling or deployment. A fixture pass does not prove live connectivity, a usable queue or a working external dashboard. SPE-3512 remains partially implemented; its parent and other owners retain their scope.

## Consumer API

`scripts/engineering-summary.mjs` exports `summarizeEngineeringActivity(input)` (object), `serializeEngineeringSummary(input)` (stable JSON plus newline), and `renderEngineeringSummary(input)` (Markdown). Each takes the same input envelope. None reads the clock, network, environment or filesystem. There is no persistent report/evidence store.

```js
import {
  summarizeEngineeringActivity,
  serializeEngineeringSummary,
  renderEngineeringSummary,
} from './scripts/engineering-summary.mjs'

// A trusted caller supplies a privately obtained, validated snapshot envelope.
const summary = summarizeEngineeringActivity(snapshot)
const machineText = serializeEngineeringSummary(snapshot)
const humanText = renderEngineeringSummary(snapshot)
```

No live collector or downstream delivery consumer is connected. SPE-3513 may consume the output under its own boundary. External repository, hosting, authentication, audience and cache placement remain undecided. Keep credentials and private provider bodies outside the game client and output. Do not diagnose the prototype's reported GitHub 403 from a different connector's successful read.

## Version 1 input

All objects use allowlisted fields. Invalid structure throws a field-only error without echoing supplied values. Input is JSON data, not executable objects/accessors. A caller must establish actual source authority and completeness before constructing it; source markers and revision strings are not authentication or proof of retrieval.

Root fields:

- `schemaVersion: 1`, `repository` (`owner/name`), `linearWorkspace`, and one explicit `workstream`: `CP-core`, `Academy`, `shared-system`, `cross-project`. No implicit combined ranking or title-based workstream inference.
- `window: {start, end}` and `evaluatedAt`: timezone-qualified ISO timestamps, seconds through milliseconds. Start precedes end; end cannot exceed evaluation time. Invalid calendar days and finer precision are rejected.
- `policy`: `maxAgeSeconds` and `expectedRevisions`, each keyed by all seven sources below; explicit nonnegative integer `futureToleranceSeconds`; explicit `maxRecordsPerSource` (0–100,000). No default freshness/clock policy is invented. Revisions are 40- or 64-character lowercase hex identifiers/digests; an expected revision may be `null` when unverified, which cannot qualify that source.
- `sources`: any subset of the seven keys. A missing source is unavailable, with unknown count and no invented records.

| Source            | Required authority | Accepted supplied record kinds             |
| ----------------- | ------------------ | ------------------------------------------ |
| `github`          | `GitHub`           | `merged-pr`, `ci-failure`                  |
| `linear`          | `Linear`           | `blocker`, `decision`                      |
| `handoff`         | `SPE-3337`         | `handoff`                                  |
| `validation`      | `SPE-3348`         | `validation`                               |
| `drift`           | `SPE-3276`         | `drift`                                    |
| `queue`           | `SPE-3338`         | Canonical snapshot, not flat queue records |
| `recommendations` | `SPE-3339`         | `recommendation` with supplied `position`  |

Each present source requires `authority`, `status` (`ready`, `partial`, `unavailable`, `conflicted`), `checkedAt`, `revision` (or `null`), `sourceRef`, `coverage`, `records`, `lastSuccess` (or `null`) and `currentError` (or `null`). `coverage` requires boolean `complete` and `paginationComplete`, `{start,end}` window and an explicit unique `workstreams` list. Coverage must include the reporting window and selected workstream. Never attest complete pagination from a capped or failed fetch.

`lastSuccess`, when supplied, is exactly `{checkedAt, revision, sourceRef}`. It is preserved independently of the current error; a failed attempt never refreshes it. It cannot follow the current observation. `currentError` contains only a fixed `code`: `http-401`, `http-403`, `http-429`, `http-error`, `timeout`, `network`, `partial-response`, `incomplete-coverage`, `unimplemented`, `not-collected`. Raw response bodies, tokens, exception text and connection details are not accepted.

Each ordinary record requires `id`, `kind`, `state`, `workstream` (or `null` when unknown), `at`, `revision`, `sourceRef`. GitHub IDs are `PR-<number>` / `CHECK-<number>`; validation IDs are lowercase validator identifiers; other IDs are canonical `SPE-<number>`. Allowed states are explicit source-contract values in `STATES` in the module: merged status, GitHub failure conclusions, active Linear lifecycle/pending-decision states, handoff readiness, existing validator results and supplied implementation-evidence states. A collector must establish an explicit pending design/approval decision, not infer one from prose or an issue title.

Recommendations also require nonnegative integer `position`. Their order is retained, never recomputed. A recommendation cannot qualify unless the canonical queue is qualified and contains its ID as runnable, and supplied drift evidence is qualified. A queue/drift rejection moves those supplied claims to `rejectedObservations`, preserving diagnostic IDs/references and `observedCount` while leaving usable `observations` empty and `count` unknown. Markdown labels these records "Rejected supplied". Missing selector output remains unavailable; a fabricated fallback is forbidden.

For `queue`, `records` must be `null`. Supply the existing complete Linear authority `snapshot` consumed by `projectApprovedWork`; the summary calls that projector and `filterWorkstream` directly. It emits only canonical active/history/runnable IDs and preserves supplied priority order. It neither classifies drift nor reconstructs a separate queue. The snapshot's own timestamp is checked independently. Unavailable sources require `records: null` and need no data/snapshot.

## Time, conflict and completeness semantics

Merged PRs use **start-inclusive, end-exclusive** merge times. Blockers, current CI failures and other current evidence are observations at their actual observation time, not events filtered by issue creation time. Their freshness is independently checked. Old observations cannot become fresh merely because a wrapper was fetched again. Record times and claimed coverage end cannot exceed source observation time beyond the supplied tolerance.

Source and record revisions must match the pinned expected source revision. Duplicate kind/ID observations, duplicate recommendation positions, contradictory source states or temporal/revision contradictions are explicit conflicts. Unknown workstreams degrade coverage and never become CP or Academy. Known other-workstream records are filtered without changing their authority.

Only complete, fresh, successful, consistent coverage yields a numeric count, including zero (`no-events`). Partial/stale/unavailable/conflicted sources have `count: null`. Available unqualified observations retain a separately labeled `observedCount`; unavailable sources have `observedCount: null` and `observations: null`, not an empty successful list. A qualified queue with active but no runnable work retains that distinction.

The report retains source-specific status/reasons, coverage, references, revisions, supplied policy, current error and last success. The informational overall state presents conflicts before stale evidence, then unavailable/partial coverage; it is not an operational priority, approval or execution decision. Other available sources remain visible. Malformed envelopes/canonical snapshots throw rather than produce a success report. The trusted caller must surface that failure, not replace it with an empty report.

## Sensitive data and bounds

Output allowlists omit titles, descriptions, raw provider errors and arbitrary payload fields. References allow only HTTPS links to the configured repository's PRs, commits, action runs or pinned blobs, and canonical issues in the configured Linear workspace. Userinfo, queries, fragments, ports and other hosts are rejected. This minimizes exposed fields; it does not declassify private issue IDs or certify that a caller supplied no sensitive data. Only an explicitly approved audience may receive reports. No public output or publication is configured.

Record bounds are caller supplied with a hard resource ceiling of 100,000 per source; references are limited to 2,048 characters and repository/workspace identity components to 100 characters. Work is bounded by the supplied data and deterministic sorting; there are no retries or unbounded network operations. Fixture data must remain labeled constructed, never used as live authority. The current missing drift feed/workstream inputs and unimplemented selector cannot be filled with synthetic all-clear values.

## Verification and remaining acceptance

Run `npm run verify:engineering-summary` and the existing `npm run verify:requirements -- --base origin/main` selector. Tests cover source health, zero events, HTTP 403, last success, coverage/pagination failure, millisecond/window boundaries, revision mismatches, duplicates, workstreams, canonical queue consumption, supplied recommendation order, output determinism/purity and sensitive-data minimization.

This slice does not satisfy live collection, provider access qualification, direct Linear/GitHub reconciliation, downstream integration or full SPE-3512 completion. No schedules, new classifier/producer, hand-maintained queue, game/runtime UI, compiler fixes or external application placement are included.

## Captured GitHub merged-PR adapter

`scripts/engineering-summary-github.mjs` exports `adaptGitHubMergedPrCapture(input)`, returning `{source, provenance}`. Put only `source` in `summaryInput.sources.github`, then use the existing summary/render APIs. `provenance` is a minimized in-memory diagnostic object; the adapter creates no file, cache, evidence store or transport. It uses built-in `node:crypto` for a deterministic SHA-256 digest and the shared pure validation in `scripts/engineering-summary-capture.mjs`. Inputs are JSON data, with no executable objects/accessors. See the explicitly constructed input builder and renderer integration in `scripts/engineering-summary-github.test.mjs`; it is not a live dataset or production configuration.

The exact version-1 envelope contains:

| Field                | Required contents                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `schemaVersion`      | `1`                                                                                             |
| `repository`         | Positive safe-integer `id`, configured `fullName` (`owner/repo`)                                |
| `linearWorkspace`    | Configured workspace slug for canonical mapping references                                      |
| `apiVersion`         | Declared captured REST version: `2022-11-28` or `2026-03-10`                                    |
| `scope`              | Explicit `baseRef`, `sort` (`created`/`updated`), `direction` (`asc`/`desc`), `perPage` (1–100) |
| `window`             | `{start,end}`, start-inclusive/end-exclusive, ending no later than capture start                |
| `bounds`             | Explicit `maxPages` (1–10,000), `maxRecords` (0–100,000)                                        |
| `sourceRef`          | Existing canonical GitHub PR, commit, action-run or pinned-blob reference in this repository    |
| `capture`            | `{startedAt,finishedAt,pages,error}`; no implicit clock reads                                   |
| `workstreamEvidence` | `{revision,checkedAt,assignments}` described below                                              |
| `lastSuccess`        | Prior `{checkedAt,revision,sourceRef}` or `null`; never refreshed by this adapter               |

Each captured page contains exactly `{requestUrl,observedAt,status,link,data}`. `status` must be `200`; failed requests are represented by `capture.error`, not a page disguised as an empty successful response. `requestUrl` and every pagination link must use `https://api.github.com/repos/<configured owner/repo>/pulls` or the equivalent `/repositories/<configured numeric ID>/pulls`. They require exactly `state=closed`, the configured `base`, `sort`, `direction`, `per_page`, and a positive integer `page`, without duplicate parameters. No arbitrary endpoint, token query, userinfo or fragment is accepted. The adapter never follows links.

`link` is the captured Link header or `null`. Supported relations are `next`, `prev`, `first`, `last`; request scope must remain unchanged. Supplied pages must form a consecutive chain from page 1, with nondecreasing observation times between capture start/end. Input array order is immaterial. A missing final suffix remains incomplete; a gap, repeated page, cyclic/inconsistent link, duplicate PR ID/number, malformed response or scope mismatch throws a fixed field-only error. Callers must surface this error, never replace it with empty success. Page and total row bounds apply before event filtering, including unmerged/out-of-window rows. Raw provider text is ignored rather than copied or included in the digest.

Provider rows require numeric `id`/`number`, canonical `html_url`, closed `state`, configured `base.ref` and `base.repo.id/full_name`, `updated_at` and nullable `merged_at`. Optional `merged`, when present, must agree with `merged_at`. Revision timestamps cannot follow their page observation or precede the merge timestamp. Closed-but-unmerged PRs produce no summary records. Merge timestamps alone decide reporting-window membership; pagination never stops at an old merge timestamp. GitHub lists can sort by creation/update time, **not merge time**. `merge_commit_sha` is not required or used: the `2026-03-10` API removes it. [Pull request API](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests), [pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api), [version changes](https://docs.github.com/en/rest/about-the-rest-api/breaking-changes).

`workstreamEvidence.assignments` contains `{pullRequestId,number,workstream,sourceRef}` rows. Nonempty assignments require a non-null 40/64-hex evidence revision, an observation no later than capture start, unique matching PR identities and canonical source references. Only the four existing workstreams are accepted. A missing assignment yields `null`, never a repository/title/author-based classification. Unavailable captures do not require invented matching PRs for prior supplied mapping evidence. The caller must actually verify the classification and its currency; a declared revision/reference is not authentication. Mapping revision/time/references are retained separately in provenance. The adapter does not query Linear or manufacture labels, issues or classifications.

The digest covers sanitized identities, facts, request/capture/window scope and mapping provenance in stable order. Every successful PR record and source uses that same digest. Per-PR `updated_at` and numeric provider IDs survive in provenance; merge times remain record event times. The digest verifies internal content consistency only. It is not a Git commit SHA, an atomic provider revision, authentication or a proof of completeness. The source anchor identifies supplied repository/evidence context; a commit anchor does not prove that PR pages were collected. The adapter never sets the summary's `policy.expectedRevisions`; leave it `null` unless the trusted caller independently qualifies/pins the capture. Traversal is explicitly marked `atomicSnapshot: false`.

**A PR-only capture always remains partial.** The existing GitHub source also covers current CI failures, which this adapter does not collect. Both source coverage booleans remain false and covered workstreams stay empty. `provenance.mergedPrPaginationComplete` describes only a successful supplied PR-page chain, not complete GitHub coverage. Even an empty, fully traversed PR capture has unknown total count. Successful complete or unfinished PR chains use `incomplete-coverage` because CI is still absent; `not-collected` is reserved for no attempted page. The summary may display scoped known observations without treating them as a usable queue or a complete GitHub result.

`capture.error` is `null` or exactly `{code}`: `http-401`, `http-403`, `http-429`, `http-error`, `timeout`, `network`, `partial-response`. An error, or no attempted page, produces unavailable source evidence with `records: null`, `revision: null` and unknown counts. Earlier captured facts remain minimized provenance only; they cannot turn a failed attempt into success. No raw exception/response/auth headers are accepted. Prior last-success metadata is preserved independently and cannot follow capture start. A partial PR-only success never advances last success for the combined GitHub source.

Source `checkedAt` is capture **start**, conservatively reused by the existing caller-supplied summary freshness policy. Response observations and capture finish cannot refresh old captures or replace historical merge timestamps. Mapping freshness/authority must still be qualified by the trusted caller. This slice tests constructed normalization, degradation and both output formats; no live collector, authenticated dataset, complete pagination reconciliation, CI evidence or external-dashboard connection is established.

## Captured GitHub check-run adapter

`scripts/engineering-summary-checks.mjs` exports `adaptGitHubCheckRunCapture(input)`, returning `{source, provenance}` for the existing summary/render APIs. This is a separate pure captured-data adapter, not a collector or a combined GitHub source. Both adapters use the same pure URL/timestamp/field checks from `scripts/engineering-summary-capture.mjs`; the existing PR contract and source layout are preserved. No dependencies, network, environment, implicit clock or filesystem access are added.

The supported provider is **GitHub check runs for one explicit commit SHA**: `GET /repos/{owner}/{repo}/commits/{sha}/check-runs?filter=latest`. It does not normalize Actions workflow runs/jobs/attempts or legacy commit statuses. A PR head and a test merge commit can differ: the caller must supply the actual checked SHA, not assume one represents every CI target. `latest` means the provider's returned filter, not an independently reconstructed supersession policy. The endpoint also limits the suite universe it returns; traversing its pages is not proof of all CI coverage. [Official endpoint](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference).

The exact version-1 input envelope is:

| Field                                         | Required contents                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `schemaVersion`, `provider`                   | `1`, `github-check-runs`                                                                                                       |
| `repository`, `linearWorkspace`, `apiVersion` | Same configured identity/reference rules as PR captures; versions `2022-11-28`/`2026-03-10`                                    |
| `scope`                                       | `{headSha,filter,perPage}`: 40-lowercase-hex SHA, literal `latest`, 1–100                                                      |
| `window`, `bounds`                            | Explicit `{start,end}` and `{maxPages,maxRecords}` with the existing capture ceilings; window ends no later than capture start |
| `capture`                                     | `{startedAt,finishedAt,pages,error}`                                                                                           |
| `workstreamEvidence`                          | `{revision,checkedAt,assignments}`, with each assignment `{checkRunId,headSha,workstream,sourceRef}`                           |
| `lastSuccess`                                 | Real prior `{checkedAt,revision,sourceRef}` or `null`; never advanced here                                                     |

Each page is exactly `{requestUrl,observedAt,status,link,data}`. Successful `status: 200` pages carry provider `data.total_count` and `data.check_runs`. Configured repository paths and the literal SHA must match; numeric repository URLs are supported. Query parameters are exactly `filter=latest`, configured `per_page`, and positive integer `page`. Additional app/name/status filters, branch aliases, foreign repositories/heads, token queries and other endpoints are rejected. Link/page-chain rules match PR captures, including page 1, consecutive/nonrepeating pages, stable scope, consistent last links, bounded lengths and chronological observations. Changing totals, duplicate check-run IDs, inconsistent states/times and malformed payloads throw field-only errors. Total row bounds count **all** rows, including pending/successful/unmapped checks, before failure selection.

`provenance.returnedSubsetPaginationComplete` requires a successful supplied chain through its terminal page and exactly the stable advertised `total_count`. Missing links/pages or short totals cannot make it true. It describes only the returned check-run subset, never the repository's entire CI universe or an atomic snapshot. Source coverage booleans always remain false, covered workstreams stay empty, and successful results remain `partial`/`incomplete-coverage`, including empty or all-success captures. No attempted page is `unavailable`/`not-collected`; explicit acquisition failures preserve their fixed code, unavailable records/counts and prior last success. Error codes, bounds, safe references and raw-error exclusion match the PR capture rules.

Check rows require numeric `id`, matching `head_sha`, a configured-repository API `url` ending in `/check-runs/<id>`, known `status`/nullable `conclusion`, nullable `started_at`/`completed_at` and nullable `check_suite`/`app` identities. Only completed `failure`, `timed_out`, `cancelled`, `action_required` map to the existing four uppercase `ci-failure` states with `CHECK-<check-run-id>`. Success, neutral, skipped and pending states are retained in provenance without fabricated failures. Provider `stale` is explicitly retained as an unmapped conclusion, not converted to FAILURE or confused with capture freshness. Unknown future status/conclusion values fail closed rather than silently becoming success. Nullable provider timestamps/identities remain null; no completion event or attempt number is invented.

The provider check-run ID, suite ID and app ID remain separate. Different check-run IDs are not collapsed by names, URLs, suite/app membership or alleged workflow attempt fields. A repeated ID, including changed status/times/app data during traversal, is rejected instead of choosing an arbitrary revision. A check-run ID is not an immutable version token: provider state can change. Rerequesting a check does not itself update that check-run object; the receiving app may subsequently update it. No workflow run/attempt relationship is inferred or reconstructed here. [Provider rerequest behavior](https://docs.github.com/en/rest/checks/runs#rerequest-a-check-run).

**CI record `at` is its actual page observation time**, consistent with the existing current-snapshot contract. Genuine start/completion times are retained separately in provenance; old completion times do not remove a currently observed failure from the report. CI is not filtered as a completion-event stream by `[window.start,window.end)`. Source `checkedAt` is capture finish so it bounds the page observations, while the existing summary independently checks **each record's** observation freshness. A recent wrapper finish cannot refresh an old page. Caller-supplied evaluation/freshness/revision policy remains authoritative; there is no invented operational freshness threshold. Mapping revision/time/references remain separate and must actually be qualified by the trusted caller. Missing mappings stay unknown; no CP/Academy inference occurs.

Summary references use the canonical configured commit URL, with the precise check-run ID and provider identities retained in provenance. No workflow-run URL is fabricated from a check-run ID, and the summary's existing reference allowlist is unchanged. Raw names, output, details URLs, external IDs, auth/errors and request URLs are omitted. The deterministic digest binds only sanitized provider/scope/time/page/mapping facts and is used consistently by that source/its records. It is not authentication or an atomic source revision; the adapter never fills `policy.expectedRevisions`.

**PR and check-run outputs are not an automatic complete GitHub source.** Each has its own capture/digest and partial coverage. This slice adds no composer, cohort authority, required-validator inference or proof that missing provider dimensions were collected. Blindly concatenating independent source records produces revision conflicts under the existing summary contract; changing coverage flags cannot establish missing evidence. A future independently qualified composition boundary must preserve both provenance and explicit target/provider coverage. Constructed tests exercise both renderers, stale page observations, failed/empty/pending/unmapped data, mutable/retried IDs, bounds and rejected mixed revisions. The single scoped source-shape read establishes neither live connectivity nor production qualification.
