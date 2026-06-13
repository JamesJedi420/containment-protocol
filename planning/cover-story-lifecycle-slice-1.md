# SPE-1347 — Cover-story lifecycle registry slice 1

One-page implementation plan. Linear: child under [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347). Follows shipped truth-layer cover pairing (`planning/truth-layer-cover-narrative-pairing-slice-1.md`, PR #2778).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | Cover-story lifecycle registry slice 1 — child under SPE-1347                                            |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) — Cover-story lifecycle state machine; stays **Backlog** |
| **Branch** | `spe-1347-cover-story-lifecycle-slice-1`                                                                   |
| **Base `main` SHA** | `89dc16c7`                                                                                          |

## Goal

Add a pure deterministic **cover-story lifecycle registry** with lifecycle phase enum, validation, read-time projection helpers, and truth-layer dual-incident pairing anchor — without a full contradiction engine, SPE-861 disclosure UI, or mission triage changes.

## Prerequisite (on `main` @ `89dc16c7`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Truth-layer registry | `src/domain/truthLayerRecordRegistry.ts` (SPE-2447 / PR #2772)         |
| Cover narrative pairing | `src/domain/truthLayerCoverNarrativePairing.ts` (PR #2778)           |
| Public disclosure registry | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109) — sibling; do not extend |
| Case lifecycle pattern | `src/domain/caseLifecycleStateMachine.ts` (SPE-1310 slice 1)         |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `CoverStoryRecordId` + `CoverStoryRecord` in `coverStoryLifecycleRegistry.ts` | Full contradiction engine          |
| Lifecycle phase enum + transition graph + event helpers            | SPE-861 disclosure UI                         |
| `validateCoverStoryRecord(record)` — deterministic lint              | Mission triage expansion                      |
| `projectCoverStoryLifecycleView(record, policy)` — read-time projection | `advanceWeek` orchestration hook       |
| `sanitizeCoverStoryRecords` with bounds + invalid transition rejection | GameState persistence wire-up          |
| `resolveCoverStoryTruthLayerAnchor` — dual-incident pairing anchor   | SPE-1309 unified engine                       |
| Coastal campus + institutional face-saving fixtures                  | Coercive protocol mirror (just shipped)       |
| Domain fixture + sanitize + projection tests                         | SPE-1347 parent Done                          |
| Slice doc (this file) + backlog handoff                              | Witness normalization (SPE-899)               |

## Lifecycle contract (deterministic)

### Phases

- **drafted** — creation / not yet deployed.
- **maintained** — active cover maintenance.
- **stressed** — contradiction accumulation without collapse.
- **collapsed** — public cover failed.
- **repairing** — repair attempt in progress.
- **abandoned** / **replaced** — terminal phases.

### Core fields

- **lifecyclePhase** — current phase; must match `transitionHistory` terminal phase when history present.
- **coverMotivation** — shame, reputation_protection, institutional_face_saving, social_anxiety, tactical_secrecy.
- **exposureKind** — paranormal, social, political, personal, institutional.
- **contradictionChannels** — witness_testimony, institutional_records, digital_traces, family_suspicion, active_surveillance with 0..1 accumulation scores.
- **repairActionHistory** — append-only staged responses (reinforcement, revision, suppression, replacement, abandonment).
- **linkedTruthLayerRef** — optional hook to truth-layer cover narrative record; resolved via `resolveCoverStoryTruthLayerAnchor`.
- **linkedDisclosureRef** — optional hook to disclosure record; does not extend `PublicDisclosureRecord`.
- **confidence / unknown / redacted** — projection legibility without dumping hidden operational truth.

### Validation rules (examples)

- Missing `id`, `label`, `subjectRef`, or invalid phase/kind → error.
- Invalid lifecycle transition in `transitionHistory` → error (rejected at sanitize).
- `lifecyclePhase` mismatch with history terminal phase → error.
- Repair actions out of week order → error.
- Repair after abandonment in history → warning.
- Collapsed with pending repair → warning.
- Franchise / source-literal token in any string field → error.

## Acceptance

- [x] Cover stories exist in distinct lifecycle phases with explicit transition graph
- [x] Contradiction channels accumulate scores without projection revealing hidden operational truth
- [x] Institutional face-saving fixture covers non-paranormal political exposure
- [x] Repair action history supports stabilization vs worsened outcomes
- [x] Truth-layer dual-incident pairing anchor resolves coastal campus cover narrative sibling
- [x] Empty map sanitize no-op without throw
- [x] Invalid phase transitions rejected at sanitize
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coverStoryLifecycleRegistry.ts`, `src/domain/coverStoryLifecycleTruthLayerAnchor.ts` |
| Tests  | `src/test/coverStoryLifecycleRegistry.test.ts`                        |
| Plan   | `planning/cover-story-lifecycle-slice-1.md`, `planning/backlog.md`    |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| GameState persistence + hydrate wire | SPE-1347 slice 2 | Registry anchor must land first |
| `advanceWeek` lifecycle tick / contradiction accumulation engine | SPE-1347 follow-up | Requires persisted records + trigger sources |
| Full contradiction engine across channels | SPE-1347 | Out of slice-1 schema boundary |
| Disclosure campaign player UI | SPE-861 | Out of domain wire-up boundary |
| Witness normalization wire-up | SPE-899 | Sibling deferred work |

## See also

- `planning/truth-layer-cover-narrative-pairing-slice-1.md`
- `src/domain/publicDisclosureStateRegistry.ts` — sibling registry; `coverCapacityFailure` hook only
- `src/domain/caseLifecycleStateMachine.ts` — transition graph pattern
