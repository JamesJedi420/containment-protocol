# SPE-2114 — Entity welfare reclassification registry slice 1

One-page implementation plan. Linear: [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows shipped [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) (visual-trigger hazard registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2114 — Entity welfare reclassification registry — threat label drift and disposition review (slice 1)](https://linear.app/spectranoir/issue/SPE-2114) |
| **Parent** | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) — Affiliation status and entity custody posture |
| **Branch** | `jamesdyedbq/spe-2114-entity-welfare-reclassification-registry-threat-label-drift`                           |
| **Status** | **Shipped** — PR #2433                                                                                     |

## Goal

Add a pure deterministic **entity welfare reclassification registry** so cases can move from hostile-threat containment to rights-aware custody when evidence, behavior, or ethics review warrants — without importing external object numbers or franchise labels.

## Prerequisite (on `main` @ `fe59d62e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Visual-trigger hazard | `src/domain/visualTriggerHazardRegistry.ts` (SPE-2111 / PR #2432)   |
| Pattern source series | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110)               |
| Public disclosure    | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109)               |
| Intake registry wave | SPE-2104 / SPE-2105 / SPE-2106 / SPE-2108 sibling patterns             |
| Harvest batch        | `starter-picks-routing-65` (C34) in `planning/harvest-reconciliation-index.md` |

## Gap (pre-slice)

- No bounded schema for threat-label drift, disposition review gates, or containment revision hooks.
- No deterministic validation for terminal reclassification states without review artifacts or evidence bundles.
- No staff morale, liability, or public-risk pressure projection helper.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `EntityWelfareReclassificationId` + `EntityWelfareReclassificationRecord` in `src/domain/entityWelfareReclassificationRegistry.ts` | GameState persistence                         |
| priorThreatLabel, proposedDisposition, welfareDebtRef, reviewGate, reviewArtifactRef, reclassificationState, evidenceBundleRefs, containmentRevisionRefs | SPE-1046 affiliation wire-up                  |
| transitionHistory — append-only pending → approved / denied / reverted trail                                                       | SPE-1310 case lifecycle integration           |
| `validateEntityWelfareReclassificationRecord(record)` — terminal states require review artifact + evidence; franchise token → error | SPE-1203 animal welfare cross-check           |
| `projectReclassificationPressure(record, policy)` — staff morale, liability, and public-risk forecast                              | SPE-1888 welfare-debt accounting engine       |
| Focused tests in `src/test/entityWelfareReclassificationRegistry.test.ts`                                                        | Full SPE-1046 parent Done                     |

## Record contract (deterministic)

### Core fields

- **priorThreatLabel** — institutional threat classification at review open (free-text ref, not franchise object number).
- **proposedDisposition** — `hostile`, `cooperative`, `medical`, `sapient_remains`, `unknown`.
- **welfareDebtRef** — external hook to SPE-1888 welfare-debt ledger (field only in slice 1).
- **reviewGate** — `ethics`, `veterinary`, `psych`, `executive`.
- **reviewArtifactRef** — signed review packet ref required for terminal states.
- **reclassificationState** — `pending`, `approved`, `denied`, `reverted`.
- **evidenceBundleRefs** — non-empty required before approval; sympathy alone never sufficient.
- **containmentRevisionRefs** — containment posture changes tied to approved reclassification.
- **transitionHistory** — append-only `{ fromState, toState, week, reviewGate?, reviewArtifactRef?, note? }[]`.
- **confidence / unknown / redacted** — projection legibility without dumping hidden dossier truth.

### Validation rules (examples)

- `approved` or `denied` without `reviewArtifactRef` → error.
- `approved` without non-empty `evidenceBundleRefs` → error.
- `approved` without non-empty `containmentRevisionRefs` when disposition softens from hostile posture → warning.
- Terminal state without matching `reviewGate` on record or history entry → warning.
- Franchise / wiki / branded object-number token in id or CP-neutral field → error.

## Acceptance

- [x] Fixture: pending → approved with ethics review ref and containment revision.
- [x] Fixture: hostile → cooperative with welfare debt accumulation hook.
- [x] Negative: approved without reviewGate artifact → validation error.
- [x] Negative: denied without review artifact → validation error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + negative lint cases.
3. **Projection** — reclassification pressure forecast.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                       |
| ------ | ----------------------------------------------------------- |
| Domain | `src/domain/entityWelfareReclassificationRegistry.ts`       |
| Tests  | `src/test/entityWelfareReclassificationRegistry.test.ts`    |
| Plan   | `planning/entity-welfare-reclassification-registry-slice-1.md` |

## Branch

`jamesdyedbq/spe-2114-entity-welfare-reclassification-registry-threat-label-drift`

## Out of scope (parent closure)

- Full SPE-1046 parent Done
- GameState persistence and weekly orchestration wiring
- SPE-1888 welfare-debt engine, SPE-1203 veterinary cross-check, SPE-1310 case lifecycle

## See also

- `planning/harvest-reconciliation-index.md` — harvest batch `starter-picks-routing-65`
- `planning/proximity-chemical-predator-metadata-26-harvest.md` — C13–C14 owner map
- `src/domain/publicDisclosureStateRegistry.ts` — validation + projection conventions (SPE-2109)
- `src/domain/visualTriggerHazardRegistry.ts` — sibling intake registry pattern (SPE-2111)
