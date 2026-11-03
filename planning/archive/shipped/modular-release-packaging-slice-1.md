# SPE-75 — Modular release packaging and compatibility declarations (slice 1)

One-page implementation plan. Linear: [SPE-2475](https://linear.app/spectranoir/issue/SPE-2475) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural continuation after [SPE-2474](https://linear.app/spectranoir/issue/SPE-2474) per `planning/contribution-intake-curation-pipeline-slice-1.md` ## Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2475 — Modular release packaging and compatibility declarations (slice 1)](https://linear.app/spectranoir/issue/SPE-2475) |
| **Status** | **Shipped** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent remains open for deferred follow-ups |
| **Branch** | `spe-75-modular-release-packaging-slice-1` |
| **Base `main` SHA** | `b44a3781` |

## Goal

Implement a pure domain module that consumes accepted contribution-intake curation output plus artifact manifest metadata and emits a bounded release-package envelope (artifact type, compatibility surfaces, delivery assumptions) without publish actions, UI, or persistence writes.

## Prerequisite (on `main`)

| Existing surface | Anchor |
| ---------------- | ------ |
| Accepted curation envelope | `src/domain/contributionIntakeCuration.ts` (SPE-2474 / PR #2867) |
| Registry validation/freeze idioms | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110) |
| Projection test style | `src/test/contributionIntakeCuration.test.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New pure domain module for post-curation release packaging | Publish actions or release automation |
| Accepted-only input gate on curation decision | Segmented/weighted feedback workflow |
| Compatibility declaration envelope with deterministic ordering | Playbook wrong-document failure mechanics |
| Artifact-kind branching (code/docs/content/mixed) | Rights governance automation |
| Targeted unit tests + fixtures | Route/UI/persistence changes |

## Packaging contract

- **Accepted-only gate** — non-accepted curation decisions reject before manifest evaluation.
- **Pure deterministic evaluation** — same curation decision + manifest yields byte-identical envelope.
- **Safe-fail validation** — malformed manifests return structured validation errors, never throw during normal evaluation.
- **Bounded statuses** — only `packaged`, `needs_revision`, `rejected` in this slice.
- **Sorted compatibility declarations** — surface kind then declaration text, localeCompare.
- **No side effects** — no persistence changes, no route/UI requirements, no publish actions.

## Acceptance

- [x] Canonical accepted curation + manifest fixture returns `packaged` with stable envelope.
- [x] Non-accepted curation or missing required compatibility fields return `rejected` with deterministic reason codes.
- [x] Borderline manifest returns `needs_revision` with bounded remediation notes.
- [x] Repeated evaluations are byte-identical for the same input set.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/modularReleasePackaging.ts` |
| Tests  | `src/test/modularReleasePackaging.test.ts` |
| Plan   | `planning/modular-release-packaging-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Segmented/weighted feedback workflow | SPE-75 follow-up child | Needs dedicated scoring/ranking model and policy shape |
| Playbook variant mismatch deterministic failure | SPE-75 follow-up child | Separate mechanic with its own fixtures and acceptance |
| Submission governance and rights policy enforcement | SPE-75 follow-up child | Requires policy artifact model beyond packaging baseline |
| Publish automation and crediting hooks | SPE-75 follow-up child | Out of slice 1 boundary — packaging envelope only |

## See also

- `planning/contribution-intake-curation-pipeline-slice-1.md`
- `docs/contribution-and-release-operations.md`
- `planning/backlog.md`
