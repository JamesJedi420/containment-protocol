# SPE-3337 — Implementation-agent designation provenance

| Field      | Value                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| **Status** | **In Progress**                                                                    |
| Owner      | SPE-3337; shared-system-owned, Containment Protocol Tooling / Developer Experience |
| Branch     | `codex/spe-3337-designation-provenance`                                            |
| Base main  | `387f5b85824ec0390ff5c07462c20fce1952722f`                                         |

## Boundary and plan

Implement the original approved issue-scoped designation-provenance acceptance through the existing preflight envelope. Preserve sourced preferences, explicit UTC time only when evidenced, unknown historical time, superseded history and conflicts. Project optional stale evidence without turning a preference into an exclusive execution lock. Keep human assignment, scope approval, executor acceptance and session activity distinct. CP and Academy use one contract.

Add the optional schema/projection module, integrate input/output with the existing evaluator, cover positive/adversarial cases through its current validator, and update operator documentation. No new transport, authority, scheduler, assignment writer, dependency or gameplay changes. Portable human presentation and follow-up classification remain outstanding parent acceptance; this slice cannot close the parent.

## Evidence and audit

Fresh Linear read confirmed the existing approved owner In Progress with no blockers or parent. Main and managed worktree were clean at the base SHA, no PRs were open, and the CLI with current diagnostics returned ready before branching. No new issue or relationship was created.

Focused tests cover all four workstreams, legacy absence, unknown historical time, explicit supersession, deterministic ordering, stale/future/conflicting evidence, retained required readiness failures, malformed/duplicate/cyclic records and unsupported timestamp precision. Run SPE-3348 selected validators and independent full-diff review before merge. Six audit passes cover integration, edges, deterministic isolation, regressions, docs/projections and cleanup.

The focused run passed 52 tests. The edge audit tightened chronological checks across undated intermediate supersession records. A live issue-description read at `2026-11-06T10:35:19Z` confirmed the explicit Codex preference; the CLI retained it with null historical designation time, nonexclusive preference-only authority, and unverified acceptance/activity. Overall start remained correctly blocked on the attached dirty implementation checkout. This actual read/CLI evidence is distinct from controlled fixtures; no history timestamp was inferred from the read.

Prior unsupported Hermes mapping retains the documented direct fallback. Short validation/review checks run directly; Freebuff remains disabled. Post-merge evidence belongs on SPE-3337 and must keep incomplete parent acceptance visible.
