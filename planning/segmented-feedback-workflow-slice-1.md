# SPE-75 — Segmented/weighted feedback workflow (slice 1)

One-page implementation plan. Linear: [SPE-2476](https://linear.app/spectranoir/issue/SPE-2476) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural continuation after [SPE-2475](https://linear.app/spectranoir/issue/SPE-2475) per `planning/modular-release-packaging-slice-1.md` ## Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2476 — Segmented/weighted feedback workflow (slice 1)](https://linear.app/spectranoir/issue/SPE-2476) |
| **Status** | **In Progress** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent remains open for deferred follow-ups |
| **Branch** | `spe-75-segmented-feedback-workflow-slice-1` |
| **Base `main` SHA** | `7d72f39c` |

## Goal

Implement a pure domain module that accepts structured feedback channel payloads and emits bounded scoring/ranking decisions (channel type, weight, grouping policy) without UI, persistence writes, or publish actions.

## Prerequisite (on `main`)

| Existing surface | Anchor |
| ---------------- | ------ |
| Decision envelope patterns | `src/domain/contributionIntakeCuration.ts` (SPE-2474) |
| Freeze/sort idioms | `src/domain/modularReleasePackaging.ts` (SPE-2475) |
| Projection test style | `src/test/contributionIntakeCuration.test.ts`, `src/test/modularReleasePackaging.test.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New pure domain module for feedback channel scoring/ranking | Publish actions or release automation |
| Channel-type discrimination (bug/balance/security/RFC) | Curation and packaging pipelines |
| Weight policy and grouping policy envelope | Playbook wrong-document failure mechanics |
| Targeted unit tests + fixtures | Route/UI/persistence changes |
| Slice doc + backlog handoff | Rights governance automation |

## Feedback contract

- **Pure deterministic evaluation** — same batch + policy yields byte-identical ranking decision.
- **Safe-fail validation** — malformed payloads return structured validation errors, never throw during normal evaluation.
- **Bounded statuses** — only `ranked`, `needs_revision`, `rejected` in this slice.
- **Channel weights** — security > bug > balance > RFC by default; partial policies fall back to defaults.
- **Sorted ranked outputs** — weighted score descending, then feedbackId localeCompare.
- **No side effects** — no persistence changes, no route/UI requirements, no publish actions.

## Acceptance

- [x] Canonical feedback fixture returns `ranked` with stable ranked entries.
- [x] Invalid channel/weight returns `rejected` with deterministic reason codes.
- [x] Borderline confidence returns `needs_revision` with bounded remediation notes.
- [x] Repeated evaluations are byte-identical for the same input set.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/segmentedFeedbackWorkflow.ts` |
| Tests  | `src/test/segmentedFeedbackWorkflow.test.ts` |
| Plan   | `planning/segmented-feedback-workflow-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Playbook variant mismatch deterministic failure | SPE-75 follow-up child | Separate mechanic with its own fixtures and acceptance |
| Submission governance and rights policy enforcement | SPE-75 follow-up child | Requires policy artifact model beyond feedback baseline |
| Publish automation and crediting hooks | SPE-75 follow-up child | Out of slice 1 boundary — ranking envelope only |

## See also

- `planning/modular-release-packaging-slice-1.md`
- `docs/contribution-and-release-operations.md`
- `planning/backlog.md`
