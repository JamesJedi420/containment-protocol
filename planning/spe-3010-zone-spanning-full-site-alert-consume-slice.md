# SPE-3010 — Consume full_site_alert onto one zone-spanning record

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                    |
| **Linear**          | [SPE-3010](https://linear.app/spectranoir/issue/SPE-3010/consume-full-site-alert-onto-one-zone-spanning-record)                                         |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella) |
| **Prerequisite**    | [SPE-3008](https://linear.app/spectranoir/issue/SPE-3008/canonical-full-site-alert-stage) — `readFullSiteAlertStage` and `full_site_alert` only         |
| **Branch**          | `cursor/spe-1606-consume-full-site-alert-249b`                                                                                                          |
| **Base `main` SHA** | `7faba700f47ab6b582c2d4100ee350927e88d286`                                                                                                              |

## Goal

One apply on the existing zone-spanning record. It calls `readFullSiteAlertStage`. Only `full_site_alert` sets site-wide affected state. A null result returns the same record, including `siteWide`.

## Pre-coding summary

| Item              | Finding                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `src/domain/siteAlertStage.ts`                                             |
| Current behavior  | `readFullSiteAlertStage` returns `full_site_alert` or null. Zone-spanning applies copy `siteWide` and do not read the stage.                                         |
| Expected behavior | `applyZoneSpanningFullSiteAlert` sets `siteWide` to true only when the reader returns `full_site_alert`. A null read returns the input record.                       |
| Boundary          | One apply, contract tests, this slice doc, and backlog handoff. No new stage id. No new propagation rule. No edit to the SPE-3008 reader.                            |
| Risks             | Treating `siteWide`, a propagation-rule token, or another spread result as the stage. Naming a second stage id.                                                      |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                        |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; deferred rows on the SPE-3008 and SPE-3007 slice docs. No `SCHEMA_REGISTRY` change. |

## Boundary

### In scope

- `applyZoneSpanningFullSiteAlert(record, stage)` calls `readFullSiteAlertStage(stage)`
- `full_site_alert` returns a frozen copy with `siteWide: true` and the same `affectedNodeIds` reference, propagation rule, origin, and pulse values
- `null`, boolean `true`, `{ siteWide: true }`, and propagation-rule tokens return the input record

### Out of scope

- A new stage id or a new entry in `ZONE_SPANNING_PROPAGATION_RULES`
- Edits to `readFullSiteAlertStage` or `src/test/siteAlertStage.contract.test.ts`
- Route-link, contamination, alarm, panic, visibility, airflow, and adjacency results as the source
- SPE-1487 site shifts and SPE-36 major-incident response mode
- A facility-graph walk, a GameState field, `SCHEMA_REGISTRY`, UI, and week-close registration

## Seam

`applyZoneSpanningFullSiteAlert` is pure. It does not import facility topology. Hydration and week-close do not call this function. `siteWide` on the input record is output state and is not the stage argument.

## Acceptance

- [x] Qualifying `full_site_alert` sets `siteWide` to true and keeps the affected-id array reference and the existing rule
- [x] `null`, `{ siteWide: true }`, boolean `true`, and propagation-rule tokens return the same record, including when the record already has `siteWide: true`
- [x] `src/test/siteAlertStage.contract.test.ts` stays unchanged
- [x] No new GameState field and no week-close hook

## Deferred

| Item or mechanic                                                            | Owner or prerequisite                                                                            | Why deferred                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Local awareness and partial site alert                                      | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | This apply reads one stage id.                                                 |
| Alert devices, channels, and activation delay                               | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | No device family and no travel or activation time.                             |
| Interruption of an alert path                                               | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | No alert chain to interrupt.                                                   |
| Responder choreography                                                      | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | No defender reposition or ambush.                                              |
| Adjacency, airflow, visibility, panic, alarm, contamination, and route link | Existing SPE-3001–SPE-3007 applies                                                               | Those applies stay on their own rules. This apply does not copy their results. |
| Persistence and `SCHEMA_REGISTRY`                                           | Later SPE-1606 child                                                                             | No GameState field this slice.                                                 |
| Week-close registration                                                     | Existing week-close owners                                                                       | This helper is not called from week-close.                                     |

Parent SPE-1606 remains **Backlog**. Parent SPE-102 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
