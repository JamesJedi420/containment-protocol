# SPE-2123 — Rule-document compliance containment registry GameState persistence (slice 2)

One-page implementation plan. Linear: child [SPE-2365](https://linear.app/spectranoir/issue/SPE-2365) under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) / anchor [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123). Follows shipped slice 1 (`planning/rule-document-compliance-containment-registry-slice-1.md`, PR #2442).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2365 — Rule-document compliance containment registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2365) |
| **Status** | **Shipped** — PR #2599 @ `de7d8501`                                                                        |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Case / facility lifecycle (stays open)         |
| **Anchor** | [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) — Rule-document compliance containment registry slice 1 |
| **Branch** | `spe-2123-rule-document-compliance-persistence-slice-2`                                                    |
| **Base `main` SHA** | `9582783b`                                                                                          |

## Goal

Persist validated `RuleDocumentComplianceRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly compliance-decay orchestration is slice 3+.

## Prerequisite (on `main` @ `9582783b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/ruleDocumentComplianceContainmentRegistry.ts` (SPE-2123 / PR #2442) |
| Fixtures             | `VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE`, `DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE` |
| Sibling persistence pattern | `planning/recurrent-catastrophe-amelioration-registry-slice-2.md` (SPE-2363 / PR #2595) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `ruleDocumentComplianceRecords` on `GameState`                     | Weekly `advanceWeek` compliance-decay hook    |
| `sanitizeRuleDocumentComplianceRecords` + `runTransfer` hydrate wire | UI / dev overlay                              |
| `validateRuleDocumentComplianceRecord` on hydrate; drop invalid, no throw | SPE-1310 parent closure                  |
| Default `{}` in `createStartingState`                              | SPE-1097 authority/legitimacy wire-up         |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Changes to slice-1 validation semantics       |
| Warnings-only records persist (e.g. `compelled_binding_without_auditor`) | Sibling registry orchestration hooks     |

## Acceptance

- [x] Valid fixtures round-trip through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate (including `breach_without_breach_consequence`)
- [x] Warnings-only records persist through sanitize
- [x] `npm run lint` + targeted tests + slice-1 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/ruleDocumentComplianceContainmentRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/ruleDocumentComplianceContainmentRegistryPersistence.test.ts` |
| Plan   | `planning/rule-document-compliance-containment-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly compliance-decay advance hook | SPE-2123 slice 3 | Persistence must land before orchestration |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 follow-up | Out of persistence-only boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |

## See also

- `planning/rule-document-compliance-containment-registry-slice-1.md`
- `planning/recurrent-catastrophe-amelioration-registry-slice-2.md`
- `src/test/recurrentCatastropheAmeliorationRegistryPersistence.test.ts`
