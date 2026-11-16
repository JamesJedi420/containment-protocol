# SPE-3758 — versioned implementation-evidence feed

- **Linear owner:** SPE-3758, child of SPE-3261; In Progress.
- **Branch:** `codex/spe-3758-evidence-feed`.
- **Base:** `201d68d667568adec01da5cd4b6ef54c352f5333` (`main`, 2026-11-16); original preflight base `ecb5d41fa6bbdc1685b43f46273cae45813e37ef`.
- **Boundary:** Read-only packaging of owner-assessed SPE-3276 findings, exact Linear and GitHub revision checks, and SPE-3338 consumer validation. No new classifier, evidence index, Linear mutation, workstream assignment, or game runtime change.

## Acceptance and evidence

The producer accepts only exact JSON findings in current SPE-3276 assignee-authored comments on SPE-3276. It checks comment ID, body, revision and issue ownership, then independently re-reads the configured Linear project issue identities and revisions. It records the current GitHub main SHA before and after the read. Complete feeds require one verified finding per issue; partial, stale or unsupported inputs yield non-qualifying diagnostics without replacing a prior feed. SPE-3338 compares the feed to its own current Linear retrieval and GitHub main SHA, then independently re-reads the source comments before exporting. Workstream metadata remains an independent eligibility gate.

The four named `workstream:*` labels exist in the current Linear workspace, and SPE-3276/SPE-3338 currently carry `workstream:shared-system`. Label existence and these two records do not verify workstream coverage for the configured issue set. A bounded read of SPE-3276's current comments found no machine-readable per-issue findings; the producer therefore cannot qualify a complete live feed yet.

Focused tests cover deterministic output, missing/extra/duplicate/stale findings, SPE-175 conflict, child-only parent evidence, SPE-1013 number coincidence, source-comment revision/owner verification, pagination, consumer rejection, and output preservation. The live SPE-3276 issue currently has no per-issue JSON finding comments, so no complete feed or runnable projection is claimed. The previously observed 3,032-issue retrieval had missing workstream labels and an unresolved freshness retry; a fresh complete read is still required.

Local checks at this branch: `npm run test:approved-work` passed 41/41; the combined approved-work and engineering-summary regression run passed 60/60; `npm run lint` passed; Prettier passed on the eight changed files. The workspace-wide Windows `format:check` reported formatting warnings across unrelated baseline files and was stopped. Local `npm run build` with Node 24 and a linked existing `node_modules` failed on 27 TypeScript errors in unrelated `src/test/*.contract.test.ts` files; this is not a Node 22 clean-install result. CI remains the required clean-environment gate.

## Next verification

Confirm an authoritative per-issue SPE-3276 assessment source and explicit workstream classification for the entire configured retrieval. Run the producer and exporter against current Linear and GitHub revisions. Keep SPE-3338 In Progress until both gates pass.
