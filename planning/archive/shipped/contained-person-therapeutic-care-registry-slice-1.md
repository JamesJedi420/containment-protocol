# SPE-2115 — Contained-person therapeutic care schedule registry slice 1

One-page implementation plan. Linear: [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) (child under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889)). Follows shipped [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) (entity welfare reclassification registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2115 — Contained-person therapeutic care schedule registry (slice 1)](https://linear.app/spectranoir/issue/SPE-2115) |
| **Parent** | [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) — Contained-person condition bundle and integrated health model |
| **Branch** | `jamesdyedbq/spe-2115-contained-person-therapeutic-care-schedule-registry-slice-1`                         |
| **Status** | **Shipped** — PR #2434                                                                                     |

## Goal

Add a pure deterministic **contained-person therapeutic care schedule registry** for cooperative human subjects and person-like entities requiring ongoing psychological or medical mediation as containment infrastructure — without importing external object numbers or franchise labels.

## Prerequisite (on `main` @ `7da4a060`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Entity welfare reclassification | `src/domain/entityWelfareReclassificationRegistry.ts` (SPE-2114 / PR #2433) |
| Visual-trigger hazard | `src/domain/visualTriggerHazardRegistry.ts` (SPE-2111 / PR #2432)   |
| Pattern source series | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110)               |
| Intake registry wave | SPE-2104 / SPE-2105 / SPE-2106 / SPE-2108 / SPE-2109 sibling patterns |
| Harvest batch        | `starter-picks-routing-65` (C29) in `planning/harvest-reconciliation-index.md` |

## Gap (pre-slice)

- No bounded schema for psych/medical care cadence, mediated channel state, or missed-session compliance tracking.
- No deterministic validation for suspended channels without documented cause or franchise tokens in CP-neutral fields.
- No care-compliance breach risk projection helper.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `TherapeuticCareScheduleId` + `TherapeuticCareScheduleRecord` in `src/domain/containedPersonTherapeuticCareRegistry.ts`              | GameState persistence                         |
| subjectRef, careMode, cadence, channelState, missedSessionStreak, staffAssigneeRefs, containmentDependency, suspensionCauseRef      | SPE-1889 integrated health bundle wire-up     |
| `validateTherapeuticCareScheduleRecord(record)` — franchise token → error; suspended without cause → warning                       | SPE-1046 detainee / patient status classes    |
| `projectCareComplianceRisk(record, policy)` — breach probability from missed sessions and channel degradation                        | Full SPE-1889 parent Done                     |
| Focused tests in `src/test/containedPersonTherapeuticCareRegistry.test.ts`                                                         | Field UI                                      |

## Record contract (deterministic)

### Core fields

- **subjectRef** — contained-person or person-like entity ref (CP-neutral internal id).
- **careMode** — `psych_screening`, `mediated_audio`, `visitation_ban`, `cooperative_checkin`.
- **cadence** — `weekly`, `biweekly`.
- **channelState** — `active`, `degraded`, `suspended`.
- **missedSessionStreak** — non-negative integer; primary compliance risk input.
- **staffAssigneeRefs** — optional non-empty staff refs for accountability.
- **containmentDependency** — boolean; when true, care failure may trigger lockdown escalation hook (field only in slice 1).
- **suspensionCauseRef** — required when `channelState` is `suspended` (documented cause ref); absence → warning.
- **confidence / unknown / redacted** — projection legibility without dumping hidden dossier truth.

### Validation rules (examples)

- Missing `id` or `label` → error.
- Invalid `careMode`, `cadence`, or `channelState` → error.
- Negative or non-integer `missedSessionStreak` → error.
- `channelState: suspended` without `suspensionCauseRef` → warning.
- `channelState: active` with `cadence` declared but zero sessions implied and high missed streak → warning (operational inconsistency).
- Franchise / wiki / branded object-number token in id or CP-neutral field → error.

### Projection (`projectCareComplianceRisk`)

- Inputs: record + optional policy (`minimumConfidence`, `redactUnknown`, `lockdownAmplification`).
- Outputs: `recordId`, `label`, `careMode`, `channelState`, `complianceRiskScore` (0..1), `lockdownEscalationLikely`, `missedSessionStreak`, `confidence`, `redacted`, `unknownFields`.
- Deterministic weights: higher streak + `degraded` channel + `containmentDependency` raise score; `suspended` with documented cause lowers immediate breach vs undocumented suspension.

## Acceptance

- [x] Fixture: weekly psych screening with two-way mediated channel active.
- [x] Fixture: missedSessionStreak triggers elevated compliance risk.
- [x] Negative: active channel with suspended cadence inconsistency or suspended without cause → warning.
- [x] Negative: franchise token in label → validation error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures (`WEEKLY_PSYCH_SCREENING_FIXTURE`, `MISSED_STREAK_ELEVATED_RISK_FIXTURE`).
2. **Validation** — positive fixtures + negative lint cases (franchise token, suspended without cause).
3. **Projection** — `projectCareComplianceRisk` streak and channel-state weighting.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/containedPersonTherapeuticCareRegistry.ts`                |
| Tests  | `src/test/containedPersonTherapeuticCareRegistry.test.ts`             |
| Plan   | `planning/contained-person-therapeutic-care-registry-slice-1.md`      |

## Branch

`jamesdyedbq/spe-2115-contained-person-therapeutic-care-schedule-registry-slice-1`

## Out of scope (parent closure)

- Full SPE-1889 parent Done
- GameState persistence and weekly orchestration wiring
- SPE-1046 detainee / patient status classes

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2115
- `src/domain/entityWelfareReclassificationRegistry.ts` — validation + projection conventions (SPE-2114)
- `src/domain/publicDisclosureStateRegistry.ts` — franchise token scan pattern (SPE-2109)

---

## Post-ship doc hygiene (mandatory after merge)

Complete in the **same PR** as implementation or an immediate docs-only follow-up before starting SPE-2116.

- [x] **`planning/contained-person-therapeutic-care-registry-slice-1.md`** — set Status to **Shipped — PR #2434**; check acceptance boxes.
- [x] **`planning/entity-welfare-reclassification-registry-slice-1.md`** — set Status to **Shipped — PR #2433** (was stale: In Progress).
- [x] **`planning/backlog.md`**
  - Active queue: registry wave complete through SPE-2115; next adjacent tier [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116).
  - Recommended next step: handoff to SPE-2116 after SPE-2115 merge.
  - Shipped table: add SPE-2115 row with module + PR.
  - Planning slice index: add `contained-person-therapeutic-care-registry-slice-1.md` as **Shipped**.
- [x] **Linear** — SPE-2115 → Done + comment (PR URL, what shipped, validation). Parent SPE-1889 stays Backlog; parent SPE-854 stays In Progress.
- [x] **Next agent handoff** — `On main @ cde20979. Next: SPE-2116 — naming-hazard descriptor registry — branch jamesdyedbq/spe-2116-naming-hazard-descriptor-registry-safe-labels-and-reference`.
