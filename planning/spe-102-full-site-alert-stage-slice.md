# SPE-3008 — Canonical full-site-alert stage

| Field               | Value                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                           |
| **Linear**          | [SPE-3008](https://linear.app/spectranoir/issue/SPE-3008/canonical-full-site-alert-stage)                                                                      |
| **Parent**          | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) — stays **Backlog** (this child does not finish the umbrella) |
| **Prerequisite**    | None. The stage is new. SPE-1606 does not name it.                                                                                                             |
| **Branch**          | `cursor/spe-102-full-site-alert-stage-4fad`                                                                                                                    |
| **Base `main` SHA** | `bcafa4d24acbf32d1d57d31040d57b580b7b5c08`                                                                                                                     |

## Goal

One canonical full-mobilization / full-site-alert stage id, owned by SPE-102. A reader returns that id only for the exact value. Any other input returns null.

## Pre-coding summary

| Item              | Finding                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/siteAlertStage.ts` (new); `src/test/siteAlertStage.contract.test.ts` (new); `src/domain/zoneSpanningSiteEvent.ts` (`siteWide` stays a flag) |
| Current behavior  | `src/` has no alert-stage helper. `siteWide` is copied through zone-spanning apply helpers and is not an escalation source.                             |
| Expected behavior | `readFullSiteAlertStage('full_site_alert')` returns `full_site_alert`. Every other input returns null. The zone-spanning record is not an argument.     |
| Boundary          | One stage id, one reader, contract tests, this slice doc, and backlog handoff. No zone-spanning edit. No SPE-1606 child.                                |
| Risks             | Treating `siteWide`, a propagation rule, or a nearby alert name as the stage. Naming the stage inside SPE-1606.                                         |
| Validation        | `src/test/siteAlertStage.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                  |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change. No site-wide-escalation slice doc.        |

## Boundary

### In scope

- Stage id `full_site_alert`
- `readFullSiteAlertStage` returns that id only when the input is exactly `full_site_alert`
- Missing, empty, boolean, object, array, `siteWide`, `local_awareness`, `partial_site_alert`, and propagation-rule tokens return null
- The reader does not receive or mutate a zone-spanning record

### Out of scope

- Local awareness and partial site alert
- Alert devices, channels, travel delay, activation delay, interruption, and responder choreography
- A SPE-1606 consume child, a new `propagationRule`, and any edit to `siteWide`
- SPE-1487 site shifts and SPE-36 major-incident response mode
- Persistence, `SCHEMA_REGISTRY`, UI, and week-close registration

## Seam

`readFullSiteAlertStage` is pure. It does not import zone-spanning, facility topology, or GameState. Hydration and week-close do not call this function. SPE-1606 may read the stage only in a later child, and that child must fail closed when the stage is missing.

## Acceptance

- [x] `full_site_alert` qualifies
- [x] Missing and non-qualifying inputs return null
- [x] A non-qualifying record is not mutated
- [x] Zone-spanning tests and `zoneSpanningSiteEvent.ts` stay unchanged
- [x] No new GameState field and no week-close hook

## Deferred

| Item or mechanic                                     | Owner or prerequisite                                                                            | Why deferred                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| SPE-1606 consume of this stage                       | Later SPE-1606 child, only after this stage is on `main`                                         | This slice defines the stage. It does not write site-wide affected state. |
| Local awareness and partial site alert               | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | This slice ships one stage id.                                            |
| Alert devices, channels, and activation delay        | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | No device family and no travel or activation time.                        |
| Interruption of an alert path                        | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | No alert chain to interrupt.                                              |
| Responder choreography                               | [SPE-102](https://linear.app/spectranoir/issue/SPE-102/alert-networks-and-response-choreography) | No defender reposition or ambush.                                         |
| Persistence and `SCHEMA_REGISTRY`                    | Later SPE-102 child                                                                              | No GameState field this slice.                                            |
| Week-close registration                              | Existing week-close owners                                                                       | This helper is not called from week-close.                                |
| Site-wide affected state on the zone-spanning record | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)        | `siteWide` stays a flag. Do not infer escalation from it.                 |

Parent SPE-102 remains **Backlog**. SPE-1606 remains **Backlog**. Parent SPE-1023 remains open.

## Validation

- Targeted Vitest: `src/test/siteAlertStage.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
