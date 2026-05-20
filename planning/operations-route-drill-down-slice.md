# Operations route drill-down (SPE-2248)

## Goal

Tighten cross-links between the event feed, case detail, and weekly reports for long-run QA and player legibility.

## Scope (this slice)

- Event feed: consistent primary `href` per event type; drill-down links preserve active feed filters when set.
- Case detail: weekly report links for weeks that reference the case (report lists, team status, or note `metadata.caseId`).
- Report detail: case ids in snapshot sections (existing `reportDetailHelpers` links — verified, no change).
- Documented event-type → drill-down matrix (below).

## Out of scope

- Report prev/next week navigation (shipped PR #2329).
- Multi-week timeline scrubber.
- Map / anomalous route graphs (SPE-765).

## Event type → primary drill-down

| Event type | Primary target |
| --- | --- |
| `assignment.*` | Case detail |
| `case.*` | Case detail |
| `intel.report_generated` | Report week |
| `concealment.activated` | Report week |
| `infiltration.*` | Report week |
| `agent.*` / `progression.xp_gained` | Agent detail |
| `recruitment.*` | Recruitment |
| `directive.applied` | Operations desk |
| `support.shortfall` | Case detail |
| `faction.unlock_available` | Factions |
| `faction.standing_changed` | Case detail when `caseId` set; else none |
| `production.*` / `market.*` / `agency.containment_updated` / `agency.front_business.*` / `system.equipment_recovered` / `system.party_cards_drawn` | None (desk-level or aggregate) |

## Acceptance

- [x] Matrix documented in this file.
- [x] RTL/component tests for representative links and feed filter preservation.
- [x] No broken `APP_ROUTES` hrefs on updated surfaces.

## See also

- `src/features/dashboard/eventFeedView.ts`
- `src/features/operations/operationsRouteDrillDown.ts`
- Linear SPE-2248 / GitHub issue #2330
