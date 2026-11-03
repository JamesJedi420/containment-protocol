# SPE-2420 — Coercive contained-person protocol registry slice 1

One-page implementation plan. Linear: [SPE-2420](https://linear.app/spectranoir/issue/SPE-2420) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2420 — Coercive contained-person protocol registry (slice 1)](https://linear.app/spectranoir/issue/SPE-2420) |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — Coercive contained-person protocol model     |
| **Branch** | `jamesdyedbq/spe-1882-coercive-protocol-model-slice-1`                                                     |
| **Status** | **Shipped** — PR #2709                                                                                     |

## Goal

Add a pure deterministic **coercive contained-person protocol registry** so containment procedures expose authorization, consent, force policy, subject-fit state, containment-vs-care tradeoffs, and coercion-risk review without duplicating welfare-debt math, medication regimen details, or integrated health bundles.

## Prerequisite (on `main` @ `5e190cc9`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Coercive procedure anchors | `src/domain/coerciveProcedureRegistry.ts` (SPE-1888 slices 5–6)   |
| Welfare-debt creation hook | `src/domain/coerciveProcedureWelfareDebtCreation.ts`              |
| Medication regimen registry | `src/domain/containedPersonMedicationRegimenRegistry.ts` (SPE-1886) |
| Custody status registry | `src/domain/containedPersonCustodyStatusRegistry.ts` (SPE-1892)   |

## Gap (pre-slice)

- No bounded protocol record schema with full handling-mode taxonomy (`deceptive`, `abusive` missing from anchors).
- No deterministic subject-fit, authorization, force-policy, or consent-confidence fields on protocol records.
- No containment-stability-versus-care tradeoff or coercion-risk review projection.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `CoerciveProtocolRecord` + full handling-mode taxonomy in `coerciveContainedPersonProtocolRegistry.ts`                             | GameState persistence                         |
| `validateCoerciveProtocolRecord` — franchise token scan, subject-fit / force-policy warnings                                       | Weekly orchestration wire-up                  |
| `classifyCoerciveProtocolHandlingPosture` — legally authorized / emergency / compelled / abusive / voluntary                       | Contradiction-check siblings (SPE-1897+)      |
| `projectContainmentCareTradeoff` + `projectCoerciveProtocolRiskReview` (non-blocking)                                              | Welfare-debt accounting math (SPE-1888)       |
| Owner refs: `medicationRegimenRef`, `custodyStatusRef`, `procedureRef` — no regimen/custody field duplication                      | Medication regimen details (SPE-1886)         |
| Extend `CoerciveHandlingMode` in `coerciveProcedureRegistry.ts` with `deceptive` + `abusive`                                        | Full SPE-1882 parent Done                     |
| Focused tests in `src/test/coerciveContainedPersonProtocolRegistry.test.ts`                                                        | Faction ethics / accountability links (SPE-1047 / SPE-1131) |

## Acceptance

- [x] Fixture: emergency sedation with authorization, consent, force policy, subject-fit validation.
- [x] Fixture: routine force + generalized subject fit flags contradiction risks without blocking.
- [x] Fixture: abusive surveillance-isolation flags burden risk; handling posture `abusive`.
- [x] Tradeoff projection: containment stability gain alongside personhood/trust/legitimacy harm.
- [x] Owner refs link medication/custody/procedure without duplicating regimen fields.
- [x] Negative: franchise token in label → validation error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| GameState persistence + weekly orchestration | SPE-1882 slice 2 | Slice 1 is pure registry only |
| Contradiction-check sibling implementations | SPE-1897 / SPE-1907 / SPE-1908 / SPE-1898 / SPE-1900 | Registry exposes flags; siblings own full checks |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of slice 1 boundary per SPE-1888 grooming |
| Full SPE-1882 parent Done | SPE-1882 | Slice 1 satisfies partial parent AC only |

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`               |
| Domain | `src/domain/coerciveProcedureRegistry.ts` (handling-mode taxonomy)    |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistry.test.ts`            |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-1.md`        |

## Branch

`jamesdyedbq/spe-1882-coercive-protocol-model-slice-1`

## See also

- `src/domain/coerciveProcedureRegistry.ts` — procedure anchors for welfare-debt wire-up
- `src/domain/containedPersonCustodyStatusRegistry.ts` — custody owner refs (SPE-1892)
- `src/domain/containedPersonMedicationRegimenRegistry.ts` — regimen owner refs (SPE-1886)
