# SPE-75 — Submission governance and rights policy enforcement (slice 1)

One-page implementation plan. Linear: [SPE-2478](https://linear.app/spectranoir/issue/SPE-2478) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural continuation after [SPE-2477](https://linear.app/spectranoir/issue/SPE-2477) per `planning/playbook-wrong-document-failure-slice-1.md` ## Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2478 — Submission governance and rights policy enforcement (slice 1)](https://linear.app/spectranoir/issue/SPE-2478) |
| **Status** | **Shipped** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent remains open for deferred follow-ups |
| **Branch** | `spe-75-submission-governance-rights-slice-1` |
| **Base `main` SHA** | `8fd639e0` |

## Goal

Implement a pure domain module that accepts structured submission governance payloads and emits deterministic rights/policy decisions (license declaration, noncanonical side-content flags, contributor attribution assumptions).

## Prerequisite (on `main`)

| Existing surface | Anchor |
| ---------------- | ------ |
| License remediation patterns | `src/domain/contributionIntakeCuration.ts` (SPE-2474) |
| Decision envelope + safe-fail patterns | `src/domain/playbookWrongDocumentFailure.ts` (SPE-2477) |
| Freeze/sort idioms | `src/domain/modularReleasePackaging.ts` (SPE-2475) |
| Projection test style | `src/test/playbookWrongDocumentFailure.test.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New pure domain module for submission governance and rights policy | Publish actions or release automation |
| Rights tier discrimination (canonical / noncanonical / fan_mod) | Curation, packaging, feedback, playbook pipelines |
| License declaration and noncanonical side-content flag policy | Route/UI/persistence changes |
| Borderline attribution → `needs_revision` | Mission triage (blocked) |
| Targeted unit tests + fixtures | Modifiable data pack validation |

## Governance contract

- **Pure deterministic evaluation** — same payload + policy yields byte-identical application decision.
- **Safe-fail validation** — malformed payloads return structured validation errors, never throw during normal evaluation.
- **Bounded statuses** — only `applied`, `needs_revision`, `rejected` in this slice.
- **Rights tier discrimination** — canonical, noncanonical, fan_mod with tier-specific policy rules.
- **License enforcement** — missing/blank license declarations reject when `requireLicenseDeclaration` is true (default).
- **Side-content flags** — fan_mod requires `noncanonicalSideContent: true`; canonical rejects when flag is set.
- **No side effects** — no persistence changes, no route/UI requirements, no publish actions.

## Acceptance

- [x] Canonical governance fixture returns `applied` with stable policy metadata.
- [x] Missing license returns `rejected` with deterministic reason codes.
- [x] Borderline attribution returns `needs_revision` with bounded remediation notes.
- [x] Repeated evaluations are byte-identical for the same input set.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/submissionGovernanceRights.ts` |
| Tests  | `src/test/submissionGovernanceRights.test.ts` |
| Plan   | `planning/submission-governance-rights-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Publish automation and crediting hooks | SPE-75 follow-up child | Out of slice 1 boundary — governance envelope only |
| Modifiable data pack safe-fail validation | SPE-75 follow-up child | Separate mechanic with schema-check fixtures |

## See also

- `planning/playbook-wrong-document-failure-slice-1.md`
- `docs/contribution-and-release-operations.md`
- `planning/backlog.md`
