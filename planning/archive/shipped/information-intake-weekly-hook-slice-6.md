# SPE-854 — Weekly intake corroboration hook slice 6

One-page implementation plan. Linear: [SPE-2297](https://linear.app/spectranoir/issue/SPE-2297). Follows [SPE-2295](https://linear.app/spectranoir/issue/SPE-2295) and [SPE-2296](https://linear.app/spectranoir/issue/SPE-2296).

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2297 — Weekly intake narrative corroboration generator (slice 6)](https://linear.app/spectranoir/issue/SPE-2297) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine |
| **Branch** | `spe-2297-weekly-intake-narrative-corroboration-generator-slice-6` |
| **Status** | **In Progress** |

## Goal

Upgrade weekly synthetic corroboration/contradiction `sourceRef` values from plain deterministic stubs to deterministic narrative segments while preserving event id stability, idempotence, and case/topic linkage behavior from slice 5.

## Prerequisite (on `main` @ `87182eb10446f59e82a5e6ae42dfbe58bb6b8f51`)

| Shipped | Anchor |
| ------- | ------ |
| Weekly hook in `advanceWeek` | `src/domain/sim/advanceWeek.ts` (SPE-2295) |
| Case/topic-linked source derivation | `src/domain/informationIntakeWeeklyCorroboration.ts` (SPE-2296) |

## Scope (this slice)

| In | Out |
| -- | --- |
| Deterministic narrative token helpers for corroboration and contradiction source refs | New report schema fields |
| Preserve existing event ids and weekly idempotence | `advanceWeek` orchestration changes |
| Focused integration assertions for narrative source-ref segments | UI/report copy surfaces |
| Slice doc + backlog row update | Parent SPE-854 closure |

## Acceptance

- [ ] Corroboration events include deterministic narrative `sourceRef` segments (`trace-*`, `channel-*`)
- [ ] Contradiction events include deterministic narrative `sourceRef` segments (`dispute-*`, `cue-*`)
- [ ] Existing case/topic link component remains in source refs
- [ ] Reapplying same weekly input remains idempotent
- [ ] `npm run test:run -- src/test/advanceWeek.informationIntake.integration.test.ts` and `npm run lint` pass

## File touch list (expected)

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/informationIntakeWeeklyCorroboration.ts` |
| Tests | `src/test/advanceWeek.informationIntake.integration.test.ts` |
| Plan | `planning/information-intake-weekly-hook-slice-6.md`, `planning/backlog.md` |

## Deferred (recorded for follow-up)

| Item | Suggested owner | Why deferred (slice 6 boundary) |
| ---- | --------------- | -------------------------------- |
| Narrative text surfaced in player-facing weekly reports | SPE-854 child | Slice 6 only enriches source refs on domain events |
| Dynamic narrative templates derived from case outcome metadata | SPE-854 child | Slice 6 keeps bounded deterministic token sets |
| Parent SPE-854 acceptance (mixed-source incident + operational routing) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Child slice only |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress**.
