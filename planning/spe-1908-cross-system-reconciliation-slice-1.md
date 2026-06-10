# SPE-1908 — Coercive protocol ↔ integrated health bundle cross-system reconciliation (slice 1)

One-page implementation plan. Linear: [SPE-2428](https://linear.app/spectranoir/issue/SPE-2428) (child under [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908)). Follows shipped slice 10 (`planning/coercive-contained-person-protocol-model-slice-10.md`, PR #2725 / [SPE-2427](https://linear.app/spectranoir/issue/SPE-2427)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2428 — Coercive protocol ↔ integrated health bundle cross-system reconciliation (slice 1)](https://linear.app/spectranoir/issue/SPE-2428) |
| **Status** | **Shipped** — PR #2727 @ `e1e29ed2`                                                                        |
| **Parent** | [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) — surveillance-isolation contradiction check umbrella |
| **Branch** | `spe-1908-cross-system-reconciliation-slice-1`                                                           |
| **Base `main` SHA** | `fed02b6a`                                                                                          |

## Goal

Deterministic cross-registry compose helper linking persisted coercive protocol records to integrated health bundles via shared `subjectRef` — first wire-up slice for broader SPE-1908 reconciliation (condition bundles, surveillance tuning, psychological resilience).

## Prerequisite (on `main` @ `fed02b6a`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Contradiction siblings | `evaluateCoerciveProtocolContradictionChecks` aggregator (slices 6–9) |
| Integrated health bundle | `src/domain/containedPersonIntegratedHealthBundleRegistry.ts` (SPE-1889) |
| Cross-link pattern     | `informationIntakeNamingHazardCrossLink.ts` (SPE-2358)                 |

## Cross-reconciliation contract (slice 1)

- **Match** — `coerciveProtocolRecord.subjectRef` ↔ `integratedHealthBundle.subjectRef` (bundle map key).
- **Hydrated truth only** — compose over validated persisted entries; skip invalid drops without re-surfacing.
- **Projections** — `projectCoerciveProtocolRiskReview` + triggered `evaluateCoerciveProtocolContradictionChecks`; bundle `mentalStateBand`, `humaneCareRiskScore`, therapeutic channel states from hydrated bundle only.
- **Tension flags** — when `surveillance_isolation_burden` in risk review contradicts bundle stable mental state, low humane-care risk, or absent active contact channels.
- **Empty maps** — zeroed summary without throw.
- **Byte-stable ordering** — subject refs, protocol ids, tension flags, structured reasons sorted on repeat.
- **Redaction** — merge per-record `redactedFields` / `unknownFields`; no hidden truth beyond registry projections.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coerciveProtocolIntegratedHealthCrossReconciliation.ts` compose   | Mirror UI / advanceWeek hooks                 |
| Surveillance-tension bundle fixture (subject-22)                   | SPE-848 surveillance tuning registry          |
| Targeted registry integration tests                                | SPE-1615 psychological resilience registry    |
| Slice doc (this file) + backlog handoff                            | Contradiction-check evaluator changes         |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |
|                                                                    | SPE-1908 parent Done (multi-owner AC remains) |

## Acceptance

- [x] Empty maps return zeroed summary without throw
- [x] Abusive surveillance protocol + subject-22 bundle links with surveillance-isolation contradiction checks and cross-system tension flags
- [x] Protocol without matching bundle omits links; tension flags empty
- [x] Invalid hydrate drops skipped without re-surfacing
- [x] Byte-stable ordering on repeated compose
- [x] Slice 1–10 coercive protocol regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts`, `src/domain/containedPersonIntegratedHealthBundleRegistry.ts` |
| Tests  | `src/test/coerciveProtocolIntegratedHealthCrossReconciliation.test.ts` |
| Plan   | `planning/spe-1908-cross-system-reconciliation-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-848 surveillance tuning cross-join | SPE-848 | No runtime registry anchor yet |
| SPE-1615 psychological resilience cross-join | SPE-1615 | No runtime registry anchor yet |
| Reconciliation surfacing in mirror / weekly report | SPE-2429 | Shipped slice 2 @ PR #2729 |
| Mirror reads persisted weekly snapshots | SPE-1882 follow-up | Slice 10 deferred row |
| SPE-1908 parent closure | SPE-1908 | Multi-owner reconciliation AC not met |

## See also

- `planning/coercive-contained-person-protocol-model-slice-9.md` — surveillance-isolation sibling origin
- `planning/coercive-contained-person-protocol-model-slice-10.md` — mirror sibling detail (deferred cross-system row)
- `planning/information-intake-naming-hazard-cross-link-slice-1.md` — sibling compose pattern
