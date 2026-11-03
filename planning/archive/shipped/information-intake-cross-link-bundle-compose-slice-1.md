# SPE-854 — Intake cross-link bundle compose chain integration (slice 1)

One-page implementation plan. Follow-on from shipped cross-link compose slices [SPE-2354](https://linear.app/spectranoir/issue/SPE-2354), [SPE-2355](https://linear.app/spectranoir/issue/SPE-2355), [SPE-2356](https://linear.app/spectranoir/issue/SPE-2356), and [SPE-2358](https://linear.app/spectranoir/issue/SPE-2358), plus surfacing slices [SPE-2406](https://linear.app/spectranoir/issue/SPE-2406), [SPE-2470](https://linear.app/spectranoir/issue/SPE-2470), [SPE-2471](https://linear.app/spectranoir/issue/SPE-2471), and [SPE-2472](https://linear.app/spectranoir/issue/SPE-2472).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2473 — Intake cross-link bundle compose chain integration (slice 1)](https://linear.app/spectranoir/issue/SPE-2473) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — parent remains **Done**; this is a follow-up child |
| **Branch** | `spe-854-intake-cross-link-bundle-compose-slice-1` |
| **Status** | **Ready for PR** |
| **Base `main` SHA** | `3bdff620` |

## Goal

Implement a single deterministic orchestrator that composes all information-intake cross-link summaries across naming-hazard, extranormal, minor-anomaly, and unexplained-location registries from one chain call.

## Prerequisite (on `main` @ `3bdff620`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake ↔ naming-hazard compose | `informationIntakeNamingHazardCrossLink.ts` (SPE-2358) |
| Intake ↔ extranormal compose | `informationIntakeExtranormalCrossLink.ts` (SPE-2354) |
| Intake ↔ minor-anomaly compose | `informationIntakeMinorAnomalyCrossLink.ts` (SPE-2355) |
| Intake ↔ unexplained-location compose | `informationIntakeUnexplainedLocationCrossLink.ts` (SPE-2356) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| New bundle chain compose module reusing per-registry `composeAll*` helpers | Any per-registry compose logic changes (SPE-2354/SPE-2355/SPE-2356/SPE-2358) |
| Deterministic grouped ordering across all four registry bundles | Surfacing module changes (SPE-2406/SPE-2470/SPE-2471/SPE-2472) |
| Bundle-focused unit tests including canal-bridge integration | Persistence changes |
| Slice doc + backlog handoff update | Mission triage full refresh |

## Bundle compose contract

- **Read-only compose chain** — no persistence writes, no surfacing side effects.
- **Registry-complete** — include naming-hazard, extranormal, minor-anomaly, unexplained-location groups.
- **Deterministic ordering** — byte-stable grouped output with each group using existing deterministic `composeAll*` behavior.
- **Empty maps** — no-op grouped empty arrays without throw.
- **Topic overlap reuse** — preserve existing topic-key overlap logic via shared per-registry compose modules.

## Acceptance

- [x] One orchestrator call returns all four grouped cross-link summary arrays.
- [x] Empty-map input returns grouped empty arrays without throw.
- [x] Canal-bridge fixture integration proves all four cross-link groups in one call.
- [x] Deterministic repeated calls return byte-identical output.
- [x] Targeted tests + lint green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeCrossLinkBundle.ts` |
| Tests  | `src/test/informationIntakeCrossLinkBundle.test.ts` |
| Plan   | `planning/information-intake-cross-link-bundle-compose-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage full refresh | SPE-16 umbrella | Out of this compose-only boundary |

## See also

- `planning/information-intake-unexplained-location-cross-link-surfacing-slice-1.md`
- `planning/information-intake-minor-anomaly-cross-link-surfacing-slice-1.md`
- `planning/information-intake-extranormal-cross-link-surfacing-slice-1.md`
- `planning/naming-hazard-cross-link-surfacing-slice-1.md`
