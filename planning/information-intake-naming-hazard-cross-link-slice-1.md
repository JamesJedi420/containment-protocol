# SPE-854 — Intake report ↔ naming-hazard descriptor cross-link compose (slice 1)

One-page implementation plan. Linear: [SPE-2358](https://linear.app/spectranoir/issue/SPE-2358) (child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854)). Closes deferred item from [SPE-2357](https://linear.app/spectranoir/issue/SPE-2357) and [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) slice 2.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2358 — Intake report ↔ naming-hazard descriptor cross-link compose (slice 1)](https://linear.app/spectranoir/issue/SPE-2358) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine (Done); registry anchor [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) / [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) |
| **Branch** | `spe-2358-intake-naming-hazard-cross-link-slice-1`                                                         |
| **Base `main` SHA** | `951fd9eb`                                                                                          |

## Goal

Deterministic compose helper linking persisted `informationIntakeReports` to `namingHazardDescriptorRecords` via shared topic refs for agent routing and downstream verification synthesis.

## Prerequisite (on `main` @ `951fd9eb`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292–2293)                |
| Naming-hazard registry | `src/domain/namingHazardDescriptorRegistry.ts` (SPE-2116 slices 1–2) |
| Sibling cross-links  | `informationIntakeExtranormalCrossLink.ts` (SPE-2354), `informationIntakeMinorAnomalyCrossLink.ts` (SPE-2355), `informationIntakeUnexplainedLocationCrossLink.ts` (SPE-2356) |

## Cross-link contract (slice 1)

- **Optional `intakeTopicRef`** on `NamingHazardDescriptorRecord` — sanitized on hydrate; backward compatible.
- **Primary match** — `descriptor.intakeTopicRef` overlaps `report.topicRef` via normalized topic keys (`resolveIntakeExtranormalTopicKeys`).
- **Hydrated truth only** — compose over persisted maps; no re-sanitize or invalid-drop surfacing.
- **Empty maps** — no-op summary with zero counts; no throw.
- **Byte-stable ordering** — links sorted by topic, descriptor id, report id; summaries deterministic on repeat.
- **Safe label boundary** — compose links ids and topic refs only; no true-name or `projectSafeLabel` surfacing in this slice.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeNamingHazardCrossLink.ts` compose + list helpers | UI / report copy / triage chips               |
| Optional `intakeTopicRef` on naming-hazard sanitize/hydrate       | Intake report schema changes                  |
| Canal-bridge fixture linkage on naming-hazard fixture             | `projectSafeLabel` contract changes           |
| Unit tests + naming-hazard persistence regression                  | SPE-76 procedural naming integration          |
| Slice doc (this file) + backlog handoff                            | Bundle compose chain / triage surfacing       |

## Acceptance

- [ ] Empty maps return zeroed summary without throw
- [ ] `intakeTopicRef` match links canal-bridge intake trio to linked naming-hazard descriptor
- [ ] Warning-only hydrated descriptors included in linked summary
- [ ] Byte-stable ordering on repeated compose
- [ ] No re-surfacing of invalid hydrate drops
- [ ] `npm run lint` + targeted tests + naming-hazard persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeNamingHazardCrossLink.ts`, `src/domain/namingHazardDescriptorRegistry.ts` |
| Tests  | `src/test/informationIntakeNamingHazardCrossLink.test.ts`, `src/test/namingHazardDescriptorRegistryPersistence.test.ts` |
| Plan   | `planning/information-intake-naming-hazard-cross-link-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cross-link surfacing in triage / report notes | SPE-854 or UX owner | Out of compose-only boundary |
| Investigation UI substitution | SPE-2116 slice 3+ | Persistence and compose must land first |
| SPE-1464 branch validation follow-up | SPE-1464 | Separate backlog option |
| Bundle compose chain integration | SPE-854 / SPE-2108 follow-up | Out of slice 1 boundary |

## See also

- `planning/naming-hazard-descriptor-registry-slice-2.md` — deferred cross-link row (closed by this slice)
- `planning/information-intake-unexplained-location-cross-link-slice-1.md` — sibling compose pattern
