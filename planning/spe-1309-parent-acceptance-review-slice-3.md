# SPE-1309 — Parent acceptance review (grooming slice 3)

One-page grooming record. Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — registry child wave + naming-hazard follow-on unchanged since slice 2; unified engine AC not met; doc vs Linear reconciliation after auto-close drift.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2451 — SPE-1309 parent acceptance review (grooming slice 3)](https://linear.app/spectranoir/issue/SPE-2451) |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine; stays **Backlog** |
| **Branch** | `spe-1309-parent-acceptance-review-slice-3`                                                                |
| **Status** | **In progress** — SPE-2451                                                                                 |
| **Base `main` SHA** | `6e9d6770`                                                                                          |

## Goal

Re-evaluate parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) acceptance criteria after [SPE-2450](https://linear.app/spectranoir/issue/SPE-2450) / [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) grooming (parent Done reconciliation). Confirm no new cognitive-hazard runtime evidence landed since [SPE-2445](https://linear.app/spectranoir/issue/SPE-2445) slice 2. Docs + Linear hygiene only — return parent to **Backlog** on Linear if auto-closed **Done**; no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `6e9d6770`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Self-censoring info registry schema | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) / PR #2429 — `selfCensoringInformationRegistry.ts` |
| GameState persistence | [SPE-2318](https://linear.app/spectranoir/issue/SPE-2318) / PR #2500 — `selfCensoringInformationRecords` |
| Weekly retention/rediscovery hook | [SPE-2324](https://linear.app/spectranoir/issue/SPE-2324) / PR #2515 — `applyWeeklySelfCensoringInformationTick` |
| Planning mirror UI | [SPE-2330](https://linear.app/spectranoir/issue/SPE-2330) / PR #2527 — `SelfCensoringInformationMirrorPage` |
| Naming-hazard follow-on (SPE-2108 child) | [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) slices 1–5 + [SPE-2358](https://linear.app/spectranoir/issue/SPE-2358) cross-link — **Done** on Linear |
| Sibling schema-only children | [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) slice 1 **Done** — no persistence slices since slice 2 grooming |
| Prior grooming       | [SPE-2445](https://linear.app/spectranoir/issue/SPE-2445) / PR #2766 — slice 2 AC table @ `1c8d2d74` |

**Delta since slice 2 (`1c8d2d74`):** no commits touching `selfCensoringInformationRegistry.ts`, `namingHazardDescriptorRegistry.ts`, investigation naming-hazard substitution, or related weekly hooks. [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) truth-layer wave (PR #2772–#2779) and grooming slice 3 ([SPE-2450](https://linear.app/spectranoir/issue/SPE-2450) / PR #2781) are unrelated to unified cognitive hazard engine AC — slice 3 confirms disposition unchanged.

## Parent AC vs shipped evidence (post slice 2)

Rows unchanged from [SPE-2445](https://linear.app/spectranoir/issue/SPE-2445) grooming — see `planning/spe-1309-parent-acceptance-review-slice-2.md`.

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Unified model covering fear pressure, memetic/infohazard exposure, memory impairment, countermeasure interaction | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) antimemetic record registry; [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) naming-hazard descriptor registry — separate domain modules, no shared cross-hazard exposure state | **No** |
| Trigger channels explicit (direct perception, recording-mediated, reference/description, memory interaction) | Propagation resistance tags on self-censoring records; naming-hazard intake topic cross-links — no engine-level trigger-channel taxonomy or routing | **No** |
| Cognitive hazard states affect agents, knowledge, and procedures | SPE-2108 weekly tick mutates persisted records only. SPE-2116 adds localized investigation substitution + confidence erosion — not unified agent impairment or procedure restriction | **No** |
| Narrower cognitive-hazard issues attach without replacing parent | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108), [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119), and [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) attach as sibling/child registries; every slice doc defers SPE-1309 unified engine wire-up | **Partial** — attach pattern works; parent engine undefined |

**Child [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) disposition:** **Done** — slices 1–4 satisfy child AC. [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) naming-hazard child **Done** (slices 1–5).

**Sibling [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118) / [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) disposition:** **Done** (schema slice 1 only) — persistence/orchestration deferred per intake wave cadence.

**Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) disposition:** **Backlog** — registry intake wave plus naming-hazard follow-on are valid attach surfaces, not the unified cognitive hazard engine. Do **not** mark parent **Done** until AC rows 1–3 meet minimum bar via owner-scoped engine slice.

**Doc vs Linear reconciliation:** Linear auto-closed parent **Done** after [SPE-2445](https://linear.app/spectranoir/issue/SPE-2445) merge (2026-06-12) while slice 2 doc and `planning/backlog.md` recorded **Backlog**. Grooming slice 3 returns Linear to **Backlog** with reasoning above — mirror SPE-2415 groomed-parent hygiene pattern; do not conflate child **Done** with parent closure.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Unified engine runtime implementation       |
| Return parent **Backlog** on Linear (guard against auto-close)     | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| `planning/backlog.md` Context + handoff row                        | Mission triage expansion                      |
| Slice doc (this file) + planning index row                         | SPE-1343 truth-layer runtime changes          |
| Linear hygiene on [SPE-2451](https://linear.app/spectranoir/issue/SPE-2451) | SPE-2116 runtime changes                      |

## Acceptance

- [ ] Parent AC re-evaluated — rows unchanged from slice 2; unified engine AC still **No**
- [ ] SPE-1309 **Backlog** on Linear aligned with docs; SPE-2108 / SPE-2116 remain **Done**
- [ ] Recommended next step updated to [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) matrix-link grooming or truth-layer follow-on
- [ ] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Unified cognitive hazard engine (shared exposure state, trigger channels, countermeasures) | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Parent AC rows 1–3; requires owner-scoped engine slice — not registry attach pattern |
| Sibling registry slice 2+ ([SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119)) | respective children | Schema slice 1 Done; persistence/orchestration deferred per intake wave cadence |
| Ethics / accountability matrix ledger links | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) / [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047) / [SPE-1131](https://linear.app/spectranoir/issue/SPE-1131) | Next recommended grooming target per backlog handoff |
| Cover-story lifecycle state machine | [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) | Truth-layer follow-on; out of SPE-1309 boundary |
| Investigation exposure dossier surfacing | [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) / E54 | Out of grooming boundary |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/spe-1309-parent-acceptance-review-slice-2.md`
- `planning/spe-1343-parent-acceptance-review-slice-3.md`
- `planning/spe-1888-parent-acceptance-review-slice-3.md`
- `planning/backlog-handoff-hygiene-slice-2.md`
