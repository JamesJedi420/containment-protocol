# SPE-3012 — Stamp one hazard event kind on the zone-spanning record

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                    |
| **Linear**          | [SPE-3012](https://linear.app/spectranoir/issue/SPE-3012/stamp-one-hazard-event-kind-on-the-zone-spanning-record)                                       |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella) |
| **Prerequisite**    | [SPE-3010](https://linear.app/spectranoir/issue/SPE-3010/consume-full-site-alert-onto-one-zone-spanning-record) — existing record and `siteWide` apply  |
| **Branch**          | `cursor/spe-3012-zone-spanning-hazard-kind-8bdb`                                                                                                        |
| **Base `main` SHA** | `c13caaaf1517bc86458ad7901b0dac18884b83d8`                                                                                                              |

## Goal

One event-kind token on the existing zone-spanning record. Exact `hazard` sets `eventKind`. A missing or unknown kind returns the same record.

## Pre-coding summary

| Item              | Finding                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `planning/spe-3010-zone-spanning-full-site-alert-consume-slice.md`        |
| Current behavior  | The record stores origin, affected ids, one propagation rule, `siteWide`, and a pulse. No event-kind field. SPE-3010 sets `siteWide` from `full_site_alert` only.   |
| Expected behavior | `applyZoneSpanningHazardKind` writes `eventKind: 'hazard'` only for that exact token. Unknown input returns the input record. An existing `hazard` kind returns it. |
| Boundary          | One token, contract tests, this slice doc, backlog handoff, and one SPE-3010 deferred row. No new rule. No stage id. No edit to `applyZoneSpanningFullSiteAlert`.   |
| Risks             | Treating `siteWide`, a propagation-rule token, or `full_site_alert` as the kind. Implementing `hostile` or `social` in this slice.                                  |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                       |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; one deferred row on the SPE-3010 slice doc. No `SCHEMA_REGISTRY` change.           |

## Boundary

### In scope

- Constant `hazard` beside the existing rule constants, not in `ZONE_SPANNING_PROPAGATION_RULES`
- Optional `eventKind` on `ZoneSpanningSiteEventRecord`
- `applyZoneSpanningHazardKind(record, kind)` freezes a copy only for exact `hazard`
- Success keeps the `affectedNodeIds` reference, propagation rule, origin, pulse, and `siteWide`
- Missing and unknown kinds, including `'hostile'`, `'social'`, and `'full_site_alert'`, return the input record
- An existing `eventKind: 'hazard'` returns the same record

### Out of scope

- A new propagation rule or a new stage id
- Edits to `applyZoneSpanningFullSiteAlert`, `readFullSiteAlertStage`, or `src/test/siteAlertStage.contract.test.ts`
- `hostile` and `social` event kinds
- Zone maps, environment pressure, occupancy, timeline, persistence, and week-close
- A GameState field and `SCHEMA_REGISTRY`

## Seam

`applyZoneSpanningHazardKind` is pure. It does not call `readFullSiteAlertStage`. Hydration and week-close do not call this function. `siteWide` and propagation-rule tokens are not the kind.

## Acceptance

- [x] Exact `hazard` sets `eventKind` and keeps the affected-id array reference and the existing rule, origin, pulse, and `siteWide`
- [x] Missing and unknown kinds return the same record, including when `siteWide` is already true
- [x] `'hostile'` and `'social'` do not set a kind
- [x] An existing `hazard` kind returns the same record
- [x] No new GameState field and no week-close hook

## Deferred

| Item or mechanic                                         | Owner or prerequisite                                                                                              | Why deferred                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Hostile event kind                                       | [SPE-3013](https://linear.app/spectranoir/issue/SPE-3013/stamp-one-hostile-event-kind-on-the-zone-spanning-record) | One token this slice. `'hostile'` fails closed here.     |
| Social/procedural event kind                             | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                          | One token this slice. `'social'` fails closed.           |
| Zone maps, environment pressure, occupancy, and timeline | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                          | This apply does not connect those systems.               |
| Persistence and `SCHEMA_REGISTRY`                        | Later SPE-1606 child                                                                                               | No GameState field this slice.                           |
| Week-close registration                                  | Existing week-close owners                                                                                         | This helper is not called from week-close.               |
| Full-site-alert consume                                  | [SPE-3010](https://linear.app/spectranoir/issue/SPE-3010/consume-full-site-alert-onto-one-zone-spanning-record)    | `applyZoneSpanningFullSiteAlert` stays on its own apply. |

Parent SPE-1606 remains **Backlog**. Parent SPE-102 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
