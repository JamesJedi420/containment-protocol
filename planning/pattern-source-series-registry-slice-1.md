# SPE-75 — Pattern source series intake registry slice 1

One-page implementation plan. Linear: [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) (public disclosure state registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2110 — Pattern source series intake registry (slice 1)](https://linear.app/spectranoir/issue/SPE-2110) |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — Contribution intake and modular release operations |
| **Branch** | `jamesdyedbq/spe-2110-pattern-source-series-intake-registry-slice-1`                                         |
| **Status** | Implemented on branch (pending PR)                                                                       |

## Goal

Add a pure deterministic **pattern-source series intake registry** for agent routing — not player-facing canon. Tracks multi-entry source clusters (series hubs) separately from single articles, location/event logs, canons, or organization indexes while preserving only Containment Protocol-safe implementation patterns.

## Prerequisite (on `main` @ `ec611a1d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Public disclosure    | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109 / PR #2430)    |
| Self-censoring info  | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108)            |
| Intake registry wave | SPE-2104 / SPE-2105 / SPE-2106 sibling patterns                        |
| Harvest hub closure  | 40+ batches on SPE-2110 in `planning/harvest-reconciliation-index.md` |

## Gap (pre-slice)

- No bounded schema for series-hub intake metadata (source family, editorial status, processing pipeline).
- No deterministic validation for CP-neutral labels, expression-risk normalization, or publication-order misuse.
- No queue projection ranked by readiness and CP utility rather than recency.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `PatternSourceSeriesId` + `PatternSourceSeriesRecord` in `src/domain/patternSourceSeriesRegistry.ts`                              | GameState persistence                         |
| sourceFamily, publicationOrder (ISO date), editorialStatus[], processingStatus, readinessScore, blurbDomainHints, linkedClusterIds | Planning mirror dashboard UI                  |
| adaptation metadata (normalizationState, expressionRiskFlags, normalizationNote)                                                   | Automated article-level queue generation      |
| `validatePatternSourceSeriesRecord(record)`                                                                                        | Linear MCP workflow wire-up                   |
| `projectSeriesProcessingQueue(records, policy)`                                                                                    | Importing harvest mirror rows into TS data    |
| `classifyBlurbDomains(blurbStub)` — routing hints only                                                                             | SPE-75 / SPE-854 parent Done                  |
| Focused tests in `src/test/patternSourceSeriesRegistry.test.ts`                                                                    |                                               |

## Record contract (deterministic)

### Core fields

- **sourceFamily** — `series_hub`, `canon_hub`, `single_article`, `organization_format`, `location_log`, `event_log`, `item_log`, `tale`, `anthology`, `meta_hub`.
- **publicationOrder** — external publication date (`YYYY-MM-DD`); tie-breaker only, not primary queue rank.
- **editorialStatus** — array; `open_entry` and `completed` may coexist on `series_hub`.
- **processingStatus** — `unqueued` → `blurb_triaged` → `deep_pass` → `reconciled` / `deferred` / `rejected`.
- **processingHistory** — optional prior statuses for pipeline warnings.
- **readinessScore** — 0..1 scalar; primary queue rank input.
- **adaptation** — normalizationState, expressionRiskFlags, normalizationNote.
- **crossClusterReinforcementRef** — hook only; no duplicate issue creation.

### Validation rules (examples)

- Franchise / wiki / branded label token in CP-neutral field → error.
- Imported organization name, character identity, plot, or setting literal → error.
- `canon_hub` on series archive intake → warning.
- `deep_pass` without prior `blurb_triaged` in history → warning.
- `implementationPriorityByPublicationOrder` true → warning.
- expressionRiskFlags without normalizationNote → warning; `implementation_ready` blocked.

## Acceptance

- [x] Fixture: series_hub with open_entry + completed editorial flags coexisting.
- [x] Queue projection prefers high readinessScore over recent publicationOrder.
- [x] Negative: imported organization name in title → validation error.
- [x] Negative: source-specific character identity in CP-neutral field → validation error.
- [x] Fixture: expression-risk flags remain provisional until normalizationNote exists.
- [x] crossClusterReinforcementRef hook on fixture without implying child issue creation.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + negative lint cases.
3. **classifyBlurbDomains** — deterministic keyword routing.
4. **projectSeriesProcessingQueue** — readiness-first ranking.
5. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                       |
| ------ | ----------------------------------------------------------- |
| Domain | `src/domain/patternSourceSeriesRegistry.ts`                 |
| Tests  | `src/test/patternSourceSeriesRegistry.test.ts`              |
| Plan   | `planning/pattern-source-series-registry-slice-1.md`        |

## Branch

`jamesdyedbq/spe-2110-pattern-source-series-intake-registry-slice-1`

## Out of scope (parent closure)

- Full SPE-75 parent Done
- GameState persistence and harvest mirror dashboard
- Automated article queue generation and Linear MCP wire-up

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2110
- `src/domain/publicDisclosureStateRegistry.ts` — validation + projection conventions (SPE-2109)
- `docs/harvest-fold-in-linear-comments.md` — hub intake (SPE-2110) batch closure format
