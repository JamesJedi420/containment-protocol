# SPE-956 — GameState incident baseline persistence (post-Done follow-on)

One-page implementation plan. Linear: [SPE-2644](https://linear.app/spectranoir/issue/SPE-2644) (post-Done follow-on related to [SPE-956](https://linear.app/spectranoir/issue/SPE-956); does **not** reopen parent AC). Follows shipped [SPE-2643](https://linear.app/spectranoir/issue/SPE-2643) week-close tick; handoff via [SPE-2645](https://linear.app/spectranoir/issue/SPE-2645).

| Field                | Value                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**           | [SPE-2644 — SPE-956 GameState incident baseline persistence (post-Done follow-on)](https://linear.app/spectranoir/issue/SPE-2644)     |
| **Status**           | **Shipped**                                                                                                                             |
| **Parent / related** | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — remains **Done**; this issue does not reopen AC                              |
| **Branch**           | `spe-956-gamestate-incident-baseline-persistence-slice-1`                                                                               |
| **Base `main` SHA**  | `6ac79281`                                                                                                                              |

## Goal

Persist authored SPE-956 incident-lane baselines on GameState (sanitize/hydrate) so the SPE-2639/2640 incident path can read baselines from persisted state instead of only EXAMPLE fixtures — without changing evaluator contracts, mirror UI, week-close tick, or the incident-path composer shape.

## Prerequisite

| Shipped                       | Anchor                                                                 | PR    |
| ----------------------------- | ---------------------------------------------------------------------- | ----- |
| Week-close channel tick       | [SPE-2643](https://linear.app/spectranoir/issue/SPE-2643)              | #3196 |
| Parent umbrella Done          | [SPE-2642](https://linear.app/spectranoir/issue/SPE-2642)              | #3194 |
| Incident path slices 1–2      | [SPE-2639](https://linear.app/spectranoir/issue/SPE-2639)–[SPE-2640](https://linear.app/spectranoir/issue/SPE-2640) | #3188–#3190 |
| Five channel persistence maps | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632)–[SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) | #3169–#3182 |

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| Durable GameState persistence for five lane baseline kinds         | SPE-956 AC reopen / new AC rows            |
| Sanitize + hydrate round-trip; empty/missing no-op                 | Evaluator / mirror rewrite                 |
| Focused Vitest                                                     | Incident-path composer expansion           |
| Slice doc + SCHEMA_REGISTRY note + backlog handoff                 | Week-close tick changes (SPE-2643)         |
|                                                                    | SPE-1682 / 860 / 911 / 875; file-byte I/O  |

## Acceptance

- [x] Empty/missing baseline persistence is a no-op without throw
- [x] Authored baselines sanitize/hydrate for all five lane kinds
- [x] Invalid / mismatched baselines are dropped
- [x] Incident path / evaluators / mirror / week-close unchanged unless a thin read helper is required
- [x] `npm run lint` + targeted tests green; `npm run verify:backlog-handoff` green
- [x] Child Done only after merge (PR #3200 @ `34b99cef`)

## Deferred

| Item                                       | Suggested owner | Why deferred                                      |
| ------------------------------------------ | --------------- | ------------------------------------------------- |
| Participatory channel weekly report notes  | SPE-2646        | Preferred post-Done sibling (handoff SPE-2648)    |
| EXAMPLE path baseline resolve wire         | SPE-2647        | Alternate; unused resolve is intentional          |
| Backend file-byte transport                | Infra slice     | SPE-2542 ledger already covers delivery receipts  |
| SPE-1682 / 860 / 911 / 875                 | Those parents   | Explicitly out of SPE-956 matrix boundary         |

## Validation

- Targeted Vitest for baseline persistence sanitize/hydrate
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-parent-ac-incident-wire-up-slice-1.md`
- `planning/spe-956-parent-ac-incident-wire-up-slice-2.md`
- `planning/spe-956-participatory-channel-persistence-slice-1.md`
- `src/domain/spe956ParticipatoryChannelIncidentPath.ts` (inspect only)
- `planning/backlog.md`
