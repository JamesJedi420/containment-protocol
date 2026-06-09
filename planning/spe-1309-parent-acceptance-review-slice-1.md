# SPE-1309 — Parent acceptance review (grooming slice 1)

One-page grooming record. Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — registry child wave shipped; unified engine AC not met.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2399 — SPE-1309 parent acceptance review (grooming slice 1)](https://linear.app/spectranoir/issue/SPE-2399) |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine; stays **Backlog** |
| **Branch** | `spe-1309-parent-acceptance-review-slice-1`                                                                |
| **Status** | **Shipped** — SPE-2399 (PR TBD) @ `5d5d7ab4`                                                               |
| **Base `main` SHA** | `5d5d7ab4`                                                                                          |

## Goal

Evaluate whether shipped [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) registry slices 1–4 satisfy parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) acceptance criteria. Docs + Linear hygiene only — no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `5d5d7ab4`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Self-censoring info registry schema | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) / PR #2429 — `src/domain/selfCensoringInformationRegistry.ts` |
| GameState persistence | [SPE-2318](https://linear.app/spectranoir/issue/SPE-2318) / PR #2500 — `selfCensoringInformationRecords` |
| Weekly retention/rediscovery hook | [SPE-2324](https://linear.app/spectranoir/issue/SPE-2324) / PR #2515 — `applyWeeklySelfCensoringInformationTick` |
| Planning mirror UI | [SPE-2330](https://linear.app/spectranoir/issue/SPE-2330) / PR #2527 — `SelfCensoringInformationMirrorPage` |
| Sibling schema-only children | [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) slice 1 **Done** |

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Unified model covering fear pressure, memetic/infohazard exposure, memory impairment, countermeasure interaction | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) covers **one** antimemetic/self-censoring **record registry** with `informationFailureMode`, `propagationResistance`, retention decay — not a shared cross-hazard exposure state model | **No** |
| Trigger channels explicit (direct perception, recording-mediated, reference/description, memory interaction) | Record fields describe propagation resistance tags; no engine-level trigger-channel taxonomy or routing | **No** |
| Cognitive hazard states affect agents, knowledge, and procedures | Weekly tick mutates persisted records only; no agent impairment, knowledge integrity, or procedure restriction wiring | **No** |
| Narrower cognitive-hazard issues attach without replacing parent | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108), [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) attach as sibling registries; domain modules explicitly defer unified engine wire-up | **Partial** — attach pattern works; parent engine undefined |

**Child [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) disposition:** **Done** — slices 1–4 satisfy child AC (schema → persistence → weekly hook → mirror UI). Parent closure was explicitly out of scope in every slice doc.

**Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) disposition:** **Backlog** — registry intake wave is a valid attach surface, not the unified cognitive hazard engine.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Unified engine runtime implementation       |
| `planning/backlog.md` recommended next step handoff                | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on [SPE-2399](https://linear.app/spectranoir/issue/SPE-2399) | SPE-868 slice 28 (branching reward logic)   |

## Acceptance

- [x] Parent AC evaluated against SPE-2108 slices 1–4 evidence with Done vs Backlog reasoning
- [x] SPE-1309 stays **Backlog** on Linear; SPE-2108 remains **Done**
- [x] Recommended next step updated to next genuinely open grooming target
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Unified cognitive hazard engine (shared exposure state, trigger channels, countermeasures) | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Parent AC; requires owner-scoped engine slice — not registry slice-2 pattern alone |
| Sibling registry slice 2+ ([SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119)) | respective children | Schema slice 1 Done; persistence/orchestration deferred per intake wave cadence |
| Investigation exposure dossier surfacing | [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) / E54 | Out of grooming boundary |
| SPE-854 unusable-archive routing cross-link | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) follow-up | Parent **Done**; cross-link deferred in slice docs |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/self-censoring-information-registry-slice-4.md`
- `planning/scope-discipline-grooming-pass.md`
- `planning/backlog-handoff-hygiene-slice-1.md`
