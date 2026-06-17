# SPE-75 — Disaster playbook wrong-document failure (slice 1)

One-page implementation plan. Linear: [SPE-2477](https://linear.app/spectranoir/issue/SPE-2477) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural continuation after [SPE-2476](https://linear.app/spectranoir/issue/SPE-2476) per `planning/segmented-feedback-workflow-slice-1.md` ## Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2477 — Disaster playbook wrong-document failure (slice 1)](https://linear.app/spectranoir/issue/SPE-2477) |
| **Status** | **Shipped** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent remains open for deferred follow-ups |
| **Branch** | `spe-75-playbook-wrong-document-failure-slice-1` |
| **Base `main` SHA** | `251c639d` |

## Goal

Implement a pure domain module that accepts structured playbook variant payloads and emits deterministic failure when the wrong disaster document is applied under pressure.

## Prerequisite (on `main`)

| Existing surface | Anchor |
| ---------------- | ------ |
| Decision envelope patterns | `src/domain/contributionIntakeCuration.ts` (SPE-2474) |
| Freeze/sort idioms | `src/domain/modularReleasePackaging.ts` (SPE-2475) |
| Segmented feedback baseline | `src/domain/segmentedFeedbackWorkflow.ts` (SPE-2476) |
| Projection test style | `src/test/segmentedFeedbackWorkflow.test.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New pure domain module for disaster playbook variant discrimination | Publish actions or release automation |
| Wrong-document failure under pressure | Feedback workflow, curation, packaging pipelines |
| Variant-type discrimination (fire/flood/containment breach/etc.) | Route/UI/persistence changes |
| Borderline partial-match → `needs_revision` | Rights governance automation |
| Targeted unit tests + fixtures | Mission triage (blocked) |

## Playbook contract

- **Pure deterministic evaluation** — same payload + policy yields byte-identical application decision.
- **Safe-fail validation** — malformed payloads return structured validation errors, never throw during normal evaluation.
- **Bounded statuses** — only `applied`, `needs_revision`, `rejected` in this slice.
- **Variant discrimination** — fire, flood, containment_breach, earthquake, chemical_spill.
- **Wrong-document failure** — mismatched variant types (no partial overlap) return `rejected` with `wrong_document_variant`.
- **Partial overlap** — related variant pairs (e.g. fire/chemical_spill) return `needs_revision` with bounded remediation notes.
- **No side effects** — no persistence changes, no route/UI requirements, no publish actions.

## Acceptance

- [x] Canonical playbook fixture returns `applied` with stable match metadata.
- [x] Wrong-document match returns `rejected` with deterministic reason codes.
- [x] Borderline partial match returns `needs_revision` with bounded remediation notes.
- [x] Repeated evaluations are byte-identical for the same input set.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/playbookWrongDocumentFailure.ts` |
| Tests  | `src/test/playbookWrongDocumentFailure.test.ts` |
| Plan   | `planning/playbook-wrong-document-failure-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Submission governance and rights policy enforcement | SPE-75 follow-up child | Requires policy artifact model beyond playbook baseline |
| Publish automation and crediting hooks | SPE-75 follow-up child | Out of slice 1 boundary — application envelope only |
| Modifiable data pack safe-fail validation | SPE-75 follow-up child | Separate mechanic with schema-check fixtures |

## See also

- `planning/segmented-feedback-workflow-slice-1.md`
- `docs/contribution-and-release-operations.md`
- `planning/backlog.md`
