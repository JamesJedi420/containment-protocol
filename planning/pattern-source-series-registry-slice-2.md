# SPE-2110 — Pattern source series registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2327](https://linear.app/spectranoir/issue/SPE-2327) (child under [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110)). Follows shipped slice 1 (`planning/pattern-source-series-registry-slice-1.md`, PR #2431).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2327 — Pattern source series registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2327) |
| **Status** | **Shipped** — PR #2521 @ `0f67c210`                                                                        |
| **Parent** | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) — Pattern source series intake registry; umbrella [SPE-75](https://linear.app/spectranoir/issue/SPE-75) |
| **Branch** | `spe-2110-pattern-source-series-persistence-slice-2`                                                     |
| **Base `main` SHA** | `283fb1c8`                                                                                          |

## Goal

Persist validated `PatternSourceSeriesRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly orchestration and planning mirror UI are slice 3+.

## Prerequisite (on `main` @ `283fb1c8`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110 / PR #2431)    |
| Fixtures             | `SERIES_HUB_OPEN_ENTRY_FIXTURE`, `EXPRESSION_RISK_PROVISIONAL_FIXTURE` |
| Sibling persistence  | `publicDisclosureRecords` (SPE-2325), `selfCensoringInformationRecords` (SPE-2318) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `patternSourceSeriesRecords` on `GameState`                        | Weekly `advanceWeek` hook                     |
| `sanitizePatternSourceSeriesRecords` + `runTransfer` hydrate wire  | Planning mirror dashboard UI                  |
| `validatePatternSourceSeriesRecord` on hydrate; drop invalid, no throw | SPE-75 parent Done                     |
| Default `{}` in `createStartingState`                              | Pattern series projection semantics (slice 1) |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Automated article-level queue generation      |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Nested fields (`editorialStatus`, `processingHistory`, `adaptation`) byte-stable after round-trip
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/patternSourceSeriesRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/patternSourceSeriesRegistryPersistence.test.ts`           |
| Plan   | `planning/pattern-source-series-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly intake queue advance hook | SPE-2110 slice 3+ | Persistence must land before orchestration |
| Planning mirror dashboard UI | SPE-2110 / SPE-75 | Out of persistence-only boundary |
| Linear MCP workflow wire-up | SPE-2110 slice 3+ | Out of persistence-only boundary |

## See also

- `planning/pattern-source-series-registry-slice-1.md`
- `planning/public-disclosure-state-registry-slice-2.md`
- `planning/self-censoring-information-registry-slice-2.md`
