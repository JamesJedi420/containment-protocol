# SPE-75 — Contribution intake curation pipeline (slice 1)

One-page implementation plan. Linear: [SPE-2474](https://linear.app/spectranoir/issue/SPE-2474) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). This slice establishes the deterministic submission-to-curation-decision baseline before release packaging, segmented feedback, and playbook variants.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2474 — Contribution intake curation pipeline (slice 1)](https://linear.app/spectranoir/issue/SPE-2474) |
| **Status** | **Shipped** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent remains open |
| **Branch** | `spe-75-contribution-intake-curation-pipeline-slice-1` |
| **Base `main` SHA** | `3f92bb49` |

## Goal

Implement a deterministic contribution-intake curation pipeline that evaluates structured submission payloads, validates schema conformance, and emits bounded curation decisions (`accepted`, `needs_revision`, `rejected`) without persistence writes or publishing side effects.

## Prerequisite (on `main`)

| Existing surface | Anchor |
| ---------------- | ------ |
| Pattern intake registry lineage | `src/domain/patternSourceSeriesRegistry.ts` and related SPE-2110 slices |
| Existing deterministic domain helper style | `src/domain/*` pure compose/project helpers |
| Existing projection test style | `src/test/*` domain-focused deterministic fixtures |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New pure domain module for submission validation + curation decisioning | External submission platform integration |
| Deterministic schema validation errors for malformed payloads | Rights/licensing governance automation |
| Curation decision output envelope (reason codes + notes) | Modular release packaging and compatibility matrix |
| Targeted unit tests for valid/invalid and deterministic ordering behavior | Segmented tester feedback weighting |
| Slice doc + backlog handoff update | Disaster playbook wrong-document failure mechanics |

## Curation contract

- **Pure deterministic evaluation** — same payload + policy input yields byte-identical decision output.
- **Safe-fail validation** — malformed submissions return structured validation errors, never throw during normal evaluation.
- **Bounded decisions** — only `accepted`, `needs_revision`, `rejected` statuses in this slice.
- **Reason-coded output** — each non-accept path includes deterministic reason codes for downstream routing.
- **No side effects** — no persistence changes, no route/UI requirements, no publish actions.

## Acceptance

- [x] Valid canonical submission fixture returns `accepted` with stable normalized metadata.
- [x] Missing/invalid required fields return `rejected` with deterministic validation reason codes.
- [x] Borderline fixture returns `needs_revision` with bounded remediation notes.
- [x] Repeated evaluations are byte-identical for the same input set.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/contributionIntakeCuration.ts` |
| Tests  | `src/test/contributionIntakeCuration.test.ts` |
| Plan   | `planning/contribution-intake-curation-pipeline-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Modular release packaging and compatibility declarations | SPE-75 follow-up child | Requires post-curation artifact pipeline beyond this intake baseline |
| Segmented/weighted feedback workflow | SPE-75 follow-up child | Needs dedicated scoring/ranking model and policy shape |
| Playbook variant mismatch deterministic failure | SPE-75 follow-up child | Separate mechanic with its own fixtures and acceptance |
| Submission governance and rights policy enforcement | SPE-75 follow-up child | Requires policy artifact model not needed for intake baseline |

## See also

- `planning/pattern-source-series-registry-slice-4.md`
- `planning/backlog.md`
