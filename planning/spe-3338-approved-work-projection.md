# SPE-3338 — approved-work authority projection

Linear is the only issue lifecycle, relationship, blocker and explicit-priority authority. Roadmap phase interpretation is deferred to SPE-3339. `planning/backlog.md` and `planning/backlog-handoff-manifest.json` retain historical handoff evidence and **are not inputs** for executable work or priority.

**Owner clarification, 2026-11-03:** an existing issue in Linear is approved for its currently recorded scope. No historical approval record, originating conversation, approval label or separate approved-issue census is required. Earlier historical-provenance requests are superseded. Approval remains separate from lifecycle, blocker, workstream and implementation-evidence readiness; see [Agent Operating Manual §1](../docs/agent-operating-manual.md#1-select-the-actor-owner-and-legal-work).

## Authority ingestion

Export a **complete and current** read-only Linear snapshot into a local JSON file outside the repository. The exporter must explicitly attest `source: "Linear"`, `complete: true`, `workstreamCoverage: "all-approved"`, and `relationCoverage: "complete"`. It must include **every approved issue and its canonical dependency IDs**, including completed dependency records. Do not fabricate completeness flags for partial query results. Record `asOf` as the actual extraction timestamp.

Each issue must have: `id`, `approved: true`, `workstream` (one of CP-core, Academy, shared-system, cross-project derived from approved planning metadata), `statusType` (backlog/unstarted/started/completed/canceled, from Linear), `priority` (Linear 0–4), `blockedBy` and `dependsOn` (complete canonical Linear issue IDs), `implementationEvidence: {state}` and `evidenceDrift` (material conflict classification supplied by SPE-3276, not inferred from this projection). `implementationEvidence.state` is one of unstarted, partial, merged, current-main, superseded, missing, or evidence-conflicted. Do not infer Linear completion from merged evidence. If any required field, issue, relationship or source attestation is not verifiable, **do not produce a runnable queue**.

```sh
npm run test:approved-work
npm run project:approved-work -- /absolute/path/to/complete-linear-snapshot.json --write
npm run project:approved-work -- /absolute/path/to/complete-linear-snapshot.json --check
```

Projection output: `planning/approved-work-projection.json`. The check command returns nonzero if source data is incomplete or if existing projection bytes drift from deterministic regeneration. Active, runnable, and history are separate lists; dependency readiness, evidence conflicts, and Linear priority are preserved. A `started` issue with merged/current-main evidence stays active; only Linear terminal status moves it to history. A `shared-system` issue exists once, with canonical identity, and can gate dependent Academy and CP-core records. Consumers may use `filterWorkstream` without changing the underlying projection.

**Integration boundary:** `project:approved-work` consumes an externally supplied authoritative Linear snapshot; `export:approved-work` below supplies the live read-only ingestion path. The legacy `verify:backlog-handoff` continues to validate only historical handoff consistency; it does not certify authoritative queue freshness. Never use a projection as current planning authority without confirming its source snapshot freshness and full coverage. Do not attach a snapshot with private tokens to the repository.

## Live read-only ingestion (SPE-3338)

`npm run export:approved-work -- /private/verified-spe-3276-evidence.json` pages through Linear GraphQL with `LINEAR_API_KEY` and the `LINEAR_PROJECT_IDS` comma-separated retrieval boundary. An optional `--output /private/projection.json` selects the output path. It checks GraphQL errors, HTTP failures, missing pages, repeated cursors, duplicated/contradictory issues, verified SPE-3276 evidence coverage, and exact issue metadata. It writes no output when validation fails. Linear issue presence establishes `approved: true`; an `approved-work` label is unnecessary. Exactly one `workstream:CP-core`, `workstream:Academy`, `workstream:shared-system`, or `workstream:cross-project` label still supplies explicit workstream ownership to this ingestion adapter; the exporter does not invent or apply labels. Missing or ambiguous workstream metadata blocks the projection. Evidence classification is supplied by SPE-3276 and is not computed by this exporter.

**Production qualification:** Existing Linear issues do not need separate approval proof. Retrieval coverage, source freshness, explicit workstream metadata, complete prerequisite closure and the SPE-3276 evidence feed still require verification against current Linear before an output can be relied on as a complete production queue. Do not auto-select work from an incomplete or unverified output.

A separate approval inventory is not required. For compatibility, the legacy positional form `<evidence.json> <inventory.json> [output-path]` accepts an optional exact-set cross-check with `source: "Linear"` or the legacy `source: "approved-planning"`, `complete: true`, `projectIds` and `issueIds`. If supplied, it must match the retrieved projects and issues; its source marker does not grant approval. Without it, the configured projects and fully retrieved Linear pages define the observed issue set, and the evidence feed must match that set exactly. Archived issues are included so completed prerequisites remain available. The live adapter exhausts label and relation connections; normalization still rejects inputs with missing completion metadata or unconsumed pages. Full pagination within configured projects does not prove that no relevant prerequisite exists outside those projects.

## Direction-aware relation handling (PR #4616)

Linear relation type `blocks` is positional. The current issue's outgoing `relations` identifies issues it blocks, whereas incoming `inverseRelations` of type `blocks` identifies the issues blocking this one. Both assembled connections are required and must have `hasNextPage: false`; absent, truncated, or unknown relation records fail closed. Other relation types are not executable prerequisites.

## Bounded pagination correction and qualification — 2026-11-03

The former issue page of 100 with three nested pages of 100 was rejected by authenticated Linear with HTTP 400: query complexity 66,691.2 exceeded the 10,000 limit. Issue pages now contain 10 records. Labels and both relationship directions retain 100-record pages and are exhausted with separate fixed continuation queries against the canonical issue UUID. This includes large historical routing records; reducing only the outer page would leave their relationships truncated.

Every page requires valid completion metadata and a continuation cursor when another page exists. Nested node IDs must be present and cannot overlap. Continuations must retain the issue UUID, identifier and `updatedAt`; changed identity/revision, malformed data, repeated cursors, partial GraphQL results and HTTP errors abort retrieval. Completed connections retain all nodes and their final page metadata. No partial retrieval is promoted into a projection, and failure preserves any previously written output. CLI forms, credentials, coverage, approval, workstream and evidence-feed contracts are unchanged.

Authenticated verification exhausted both configured projects and every requested nested page, returning **3,032 unique canonical issues**. An independent lightweight traversal returned exactly the same UUID/identifier set. The largest outgoing and incoming connections contained **1,224** and **149** records; no incoming `blocks` prerequisite pointed outside the retrieved set. Raw timestamped responses, page counts, code hashes and identifier hashes are retained in the private local packet `spe3338-exporter-pagination-implementation-20261103`, outside the repository.

This is a non-transactional observation. One issue changed its update timestamp between the full retrieval and independent check. The single verification retry was stopped by HTTP 429; no further API retry or production-current/atomic-snapshot claim is made. `updatedAt` comparison is a consistency check, not a provider-enforced snapshot guarantee.

| Input                                      | Verified result                                                                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete transport and identifier coverage | Full authenticated traversal and independent identifier sets agree for the observed 3,032 issues.                                                                                                   |
| Source freshness                           | Unverified: one concurrent update, followed by a rate-limited retry.                                                                                                                                |
| Workstream metadata                        | All 3,032 returned issues lack a `workstream:*` label; local mapping proposals are not ingestion inputs.                                                                                            |
| SPE-3276 feed                              | No authoritative complete feed located or qualified in the inspected owner records, referenced GitHub mirror and implementation/artifact sources. Done status and fixtures do not establish a feed. |
| Production projection                      | Not generated or activated; the issue remains In Progress, its parent stays open and downstream work stays blocked.                                                                                 |

The precise missing feed input is a versioned authoritative SPE-3276 artifact with provenance/source revision, the exact identifiers of a current complete retrieval, and a verified implementation-evidence state plus material-drift classification for each record. No classifier or synthetic all-clear feed is introduced. Verified conflicts may remain explicitly non-runnable; they need not be repaired before a safe projection can exist.

Focused Node 22 coverage includes multi-project issue pages, later label/relationship pages, blocker direction, archived prerequisites, ambiguous ownership, malformed/repeated/overlapping pages, identity/revision changes, HTTP/GraphQL failures, output preservation and legacy CLI behavior. Freshness reconciliation after rate limits, authoritative workstream metadata and the qualified evidence feed remain existing readiness inputs; this transport correction does not close the full issue.
