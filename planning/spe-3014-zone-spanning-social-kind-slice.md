# SPE-3014 — Stamp one social event kind on the zone-spanning record

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                    |
| **Linear**          | [SPE-3014](https://linear.app/spectranoir/issue/SPE-3014/stamp-one-social-event-kind-on-the-zone-spanning-record)                                       |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella) |
| **Prerequisite**    | [SPE-3013](https://linear.app/spectranoir/issue/SPE-3013/stamp-one-hostile-event-kind-on-the-zone-spanning-record) — existing record and `hostile` kind |
| **Branch**          | `cursor/spe-3014-zone-spanning-social-kind-cf7c`                                                                                                        |
| **Base `main` SHA** | `028072f5da18befabaa2756f77884de5c5077361`                                                                                                              |

## Goal

One event-kind token beside the shipped `hazard` and `hostile` kinds. Exact `social` sets `eventKind`. A missing or unknown kind returns the same record. An existing `hazard` or `hostile` stamp stays.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `planning/spe-3013-zone-spanning-hostile-kind-slice.md`                                           |
| Current behavior  | `applyZoneSpanningHostileKind` writes `eventKind: 'hostile'` only for that token. `'social'` returns the same record. An existing `hazard` or `hostile` stamp is not cleared.               |
| Expected behavior | `applyZoneSpanningSocialKind` writes `eventKind: 'social'` only for that exact token. Unknown input returns the input record. An existing `hazard`, `hostile`, or `social` kind returns it. |
| Boundary          | One token, contract tests, this slice doc, backlog handoff, and the SPE-3013 social deferred row. No new rule.                                                                              |
| Risks             | Replacing an existing `hazard` or `hostile` stamp. Treating `hazard`, `hostile`, `siteWide`, `full_site_alert`, or a propagation-rule token as this kind.                                   |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                                               |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; social row on the SPE-3013 slice doc. No `SCHEMA_REGISTRY` change.                                         |

## Boundary

### In scope

- Constant `social` beside `ZONE_SPANNING_HAZARD_KIND` and `ZONE_SPANNING_HOSTILE_KIND`, not in `ZONE_SPANNING_PROPAGATION_RULES`
- Optional `eventKind` widened to `'hazard' | 'hostile' | 'social'`
- `applyZoneSpanningSocialKind(record, kind)` freezes a copy only for exact `social`
- Success keeps the `affectedNodeIds` reference, propagation rule, origin, pulse, and `siteWide`
- Missing and unknown kinds, including `'hazard'`, `'hostile'`, and `'full_site_alert'`, return the input record
- An existing `eventKind: 'hazard'`, `eventKind: 'hostile'`, or `eventKind: 'social'` returns the same record
- `applyZoneSpanningHazardKind` and `applyZoneSpanningHostileKind` return the same record when `eventKind` is already `'social'`

### Out of scope

- A new propagation rule or a new stage id
- Edits to `applyZoneSpanningFullSiteAlert`, `readFullSiteAlertStage`, or `src/test/siteAlertStage.contract.test.ts`
- Copying `eventKind` through spread helpers or `freezeRecord`
- Zone maps, environment pressure, occupancy, timeline, persistence, and week-close
- A GameState field and `SCHEMA_REGISTRY`

## Seam

`applyZoneSpanningSocialKind` is pure. It does not call `readFullSiteAlertStage`. Hydration and week-close do not call this function. `siteWide` and propagation-rule tokens are not the kind.

## Acceptance

- [x] Exact `social` sets `eventKind` and keeps the affected-id array reference and the existing rule, origin, pulse, and `siteWide`
- [x] Missing and unknown kinds return the same record, including when `siteWide` is already true
- [x] An existing `hazard` kind returns the same record
- [x] An existing `hostile` kind returns the same record
- [x] An existing `social` kind returns the same record
- [x] `applyZoneSpanningHazardKind` and `applyZoneSpanningHostileKind` do not replace an existing `social` kind
- [x] `'social'` stays in the hazard and hostile rejected-kind lists
- [x] No new GameState field and no week-close hook

## Deferred

| Item or mechanic                                         | Owner or prerequisite                                                                                              | Why deferred                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Zone maps, environment pressure, occupancy, and timeline | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                          | This apply does not connect those systems.               |
| Persistence and `SCHEMA_REGISTRY`                        | Later SPE-1606 child                                                                                               | No GameState field this slice.                           |
| Week-close registration                                  | Existing week-close owners                                                                                         | This helper is not called from week-close.               |
| Spread helpers omit `eventKind`                          | Later SPE-1606 child                                                                                               | `freezeRecord` and spread applies still drop the field.  |
| Hazard kind                                              | [SPE-3012](https://linear.app/spectranoir/issue/SPE-3012/stamp-one-hazard-event-kind-on-the-zone-spanning-record)  | Exact `hazard` stays on its own apply.                   |
| Hostile kind                                             | [SPE-3013](https://linear.app/spectranoir/issue/SPE-3013/stamp-one-hostile-event-kind-on-the-zone-spanning-record) | Exact `hostile` stays on its own apply.                  |
| Full-site-alert consume                                  | [SPE-3010](https://linear.app/spectranoir/issue/SPE-3010/consume-full-site-alert-onto-one-zone-spanning-record)    | `applyZoneSpanningFullSiteAlert` stays on its own apply. |

Parent SPE-1606 remains **Backlog**. Parent SPE-102 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
