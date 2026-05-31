# SPE-854 — Extranormal event registry slice 1 (brief incident intake schema)

One-page implementation plan. Linear: [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) (child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854)). Follows shipped [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) (investigation exposure / fuzzy-clue registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2105 — Extranormal event registry slice 1](https://linear.app/spectranoir/issue/SPE-2105)           |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine       |
| **Branch** | `jamesdyedbq/spe-2105-extranormal-event-registry-brief-incident-intake-cover-up`                           |
| **Status** | **Shipped** — PR #2426                                                                                     |

## Goal

Add a pure deterministic **extranormal-event registry** for short-lived incidents too brief for ordinary securing or containment — resolved primarily through cover-up, monitoring windows, and record repair — without importing external wiki event labels or franchise terminology.

## Prerequisite (on `main` @ `d031fd91`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Fuzzy-clue registry  | `src/domain/investigationExposureClueRegistry.ts` (SPE-2159)         |
| Information intake parent | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — In Progress |
| Hidden-state matrix  | Post-matrix queue complete (SPE-2288–SPE-2290 / PR #2421–#2423)      |

## Gap (pre-slice)

- No bounded schema for brief extranormal incidents distinct from full case lifecycle.
- No deterministic validation for cover-story / monitoring / closure-state combinations.
- No map projection helper for record-derived location and confidence (not objective truth).

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `ExtranormalEventId` + `ExtranormalEventRecord` in `src/domain/extranormalEventRegistry.ts`                                        | GameState persistence                         |
| Occurrence window, effectDomainTags, affectedAreaGeometry, populationSelectors, evidence types, cover-story, witness class, monitoring-until week, `closureState` | Cover-story matcher wire-up on downstream owners |
| `validateExtranormalEventRecord(record)` — deterministic lint (warnings + errors)                                                | Case escalation transitions                   |
| `projectExtranormalEventForMap(record, policy)` — record-derived location/confidence projection                                    | Event board UI                                |
| Similar-event cluster refs (no causation implied)                                                                                    | Recurring temporal events owner               |
| Focused tests in `src/test/extranormalEventRegistry.test.ts`                                                                       | Full SPE-854 parent Done                      |

## Record contract (deterministic)

### Core fields

- **Occurrence window** — start/end week or compact interval token.
- **effectDomainTags** — biological, spatial, temporal, media, cognitive, animal, environmental, infrastructural, jurisdictional, record-affecting.
- **affectedAreaGeometry** — point, room, building, route, radius, civic boundary, river, broadcast reach, species-wide, worldwide.
- **populationSelectors** — location, role, name, species, staff, viewer, memory-state.
- **closureState** — `sourceless_closed`, `escalated_to_case`, `unrecovered_followup`, `monitor_only`, `public_hoax_left`.
- **confidence / unknown / redacted** — projection legibility without dumping hidden truth.

### Validation rules (examples)

- `cover_story` without `witness_plan` → warning.
- monitoring timer without `closureState` → error.
- similarity cluster without confidence → warning.
- `escalated_to_case` requires target case ref.
- single `resolved: true` without cover_story or monitor fields → `closure_collapse` warning.

## Acceptance

- [ ] Fixture: brief event with cover_story + 6-month monitoring timer + `sourceless_closed`.
- [ ] Similarity cluster links two events without `shared_source_id`.
- [ ] effectDomainTags + populationSelectors round-trip on validation.
- [ ] Negative: bare `resolved: true` without cover/monitor → closure_collapse warning.
- [ ] `escalated_to_case` requires target case ref.
- [ ] Optional observer-class / theme / danger metadata round-trips without expanding beyond brief-event boundary.
- [ ] Repeated validation byte-stable.
- [ ] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — record shape, closure states, tag unions.
2. **Validation** — positive fixtures + negative lint cases.
3. **Map projection** — record-derived location/confidence only.
4. **Regression** — investigation exposure registry tests unchanged.

## File touch list (expected)

| Area   | Files                                              |
| ------ | -------------------------------------------------- |
| Domain | `src/domain/extranormalEventRegistry.ts`           |
| Tests  | `src/test/extranormalEventRegistry.test.ts`        |

## Branch

`jamesdyedbq/spe-2105-extranormal-event-registry-brief-incident-intake-cover-up`

## Out of scope (parent closure)

- Full SPE-854 parent Done
- GameState persistence and weekly orchestration wiring
- Memory intervention as default cleanup (ethics routing external)

## See also

- `architecture/containment-environment-patterns.md` — distant reappearance / signature match reference
- `src/domain/investigationExposureClueRegistry.ts` — sibling intake registry pattern (SPE-2159)
