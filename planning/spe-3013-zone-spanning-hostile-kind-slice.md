# SPE-3013 — Stamp one hostile event kind on the zone-spanning record

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                    |
| **Linear**          | [SPE-3013](https://linear.app/spectranoir/issue/SPE-3013/stamp-one-hostile-event-kind-on-the-zone-spanning-record)                                      |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella) |
| **Prerequisite**    | [SPE-3012](https://linear.app/spectranoir/issue/SPE-3012/stamp-one-hazard-event-kind-on-the-zone-spanning-record) — existing record and `hazard` kind   |
| **Branch**          | `cursor/spe-3013-zone-spanning-hostile-kind-6bf8`                                                                                                       |
| **Base `main` SHA** | `8dc190e11dd0ecf597e73c2684ebb185aca669a6` (`450c3fe280776d1a0778d95c5e05c80f6e10ea54` is the hazard-kind ancestor)                                     |

## Goal

One event-kind token beside the shipped `hazard` kind. Exact `hostile` sets `eventKind`. A missing or unknown kind returns the same record. An existing `hazard` stamp stays.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `planning/spe-3012-zone-spanning-hazard-kind-slice.md`                                   |
| Current behavior  | `applyZoneSpanningHazardKind` writes `eventKind: 'hazard'` only for that token. `'hostile'` and `'social'` return the same record.                                                 |
| Expected behavior | `applyZoneSpanningHostileKind` writes `eventKind: 'hostile'` only for that exact token. Unknown input returns the input record. An existing `hazard` or `hostile` kind returns it. |
| Boundary          | One token, contract tests, this slice doc, backlog handoff, and the SPE-3012 hostile deferred row. No `social` token. No new rule.                                                 |
| Risks             | Replacing an existing `hazard` stamp. Treating `hazard`, `social`, `siteWide`, or a propagation-rule token as this kind.                                                           |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                                      |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; hostile row on the SPE-3012 slice doc. No `SCHEMA_REGISTRY` change.                               |

## Boundary

### In scope

- Constant `hostile` beside `ZONE_SPANNING_HAZARD_KIND`, not in `ZONE_SPANNING_PROPAGATION_RULES`
- Optional `eventKind` widened to `'hazard' | 'hostile'`
- `applyZoneSpanningHostileKind(record, kind)` freezes a copy only for exact `hostile`
- Success keeps the `affectedNodeIds` reference, propagation rule, origin, pulse, and `siteWide`
- Missing and unknown kinds, including `'hazard'`, `'social'`, and `'full_site_alert'`, return the input record
- An existing `eventKind: 'hazard'` or `eventKind: 'hostile'` returns the same record
- `applyZoneSpanningHazardKind` returns the same record when `eventKind` is already `'hostile'`

### Out of scope

- A `social` constant, union member, or apply
- A new propagation rule or a new stage id
- Edits to `applyZoneSpanningFullSiteAlert`, `readFullSiteAlertStage`, or `src/test/siteAlertStage.contract.test.ts`
- Copying `eventKind` through spread helpers or `freezeRecord`
- Zone maps, environment pressure, occupancy, timeline, persistence, and week-close
- A GameState field and `SCHEMA_REGISTRY`

## Seam

`applyZoneSpanningHostileKind` is pure. It does not call `readFullSiteAlertStage`. Hydration and week-close do not call this function. `siteWide` and propagation-rule tokens are not the kind.

## Acceptance

- [x] Exact `hostile` sets `eventKind` and keeps the affected-id array reference and the existing rule, origin, pulse, and `siteWide`
- [x] Missing and unknown kinds return the same record, including when `siteWide` is already true
- [x] `'social'` does not set a kind
- [x] An existing `hazard` kind returns the same record
- [x] An existing `hostile` kind returns the same record
- [x] `applyZoneSpanningHazardKind` does not replace an existing `hostile` kind
- [x] No new GameState field and no week-close hook

## Deferred

| Item or mechanic                                         | Owner or prerequisite                                                                                             | Why deferred                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Social/procedural event kind                             | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                         | One token this slice. `'social'` fails closed.           |
| Zone maps, environment pressure, occupancy, and timeline | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                         | This apply does not connect those systems.               |
| Persistence and `SCHEMA_REGISTRY`                        | Later SPE-1606 child                                                                                              | No GameState field this slice.                           |
| Week-close registration                                  | Existing week-close owners                                                                                        | This helper is not called from week-close.               |
| Spread helpers omit `eventKind`                          | Later SPE-1606 child                                                                                              | `freezeRecord` and spread applies still drop the field.  |
| Hazard kind                                              | [SPE-3012](https://linear.app/spectranoir/issue/SPE-3012/stamp-one-hazard-event-kind-on-the-zone-spanning-record) | Exact `hazard` stays on its own apply.                   |
| Full-site-alert consume                                  | [SPE-3010](https://linear.app/spectranoir/issue/SPE-3010/consume-full-site-alert-onto-one-zone-spanning-record)   | `applyZoneSpanningFullSiteAlert` stays on its own apply. |

Parent SPE-1606 remains **Backlog**. Parent SPE-102 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
