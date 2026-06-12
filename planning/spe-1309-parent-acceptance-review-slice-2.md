# SPE-1309 — Parent acceptance review (grooming slice 2)

One-page grooming record. Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — registry child wave + naming-hazard follow-on shipped; unified engine AC not met.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2445 — SPE-1309 parent acceptance review (grooming slice 2)](https://linear.app/spectranoir/issue/SPE-2445) |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine; stays **Backlog** |
| **Branch** | `spe-1309-parent-acceptance-review-slice-2`                                                                |
| **Status** | **Shipped** — SPE-2445 (PR pending) @ `ca39aec2`                                                           |
| **Base `main` SHA** | `ca39aec2`                                                                                          |

## Goal

Re-evaluate whether shipped [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) registry wave and follow-on sibling slices satisfy remaining parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) acceptance criteria after [SPE-2399](https://linear.app/spectranoir/issue/SPE-2399) grooming (slice 1). Docs + Linear hygiene only — no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `ca39aec2`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Self-censoring info registry schema | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) / PR #2429 — `src/domain/selfCensoringInformationRegistry.ts` |
| GameState persistence | [SPE-2318](https://linear.app/spectranoir/issue/SPE-2318) / PR #2500 — `selfCensoringInformationRecords` |
| Weekly retention/rediscovery hook | [SPE-2324](https://linear.app/spectranoir/issue/SPE-2324) / PR #2515 — `applyWeeklySelfCensoringInformationTick` |
| Planning mirror UI | [SPE-2330](https://linear.app/spectranoir/issue/SPE-2330) / PR #2527 — `SelfCensoringInformationMirrorPage` |
| Naming-hazard follow-on (SPE-2108 child) | [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) slices 2–5 + [SPE-2358](https://linear.app/spectranoir/issue/SPE-2358) cross-link — persistence, investigation substitution, weekly tick, mirror UI, triage surfacing (PR #2582–#2681) |
| Sibling schema-only children | [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) slice 1 **Done** — no persistence slices since slice 1 grooming |

**Delta since slice 1 (`5d5d7ab4`):** no changes to `selfCensoringInformationRegistry.ts`, weekly retention hook, or mirror UI. Naming-hazard follow-on under [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) was already in flight at slice 1 base but not in slice 1 AC table — now fully shipped and audited below.

## Parent AC vs shipped evidence (post slice 1)

Rows 1–3 unchanged from [SPE-2399](https://linear.app/spectranoir/issue/SPE-2399) grooming — see `planning/spe-1309-parent-acceptance-review-slice-1.md`.

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Unified model covering fear pressure, memetic/infohazard exposure, memory impairment, countermeasure interaction | Unchanged from slice 1 — [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) antimemetic record registry; [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) naming-hazard descriptor registry (safe-label substitution, confidence erosion) — separate domain modules, no shared cross-hazard exposure state | **No** |
| Trigger channels explicit (direct perception, recording-mediated, reference/description, memory interaction) | Unchanged from slice 1 — propagation resistance tags on self-censoring records; naming-hazard routes intake topic cross-links — no engine-level trigger-channel taxonomy or routing | **No** |
| Cognitive hazard states affect agents, knowledge, and procedures | Unchanged from slice 1 for SPE-2108 weekly tick (persisted records only). SPE-2116 adds investigation case-prep substitution (`investigationNamingHazardSubstitution.ts`) and weekly confidence erosion — localized naming-hazard effects only, not unified agent impairment or procedure restriction | **No** |
| Narrower cognitive-hazard issues attach without replacing parent | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108), [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119), and [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) attach as sibling/child registries; every slice doc defers SPE-1309 unified engine wire-up | **Partial** — attach pattern strengthened by naming-hazard follow-on; parent engine undefined |

**Child [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) disposition:** **Done** — slices 1–4 satisfy child AC. [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) naming-hazard child remains open on Linear (full registry wave shipped; parent SPE-2108 stays open per backlog).

**Sibling [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118) / [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) disposition:** **Done** (schema slice 1 only) — persistence/orchestration deferred per intake wave cadence; unchanged since slice 1.

**Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) disposition:** **Backlog** — registry intake wave plus naming-hazard follow-on are valid attach surfaces, not the unified cognitive hazard engine.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Unified engine runtime implementation       |
| `planning/backlog.md` recommended next step handoff                | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on [SPE-2445](https://linear.app/spectranoir/issue/SPE-2445) | SPE-868 slice 28+ (branching reward logic)  |
| Confirm parent stays **Backlog** (guard against auto-close)        | SPE-2116 runtime changes                      |

## Acceptance

- [x] Parent AC re-evaluated against SPE-2108 wave + follow-on evidence with Done vs Backlog reasoning
- [x] SPE-1309 stays **Backlog** on Linear; SPE-2108 remains **Done**
- [x] Recommended next step updated to [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) grooming slice 2
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Unified cognitive hazard engine (shared exposure state, trigger channels, countermeasures) | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Parent AC; requires owner-scoped engine slice — not registry slice-2 pattern alone |
| Sibling registry slice 2+ ([SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119)) | respective children | Schema slice 1 Done; persistence/orchestration deferred per intake wave cadence |
| Investigation exposure dossier surfacing | [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) / E54 | Out of grooming boundary |
| SPE-854 unusable-archive routing cross-link | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) follow-up | Parent **Done**; cross-link deferred in slice docs |
| Truth-layer split parent grooming slice 2 | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Next recommended handoff target |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/spe-1309-parent-acceptance-review-slice-1.md`
- `planning/self-censoring-information-registry-slice-4.md`
- `planning/naming-hazard-descriptor-registry-slice-5.md`
- `planning/spe-1343-parent-acceptance-review-slice-1.md`
