# SPE-956 — Participatory channel week-close tick (post-Done follow-on)

One-page implementation plan. Linear: [SPE-2643](https://linear.app/spectranoir/issue/SPE-2643) (post-Done follow-on related to [SPE-956](https://linear.app/spectranoir/issue/SPE-956); does **not** reopen parent AC). Follows shipped [SPE-2642](https://linear.app/spectranoir/issue/SPE-2642) umbrella Done.

| Field               | Value                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2643 — SPE-956 participatory channel week-close tick (post-Done follow-on)](https://linear.app/spectranoir/issue/SPE-2643)        |
| **Status**          | **In progress**                                                                                                                         |
| **Parent / related**| [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — remains **Done**; this issue does not reopen AC                               |
| **Branch**          | `spe-956-participatory-channel-week-close-slice-1`                                                                                      |
| **Base `main` SHA** | `4133bb07`                                                                                                                              |

## Goal

Wire persisted SPE-956 participatory channel maps into `advanceWeek` with a pure deterministic week-close tick: apply optional authored `weeklyElapsedWeeksDelta` to `elapsedChannelWeeks` when present, with `lastWeeklyTickWeek` idempotency ([SPE-2624](https://linear.app/spectranoir/issue/SPE-2624) / [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) pattern). No store/UI/mirror; no evaluator contract changes; no SPE-956 AC reopen.

## Prerequisite (on `main` @ `4133bb07`)

| Shipped                          | Anchor                                                                                                      | PR    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----- |
| Parent umbrella Done             | [SPE-2642](https://linear.app/spectranoir/issue/SPE-2642) — owner acceptance; SPE-956 **Done**              | #3194 |
| Five channel persistence maps    | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632)–[SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) | #3169–3182 |
| Propagation graph week-close     | [SPE-2624](https://linear.app/spectranoir/issue/SPE-2624) — peer pattern                                    | #3147 |
| SPE-947 week-close               | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) — peer pattern                                    | #3077 |

## Orchestration tick contract

- **Optional elapsed-week delta** — when `weeklyElapsedWeeksDelta` is authored (non-negative finite), add it to `elapsedChannelWeeks` (default 0) once per week on each of the five maps.
- **Idempotent same-week re-tick** — `lastWeeklyTickWeek === week` is a no-op.
- **No-op** — empty maps, channels without authored delta fields; no invented baselines or evaluator outcomes.
- **Overflow** — counter sums clamp to `Number.MAX_VALUE` (SPE-2625 pattern).
- **Does not reopen SPE-956 AC** — orchestration only; incident-path matrix remains closed via SPE-2642.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| Optional weekly fields on five persisted channel entry types + sanitize | GameState incident baseline persistence |
| `applyWeeklySpe956ParticipatoryChannelTick` domain module          | Evaluator / mirror / SPE-2639/2640 rewrite |
| Call from `advanceWeek` after week increment (peer to SPE-2624)    | SPE-1682 / 860 / 911 / 875 expansions      |
| Focused Vitest + advanceWeek integration tests                     | SPE-1046 file-content release slice 2      |
| Slice doc + SCHEMA_REGISTRY weekly-field note + backlog handoff    | Inventing new SPE-956 AC rows              |

## Acceptance

- [x] Empty `{}` for all five maps is a no-op without throw
- [x] Channels without authored `weeklyElapsedWeeksDelta` are unchanged on week-close
- [x] Authored delta applies once per week; same-week re-tick is idempotent
- [x] Overflow sums clamp to `Number.MAX_VALUE`
- [x] sanitize/hydrate round-trip preserves weekly fields
- [x] `advanceWeek` integration covers no-op + authored-delta paths
- [x] `npm run lint` + targeted tests green; `npm run verify:backlog-handoff` green
- [ ] Child Done only after merge

## Deferred

| Item                                    | Suggested owner                               | Why deferred                                                                 |
| --------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| GameState incident baseline persistence | Optional post-Done sibling                    | Baselines remain authored inputs on SPE-2639/2640 path                       |
| SPE-1046 file-content release delivery slice 2 | New SPE-1046 successor (SPE-1046 Done) | Alternate handoff sibling; not this boundary                                 |
| Weekly report-note surfacing            | Optional sibling                              | Out of week-close compose boundary                                           |
| SPE-1682 / 860 / 911 / 875 expansions   | Those parents                                 | Explicitly out of SPE-956 matrix boundary                                    |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelWeeklyOrchestration.test.ts src/test/advanceWeek.spe956ParticipatoryChannel.integration.test.ts src/test/spe956ParticipatoryChannelPersistence.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-parent-umbrella-acceptance-slice-1.md`
- `planning/spe-956-propagation-graph-week-close-slice-3.md`
- `planning/spe-947-weekly-orchestration-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
- `planning/backlog.md`
