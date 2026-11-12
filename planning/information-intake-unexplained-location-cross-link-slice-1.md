# SPE-854 — Intake report ↔ unexplained location cross-link compose (slice 1)

One-page implementation plan. Linear: [SPE-2356](https://linear.app/spectranoir/issue/SPE-2356) (child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854)). Closes deferred item from [SPE-2355](https://linear.app/spectranoir/issue/SPE-2355) and [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) slice 3.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2356 — Intake report ↔ unexplained location cross-link compose (slice 1)](https://linear.app/spectranoir/issue/SPE-2356) |
| **Status** | **Shipped** — PR #2580 @ `6d4b721b`                                                                        |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine (Done); registry anchor [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) |
| **Branch** | `spe-854-intake-unexplained-location-cross-link-slice-1`                                                   |
| **Base `main` SHA** | `69502dc8`                                                                                          |

## Goal

Deterministic compose helper linking persisted `informationIntakeReports` to `unexplainedLocationRecords` via shared topic refs for agent routing and downstream verification synthesis.

## Prerequisite (on `main` @ `69502dc8`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292–2293)                |
| Location registry    | `src/domain/unexplainedLocationRegistry.ts` (SPE-2106 slices 1–3)      |
| Sibling cross-links  | `informationIntakeExtranormalCrossLink.ts` (SPE-2354), `informationIntakeMinorAnomalyCrossLink.ts` (SPE-2355) |

## Cross-link contract (slice 1)

- **Optional `intakeTopicRef`** on `UnexplainedLocationRecord` — sanitized on hydrate; backward compatible.
- **Primary match** — `location.intakeTopicRef` overlaps `report.topicRef` via normalized topic keys (`resolveIntakeExtranormalTopicKeys`).
- **Hydrated truth only** — compose over persisted maps; no re-sanitize or invalid-drop surfacing.
- **Empty maps** — no-op summary with zero counts; no throw.
- **Byte-stable ordering** — links sorted by topic, location id, report id; summaries deterministic on repeat.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeUnexplainedLocationCrossLink.ts` compose + list helpers | UI / report copy / triage chips               |
| Optional `intakeTopicRef` on location sanitize/hydrate            | Intake report schema changes                  |
| Canal-bridge fixture linkage on location fixture                    | `advanceWeek` hook changes                    |
| Unit tests + location persistence regression                       | SPE-854 parent reopen                         |
| Slice doc (this file) + backlog handoff                            | Bundle compose chain / triage surfacing       |

## Acceptance

- [x] Empty maps return zeroed summary without throw
- [x] `intakeTopicRef` match links canal-bridge intake trio to linked location
- [x] Warning-only hydrated locations included in linked summary
- [x] Byte-stable ordering on repeated compose
- [x] No re-surfacing of invalid hydrate drops
- [x] `npm run lint` + targeted tests + unexplained-location persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeUnexplainedLocationCrossLink.ts`, `src/domain/unexplainedLocationRegistry.ts` |
| Tests  | `src/test/informationIntakeUnexplainedLocationCrossLink.test.ts`, `src/test/unexplainedLocationRegistryPersistence.test.ts` |
| Plan   | `planning/information-intake-unexplained-location-cross-link-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cross-link surfacing in triage / report notes | SPE-2472 | Shipped in sibling surfacing slice — see `planning/information-intake-unexplained-location-cross-link-surfacing-slice-1.md` |
| SPE-1464 branch validation follow-up | SPE-1464 | Separate backlog option |
| Naming-hazard descriptor registry persistence (slice 2) | SPE-2116 | Sibling registry persistence path |

## See also

- `planning/unexplained-location-registry-slice-3.md` — deferred cross-link row (out of slice 3 cadence scope)
- `planning/information-intake-minor-anomaly-cross-link-slice-1.md` — sibling compose pattern
