# SPE-956 — Parent AC matrix reconciliation after SPE-2639/2640 (slice 1)

One-page hygiene record. Linear: [SPE-2641](https://linear.app/spectranoir/issue/SPE-2641) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped [SPE-2639](https://linear.app/spectranoir/issue/SPE-2639)–[SPE-2640](https://linear.app/spectranoir/issue/SPE-2640); parent stays **Backlog**. Pattern: [SPE-2575](https://linear.app/spectranoir/issue/SPE-2575) / `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`.

| Field               | Value                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2641 — Parent AC matrix reconciliation after SPE-2639/2640 (slice 1)](https://linear.app/spectranoir/issue/SPE-2641)                                      |
| **Status**          | **Shipped** (PR #3192 @ `e697dcbb`)                                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; **Done** pending SPE-2642 owner acceptance    |
| **Branch**          | `spe-956-parent-ac-matrix-reconciliation-slice-1`                                                                                                             |
| **Base `main` SHA** | `0b99f42f`                                                                                                                                                    |

## Goal

Reconcile the SPE-956 parent Linear AC matrix against shipped five-lane incident-path evidence (SPE-2639 advisory + hotline; SPE-2640 async + survivor + memory). Distinguish evaluator-level Yes vs incident-path Yes. Confirm script/staffing-under-pressure is satisfied by SPE-2628 EXAMPLE + evaluator pressure tests (no gap child). Do **not** mark SPE-956 Done.

## Prerequisite (on `main` @ `0b99f42f`)

| Shipped                                 | Anchor                                                                                                                         | PR    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Advisory + hotline incident path        | [SPE-2639](https://linear.app/spectranoir/issue/SPE-2639) — `applySpe956ParticipatoryChannelsToIncident`                       | #3188 |
| Async + survivor + memory incident path | [SPE-2640](https://linear.app/spectranoir/issue/SPE-2640) — three additional FromGameState lanes                               | #3190 |
| Hotline evaluator (script/staffing)     | [SPE-2628](https://linear.app/spectranoir/issue/SPE-2628) — `evaluateHotlineCall` + EXAMPLE + below-threshold escalate tests | #3162 |
| Channel evaluators                      | SPE-2620 / 2629 / 2630 / 2631                                                                                                  | —     |
| FromGameState helpers                   | [SPE-2638](https://linear.app/spectranoir/issue/SPE-2638)                                                                      | #3186 |
| Five channel GameState maps             | SPE-2632–2636                                                                                                                  | —     |

**Delta:** After SPE-2640, SPE-956 deferred still listed parent reconciliation and possible script/staffing gap. This slice closes the matrix hygiene row: 7/7 parent AC bullets Yes at incident-path (or evaluator + EXAMPLE-on-path for staffing pressure). Empty `{}` maps still no-op (must not false-satisfy).

## Parent AC vs shipped evidence (post SPE-2639/2640)

| Parent AC                                                                                         | Shipped evidence                                                                                                                                                                                                 | Met?                                      |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Advisory body with explicit scope/criteria influences a response decision                         | SPE-2620 evaluator + SPE-2639 path: riverside EXAMPLE `adopted` + `supportRouting` → `community_liaison_first`                                                                                                   | **Yes** (incident-path)                   |
| Private hotline materially changes guidance, trust, or support routing                            | SPE-2628 evaluator + SPE-2639 path: EXAMPLE call `handled` + `supportRouting` → `hotline_priority_callback`                                                                                                      | **Yes** (incident-path)                   |
| Channel requires script quality, staffing, or escalation handling to function well under pressure | SPE-2628: `scriptQuality * staffingCapacity` gate; Vitest escalates/unanswered below threshold; EXAMPLE channel on SPE-2639 path only handles when above threshold                                               | **Yes** (evaluator + EXAMPLE on path)     |
| Asynchronous / transcript discussion widens participation or preserves institutional memory       | SPE-2629 evaluator + SPE-2640 path: EXAMPLE session `widened` + `participation` → `async_resident_thread`                                                                                                        | **Yes** (incident-path)                   |
| Community input materially improves a plan or message                                             | SPE-2639 advisory adoption changes incident `supportRouting` (not ignored); SPE-2628 also proves guidance-scope message change at evaluator                                                                      | **Yes** (incident-path)                   |
| Survivor community as informal morbidity / recurrence registry with support-knowledge value       | SPE-2630 evaluator + SPE-2640 path: EXAMPLE signal `recorded` + `supportKnowledge` → `recurrence_peer_notes`                                                                                                     | **Yes** (incident-path)                   |
| Targeted tests: advisory, hotline handling, escalation routing, participatory effects             | `spe956ParticipatoryChannelIncidentPath.test.ts` (five-lane material + empty `{}` no-op); SPE-2620–2631 focused tests including hotline below-threshold escalation                                               | **Yes** (focused-test + incident-path)    |

**Level note:** **Yes (incident-path)** means the authored riverside path via `applySpe956ParticipatoryChannelsToIncident` + EXAMPLE GameState maps shows material influence. **Yes (evaluator + EXAMPLE on path)** means the pressure gate is proven on the SPE-2628 evaluator (and the incident path uses that EXAMPLE channel); a separate under-pressure incident-path fixture is not required. Empty maps yield no material flags — they must not false-satisfy matrix rows.

**Collective memory (scope, not a separate AC bullet):** SPE-2631 + SPE-2640 path stabilizes `procedureMemory` on the same riverside incident; recorded here for completeness, not as an eighth AC row.

**Script/staffing disposition:** Satisfied by SPE-2628 EXAMPLE + pressure tests on the channel used by SPE-2639. **No gap child opened.**

## Parent [SPE-956](https://linear.app/spectranoir/issue/SPE-956) disposition

7/7 AC rows Yes at incident-path / evaluator+EXAMPLE level. Umbrella **Done** accepted via [SPE-2642](https://linear.app/spectranoir/issue/SPE-2642) (owner acceptance July 2026; SPE-2618 pattern). Week-close channel tick and GameState incident baseline persistence remain optional post-Done siblings (not AC blockers).

## Scope (this slice)

| In                                                                                          | Out                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| SPE-956 Linear parent AC matrix + deferred table refresh                                    | Week-close channel tick                     |
| Slice doc (this file) + `planning/backlog.md` / handoff manifest                            | GameState incident baseline persistence     |
| Mark SPE-2640 / slice-2 **Shipped** in backlog + manifest                                   | Evaluator / mirror / `src/` runtime changes |
| Confirm no script/staffing gap child                                                        | SPE-1682 / 860 / 911 / 875 expansions       |
| Distinguish evaluator Yes vs incident-path Yes; empty-map no false Yes                      | Mark SPE-956 Done                           |

## Acceptance

- [x] SPE-956 Linear AC matrix marks rows 1–7 **Yes** with SPE-2639/2640 (and SPE-2628) anchors at the correct evidence level
- [x] Script/staffing-under-pressure disposition: satisfied; no gap child
- [x] Deferred table lists week-close tick, baseline persistence, umbrella Done
- [x] Slice doc + backlog handoff present; SPE-2640 → recently shipped
- [x] Parent SPE-956 stays **Backlog** through this child; umbrella Done via SPE-2642
- [x] No `src/` domain/runtime changes

## Deferred

| Item                                    | Suggested owner                                                         | Why deferred                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Week-close channel tick                 | Optional post-Done sibling                                              | Optional orchestration; not required once AC matrix Yes                      |
| GameState incident baseline persistence | Optional post-Done sibling                                              | Baselines remain authored inputs on SPE-2639/2640 path                       |
| Parent umbrella **Done**                | [SPE-2642](https://linear.app/spectranoir/issue/SPE-2642)               | Owner acceptance July 2026; 7/7 AC Yes closes umbrella (SPE-2618 pattern)    |
| SPE-1682 / 860 / 911 / 875 expansions   | Those parents                                                           | Explicitly out of SPE-956 incident / matrix boundary                         |

## Validation

Docs/hygiene only — no new domain tests.

- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-parent-ac-incident-wire-up-slice-1.md`
- `planning/spe-956-parent-ac-incident-wire-up-slice-2.md`
- `planning/spe-956-hotline-channel-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `src/domain/spe956ParticipatoryChannelIncidentPath.ts`
- `src/test/spe956ParticipatoryChannelIncidentPath.test.ts`
- `src/test/hotlineChannel.test.ts`
