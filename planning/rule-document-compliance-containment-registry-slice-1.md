# SPE-2123 — Rule-document compliance containment registry slice 1

One-page implementation plan. Linear: [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Follows shipped [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) (mass anomalous population emergence registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2123 — Rule-document compliance containment registry — written-conduct binding (slice 1)](https://linear.app/spectranoir/issue/SPE-2123) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine |
| **Branch** | `jamesdyedbq/spe-2123-rule-document-compliance-containment-registry-written` |
| **Status** | **In Progress** |

## Goal

Add a pure deterministic **rule-document compliance containment registry** for anomalies and persons that can follow written codes of conduct, policies, or procedure documents as active containment tools — with audit trails for revisions and breaches.

## Prerequisite (on `main` @ `a4c35b63`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Population emergence | `src/domain/massAnomalousPopulationEmergenceRegistry.ts` (SPE-2122 / PR #2441) |
| Harvest batch        | `starter-picks-routing-65` (C48) in `planning/harvest-reconciliation-index.md` |

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `RuleDocumentComplianceId` + `RuleDocumentComplianceRecord` in `src/domain/ruleDocumentComplianceContainmentRegistry.ts`       | GameState persistence                         |
| documentRef, bindingStrength, complianceState, revisionHistoryRefs, physicalCopyRequired, breachConsequence, auditorAssigneeRefs | SPE-1310 case lifecycle integration           |
| `validateRuleDocumentComplianceRecord(record)` — compelled without auditor warning; breach without consequence error              | SPE-1097 authority/legitimacy obedience checks  |
| `projectComplianceDecay(record, policy)` — drift probability per week forecast                                                    | Full SPE-1310 parent Done                     |
| Focused tests in `src/test/ruleDocumentComplianceContainmentRegistry.test.ts`                                                    | SPE-1047 ethics review engine                 |

## Record contract (deterministic)

### Core fields

- **documentRef** — non-empty ref anchoring the written conduct document.
- **bindingStrength** — `voluntary`, `contractual`, `compelled`.
- **complianceState** — `compliant`, `drifting`, `breach`, `unknown`.
- **revisionHistoryRefs** — optional ordered audit refs for document revisions.
- **physicalCopyRequired** — boolean; active containment requires a physical copy on file.
- **breachConsequence** — `recontain`, `escalate_review`, `terminate_protocol`; required when `complianceState` is `breach`.
- **auditorAssigneeRefs** — optional staff refs assigned to monitor compliance.
- **confidence / unknown / redacted** — projection legibility without omniscient labels.

### Validation rules (examples)

- Missing `id`, `label`, or `documentRef` → error.
- Invalid union values → error.
- `complianceState: breach` without `breachConsequence` → error.
- `bindingStrength: compelled` with empty `auditorAssigneeRefs` → warning.
- Franchise / wiki / branded object-number token in id/label/nested refs → error.

### Projection (`projectComplianceDecay`)

- Inputs: record + optional policy (`currentWeek`, `minimumConfidence`, `redactUnknown`, `suppressHiddenConflictLabels`).
- Outputs: weekly drift probability, decay band, revision audit symptom entries — symptom-first, not hidden compliance truth labels.
- Deterministic mapping from binding strength + compliance state + physical copy requirement to drift forecast.

## Acceptance

- [x] Fixture: voluntary compliant with physicalCopyRequired.
- [x] Fixture: drifting → breach with escalate_review consequence.
- [x] Negative: breach state without documented breachConsequence → error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + compelled/auditor warning + breach/consequence error.
3. **Projection** — `projectComplianceDecay` with deterministic drift symptoms.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/ruleDocumentComplianceContainmentRegistry.ts`           |
| Tests  | `src/test/ruleDocumentComplianceContainmentRegistry.test.ts`        |
| Plan   | `planning/rule-document-compliance-containment-registry-slice-1.md` |

## Branch

`jamesdyedbq/spe-2123-rule-document-compliance-containment-registry-written`

## Boundary notes

| Related issue | Relationship |
| ------------- | ------------ |
| [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Parent — case lifecycle integration deferred. |
| [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047) | Ethics review for coerced subjects — external constraint, no runtime coupling. |
| [SPE-1097](https://linear.app/spectranoir/issue/SPE-1097) | Authority/legitimacy obedience checks deferred. |

## Out of scope (parent closure)

- Full SPE-1310 parent Done
- Case lifecycle integration
- SPE-1097 authority/legitimacy obedience checks

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2123
- `src/domain/massAnomalousPopulationEmergenceRegistry.ts` — immediate predecessor registry conventions (SPE-2122)
