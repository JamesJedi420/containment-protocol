# SPE-3015 — Reserve eventKind when a spread apply copies the record

| Field               | Value                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                |
| **Linear**          | [SPE-3015](https://linear.app/spectranoir/issue/SPE-3015/reserve-eventkind-when-a-spread-apply-copies-the-record)                                                   |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella)             |
| **Prerequisite**    | [SPE-3014](https://linear.app/spectranoir/issue/SPE-3014/stamp-one-social-event-kind-on-the-zone-spanning-record) — `eventKind` is `hazard`, `hostile`, or `social` |
| **Branch**          | `cursor/spe-3015-reserve-event-kind-on-spread-b3d0`                                                                                                                 |
| **Base `main` SHA** | `a5d78ee474936a46d5c4429191ca99bd19c48043`                                                                                                                          |

## Goal

On spread success, the rebuilt record keeps an existing `eventKind`. A missing kind stays omitted. The copy does not invent, clear, or replace a kind.

## Pre-coding summary

| Item              | Finding                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `planning/spe-3014-zone-spanning-social-kind-slice.md`    |
| Current behavior  | `freezeRecord` and adjacency success rebuild the record and drop `eventKind`. Failure paths return the same record.                                 |
| Expected behavior | Success copies `hazard`, `hostile`, or `social`. A missing kind omits the key. Failure still returns the same record.                               |
| Boundary          | Copy the field on spread success. Contract tests, this slice doc, backlog handoff, and the SPE-3014 deferred row. No new kind token.                |
| Risks             | Writing `eventKind: undefined`. Replacing a kind. Routing adjacency through `freezeRecord` and changing the frozen shape.                           |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                       |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; spread row on the SPE-3014 slice doc. No `SCHEMA_REGISTRY` change. |

## Boundary

### In scope

- `freezeRecord` copies an existing `hazard`, `hostile`, or `social` kind and omits the key when the kind is missing
- Adjacency success uses that same copy
- Airflow, visibility, panic, alarm, contamination, and route_link success keep the kind because they already call `freezeRecord`
- Contract tests for each success path

### Out of scope

- A fourth event-kind token
- Edits to `applyZoneSpanningHazardKind`, `applyZoneSpanningHostileKind`, `applyZoneSpanningSocialKind`, or `applyZoneSpanningFullSiteAlert`
- A new propagation rule, stage id, GameState field, `SCHEMA_REGISTRY` change, or week-close hook
- Zone maps, environment pressure, occupancy, timeline, and persistence

## Seam

Spread success is the only copy. Failure still returns the input record. Kind stampers and full-site alert are unchanged. `applyZoneSpanningFullSiteAlert` still drops `eventKind`.

## Acceptance

- [x] Adjacency, airflow, visibility, panic, alarm, contamination, and route_link success keep `hazard`, `hostile`, and `social`
- [x] A missing kind stays omitted on those success paths
- [x] Origin, propagation rule, pulse, `siteWide`, and affected ids stay on the existing spread behavior
- [x] No new kind token, GameState field, or week-close hook

## Deferred

| Item or mechanic                                         | Owner or prerequisite                                                                                                                                                                                                                                                                                                                                    | Why deferred                                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Zone maps, environment pressure, occupancy, and timeline | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                                                                                                                                                                                                                                                | This copy does not connect those systems.                                                                     |
| Persistence and `SCHEMA_REGISTRY`                        | Later SPE-1606 child                                                                                                                                                                                                                                                                                                                                     | No GameState field this slice.                                                                                |
| Week-close registration                                  | Existing week-close owners                                                                                                                                                                                                                                                                                                                               | Spread helpers are not newly registered on week-close.                                                        |
| Full-site alert drops `eventKind`                        | [SPE-3016](https://linear.app/spectranoir/issue/SPE-3016/copy-zone-spanning-eventkind-through-the-full-site-alert-rebuild)                                                                                                                                                                                                                               | Deferred here because this slice left the rebuild unchanged. SPE-3016 copies an existing kind on that freeze. |
| Kind stampers                                            | [SPE-3012](https://linear.app/spectranoir/issue/SPE-3012/stamp-one-hazard-event-kind-on-the-zone-spanning-record), [SPE-3013](https://linear.app/spectranoir/issue/SPE-3013/stamp-one-hostile-event-kind-on-the-zone-spanning-record), [SPE-3014](https://linear.app/spectranoir/issue/SPE-3014/stamp-one-social-event-kind-on-the-zone-spanning-record) | Exact tokens stay on their own applies.                                                                       |

Parent SPE-1606 remains **Backlog**. Parent SPE-102 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
