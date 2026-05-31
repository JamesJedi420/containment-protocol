# SPE-1309 — Self-censoring information registry slice 1

One-page implementation plan. Linear: [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) (child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309)). Complements shipped [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) (investigation exposure / fuzzy-clue registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2108 — Self-censoring information registry slice 1](https://linear.app/spectranoir/issue/SPE-2108)  |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine                |
| **Branch** | `jamesdyedbq/spe-2108-self-censoring-information-registry-negative-facts-retention`                         |
| **Status** | **Shipped** — PR #2429                                                                                     |

## Goal

Add a pure deterministic **self-censoring information registry** for ideas that resist spread through forgetting, aversion, record decay, or cognition failure — without importing external wiki division names, object numbers, or character canon.

## Prerequisite (on `main` @ `20a11678`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Fuzzy-clue registry  | `src/domain/investigationExposureClueRegistry.ts` (SPE-2159)           |
| Intake registry wave | SPE-2105 / SPE-2106 / SPE-2104 sibling patterns                        |
| Concealment activation | SPE-2107 — distinct from institutional memory attack (boundary)    |

## Gap (pre-slice)

- No bounded schema for information that resists institutional memory.
- No deterministic validation for negative facts, retention decay, or rediscovery loops.
- No fallible dossier projection that surfaces contradictions before hazard labels.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `SelfCensoringInformationId` + `SelfCensoringInformationRecord` in `src/domain/selfCensoringInformationRegistry.ts`                | GameState persistence                         |
| propagationResistance, negativeFacts, retentionDecayTimer, rediscoveryLoop, informationFailureMode, usableArchiveState, absenceSignals | SPE-1309 unified engine wire-up              |
| `validateSelfCensoringInformationRecord(record)` — deterministic lint (warnings + errors)                                        | Investigation UI (E54)                        |
| `projectAntimemeticCaseView(record, policy)` — contradiction-first dossier projection                                              | Full SPE-1309 parent Done                       |
| Focused tests in `src/test/selfCensoringInformationRegistry.test.ts`                                                               | Memory erasure as frictionless cleanup        |

## Record contract (deterministic)

### Core fields

- **propagationResistance** — forgetting, aversion, record_decay, cognition_fail, transmission_block, retrieval_block.
- **negativeFacts** — explicit not-known predicates with optional scope.
- **retentionDecayTimer** — weeks until cognition leak.
- **rediscoveryLoop** — loopCount, lastAlarmWeek, forgottenWarningRefs.
- **informationFailureMode** — record_ok_cognition_fail, record_fail, transmission_fail, retrieval_fail, interpretation_fail.
- **usableArchiveState** — stored, unusable, study_blocked.
- **absenceSignals** — missing_roster, empty_budget_line, unclaimed_room, orphaned_equipment, silent_comm_channel.
- **confidence / unknown / redacted** — projection legibility without dumping hidden truth.

### Validation rules (examples)

- negativeFacts without parentCaseRef → warning.
- rediscoveryLoop without loopCount → error.
- loopCount 0 with alarm/warning refs → error.
- study_blocked without mediumIntegrityNotes → warning.
- franchise/source-literal token in any string field → error.

## Acceptance

- [x] Fixture: negativeFacts + retentionDecayTimer + rediscovery loopCount 2.
- [x] informationFailureMode record_ok_cognition_fail validates with mediumIntegrityNotes.
- [x] absenceSignals round-trip without implying confirmed entity.
- [x] Negative: loopCount 0 with alarm ref → error.
- [x] Negative: projection/validation rejects franchise label token.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + negative lint cases.
3. **Projection** — contradiction-first dossier view.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                       |
| ------ | ----------------------------------------------------------- |
| Domain | `src/domain/selfCensoringInformationRegistry.ts`            |
| Tests  | `src/test/selfCensoringInformationRegistry.test.ts`         |

## Branch

`jamesdyedbq/spe-2108-self-censoring-information-registry-negative-facts-retention`

## Out of scope (parent closure)

- Full SPE-1309 parent Done
- GameState persistence and weekly orchestration wiring
- SPE-854 unusable-archive routing integration

## See also

- `src/domain/investigationExposureClueRegistry.ts` — sibling intake registry pattern (SPE-2159)
- `src/domain/extranormalEventRegistry.ts` — validation + projection conventions (SPE-2105)
