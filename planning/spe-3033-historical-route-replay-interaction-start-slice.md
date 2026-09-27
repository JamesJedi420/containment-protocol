# SPE-3033 — Activate one historical-route replay from an interaction start condition

| Field                        | Value                                                                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | **Recently shipped**                                                                                                                                                                   |
| **Linear**                   | [SPE-3033](https://linear.app/spectranoir/issue/SPE-3033/activate-one-historical-route-replay-from-an-interaction-start)                                                               |
| **Parent / lineage**         | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) — remains Backlog                                                                            |
| **Sibling calendar**         | [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy) — Done; do not reopen or rewrite calendar policy       |
| **Deferred source**          | [SPE-3032](https://linear.app/spectranoir/issue/SPE-3032/project-knowledgeintel-into-historical-route-replay-visibility-inputs) Deferred row 1 (Interaction-triggered mid-week starts) |
| **Prerequisite create**      | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — `createHistoricalRouteReplay` unchanged                 |
| **Prerequisite persistence** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) — sanitize/hydrate unchanged                                     |
| **Branch**                   | `cursor/spe-3033-historical-route-replay-interaction-start-cffc`                                                                                                                       |
| **Base `main` SHA**          | `28553207bdd0574a3824df37b45416eba65be893`                                                                                                                                             |

## Goal

Activate one historical-route replay into an `approaching` SPE-3009/3017 registry sibling from a single deterministic SPE-1605 **interaction** start condition. Sibling of SPE-3024 calendar/`absolute_week` activation — do not reopen SPE-3024.

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Replay create (fail-closed inactive path) | `createHistoricalRouteReplay` / SPE-3009                                          |
| Canonical registry sanitize               | `normalizeHistoricalRouteReplayRegistry` / SPE-3017                               |
| Week-close advance + terminal resolve     | SPE-3018 / SPE-3020 — **unchanged**; advance stays week-close-only                |
| Calendar `absolute_week` activation       | `activateHistoricalRouteReplayRegistryForCalendarWeek` / SPE-3024 — **unchanged** |
| SPE-1605 interaction start vocabulary     | **This slice** — `interaction` kind + SPE-1605 explicit-interaction families      |
| Interaction-seam create                   | **This slice** — `activateHistoricalRouteReplayRegistryForInteractionStart`       |
| SPE-1392 path resolution                  | `resolveActiveHistoricalRoutePath` via SPE-3009 create                            |

## Owned start-condition policy

Interaction-seam activation owns these fields:

- Start condition kind: `interaction` (`HISTORICAL_ROUTE_REPLAY_INTERACTION_START`)
- Match rule: `interactionKind` + authored `interactionId` equal the fired signal
- Interaction kind vocabulary (SPE-1605 body, compact): `enter_zone`, `make_noise`, `operate_control`, `open_access`, `search`, `remove_asset`, `interview_witness`, `touch_sensitive_object`
- Create path: SPE-3009 `createHistoricalRouteReplay` only (no edge invent)
- Ordering: deterministic code-unit `eventId`
- Idempotency: existing registry siblings for the same `eventId` stay unchanged
- Timing: call at the **interaction seam** when the explicit interaction fires; creates `approaching` only. SPE-3018 advance remains week-close-only (mid-week create of approaching is allowed; mid-week advance is not)
- Calendar candidates never match on this path; interaction candidates never match on SPE-3024 week-close

## Scope

- Extend `historicalRouteReplayActivation.ts` with `interaction` start condition + interaction activator.
- Reuse shared SPE-3009/3017 create insert (no parallel registry).
- Targeted Vitest + slice doc + backlog handoff; retarget SPE-3032 Deferred interaction row here.
- SCHEMA_REGISTRY note for interaction candidates. No store/save version bump. No new GameState field.

## Boundaries

Not implemented here:

- SPE-3024 calendar helper semantic rewrite
- Full SPE-1605 umbrella (timer families, recurring, spent state machine)
- SPE-3032 visibility projector / SPE-3026 / SPE-3031 adapters
- Domain knowledge/intel fusion; SPE-1052 catalog
- SPE-950 possession / SPE-3007 `route_link` invent
- UI redesign / store command surface (pure domain seam only)
- Parent SPE-1605 closure

## Acceptance

- [x] Matching interaction start + active SPE-1392 path creates an `approaching` persisted replay.
- [x] Dormant / no-match signal creates nothing (no-op).
- [x] Inactive/missing SPE-1392 path creates nothing (fail-closed).
- [x] Re-trigger for an existing `eventId` is idempotent; denied path leaves registry frozen.
- [x] SPE-3024 calendar path has no regression (calendar-only candidates still activate at week match; interaction candidates ignored by calendar).
- [x] Slice doc, backlog handoff/manifest, SCHEMA_REGISTRY, SPE-3032 Deferred row retargeted.
- [x] Parent SPE-1605 remains **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayActivation.contract.test.ts`
- `npm run lint`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`

## Deferred

| Item                                                      | Suggested owner issue               | Why deferred                                                                |
| --------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Store/UI interaction command that fires the seam          | [SPE-3034](https://linear.app/spectranoir/issue/SPE-3034/fire-one-historical-route-replay-interaction-start-from-an-existing) | Retargeted: store `recordSceneVisit` → SPE-1605 `enter_zone` fires the SPE-3033 activator. |
| Full SPE-1605 dormant/armed/spent/recurring state machine | Later SPE-1605 child                | One interaction → approaching is enough for the SPE-3032 Deferred row.      |
| Anniversary / week-of-year / seasonal start conditions    | Later SPE-1071 / SPE-1605 child     | Outside this interaction boundary; calendar absolute week remains SPE-3024. |
