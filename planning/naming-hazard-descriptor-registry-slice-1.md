# SPE-2108 — Naming-hazard descriptor registry slice 1

One-page implementation plan. Linear: [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) (child under [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108)). Follows shipped [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) (contained-person therapeutic care registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2116 — Naming-hazard descriptor registry — safe labels and reference constraints (slice 1)](https://linear.app/spectranoir/issue/SPE-2116) |
| **Parent** | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) — Self-censoring information registry |
| **Branch** | `jamesdyedbq/spe-2116-naming-hazard-descriptor-registry-safe-labels-and-reference`                         |
| **Status** | **Shipped** — PR #2435                                                                                     |

## Goal

Add a pure deterministic **naming-hazard descriptor registry** so locations, entities, and landmarks that cannot be safely named use approved surrogate descriptors in UI, maps, briefings, and file labels — without importing external canon names.

## Prerequisite (on `main` @ `7df49452`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Contained-person care | `src/domain/containedPersonTherapeuticCareRegistry.ts` (SPE-2115 / PR #2434) |
| Self-censoring info  | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108)               |
| Intake registry wave | SPE-2104–SPE-2115 sibling patterns                                       |
| Harvest batch        | `starter-picks-routing-65` (C28, C19) in `planning/harvest-reconciliation-index.md` |

## Gap (pre-slice)

- No bounded schema for true-name prohibition, safe descriptor pools, or reference constraints.
- No deterministic validation for empty pools when naming is forbidden or compulsive-phrase briefing lint.
- No `projectSafeLabel` helper for dossier/map/briefing/file_label surfaces.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `NamingHazardDescriptorId` + `NamingHazardDescriptorRecord` in `src/domain/namingHazardDescriptorRegistry.ts`                      | GameState persistence                         |
| trueNameForbidden, safeDescriptorPool, referenceConstraints, uiSubstitutionPolicy, mapLabelMode, compulsivePhraseWatchlist         | Investigation UI substitution               |
| `validateNamingHazardDescriptorRecord(record)` — empty pool when forbidden → error; compulsive_phrase_risk briefing lint         | Procedural naming integration (SPE-76)        |
| `projectSafeLabel(record, context)` — substituted label for dossier/map/briefing/file_label contexts                               | Name-taxonomy targeting (SPE-456)             |
| Focused tests in `src/test/namingHazardDescriptorRegistry.test.ts`                                                                 | Full SPE-2108 parent Done                     |

## Record contract (deterministic)

### Core fields

- **trueNameForbidden** — when true, only safeDescriptorPool entries may surface in player-facing projection.
- **safeDescriptorPool** — approved surrogate strings; non-empty required when trueNameForbidden.
- **referenceConstraints** — `no_titles`, `no_designations`, `no_proper_nouns`, `compulsive_phrase_risk`.
- **uiSubstitutionPolicy** — `pool_descriptor`, `pool_with_grid_fallback`, `grid_ref`, `redacted`.
- **mapLabelMode** — `descriptor_only`, `grid_ref`, `redacted`.
- **compulsivePhraseWatchlist** — optional corruption detector phrases for briefing lint.
- **briefingTemplateSnippet** — optional authoring preview scanned when compulsive_phrase_risk is active.
- **confidence / unknown / redacted** — projection legibility without dumping hidden dossier truth.

### Validation rules (examples)

- Missing `id` or `label` → error.
- `trueNameForbidden` with empty `safeDescriptorPool` → error.
- Invalid union values, empty pool entries, duplicate pool entries → error.
- `compulsive_phrase_risk` without watchlist → warning.
- Watchlist phrase present in `briefingTemplateSnippet` → warning.
- Franchise / wiki / branded object-number token in id or CP-neutral field → error.

### Projection (`projectSafeLabel`)

- Inputs: record + context (`surface`, optional `gridRef`, `descriptorIndex`, `templateText`).
- Map + `descriptor_only` + `pool_with_grid_fallback` uses pool descriptor, falls back to `gridRef`.
- `redacted` map mode or `redacted` policy returns deterministic redacted placeholder.
- Never emits player-facing true names in slice 1 fixtures.

## Acceptance

- [x] Fixture: descriptor_only map labels with grid_ref fallback.
- [x] Fixture: compulsive_phrase_risk triggers lint on briefing template.
- [x] Negative: trueNameForbidden with empty safeDescriptorPool → error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + negative lint cases.
3. **Projection** — `projectSafeLabel` descriptor and grid fallback paths.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/namingHazardDescriptorRegistry.ts`                        |
| Tests  | `src/test/namingHazardDescriptorRegistry.test.ts`                     |
| Plan   | `planning/naming-hazard-descriptor-registry-slice-1.md`               |

## Branch

`jamesdyedbq/spe-2116-naming-hazard-descriptor-registry-safe-labels-and-reference`

## Out of scope (parent closure)

- Full SPE-2108 parent Done
- GameState persistence and weekly orchestration wiring
- SPE-76 procedural naming, SPE-456 name-taxonomy targeting, investigation UI substitution

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2116
- `src/domain/selfCensoringInformationRegistry.ts` — parent chain validation conventions (SPE-2108)
- `architecture/procedural-naming-layered-identity.md` — SPE-76 boundary (distinct from this registry)

---

## Post-ship doc hygiene (mandatory after merge)

- [x] **`planning/naming-hazard-descriptor-registry-slice-1.md`** — Status **Shipped — PR #2435**; acceptance boxes checked.
- [x] **`planning/backlog.md`** — wave through SPE-2116; shipped table + slice index; handoff to SPE-2117 @ `3d2cf928`.
- [x] **Linear** — SPE-2116 → Done + merge comment (PR #2435, validation). Parent SPE-2108 → Backlog (umbrella open).
- [x] **Next agent handoff** — `On main @ 3d2cf928. Next: SPE-2117 — recurrent catastrophe amelioration registry — branch jamesdyedbq/spe-2117-recurrent-catastrophe-amelioration-registry-slice-1`.
