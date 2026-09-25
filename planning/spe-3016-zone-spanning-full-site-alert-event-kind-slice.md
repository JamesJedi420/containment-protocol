# SPE-3016 — Copy zone-spanning eventKind through the full-site alert rebuild

| Field               | Value                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                               |
| **Linear**          | [SPE-3016](https://linear.app/spectranoir/issue/SPE-3016/copy-zone-spanning-eventkind-through-the-full-site-alert-rebuild)                                                         |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella)                            |
| **Prerequisite**    | [SPE-3015](https://linear.app/spectranoir/issue/SPE-3015/reserve-eventkind-when-a-spread-apply-copies-the-record) — spread success already copies `hazard`, `hostile`, or `social` |
| **Branch**          | `cursor/spe-3016-zone-spanning-full-site-alert-event-kind-13f0`                                                                                                                    |
| **Base `main` SHA** | `8abaeb4451b8a9497c7e7692c9a0ac8c23a06119`                                                                                                                                         |

## Goal

On a qualifying full-site-alert stage, the frozen copy keeps an existing `hazard`, `hostile`, or `social` eventKind and omits the key when the kind is missing. A null stage returns the same record.

## Pre-coding summary

| Item              | Finding                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `planning/spe-3015-zone-spanning-reserve-event-kind-slice.md`          |
| Current behavior  | `applyZoneSpanningFullSiteAlert` rebuilds the frozen record and drops `eventKind`. A null stage returns the same record. `freezeRecord` already copies the kind. |
| Expected behavior | The qualifying freeze includes `eventKind` only for `hazard`, `hostile`, or `social`. A missing kind omits the key. A null stage returns the same record.        |
| Boundary          | That one rebuild, contract tests, this slice doc, backlog handoff, and the SPE-3015 deferred row. No new kind token.                                             |
| Risks             | Writing `eventKind: undefined`. Changing `siteWide`, affected ids, rule, origin, or pulse. Editing `freezeRecord` or the kind stampers.                          |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                    |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; the SPE-3015 deferred row. No `SCHEMA_REGISTRY` change.                         |

## Boundary

### In scope

- Qualifying `applyZoneSpanningFullSiteAlert` copies an existing `hazard`, `hostile`, or `social` kind and omits the key when the kind is missing
- The null-stage early return stays the same record reference
- Contract tests on the existing full-site-alert file

### Out of scope

- A fourth event-kind token
- Edits to `freezeRecord`, adjacency, airflow, visibility, panic, alarm, contamination, or route_link applies
- Edits to `applyZoneSpanningHazardKind`, `applyZoneSpanningHostileKind`, or `applyZoneSpanningSocialKind`
- A new propagation rule, stage id, GameState field, `SCHEMA_REGISTRY` change, or week-close hook

## Seam

The qualifying freeze is the only copy. A null or non-qualifying stage still returns the input record. Spread helpers and kind stampers stay on their shipped applies.

## Acceptance

- [x] Qualifying success keeps `hazard`, `hostile`, and `social` and still sets `siteWide: true`
- [x] Affected-id identity, rule, origin, and pulse stay on the existing full-site-alert behavior
- [x] A missing kind stays omitted (`eventKind` key absent)
- [x] A null stage returns the same reference even when a kind is already set
- [x] No new kind token, GameState field, or week-close hook

## Deferred

| Item or mechanic                                         | Owner or prerequisite                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Why deferred                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Zone maps, environment pressure, occupancy, and timeline | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                                                                                                                                                                                                                                                                                                                                                                   | This copy does not connect those systems.             |
| Persistence and `SCHEMA_REGISTRY`                        | Later SPE-1606 child                                                                                                                                                                                                                                                                                                                                                                                                                                                        | No GameState field this slice.                        |
| Week-close registration                                  | Existing week-close owners                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The full-site-alert apply is not newly registered.    |
| Kind stampers and spread copies                          | [SPE-3012](https://linear.app/spectranoir/issue/SPE-3012/stamp-one-hazard-event-kind-on-the-zone-spanning-record), [SPE-3013](https://linear.app/spectranoir/issue/SPE-3013/stamp-one-hostile-event-kind-on-the-zone-spanning-record), [SPE-3014](https://linear.app/spectranoir/issue/SPE-3014/stamp-one-social-event-kind-on-the-zone-spanning-record), [SPE-3015](https://linear.app/spectranoir/issue/SPE-3015/reserve-eventkind-when-a-spread-apply-copies-the-record) | Exact tokens and spread copies stay on their applies. |

Parent SPE-1606 remains **Backlog**. Parent SPE-102 remains **Backlog**. No fourth kind token is queued.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
