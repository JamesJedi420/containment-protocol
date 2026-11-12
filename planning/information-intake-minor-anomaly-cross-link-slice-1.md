# SPE-854 — Intake report ↔ minor anomaly item cross-link compose (slice 1)

One-page implementation plan. Linear: [SPE-2355](https://linear.app/spectranoir/issue/SPE-2355) (child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854)). Closes deferred item from [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) slice 3 and [SPE-2354](https://linear.app/spectranoir/issue/SPE-2354).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2355 — Intake report ↔ minor anomaly item cross-link compose (slice 1)](https://linear.app/spectranoir/issue/SPE-2355) |
| **Status** | **Shipped** — PR #2578 @ `8feafcec`                                                                        |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine (Done); registry anchor [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) |
| **Branch** | `spe-854-intake-minor-anomaly-cross-link-slice-1`                                                          |
| **Base `main` SHA** | `72eef839`                                                                                          |

## Goal

Deterministic compose helper linking persisted `informationIntakeReports` to `minorAnomalyItemRecords` via shared topic refs for agent routing and downstream verification synthesis.

## Prerequisite (on `main` @ `72eef839`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292–2293)                |
| Minor-item registry  | `src/domain/minorAnomalyItemRegistry.ts` (SPE-2104 slices 1–3)         |
| Extranormal cross-link pattern | `src/domain/informationIntakeExtranormalCrossLink.ts` (SPE-2354) |

## Cross-link contract (slice 1)

- **Optional `intakeTopicRef`** on `MinorAnomalyRecord` — sanitized on hydrate; backward compatible.
- **Primary match** — `item.intakeTopicRef` overlaps `report.topicRef` via normalized topic keys (`resolveIntakeExtranormalTopicKeys`).
- **Hydrated truth only** — compose over persisted maps; no re-sanitize or invalid-drop surfacing.
- **Empty maps** — no-op summary with zero counts; no throw.
- **Byte-stable ordering** — links sorted by topic, item id, report id; summaries deterministic on repeat.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeMinorAnomalyCrossLink.ts` compose + list helpers  | UI / report copy / triage chips               |
| Optional `intakeTopicRef` on minor-item sanitize/hydrate          | Intake report schema changes                  |
| Canal-bridge fixture linkage on minor-item fixture                  | Unexplained-location cross-link               |
| Unit tests                                                         | `advanceWeek` hook changes                    |
| Slice doc (this file) + backlog handoff                            | SPE-854 parent reopen                         |

## Acceptance

- [x] Empty maps return zeroed summary without throw
- [x] `intakeTopicRef` match links canal-bridge intake trio to linked minor item
- [x] Warning-only hydrated minor items included in linked summary
- [x] Byte-stable ordering on repeated compose
- [x] No re-surfacing of invalid hydrate drops
- [x] `npm run lint` + targeted tests + minor-item persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeMinorAnomalyCrossLink.ts`, `src/domain/minorAnomalyItemRegistry.ts` |
| Tests  | `src/test/informationIntakeMinorAnomalyCrossLink.test.ts`              |
| Plan   | `planning/information-intake-minor-anomaly-cross-link-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Intake ↔ unexplained location cross-link | SPE-854 follow-up | One sibling registry per slice |
| Cross-link surfacing in triage / report notes | [SPE-854 follow-up](planning/information-intake-minor-anomaly-cross-link-surfacing-slice-1.md) | Surfacing slice 1 under compose parent SPE-2355 |
| SPE-1464 branch validation follow-up | SPE-1464 | Separate backlog option |

## See also

- `planning/minor-anomaly-item-registry-slice-3.md` — deferred cross-link row
- `planning/information-intake-extranormal-cross-link-slice-1.md` — sibling compose pattern
