# SPE-854 — Weekly intake corroboration hook slice 5

One-page implementation plan. Linear: [SPE-2296](https://linear.app/spectranoir/issue/SPE-2296). Follows [SPE-2295](https://linear.app/spectranoir/issue/SPE-2295).

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2296 — Case/topic-linked weekly corroboration source derivation (slice 5)](https://linear.app/spectranoir/issue/SPE-2296) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine |
| **Branch** | `spe-2296-case-topic-linked-weekly-corroboration-source-derivation-slice-5` |
| **Status** | **Shipped** (PR #2453) |

## Goal

Derive weekly intake corroboration/contradiction synthetic events from case/topic simulation state instead of fixture-id-only stubs, while preserving deterministic event ids and weekly idempotence.

## Prerequisite (on `main` @ SPE-2295 merge)

| Shipped | Anchor |
| ------- | ------ |
| Weekly hook in `advanceWeek` | `src/domain/sim/advanceWeek.ts` (SPE-2295) |
| Weekly tick helper | `src/domain/informationIntakeWeeklyCorroboration.ts` (SPE-2295) |

## Scope (this slice)

| In | Out |
| -- | --- |
| Case/topic token matching and linked-case segments in weekly synthetic events | Full narrative corroboration generator |
| Pass `cases` from `advanceWeek` into weekly tick | UI/report copy surfaces |
| Integration test for linked case/topic source refs | Parent SPE-854 closure |

## Acceptance

- [x] Weekly events reference linked case ids in `sourceRef` when topic matches open case state
- [x] Deterministic phase selection from report id, week, and linked-case count
- [x] Existing idempotence and empty-map behavior preserved
- [x] `npm run lint` + targeted intake integration tests green

## File touch list (shipped)

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/informationIntakeWeeklyCorroboration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests | `src/test/advanceWeek.informationIntake.integration.test.ts` |
| Plan | `planning/information-intake-weekly-hook-slice-5.md`, `planning/backlog.md` |

## Deferred (recorded for follow-up)

| Item | Suggested owner | Why deferred (slice 5 boundary) |
| ---- | --------------- | -------------------------------- |
| Full narrative corroboration generator | SPE-2297 | Slice 5 derives linkage only; narrative token segments deferred |
| Intake verification UI / report copy surfaces | SPE-854 or adjacent UX owner | Domain-only slice |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress**.
