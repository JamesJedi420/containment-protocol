# SPE-88 — Minor anomaly item registry slice 1 (low-priority intake schema)

One-page implementation plan. Linear: [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) (child under [SPE-88](https://linear.app/spectranoir/issue/SPE-88)). Follows shipped [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) / [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) intake registries.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2104 — Minor anomaly item registry slice 1](https://linear.app/spectranoir/issue/SPE-2104)          |
| **Parent** | [SPE-88](https://linear.app/spectranoir/issue/SPE-88) — Anomaly systems umbrella                           |
| **Branch** | `jamesdyedbq/spe-2104-minor-anomaly-item-registry-low-priority-intake-disposition`                         |
| **Status** | **Shipped** — PR #2428                                                                                     |

## Goal

Add a pure deterministic **minor-anomaly item registry** for low-priority intake objects that are real and recordable but do not justify full case/containment project scope — without importing external wiki item numbers, names, or franchise labels.

## Prerequisite (on `main` @ `aa656592`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Extranormal events   | `src/domain/extranormalEventRegistry.ts` (SPE-2105)                    |
| Unexplained locations | `src/domain/unexplainedLocationRegistry.ts` (SPE-2106)               |
| Hidden-state matrix  | Post-matrix queue complete (SPE-2288–SPE-2290 / PR #2421–#2423)       |

## Gap (pre-slice)

- No bounded schema for minor objects distinct from full case lifecycle.
- No deterministic validation for disposition chains, destruction authorization, or latent-risk underestimation.
- No operator projection helper separating recovery site from suspected origin.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `MinorAnomalyItemId` + `MinorAnomalyRecord` in `src/domain/minorAnomalyItemRegistry.ts`                                            | GameState persistence                         |
| Disposition enum, append-only `statusHistory[]`, `latentRiskScore`, custody/recovery refs, staff-note provenance hooks             | Storage policy enforcement (SPE-1314)         |
| `validateMinorAnomalyRecord(record, policy)` — deterministic lint (warnings + errors)                                            | Case lifecycle wire-up (SPE-1310)             |
| `projectMinorAnomalyForOperator(record, policy)` — recovery vs origin separate projection fields                                    | Compendium / registry UI                      |
| Focused tests in `src/test/minorAnomalyItemRegistry.test.ts`                                                                       | Full SPE-88 parent Done                       |

## Record contract (deterministic)

### Core fields

- **Disposition** — `recovered`, `pending_review`, `stored`, `assigned`, `staff_use`, `lost`, `destroyed`, `neutralized`, `in_circulation`, `under_investigation`, `false_positive_returned`.
- **statusHistory** — append-only `{ fromDisposition, toDisposition, week, note? }[]`.
- **latentRiskScore** — required finite score; low priority must not imply zero risk.
- **recoverySiteRef / currentCustodyRef / suspectedOriginRef** — separate map/operator projection fields.
- **confidence / unknown / redacted** — projection legibility without dumping hidden truth.
- **Legacy `status`** — optional string mirror; warns when present without history on multi-step dispositions.

### Validation rules (examples)

- `destroyed` without `destructionAuthorizationRef` → error when policy requires authorization.
- `lowValue` without `latentRiskScore` → warning.
- revised disposition with empty `statusHistory` → error.
- `false_positive_returned` without `investigationRef` → error.
- legacy `status` without history on multi-step disposition → warning.
- `lowValue` + `latentRiskScore` 0 + `publicDisruptionRef` → `latent_risk_underestimate` warning.

## Acceptance

- [x] Fixture: item progresses recovered → stored → staff_use with statusHistory preserved.
- [x] `false_positive_returned` validates with investigation ref.
- [x] Negative: legacy `status` without history on multi-step fixture → warning.
- [x] Negative: `lowValue` + latentRiskScore 0 + public disruption hook → `latent_risk_underestimate` warning.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## File touch list (expected)

| Area   | Files                                              |
| ------ | -------------------------------------------------- |
| Domain | `src/domain/minorAnomalyItemRegistry.ts`           |
| Tests  | `src/test/minorAnomalyItemRegistry.test.ts`        |

## Out of scope

- GameState persistence and weekly orchestration wiring
- SPE-1310 / SPE-1314 / SPE-1033 / SPE-2070 downstream owners

## See also

- `planning/harvest-reconciliation-index.md` — harvest batch `minor-anomaly-log-75`
- `src/domain/unexplainedLocationRegistry.ts` — sibling site-intake registry pattern (SPE-2106)
