# SPE-75 — Publish automation and crediting hooks (slice 1)

One-page implementation plan. Linear: [SPE-2480](https://linear.app/spectranoir/issue/SPE-2480) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural continuation after [SPE-2479](https://linear.app/spectranoir/issue/SPE-2479) per `planning/modifiable-data-pack-validation-slice-1.md` ## Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2480 — Publish automation and crediting hooks (slice 1)](https://linear.app/spectranoir/issue/SPE-2480) |
| **Status** | **Shipped** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear |
| **Branch** | `spe-75-publish-automation-crediting-hooks-slice-1` |
| **Base `main` SHA** | `2a56d78c` |

## Goal

Implement a pure domain module that composes packaged release, applied governance, and crediting manifest inputs into a bounded publish-intent decision (crediting metadata, changelog targets, release manifest hooks) without actual publish execution, UI, or GameState persistence writes.

## Prerequisite (on `main`)

| Existing surface | Anchor |
| ---------------- | ------ |
| Packaged release envelope | `src/domain/modularReleasePackaging.ts` (SPE-2475) |
| Applied governance metadata | `src/domain/submissionGovernanceRights.ts` (SPE-2478) |
| Accepted curation chain | `src/domain/contributionIntakeCuration.ts` (SPE-2474) |
| Projection test style | `src/test/modularReleasePackaging.test.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New pure domain module for publish-intent + crediting hook envelopes | Actual publish execution or CI automation |
| Packaged-only + applied-governance upstream gates | Route/UI/persistence changes |
| Deterministic crediting and publish hook descriptors | Modifiable data-pack runtime import wiring |
| Targeted unit tests + fixtures | Mission triage (blocked) |
| | Changes to upstream curation/packaging/governance modules beyond read-only composition |

## Publish contract

- **Packaged-only gate** — non-packaged release envelopes reject before crediting evaluation.
- **Applied-governance gate** — non-applied governance decisions reject before crediting evaluation.
- **Pure deterministic evaluation** — same upstream envelopes + manifest yields byte-identical decision.
- **Safe-fail validation** — malformed upstream or manifest payloads return structured errors, never throw during normal evaluation.
- **Bounded statuses** — only `ready_to_publish`, `needs_revision`, `rejected` in this slice.
- **Sorted hook descriptors** — hook kind then target then payload, localeCompare.
- **No side effects** — no persistence changes, no route/UI requirements, no publish execution.

## Acceptance

- [x] Canonical upstream fixture chain returns `ready_to_publish` with stable crediting and publish hooks.
- [x] Non-packaged release or non-applied governance returns `rejected` with deterministic reason codes.
- [x] Borderline crediting manifest returns `needs_revision` with bounded remediation notes.
- [x] Repeated evaluations are byte-identical for the same input set.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishAutomationCreditingHooks.ts` |
| Tests  | `src/test/publishAutomationCreditingHooks.test.ts` |
| Plan   | `planning/publish-automation-crediting-hooks-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Runtime publish executor / CI wiring | SPE-75 follow-up child | Requires automation integration beyond hook envelope |
| GameState persistence for publish queue | [SPE-2483](https://linear.app/spectranoir/issue/SPE-2483) | Shipped in follow-up slice |

## See also

- `planning/modifiable-data-pack-validation-slice-1.md`
- `docs/contribution-and-release-operations.md`
- `planning/backlog.md`
