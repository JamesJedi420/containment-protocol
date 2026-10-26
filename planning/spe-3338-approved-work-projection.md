# SPE-3338 — approved-work authority projection

Linear is the only issue lifecycle, relationship, blocker and explicit-priority authority. Roadmap phase interpretation is deferred to SPE-3339. `planning/backlog.md` and `planning/backlog-handoff-manifest.json` retain historical handoff evidence and **are not inputs** for executable work or priority.

## Authority ingestion

Export a **complete and current** read-only Linear snapshot into a local JSON file outside the repository. The exporter must explicitly attest `source: "Linear"`, `complete: true`, `workstreamCoverage: "all-approved"`, and `relationCoverage: "complete"`. It must include **every approved issue and its canonical dependency IDs**, including completed dependency records. Do not fabricate completeness flags for partial query results. Record `asOf` as the actual extraction timestamp.

Each issue must have: `id`, `approved: true`, `workstream` (one of CP-core, Academy, shared-system, cross-project derived from approved planning metadata), `statusType` (backlog/unstarted/started/completed/canceled, from Linear), `priority` (Linear 0–4), `blockedBy` and `dependsOn` (complete canonical Linear issue IDs), `implementationEvidence: {state}` and `evidenceDrift` (material conflict classification supplied by SPE-3276, not inferred from this projection). `implementationEvidence.state` is one of unstarted, partial, merged, current-main, superseded, missing, or evidence-conflicted. Do not infer Linear completion from merged evidence. If any required field, issue, relationship or source attestation is not verifiable, **do not produce a runnable queue**.

```sh
npm run test:approved-work
npm run project:approved-work -- /absolute/path/to/complete-linear-snapshot.json --write
npm run project:approved-work -- /absolute/path/to/complete-linear-snapshot.json --check
```

Projection output: `planning/approved-work-projection.json`. The check command returns nonzero if source data is incomplete or if existing projection bytes drift from deterministic regeneration. Active, runnable, and history are separate lists; dependency readiness, evidence conflicts, and Linear priority are preserved. A `started` issue with merged/current-main evidence stays active; only Linear terminal status moves it to history. A `shared-system` issue exists once, with canonical identity, and can gate dependent Academy and CP-core records. Consumers may use `filterWorkstream` without changing the underlying projection.

**Integration boundary:** This repository command consumes an externally supplied authoritative Linear snapshot. It does not yet fetch Linear on its own. The legacy `verify:backlog-handoff` continues to validate only historical handoff consistency; it does not certify authoritative queue freshness. Never use a projection as current planning authority without confirming its source snapshot freshness and full coverage. Do not attach a snapshot with private tokens to the repository.
