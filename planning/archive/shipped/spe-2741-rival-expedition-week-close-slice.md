# SPE-2741 — Persist rival expeditions and advance at campaign week-close

| Field               | Value                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2741 — Persist rival expeditions and advance them at campaign week-close](https://linear.app/spectranoir/issue/SPE-2741/persist-rival-expeditions-and-advance-them-at-campaign-week-close) |
| **Status**          | **Shipped**                                                                                                                                                                                     |
| **Parent**          | [SPE-542](https://linear.app/spectranoir/issue/SPE-542/offscreen-rival-expedition-simulation)                                                                                                   |
| **Branch**          | `agent/spe-2741-rival-expedition-week-close`                                                                                                                                                    |
| **Base `main` SHA** | `a62a8a6aa818b679475d8e2b0474e73ec5665909`                                                                                                                                                      |

## Goal

Persist the SPE-2740 rival-expedition progress contract in canonical campaign
state and advance every valid nonterminal packet exactly once through the
authoritative campaign week-close, without adding hidden pressure derivation,
RNG, mission resolution, UI, or encounter behavior.

## Ownership audit

| Concern                         | Existing owner reused by this slice                                      |
| ------------------------------- | ------------------------------------------------------------------------ |
| Packet progression and clues    | `src/domain/rivalExpeditionProgress.ts` / SPE-2740                       |
| Canonical runtime normalization | `normalizeGameState` in `src/domain/teamSimulation.ts`                   |
| Campaign calendar               | `GameState.week` and `src/domain/sim/advanceWeek.ts`                     |
| Hydration and run transfer      | `src/app/store/runTransfer.ts`                                           |
| Manual save envelope            | `src/app/store/saveSystem.ts`; `GAME_SAVE_VERSION` remains `1`           |
| Mission resolution boundary     | `systems/mission-resolution.md`; rival progress is not a mission outcome |

## Scope

- Add optional canonical `GameState.rivalExpeditionProgressPackets` and
  `GameState.rivalExpeditionClues` registries, with empty starting-state and
  legacy-hydration defaults.
- Normalize valid packets by embedded expedition ID, enforcing definition,
  phase, progress-counter, personnel, departure/advance-week, and terminal-week
  invariants. Drop malformed or key-mismatched siblings independently.
- Normalize deterministic clue IDs, deduplicate by ID, and retain stable
  expedition/week/kind ordering.
- Add one pure registry week-close orchestrator. Every eligible expedition must
  receive explicit casualty and pace-penalty inputs; missing or malformed inputs
  fail closed for that packet.
- Wire the orchestrator after the canonical `advanceWeek` calendar step using
  the closing `sourceState.week`. Production supplies explicit zero-casualty and
  zero-penalty inputs until later pressure owners are connected.
- Preserve terminal and same/past-week idempotency and avoid RNG, reports,
  missions, encounters, factions, rewards, and UI mutations.
- Round-trip registries through existing run/save payloads without changing
  store or save envelope versions.

## Acceptance

- [x] New and hydrated legacy games contain empty canonical registries.
- [x] Valid packets/clues round-trip through manual save serialization.
- [x] Malformed persisted siblings fail closed without removing valid records.
- [x] Canonical runtime normalization preserves stable registry ordering.
- [x] One and multiple expeditions advance once in deterministic ID order.
- [x] Production no-pressure week-close matches direct SPE-2740 replay for the
      closing campaign week.
- [x] Terminal and same-week replay remain immutable no-ops.
- [x] Clues persist in deterministic expedition/week/kind order without
      duplicate IDs.
- [x] RNG, mission/case outcomes, reports, events, and unrelated state match a
      baseline week-close with no rival packet.
- [x] `GAME_STORE_VERSION` and `GAME_SAVE_VERSION` remain unchanged.

## Validation

- `npm run test:run -- src/test/rivalExpeditionProgress.test.ts src/test/rivalExpeditionWeekClose.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run verify:backlog-handoff`
- `npm run test:run`

## Deferred

| Item                                                       | Owner / target       | Boundary                                                                  |
| ---------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| Casualty, hostile-zone, route-pressure, and search inputs  | Future SPE-542 child | SPE-2741 production inputs remain deterministic zero-pressure defaults.   |
| Probabilistic search                                       | Future SPE-542 child | Do not add RNG to the fixed-work SPE-2740 contract in this slice.         |
| Clue report/UI and live encounter crossover                | Future SPE-542 child | Persisted clues remain hidden domain state with no presentation path.     |
| Rival motivation and live party behavior                   | SPE-430              | Team hierarchy, motives, alliances, and member behavior stay delegated.   |
| Objective claims, rewards, credit, factions, relationships | Future SPE-542 child | Week-close advances progress only; no broader campaign consequences here. |
