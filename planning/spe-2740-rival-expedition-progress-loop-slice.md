# SPE-2740 — Rival-expedition progress packet and deterministic phase loop

| Field               | Value                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2740 — Rival-expedition progress packet and deterministic phase loop](https://linear.app/spectranoir/issue/SPE-2740/rival-expedition-progress-packet-and-deterministic-phase-loop-slice-1) |
| **Status**          | **Shipped**                                                                                                                                                                                     |
| **Parent**          | [SPE-542](https://linear.app/spectranoir/issue/SPE-542/offscreen-rival-expedition-simulation)                                                                                                   |
| **Branch**          | `agent/spe-2740-rival-expedition-progress-loop`                                                                                                                                                 |
| **Base `main` SHA** | `89c043d3f01c0b892afb97acfcb488a5e0a9446d`                                                                                                                                                      |

## Goal

Add a pure, immutable offscreen rival-expedition packet that advances on a
deterministic weekly search → extraction → retreat timeline, accepts explicit
casualty and pace inputs, and emits partial-information clue signals.

## Ownership audit

| Concern                            | Existing owner reused by this slice                                       |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Campaign week semantics            | `GameState.week` / `campaignCalendar.ts`; this slice accepts week numbers |
| Clue clarity vocabulary            | `investigationExposureClueRegistry.ts`                                    |
| Expedition recovery and field base | `sim/expeditionRecoveryNode.ts`; unchanged                                |
| Mission outcome resolution         | `systems/mission-resolution.md` and canonical resolution pipeline         |
| Global deterministic RNG           | `math.ts` / `GameState.rngState`; unchanged                               |

## Scope

- Define and validate authored expedition identity, route/objective references,
  head start, route pace, phase work, extraction duration, and personnel.
- Initialize a self-contained immutable progress packet and replay exactly the
  declared head-start weeks with no hidden attrition.
- Advance one contiguous campaign week per call, with casualties applied before
  phase progress and at most one phase transition in a week.
- Use fixed search and retreat work thresholds; extraction advances by elapsed
  weeks. Discard phase overflow so later phases retain their own time cost.
- Clamp caller-provided casualties to active personnel, apply an explicit
  caller-provided pace penalty, and terminate as `lost` at zero personnel.
- Return immutable `completed` / `lost` terminal packets, no-op same/past-week
  replay, and fail closed on skipped weeks or malformed weekly inputs.
- Emit ordered transition/attrition clue signals with route, phase, clarity,
  and coarse progress bands but no exact hidden counters.

## Out of scope

- GameState persistence, hydration, schema migration, or `advanceWeek` wiring
- UI, report notes, player-facing prose, or live encounter crossover
- Rival capability-team composition, motivations, disguises, faction staging,
  autonomous reward claims, or relationship changes
- RNG or probabilistic search
- Changes to mission resolution, expedition recovery, or global RNG ownership

## Acceptance

- [x] Invalid identifiers and timing/work/personnel fields fail validation.
- [x] Head-start replay is deterministic and preserves one transition per week.
- [x] One packet advances searching → extracting → retreating → completed.
- [x] Casualties and pace penalties are explicit, bounded, and non-mutating.
- [x] Total-party attrition produces a terminal lost packet.
- [x] Same/past-week calls are immutable no-ops; skipped weeks fail closed.
- [x] Clue signals remain coarsened, stable, and deterministically ordered.
- [x] Identical definitions and inputs produce byte-stable outputs.

## Validation

- `npm run test:run -- src/test/rivalExpeditionProgress.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run test:run`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                      | Owner             | Boundary                                                                |
| ----------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| Persistence and week-close orchestration  | New SPE-542 child | This slice returns pure packets only.                                   |
| Probabilistic search                      | New SPE-542 child | Fixed deterministic work thresholds are the slice-1 search contract.    |
| Live encounter / capability-team behavior | SPE-542 follow-up | Clue signals are extension points, not encounter state.                 |
| Motivation and calendar consequences      | SPE-542 follow-up | No relationship, reward, public-credit, or faction mutation in slice 1. |
