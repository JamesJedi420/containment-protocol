# SPE-75 — Modifiable data pack safe-fail validation (slice 1)

One-page implementation plan. Linear: [SPE-2479](https://linear.app/spectranoir/issue/SPE-2479) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural continuation after [SPE-2478](https://linear.app/spectranoir/issue/SPE-2478) per `planning/submission-governance-rights-slice-1.md` ## Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2479 — Modifiable data pack safe-fail validation (slice 1)](https://linear.app/spectranoir/issue/SPE-2479) |
| **Status** | **In Progress** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent remains open for deferred follow-ups |
| **Branch** | `spe-75-modifiable-data-pack-validation-slice-1` |
| **Base `main` SHA** | `940b27b2` |

## Goal

Implement a pure domain module that accepts structured modifiable data-pack payloads and emits deterministic schema-validation decisions with safe-fail on corrupt/malformed structure.

## Prerequisite (on `main`)

| Existing surface | Anchor |
| ---------------- | ------ |
| Decision envelope + safe-fail patterns | `src/domain/submissionGovernanceRights.ts` (SPE-2478) |
| Validation/freeze/sort idioms | `src/domain/playbookWrongDocumentFailure.ts` (SPE-2477) |
| Projection test style | `src/test/submissionGovernanceRights.test.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New pure domain module for modifiable data-pack schema validation | Publish actions or release automation |
| Safe-fail validation for malformed/corrupt payloads | Curation, packaging, feedback, playbook pipelines |
| Borderline schema version → `needs_revision` | Route/UI/persistence changes |
| Targeted unit tests + fixtures | Mission triage (blocked) |
| | Submission governance module changes |

## Validation contract

- **Pure deterministic evaluation** — same payload + policy yields byte-identical validation decision.
- **Safe-fail validation** — malformed payloads return structured validation errors, never throw during normal evaluation.
- **Bounded statuses** — only `applied`, `needs_revision`, `rejected` in this slice.
- **Schema version discrimination** — supported versions list with borderline below recommended threshold.
- **Section shape checks** — required keys, duplicate detection, field-type/default-value alignment.
- **No side effects** — no persistence changes, no route/UI requirements, no publish actions.

## Acceptance

- [x] Canonical pack fixture returns `applied` with stable pack metadata.
- [x] Corrupt structure returns `rejected` with deterministic reason codes.
- [x] Borderline schema version returns `needs_revision` with bounded remediation notes.
- [x] Repeated evaluations are byte-identical for the same input set.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/modifiableDataPackValidation.ts` |
| Tests  | `src/test/modifiableDataPackValidation.test.ts` |
| Plan   | `planning/modifiable-data-pack-validation-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Publish automation and crediting hooks | SPE-75 follow-up child | Out of slice 1 boundary — validation envelope only |
| Runtime import/persistence wiring for modifiable packs | SPE-75 follow-up child | Requires GameState integration beyond pure validation |

## See also

- `planning/submission-governance-rights-slice-1.md`
- `docs/contribution-and-release-operations.md`
- `planning/backlog.md`
