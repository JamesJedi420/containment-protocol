# Engineering activity summary contract — SPE-3512

This tooling-only slice implements deterministic summaries of **supplied snapshots**. It performs no live reads, source authentication, credential setup, writes, scheduling or deployment. A fixture pass does not prove live connectivity, a usable queue or a working external dashboard. SPE-3512 remains partially implemented; its parent and other owners retain their scope.

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

No live adapter or downstream delivery consumer is connected in this slice. SPE-3513 may consume the output under its own boundary. External repository, hosting, authentication, audience and cache placement remain undecided. Keep credentials and private provider bodies outside the game client and output. Do not diagnose the prototype's reported GitHub 403 from a different connector's successful read.

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

Recommendations also require nonnegative integer `position`. Their order is retained, never recomputed. A recommendation cannot qualify unless the canonical queue is qualified and contains its ID as runnable. Missing selector output remains unavailable; a fabricated fallback is forbidden.

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
