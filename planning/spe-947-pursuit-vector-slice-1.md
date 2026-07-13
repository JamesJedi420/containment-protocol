# SPE-947 — Pursuit vector simulator integration (slice 1)

One-page implementation plan. Linear: [SPE-2604](https://linear.app/spectranoir/issue/SPE-2604/pursuit-vector-simulator-integration-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred row after shipped [SPE-2602](https://linear.app/spectranoir/issue/SPE-2602); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2604 — Pursuit vector simulator integration (slice 1)](https://linear.app/spectranoir/issue/SPE-2604/pursuit-vector-simulator-integration-slice-1) |
| **Status**          | **In Progress**                                                                                                                                       |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**             |
| **Branch**          | `spe-947-pursuit-vector-slice-1`                                                                                                                      |
| **Base `main` SHA** | `fae99f42`                                                                                                                                            |

## Goal

Ship the smallest deterministic **pursuit-vector** surface that consumes SPE-2111 `pursuitState` / observer-escalation context through SPE-2602 SPE-947↔registry linkage — without inventing a propagation graph, full internet simulator, or mid-week mutations. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `fae99f42`)

| Shipped                            | Anchor                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| SPE-2111 pursuit + escalation      | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) — `pursuitState`, targets, escalation |
| SPE-947 ↔ registry linkage         | [SPE-2602](https://linear.app/spectranoir/issue/SPE-2602) — authored bindings + read/compose    |
| Compact evaluator maps             | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576)                                       |
| Surfacing label/note patterns      | [SPE-2489](https://linear.app/spectranoir/issue/SPE-2489) / [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596) |

## Pursuit-vector contract

- **Read/compose only** — resolve SPE-2602 links, then map SPE-2111 `pursuitState` + `targetInstanceIds` (+ escalation snapshot) to a compact band.
- **Bands** — `none` (dormant/resolved), `latent` (distressed), `active` (active_pursuit), `unresolved_link` (missing registry/entity).
- **Empty / missing** — empty bindings → empty list; unresolved links → `unresolved_link` without throw; missing targets flagged in reason codes (no false parent AC).
- **No dual truth** — pursuit state stays on `visualTriggerHazardRecords`; this surface does not persist a second copy.
- **CP-neutral labels** — reuse entity/registry labels only.

## Scope

| In                                                           | Out                                        |
| ------------------------------------------------------------ | ------------------------------------------ |
| Pure `resolveSpe947PursuitVector` / `composeSpe947PursuitVectors` | Propagation graph / internet simulator |
| Focused Vitest: empty/no-op + authored active path           | Evaluator contract changes (SPE-2568–2574) |
| Slice doc + backlog handoff                                  | Mid-week mutations                         |
|                                                              | SPE-947 parent Done                        |
|                                                              | SPE-956 propagation graph                  |

## Acceptance

- [x] Empty bindings / missing pursuit targets resolve as no-op / flagged without throw
- [x] One authored path yields a deterministic active pursuit-vector reading
- [x] Empty defaults do not falsely satisfy parent AC scenarios
- [x] Evaluator contracts (SPE-2568–2574) unchanged
- [x] No new mid-week mutations; no invented propagation graph
- [x] CP-neutral labels only
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947PursuitVector.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                      | Suggested owner              | Why deferred            |
| ------------------------- | ---------------------------- | ----------------------- |
| Propagation graph wire-up | SPE-956 / harvest #965       | Deferred since SPE-2111 |
| Countermeasure ledger link | SPE-947 sibling             | Next SPE-947-owned row  |
| Adaptation / commercialization kinds | SPE-947 / SPE-1085 | Out of this slice       |
| Parent umbrella Done      | Later SPE-947 reconciliation | Wire-up still open      |

## See also

- `planning/spe-947-spe-2111-registry-linkage-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-1.md`
- `planning/backlog.md`
