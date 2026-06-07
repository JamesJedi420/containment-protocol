# SPE-854 — Intake report ↔ extranormal event cross-link compose (slice 1)

One-page implementation plan. Linear: [SPE-2354](https://linear.app/spectranoir/issue/SPE-2354) (child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854)). Closes deferred item from [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) slices 2–3.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2354 — Intake report ↔ extranormal event cross-link compose (slice 1)](https://linear.app/spectranoir/issue/SPE-2354) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine (Done); registry anchor [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) |
| **Branch** | `spe-854-intake-extranormal-cross-link-slice-1`                                                            |
| **Base `main` SHA** | `7ec285e8`                                                                                          |

## Goal

Deterministic compose helper linking persisted `informationIntakeReports` to `extranormalEventRecords` via shared topic refs for agent routing and downstream verification synthesis.

## Prerequisite (on `main` @ `7ec285e8`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Intake report model  | `src/domain/informationIntakeReport.ts` (SPE-2292–2293)                |
| Intake weekly hook   | `src/domain/informationIntakeWeeklyCorroboration.ts` (SPE-2295)        |
| Extranormal registry | `src/domain/extranormalEventRegistry.ts` (SPE-2105 slices 1–3)         |
| Topic coverage compose | `evaluateTopicIntakeCoverage` in `publicSignalCoverage.ts` (SPE-2294) |

## Cross-link contract (slice 1)

- **Optional `intakeTopicRef`** on `ExtranormalEventRecord` — sanitized on hydrate; backward compatible.
- **Primary match** — `event.intakeTopicRef` overlaps `report.topicRef` via normalized topic keys.
- **Secondary match** — `event.escalatedCaseRef` overlaps report topic keys when `intakeTopicRef` absent.
- **Hydrated truth only** — compose over persisted maps; no re-sanitize or invalid-drop surfacing.
- **Empty maps** — no-op summary with zero counts; no throw.
- **Byte-stable ordering** — links sorted by topic, event id, report id; summaries deterministic on repeat.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeExtranormalCrossLink.ts` compose + list helpers  | UI / report copy / triage chips               |
| Optional `intakeTopicRef` on extranormal sanitize/hydrate          | Intake report schema changes                  |
| Canal-bridge fixture linkage on `BRIEF_COVER_UP_EVENT_WITH_CLUSTER` | Minor-item / unexplained-location cross-links |
| Unit tests                                                         | `advanceWeek` hook changes                    |
| Slice doc (this file) + backlog handoff                            | SPE-854 parent reopen                         |

## Acceptance

- [x] Empty maps return zeroed summary without throw
- [x] `intakeTopicRef` match links canal-bridge intake trio to linked extranormal event
- [x] `escalatedCaseRef` fallback match when `intakeTopicRef` absent
- [x] Warning-only / conflicting verification intake included in linked summary
- [x] Byte-stable ordering on repeated compose
- [x] No re-surfacing of invalid hydrate drops
- [x] `npm run lint` + targeted tests + extranormal persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeExtranormalCrossLink.ts`, `src/domain/extranormalEventRegistry.ts` |
| Tests  | `src/test/informationIntakeExtranormalCrossLink.test.ts`              |
| Plan   | `planning/information-intake-extranormal-cross-link-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Intake ↔ minor anomaly item cross-link | SPE-854 follow-up | One sibling registry per slice |
| Intake ↔ unexplained location cross-link | SPE-854 follow-up | One sibling registry per slice |
| Cross-link surfacing in triage / report notes | SPE-854 or UX owner | Out of compose-only boundary |
| SPE-1464 branch validation follow-up | SPE-1464 | Separate backlog option |

## See also

- `planning/extranormal-event-registry-slice-2.md` — deferred cross-link item
- `planning/information-intake-coverage-compose-slice-3.md` — sibling compose pattern
- `planning/welfare-debt-accounting-registry-slice-4.md` — audit compose pattern
