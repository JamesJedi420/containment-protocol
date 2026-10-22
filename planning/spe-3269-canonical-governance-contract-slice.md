# SPE-3269 — Canonical governance contract and authority semantics

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (PR #4349 @ `7c50767`) |
| **Issue** | [SPE-3269](https://linear.app/spectranoir/issue/SPE-3269) |
| **Parent** | [SPE-3261](https://linear.app/spectranoir/issue/SPE-3261) — Backlog |
| **Branch** | `governance/spe-3269-canonical-authority-contract` |
| **Base** | `10e47ef6278e662b2d306afe3cce7657d3119989` |
| **Project** | Containment Protocol — shared governance tooling, single canonical owner SPE-3261 |

## Approved implementation boundary

Encode approved authority hierarchy, versioned stable rule IDs, mutation classes and sequential approval phases, candidate dispositions, provenance/source classification, fail-closed stale/missing/superseded/contradictory approval handling, bounded non-scope maintenance, and deterministic reviewer degradation semantics in one machine-readable data contract.

The artifact represents existing user-approved governance and Linear-approved program scope **without independently granting any policy authority**. Consumer-facing validation must reject incomplete, unknown, lower-authority-promoted, and version-incompatible semantics. Pure evidence inspection is read-only; actual Linear write-adapter authorization is owned by SPE-3272, and active-surface projections/CI conformance by SPE-3271.

No Linear scope or relationship mutation. No GameState, gameplay, balance, content or player-facing UI work.

## Verification

- Contract validation rejects incomplete/unknown critical fields and duplicated IDs, bad authority precedence, invalid rule provenance, phase disorder, and unknown versions.
- Deterministic read-only evidence diagnostics cover incomplete/stale/superseded/conflicting approvals, lifecycle versus backlog-shape separation, maintenance misuse, and reviewer availability.
- Contract tests run as part of the repository CI test suite.
- `npm run verify:backlog-handoff` checks the current repository handoff, including this slice's shipped status.

## Deferred ownership

| Item | Existing approved owner | Boundary |
| --- | --- | --- |
| Guard actual Linear mutation adapters and official automation | SPE-3272 | Do not claim universal interception |
| Project/check active policy surfaces and CI conformance | SPE-3271 | Do not create another projection framework |
| Audit Linear ↔ GitHub state/parent completion | SPE-3276 | Blocked by SPE-3272 |
| Candidate transport and approved lifecycle replay | SPE-3274 / SPE-3340 | Distinct pending-candidate versus approved-evidence channels |

## Selection and evidence

Selected during requested General Recursive Improvement continuation on 2026-10-21 after verifying PR #4347 merged with passing Test workflow, no open PRs, no active CP implementation issues, manifest In progress empty, and SPE-3269 unblocked with no child issues. Compared SPE-1052 (parent), SPE-1060/SPE-792 (larger game-system dependencies), SPE-3271/SPE-3272 (blocked by this contract), and SPE-3269 (single non-game contract prerequisite for both). No new parent/child or approval phase was inferred; the issue already exists with approved boundaries.