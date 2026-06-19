# SPE-75 — Modifiable data-pack publish automation integration (slice 3)

One-page implementation plan. Linear: [SPE-2494](https://linear.app/spectranoir/issue/SPE-2494) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural next deferred item from [SPE-2492](https://linear.app/spectranoir/issue/SPE-2492) / [SPE-2493](https://linear.app/spectranoir/issue/SPE-2493) slice docs § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2494 — Modifiable data-pack publish automation integration (slice 3)](https://linear.app/spectranoir/issue/SPE-2494) |
| **Status** | **In progress** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-modifiable-data-pack-publish-automation-integration-slice-3` |
| **Base `main` SHA** | `ab890d33` |

## Goal

Wire validated modifiable data-pack import into the publish automation / contribution pipeline — connect `composeModifiableDataPackRecord` and the SPE-2479 validation envelope to the SPE-2480 publish-intent flow. No mirror UI changes, weekly tick changes, or SPE-75 parent reopen.

## Prerequisite (on `main` @ `ab890d33`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Validation envelope  | `src/domain/modifiableDataPackValidation.ts` (SPE-2479) |
| Runtime persistence | `modifiableDataPackRecords` on `GameState` (SPE-2486) |
| Publish-intent evaluation | `src/domain/publishAutomationCreditingHooks.ts` (SPE-2480) |
| Upstream contribution chain | `contributionIntakeCuration.ts`, `modularReleasePackaging.ts`, `submissionGovernanceRights.ts` (SPE-2474–2478) |
| Weekly governance tick | `modifiableDataPackWeeklyOrchestration.ts` (SPE-2493, read-only downstream) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Domain integration module bridging pack import → publish-intent | Mirror UI changes |
| `composeModifiableDataPackRecord` as single import path into integration | Weekly `advanceWeek` orchestration changes |
| Publish-intent envelope aligned with validation `importStatus` | Publish-queue executor / GitHub client |
| Targeted domain unit tests + fixtures | Mission triage chips (blocked) |
| Slice doc (this file) + backlog handoff | SPE-75 parent reopen |
| Docs cross-ref in `docs/contribution-and-release-operations.md` | GameState execution-receipt persistence (alternate tail) |

## Integration contract

| Input | Behavior |
| --- | --- |
| Rejected / invalid pack payload | Return integration envelope with `record: null`; no publish-intent side effects; no throw |
| `needs_revision` pack record | Compose record; publish-intent returns `needs_revision` or rejects per upstream gates — import status stays aligned with validation decision |
| `applied` pack + canonical upstream chain | Compose record; publish-intent returns `ready_to_publish` with stable hook descriptors |
| Empty / undefined payload | No-op; `record: null`; publish-intent absent or rejected without throw |
| Duplicate compose paths | Single entry point delegates to `composeModifiableDataPackRecord` — no parallel import logic |
| Determinism | Same inputs yield byte-identical integration envelope; sorted reason codes and hook descriptors |

## Proposed domain surface

New module `src/domain/modifiableDataPackPublishIntegration.ts` (name may adjust to match repo conventions):

| Function | Role |
| --- | --- |
| `evaluateModifiableDataPackPublishIntegration(input)` | Orchestrates pack compose → contribution curation → release packaging → governance → publish-intent |
| `ModifiableDataPackPublishIntegrationEnvelope` | Bounded result: optional `record`, optional `publishDecision`, validation issues, reason codes |

Integration input bundles:

- `packPayload` — `ModifiableDataPackPayload` (required for compose)
- `contributionPayload` — `ContributionSubmissionPayload` (or derived from pack `authorRef` / `issueLink` when omitted)
- `releaseManifest` — `ReleaseArtifactManifest`
- `governancePayload` — submission governance fixture shape
- `creditingManifest` — `PublishCreditingManifest`
- Optional policy objects per upstream module

**Do not** add a second compose path in `runTransfer` or weekly orchestration — integration is pure domain composition for callers that need import + publish-intent in one deterministic step.

## Acceptance

- [x] Canonical fixture chain: `applied` pack record + `ready_to_publish` publish-intent with stable hooks
- [x] Invalid / rejected pack payloads return `record: null` without corrupting publish-intent envelope
- [x] Borderline `needs_revision` pack preserves aligned `importStatus` and bounded publish-intent status
- [x] Empty payload / empty map inputs no-op without throw
- [x] Repeated evaluations byte-identical for same input set
- [x] `npm run lint` + targeted tests green (6 tests via vitest; npm not on agent PATH)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/modifiableDataPackPublishIntegration.ts` (new), possible thin re-exports in `modifiableDataPackValidation.ts` or `publishAutomationCreditingHooks.ts` only if needed for fixture sharing |
| Tests  | `src/test/modifiableDataPackPublishIntegration.test.ts` |
| Plan   | `planning/modifiable-data-pack-publish-automation-integration-slice-3.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Risks and edge cases

| Risk | Mitigation |
| --- | --- |
| Rejected payloads persist | Integration returns `record: null`; callers must not write to `modifiableDataPackRecords` |
| `importStatus` drift | Reuse `validateModifiableDataPackRecord` alignment checks; integration must not override validation decision |
| Duplicate import paths | All compose flows delegate to existing `composeModifiableDataPackRecord` |
| Non-deterministic ordering | Freeze envelopes; sort reason codes and hooks via existing upstream helpers |
| Upstream gate mismatch | Pack `applied` does not bypass contribution/packaging/governance gates — document gate order in tests |

## Implementation sequence

1. Branch from `main` @ `ab890d33`: `spe-75-modifiable-data-pack-publish-automation-integration-slice-3`
2. Move SPE-2494 to **In Progress** on Linear
3. Define integration envelope types + `evaluateModifiableDataPackPublishIntegration`
4. Wire upstream chain read-only (mirror `publishAutomationCreditingHooks.test.ts` fixture chain)
5. Add targeted tests: canonical, rejected, borderline, empty, determinism
6. Update `docs/contribution-and-release-operations.md` § Modifiable data packs
7. Pre-ship audit → commit → push → PR → babysit → merge → Linear Done

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| GameState execution-receipt persistence | SPE-75 follow-up child | Optional ledger beyond integration envelope |
| Mission triage modifiable-pack chips | Backlog | Mission triage full refresh blocked |
| Runtime wire integration into `runTransfer` | Out of slice unless required for acceptance | Pure domain boundary first |

## See also

- `planning/modifiable-data-pack-weekly-orchestration-slice-2.md`
- `planning/modifiable-data-pack-runtime-import-slice-1.md`
- `planning/publish-automation-crediting-hooks-slice-1.md`
- `planning/backlog.md`
